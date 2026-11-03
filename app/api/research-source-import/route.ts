import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { parseCsv, CSV_MAX_BYTES, CsvError, demoAllowed } from "@/lib/portal-v2/csv-updates";
import { reconcile, registryDests, SourceError, sourceApplyEnabled } from "@/lib/portal-v2/source-reconcile";
import { REGISTRY_META, SOURCE_FIELDS } from "@/lib/portal-v2/source-registry";

// Staff-only source CSV reconciliation PREVIEW (/research/source-import). Read-only. There is no apply op:
// raw source writes stay OFF until a reviewed transport/migration and real-SQL acceptance exist.
// Live preview is not wired because no approved baseline store exists (missing baseline => everything held);
// only the local fictional demo computes a preview.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const CLIENTS = ["jag", "csnf", "pvas", "wcbhc", "baq"];

function sameOrigin(req: NextRequest) {
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return false;
  const origin = req.headers.get("origin"); const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEARCH_PASSWORD || !process.env.RESEARCH_AUTH_SECRET || !(await isResearchAuthed(req))) return bad("unauthorized", 401);
  if (!sameOrigin(req)) return bad("JSON same-origin requests only", 403);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("bad body");
  const client = String(b.client || ""), table = String(b.table || "");
  if (!CLIENTS.includes(client)) return bad("Choose a client");
  try {
    if (b.op === "tables") {
      const ts = [...new Set(SOURCE_FIELDS.filter((f) => f.c === client).map((f) => f.t))];
      return NextResponse.json({ registry: REGISTRY_META, applyEnabled: sourceApplyEnabled(), tables: ts.map((t) => ({ table: t, candidate: SOURCE_FIELDS.filter((f) => f.c === client && f.t === t && f.st === "candidate").length })) });
    }
    const dests = registryDests(client, table);
    if (!dests.length) return bad("Choose a table");
    if (b.op === "fields") return NextResponse.json({ fields: dests });
    if (b.op === "preview") {
      if (b.demo !== true) return bad("Live source preview is not available: no approved baseline store or source transport yet", 501);
      if (!demoAllowed()) return bad("Demo data is only available in local development", 403);
      const csv = typeof b.csv === "string" ? b.csv : "";
      if (!csv || Buffer.byteLength(csv, "utf8") > CSV_MAX_BYTES) return bad("Choose a CSV file of 2 MB or smaller");
      const grid = parseCsv(csv); const headers = grid[0] ?? [];
      const rows = grid.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
      const mapping = (b.mapping && typeof b.mapping === "object" ? b.mapping : {}) as Record<string, string>;
      for (const h of Object.keys(mapping)) if (!headers.includes(h)) return bad(`Unknown header ${h}`);
      const { demoSourceState } = await import("@/lib/portal-v2/source-demo");
      const st = demoSourceState(client, table);
      return NextResponse.json({ headers, result: reconcile({ client, table, mode: "update", mapping, rows, ...st }) });
    }
    return bad("unknown op");
  } catch (e) {
    if (e instanceof SourceError || e instanceof CsvError) return bad((e as Error).message);
    return bad("Preview failed", 500);
  }
}
