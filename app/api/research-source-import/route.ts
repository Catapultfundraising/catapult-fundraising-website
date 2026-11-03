import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { parseCsv, CSV_MAX_BYTES, CsvError, demoAllowed } from "@/lib/portal-v2/csv-updates";
import { canonLink, resolveDestination, approvedPrepared, clientTables, parseKey, parseKeyOf, clientKeyKind, reconcile, registryDests, rowsFromGrid, validateHeadersAndMapping, SourceError, sourceApplyEnabled, SOURCE_MAX_OPS } from "@/lib/portal-v2/source-reconcile";
import { REGISTRY_META, SOURCE_FIELDS } from "@/lib/portal-v2/source-registry";
import { createHash } from "node:crypto";
import { verifyJobChunk, JobError, JOB_CHUNK_MAX_BYTES, JOB_MANIFEST_MAX_BYTES, jobBatchRows, jobWriteCols } from "@/lib/portal-v2/source-jobs";
import { insertPolicyFor } from "@/lib/portal-v2/source-insert-policy";
import { applyRequestBody, describeFreshness, livePreview, postToEngage, sourceApplyConfigured, sourcePreviewConfigured, type EngageState } from "@/lib/portal-v2/source-import-apply";

// Staff-only source CSV reconciliation (/research/source-import). Raw source writes stay OFF until a reviewed
// transport/migration and real-SQL acceptance exist.
// Live preview/apply are wired but hidden: unconfigured by default (see source-import-apply.ts); apply also hard-gated.
// Existing clients have no persisted baseline, so live updates stay held until a reviewed baseline workflow exists.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Engage /api/source-import has maxDuration 120 s and each request is capped by write statements (~45 s measured budget);
// this route waits up to 125 s for Engage (then reports UNCONFIRMED, never success) and must outlive that wait.
export const maxDuration = 150;
const nodeSha = async (x: string) => createHash("sha256").update(x, "utf8").digest("hex");
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const clientsNow = () => [...new Set([...SOURCE_FIELDS.map((f) => f.c), ...approvedPrepared().map((p) => p.client)])];

function sameOrigin(req: NextRequest) {
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return false;
  const origin = req.headers.get("origin"); const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

async function livePreviewResponse(client: string, table: string, dests: ReturnType<typeof registryDests>, headers: string[], rows: Record<string, string>[], mappingIn: unknown, fileNameIn: unknown, fileDateIn: unknown, csvIn: string, job?: Parameters<typeof livePreview>[2]["job"]) {
  const mapping = validateHeadersAndMapping(headers, mappingIn);
  const keyCol = dests.find((d) => d.key)?.key ?? "";
  const kh = Object.keys(mapping).find((h) => mapping[h] === keyCol);
  if (!kh) return bad(`Map a column to the key ${keyCol}`);
  const mapped = Object.values(mapping).filter(Boolean);
  if (new Set(mapped).size !== mapped.length) return bad("A destination is mapped twice");
  if (rows.length > SOURCE_MAX_OPS) return bad(`One preview handles at most ${SOURCE_MAX_OPS} rows; larger files are uploaded as a batched job`, 413);
  const isPrepared = approvedPrepared().some((p) => p.client === client);
  const budgetRows = jobBatchRows(jobWriteCols(dests, mapping, isPrepared));
  if (!job && rows.length > budgetRows) return bad(`With these columns one request can save at most ${budgetRows} rows; upload the file as a batched job`, 413);
  const kind = clientKeyKind(client, table);
  const keys = [...new Set(rows.map((r) => parseKeyOf(kind, r[kh])).filter((k) => k !== null))];
  const cols = mapped.filter((c) => dests.some((d) => d.col === c && d.st === "candidate" && c !== keyCol));
  if (!keys.length || !cols.length) return bad("Map the key and at least one reviewable field");
  // Source-as-of date: explicit only. Blank = unknown (never today).
  const fileDate = fileDateIn == null || fileDateIn === "" ? null : typeof fileDateIn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fileDateIn) && !Number.isNaN(Date.parse(fileDateIn + "T00:00:00Z")) && new Date(fileDateIn + "T00:00:00Z").toISOString().startsWith(fileDateIn) ? fileDateIn : "bad";
  if (fileDate === "bad") return bad("Source date must be a real date (YYYY-MM-DD) or left blank for unknown");
  const fileName = typeof fileNameIn === "string" && fileNameIn.trim() && fileNameIn.length <= 300 ? fileNameIn.trim() : "";
  if (!fileName) return bad("File name missing; choose the file again");
  // approved gift insert policy (server registry only): send each row's canonical SOURCE person link for Engage to resolve
  let newLinks: { key: unknown; link: string }[] | undefined;
  if (insertPolicyFor(client, table)) {
    const rd = resolveDestination(client, table);
    const ph = rd.personLink ? Object.keys(mapping).find((h) => mapping[h] === rd.personLink) : undefined;
    if (ph) newLinks = rows.flatMap((r) => { const k = parseKeyOf(kind, r[kh]); const l = rd.xw ? canonLink(rd.xw.fromKind, r[ph]) : (() => { const n = parseKey(r[ph]); return n === null ? null : String(n); })(); return k !== null && l !== null ? [{ key: k, link: l }] : []; });
  }
  const out = await postToEngage(fetch, process.env, { op: "previewState", client, table, keys, cols, ...(job ? { jobId: job.ref.jobId } : {}), ...(newLinks ? { newLinks } : {}) }, "");
  if (!out.ok) return bad(out.unconfirmed ? "Engage did not answer; try again" : String(out.body.error || "Preview failed"), 502);
  const prepared = approvedPrepared().find((p) => p.client === client); // server registration only, never request input
  const st = out.body as unknown as EngageState;
  // prepared client: empty destination, or (large initial-load job) destination holding ONLY this job's committed batches
  const mode = prepared && (st.destinationEmpty === true || (!!job && st.destinationOnlyJob === true)) ? "first-load" as const : "update" as const;
  const lp = livePreview({ client, table, mode, mapping, rows, headers, prepared }, st, { fileName, csv: csvIn, fileDate, secret: process.env.PORTAL_WRITE_SECRET, ...(job ? { job } : {}) });
  const { dest: _d, ...result } = lp.result;
  return NextResponse.json({ headers, result, mode, token: lp.token, requestId: lp.requestId, job: lp.job ?? null, fileName, fileDate, applyAvailable: sourceApplyConfigured() && !!lp.token });
}

/** Work-bounded batch size for a job, derived from the (untrusted) manifest mapping; verifyJobChunk then requires equality. */
function jobRowsFor(client: string, dests: ReturnType<typeof registryDests>, manifest: unknown) {
  const mm = (manifest as { mapping?: unknown } | null)?.mapping;
  const jm = Array.isArray(mm) && mm.every((e) => Array.isArray(e) && e.length === 2 && typeof e[0] === "string" && typeof e[1] === "string") ? Object.fromEntries(mm as [string, string][]) : {};
  return jobBatchRows(jobWriteCols(dests, jm, approvedPrepared().some((p) => p.client === client)));
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEARCH_PASSWORD || !process.env.RESEARCH_AUTH_SECRET || !(await isResearchAuthed(req))) return bad("unauthorized", 401);
  if (!sameOrigin(req)) return bad("JSON same-origin requests only", 403);
  // job batches carry <=500 rows + the whole-file manifest; stays under the ~4.5 MB deployed request-body limit
  const MAX_BODY = JOB_CHUNK_MAX_BYTES + JOB_MANIFEST_MAX_BYTES - 200_000;
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) return bad("Request too large", 413);
  const text = await req.text().catch(() => "");
  if (Buffer.byteLength(text, "utf8") > MAX_BODY) return bad("Request too large", 413);
  let b: Record<string, unknown> | null = null;
  try { const j = JSON.parse(text); b = j && typeof j === "object" && !Array.isArray(j) ? j : null; } catch { b = null; }
  if (!b) return bad("bad body");
  const client = String(b.client || ""), table = String(b.table || "");
  const CLIENTS = clientsNow();
  if (b.op === "clients") return NextResponse.json({ clients: CLIENTS, prepared: approvedPrepared().map((p) => p.client) });
  if (!CLIENTS.includes(client)) return bad("Choose a client");
  try {
    if (b.op === "provenance") {
      const tables = clientTables(client).map((t) => t.table);
      if (!sourcePreviewConfigured()) return NextResponse.json({ configured: false, ...describeFreshness(tables, null) });
      const out = await postToEngage(fetch, process.env, { op: "provenance", client }, "");
      return NextResponse.json({ configured: true, ...describeFreshness(tables, out.ok ? (out.body.tables as never) : null), error: out.ok ? undefined : "Source dates unavailable" });
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
    if (b.op === "jobStatus") {
      if (!sourcePreviewConfigured()) return bad("Source import is not configured", 501);
      const jid = String(b.jobId || ""); if (!/^[a-f0-9]{64}$/.test(jid)) return bad("bad jobId");
      const out = await postToEngage(fetch, process.env, { op: "jobStatus", client, jobId: jid }, "");
      return out.ok ? NextResponse.json(out.body) : bad("Status unavailable; try again", 502);
    }
    if (b.op === "tables") {
      return NextResponse.json({ registry: REGISTRY_META, applyEnabled: sourceApplyEnabled(), tables: clientTables(client) });
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
        return await livePreviewResponse(client, table, dests, headers, rows, b.mapping, b.fileName, b.fileDate, csvIn);
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
    if (b.op === "jobPreview") {
      const BR = jobRowsFor(client, dests, b.manifest);
      if (b.demo === true) {
        if (!demoAllowed()) return bad("Demo data is only available in local development", 403);
        const v = await verifyJobChunk(nodeSha, b.manifest, b.jobId, b.batchIndex, b.rows, { client, table, registryRev: REGISTRY_META.rev, actor: String(b.actor || ""), keyCol: dests.find((d) => d.key)?.key ?? "", keyKind: clientKeyKind(client, table), batchRows: BR });
        const { demoSourceState } = await import("@/lib/portal-v2/source-demo");
        const { dest: _d, ...result } = reconcile({ client, table, mode: "update", mapping: validateHeadersAndMapping(v.manifest.headers, v.mapping), rows: v.rows, headers: v.manifest.headers, ...demoSourceState(client, table) });
        return NextResponse.json({ result, token: null, requestId: v.requestId, job: null, applyAvailable: false });
      }
      // One bounded batch of a large file. Whole-file identity/keys are re-verified on every batch; nothing is stored here.
      if (!sourcePreviewConfigured()) return bad("Live source preview is not configured (needs the reviewed source_import store and dedicated Engage connection)", 501);
      if (typeof b.actor !== "string" || !b.actor.trim() || b.actor.length > 200) return bad("Enter your name (recorded as the shared-login author)");
      const v = await verifyJobChunk(nodeSha, b.manifest, b.jobId, b.batchIndex, b.rows, { client, table, registryRev: REGISTRY_META.rev, actor: b.actor, keyCol: dests.find((d) => d.key)?.key ?? "", keyKind: clientKeyKind(client, table), batchRows: BR });
      const ref = { jobId: b.jobId as string, batchIndex: v.index, batchCount: v.batchCount, batchRows: BR, totalRows: v.manifest.totalRows };
      return await livePreviewResponse(client, table, dests, v.manifest.headers, v.rows, v.mapping, v.manifest.fileName, v.manifest.fileDate, "", { ref, requestId: v.requestId, fileDigest: v.fileDigest });
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
    if (e instanceof SourceError || e instanceof CsvError || e instanceof JobError) return bad((e as Error).message);
    return bad("Preview failed", 500);
  }
}
