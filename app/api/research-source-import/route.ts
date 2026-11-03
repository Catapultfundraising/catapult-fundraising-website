import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { parseCsv, CSV_MAX_BYTES, CsvError, demoAllowed } from "@/lib/portal-v2/csv-updates";
import { reconcile, registryDests, rowsFromGrid, validateHeadersAndMapping, SourceError, sourceApplyEnabled } from "@/lib/portal-v2/source-reconcile";
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
  const MAX_BODY = CSV_MAX_BYTES + 64_000;
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) return bad("Request too large", 413);
  const text = await req.text().catch(() => "");
  if (Buffer.byteLength(text, "utf8") > MAX_BODY) return bad("Request too large", 413);
  let b: Record<string, unknown> | null = null;
  try { const j = JSON.parse(text); b = j && typeof j === "object" && !Array.isArray(j) ? j : null; } catch { b = null; }
  if (!b) return bad("bad body");
  const client = String(b.client || ""), table = String(b.table || "");
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
      if (b.demo !== true) return bad("Live source preview is not available: no approved baseline store or source transport yet", 501);
      if (!demoAllowed()) return bad("Demo data is only available in local development", 403);
      if (!csvIn || Buffer.byteLength(csvIn, "utf8") > CSV_MAX_BYTES) return bad("Choose a CSV file of 2 MB or smaller");
      const { headers, rows } = rowsFromGrid(parseCsv(csvIn));
      const mapping = validateHeadersAndMapping(headers, b.mapping);
      const { demoSourceState } = await import("@/lib/portal-v2/source-demo");
      const st = demoSourceState(client, table);
      const { dest: _d, ...result } = reconcile({ client, table, mode: "update", mapping, rows, ...st });
      return NextResponse.json({ headers, result });
    }
    return bad("unknown op");
  } catch (e) {
    if (e instanceof SourceError || e instanceof CsvError) return bad((e as Error).message);
    return bad("Preview failed", 500);
  }
}
