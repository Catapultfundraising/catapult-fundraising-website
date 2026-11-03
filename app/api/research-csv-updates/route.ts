import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import {
  CSV_CLIENTS, CSV_MAX_BYTES, CSV_TOKEN_TTL_MS, CsvError, buildPreview, changesOf, inspectCsv, csvApplyEnabled, demoAllowed, newRequestId, signToken,
  type CsvClient, type PreviewInputs, type TokenPayload,
} from "@/lib/portal-v2/csv-updates";

// Staff-only CSV contact updater (/research/csv-updates). Preview is read-only; apply is OFF unless CSV_UPDATES_APPLY=enabled
// here AND PORTAL_CSV_UPDATES_APPLY=enabled on Engage. Never accepts client-portal/board cookies.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bad = (error: string, status = 400, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

/** Staff auth: the /research password cookie (or key header). Refuses when the password/secret are not configured. */
async function staffAuthed(req: NextRequest) {
  if (!process.env.RESEARCH_PASSWORD || !process.env.RESEARCH_AUTH_SECRET) return false;
  return isResearchAuthed(req);
}
/** JSON-only, same-origin requests (blocks cross-site form posts riding the staff cookie). */
function sameOrigin(req: NextRequest) {
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return false;
  const origin = req.headers.get("origin"); const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

async function loadSource(client: CsvClient, demo: boolean): Promise<Omit<PreviewInputs, "client">> {
  if (demo) return (await import("@/lib/portal-v2/csv-updates-demo")).demoSource(client);
  const { engage, recordsFor } = await import("@/lib/portal-v2/server");
  // Context (high-water batch id) is read BEFORE state, so any save in between makes the apply stale rather than unseen.
  const ctx = await engage<{ maxBatchId: number; ownedBatchIds: number[] }>(client, "csvUpdateContext");
  const [state, recs] = await Promise.all([engage<{ updates: PreviewInputs["updates"]; prospects: PreviewInputs["prospects"] }>(client, "state"), recordsFor(client)]);
  if (!recs?.records || !recs.asOf) throw new CsvError("Client records snapshot is unavailable; try again later");
  return { asOf: recs.asOf, records: recs.records, updates: state.updates ?? [], prospects: state.prospects ?? [], ownedBatchIds: ctx.ownedBatchIds ?? [], maxBatchId: Number(ctx.maxBatchId) || 0 };
}

export async function POST(req: NextRequest) {
  if (!(await staffAuthed(req))) return bad("unauthorized", 401);
  if (!sameOrigin(req)) return bad("JSON same-origin requests only", 403);
  const len = Number(req.headers.get("content-length") || 0);
  if (len > CSV_MAX_BYTES * 2 + 4_000_000) return bad("Request too large", 413);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("bad body");
  const client = b.client as CsvClient;
  if (!(CSV_CLIENTS as readonly string[]).includes(client)) return bad("Choose a client");
  const demo = b.demo === true;
  if (demo && !demoAllowed()) return bad("Demo data is only available in local development", 403);
  const secret = demo ? "local-demo-only-signing-key-not-a-secret" : process.env.PORTAL_WRITE_SECRET;
  try {
    if (b.op === "inspect") {
      const csv = typeof b.csv === "string" ? b.csv : "";
      if (!csv) return bad("Choose a CSV file");
      if (Buffer.byteLength(csv, "utf8") > CSV_MAX_BYTES) return bad("CSV must be 2 MB or smaller", 413);
      return NextResponse.json(inspectCsv(csv));
    }
    if (b.op === "preview") {
      const csv = typeof b.csv === "string" ? b.csv : "";
      if (!csv) return bad("Choose a CSV file");
      if (Buffer.byteLength(csv, "utf8") > CSV_MAX_BYTES) return bad("CSV must be 2 MB or smaller", 413);
      const fileName = String(b.fileName || "").trim().slice(0, 200);
      if (!/\.csv$/i.test(fileName)) return bad("Upload a .csv file");
      const src = await loadSource(client, demo);
      const mapping = b.mapping && typeof b.mapping === "object" ? (b.mapping as Record<string, unknown>) : null;
      const p = buildPreview(csv, mapping, { client, ...src });
      const changes = changesOf(p);
      let token: string | null = null; let requestId: string | null = null;
      if (changes.length) {
        requestId = newRequestId();
        const payload: TokenPayload = { v: 1, client, fileName, mapping: p.mapping, asOf: src.asOf, maxBatchId: src.maxBatchId, requestId, exp: Date.now() + CSV_TOKEN_TTL_MS, changes };
        token = signToken(payload, secret);
      }
      return NextResponse.json({ preview: p, token, requestId, applyEnabled: csvApplyEnabled() && !demo, demo });
    }
    if (b.op === "apply") {
      if (demo) return bad("Demo previews cannot be saved", 403);
      const server = await import("@/lib/portal-v2/server");
      const { applyCsvPreview } = await import("@/lib/portal-v2/csv-updates-apply");
      const r = await applyCsvPreview(b, client, secret, { recordsFor: server.recordsFor, engageCall: server.engageCall });
      return NextResponse.json(r.body, { status: r.status });
    }
    if (b.op === "status") {
      const requestId = String(b.requestId || "");
      if (!/^[a-f0-9]{32}$/.test(requestId) || demo) return bad("bad request id");
      const { engage } = await import("@/lib/portal-v2/server");
      return NextResponse.json(await engage(client, "csvUpdateStatus", { requestId }));
    }
    return bad("unknown op");
  } catch (e) {
    if (e instanceof CsvError) return bad(e.message, 400);
    console.error("csv-updates", client, e);
    return bad("Could not load the dashboard data. Try again.", 503);
  }
}
