import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { parseCsv, CSV_MAX_BYTES, CsvError, demoAllowed } from "@/lib/portal-v2/csv-updates";
import { APPROVED_PREPARED, parseKey, reconcile, registryDests, rowsFromGrid, validateHeadersAndMapping, SourceError, sourceApplyEnabled, SOURCE_MAX_OPS } from "@/lib/portal-v2/source-reconcile";
import { REGISTRY_META, SOURCE_FIELDS } from "@/lib/portal-v2/source-registry";
import { applyRequestBody, livePreview, postToEngage, sourceApplyConfigured, sourcePreviewConfigured, type EngageState } from "@/lib/portal-v2/source-import-apply";

// Staff-only source CSV reconciliation (/research/source-import). Raw source writes stay OFF until a reviewed
// transport/migration and real-SQL acceptance exist.
// Live preview/apply are wired but hidden: unconfigured by default (see source-import-apply.ts); apply also hard-gated.
// Existing clients have no persisted baseline, so live updates stay held until a reviewed baseline workflow exists.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const CLIENTS = [...new Set([...SOURCE_FIELDS.map((f) => f.c), ...APPROVED_PREPARED.map((p) => p.client)])];

function sameOrigin(req: NextRequest) {
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return false;
  const origin = req.headers.get("origin"); const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEARCH_PASSWORD || !process.env.RESEARCH_AUTH_SECRET || !(await isResearchAuthed(req))) return bad("unauthorized", 401);
  if (!sameOrigin(req)) return bad("JSON same-origin requests only", 403);
  const MAX_BODY = CSV_MAX_BYTES + 64_000;
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) return bad("Request too large", 413);
  const text = await req.text().catch(() => "");
  if (Buffer.byteLength(text, "utf8") > MAX_BODY) return bad("Request too large", 413);
  let b: Record<string, unknown> | null = null;
  try { const j = JSON.parse(text); b = j && typeof j === "object" && !Array.isArray(j) ? j : null; } catch { b = null; }
  if (!b) return bad("bad body");
  const client = String(b.client || ""), table = String(b.table || "");
  if (b.op === "clients") return NextResponse.json({ clients: CLIENTS, prepared: APPROVED_PREPARED.map((p) => p.client) });
  if (!CLIENTS.includes(client)) return bad("Choose a client");
  try {
    if (b.op === "tables") {
      const ts = [...new Set(SOURCE_FIELDS.filter((f) => f.c === client).map((f) => f.t))];
      return NextResponse.json({ registry: REGISTRY_META, applyEnabled: sourceApplyEnabled(), tables: ts.map((t) => ({ table: t, candidate: SOURCE_FIELDS.filter((f) => f.c === client && f.t === t && f.st === "candidate").length })) });
    }
    const csvIn = typeof b.csv === "string" ? b.csv : "";
    if (b.op === "inspect") {
      if (!csvIn || Buffer.byteLength(csvIn, "utf8") > CSV_MAX_BYTES) return bad("Choose a CSV file of 2 MB or smaller");
      const { headers, rows } = rowsFromGrid(parseCsv(csvIn));
      validateHeadersAndMapping(headers, {});
      return NextResponse.json({ headers, rows: rows.length });
    }
    const dests = registryDests(client, table);
    if (!dests.length) return bad("Choose a table");
    if (b.op === "fields") return NextResponse.json({ fields: dests });
    if (b.op === "preview") {
      if (b.demo !== true) {
        if (!sourcePreviewConfigured()) return bad("Live source preview is not configured (needs the reviewed source_import store and dedicated Engage connection)", 501);
        if (!csvIn || Buffer.byteLength(csvIn, "utf8") > CSV_MAX_BYTES) return bad("Choose a CSV file of 2 MB or smaller");
        const { headers, rows } = rowsFromGrid(parseCsv(csvIn));
        const mapping = validateHeadersAndMapping(headers, b.mapping);
        const keyCol = dests.find((d) => d.key)?.key ?? "";
        const kh = Object.keys(mapping).find((h) => mapping[h] === keyCol);
        if (!kh) return bad(`Map a column to the key ${keyCol}`);
        const mapped = Object.values(mapping).filter(Boolean);
        if (new Set(mapped).size !== mapped.length) return bad("A destination is mapped twice");
        if (rows.length > SOURCE_MAX_OPS) return bad(`Live preview handles at most ${SOURCE_MAX_OPS} rows per file; split the file`, 413);
        const keys = [...new Set(rows.map((r) => parseKey(r[kh])).filter((k): k is number => k !== null))];
        const cols = mapped.filter((c) => dests.some((d) => d.col === c && d.st === "candidate" && c !== keyCol));
        if (!keys.length || !cols.length) return bad("Map the key and at least one reviewable field");
        // Source-as-of date: explicit only. Blank = unknown (never today).
        const fileDate = b.fileDate == null || b.fileDate === "" ? null : typeof b.fileDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.fileDate) && !Number.isNaN(Date.parse(b.fileDate + "T00:00:00Z")) && new Date(b.fileDate + "T00:00:00Z").toISOString().startsWith(b.fileDate) ? b.fileDate : "bad";
        if (fileDate === "bad") return bad("Source date must be a real date (YYYY-MM-DD) or left blank for unknown");
        const fileName = typeof b.fileName === "string" && b.fileName.trim() && b.fileName.length <= 300 ? b.fileName.trim() : "";
        if (!fileName) return bad("File name missing; choose the file again");
        const out = await postToEngage(fetch, process.env, { op: "previewState", client, table, keys, cols }, "");
        if (!out.ok) return bad(out.unconfirmed ? "Engage did not answer; try again" : String(out.body.error || "Preview failed"), 502);
        const lp = livePreview({ client, table, mode: "update", mapping, rows, headers }, out.body as unknown as EngageState, { fileName, csv: csvIn, fileDate, secret: process.env.PORTAL_WRITE_SECRET });
        const { dest: _d, ...result } = lp.result;
        return NextResponse.json({ headers, result, token: lp.token, requestId: lp.requestId, fileName, fileDate, applyAvailable: sourceApplyConfigured() && !!lp.token });
      }
      if (!demoAllowed()) return bad("Demo data is only available in local development", 403);
      if (!csvIn || Buffer.byteLength(csvIn, "utf8") > CSV_MAX_BYTES) return bad("Choose a CSV file of 2 MB or smaller");
      const { headers, rows } = rowsFromGrid(parseCsv(csvIn));
      const mapping = validateHeadersAndMapping(headers, b.mapping);
      const { demoSourceState } = await import("@/lib/portal-v2/source-demo");
      const st = demoSourceState(client, table);
      const { dest: _d, ...result } = reconcile({ client, table, mode: "update", mapping, rows, headers, ...st });
      return NextResponse.json({ headers, result });
    }
    if (b.op === "status") {
      // Status stays available whenever the read path is configured, even with saving turned off.
      if (!sourcePreviewConfigured()) return bad("Source import is not configured", 501);
      {
        const rid = String(b.requestId || ""); if (!/^[a-f0-9]{32}$/.test(rid)) return bad("bad requestId");
        const out = await postToEngage(fetch, process.env, { op: "status", client, requestId: rid }, rid);
        return out.ok ? NextResponse.json(out.body) : bad("Status unavailable; try again", 502);
      }
    }
    if (b.op === "apply") {
      if (!sourceApplyConfigured()) return bad("Saving source data is turned off", 403);
      const body = applyRequestBody(b.token, b.actor, process.env.PORTAL_WRITE_SECRET);
      if (body.client !== client) return bad("Preview token is for another client", 400);
      const out = await postToEngage(fetch, process.env, body, String(body.request.requestId));
      if (out.ok) return NextResponse.json(out.body);
      if (out.unconfirmed) return NextResponse.json({ unconfirmed: true, requestId: out.requestId, error: "Save not confirmed. Check status before doing anything else." }, { status: 202 });
      return NextResponse.json(out.body, { status: out.status });
    }
    return bad("unknown op");
  } catch (e) {
    if (e instanceof SourceError || e instanceof CsvError) return bad((e as Error).message);
    return bad("Preview failed", 500);
  }
}
