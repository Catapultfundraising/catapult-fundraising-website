import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { parseCsv, CSV_MAX_BYTES, CsvError, demoAllowed, CSV_CLIENTS } from "@/lib/portal-v2/csv-updates";
import { canonLink, resolveDestination, approvedPrepared, clientTables, parseKey, parseKeyOf, clientKeyKind, reconcile, registryDests, rowsFromGrid, validateHeadersAndMapping, SourceError, sourceApplyEnabled, SOURCE_MAX_OPS } from "@/lib/portal-v2/source-reconcile";
import { REGISTRY_META, SOURCE_FIELDS } from "@/lib/portal-v2/source-registry";
import { createHash } from "node:crypto";
import { verifyJobChunk, JobError, JOB_CHUNK_MAX_BYTES, JOB_MANIFEST_MAX_BYTES, jobBatchRows, jobWriteCols } from "@/lib/portal-v2/source-jobs";
import { insertPolicyFor } from "@/lib/portal-v2/source-insert-policy";
import { approvedAllocators, verifyAllocChunk, identityConfigDigest, reservePayloadHash, AllocError, type AllocContext } from "@/lib/portal-v2/source-allocator";
import { preparedDigest as preparedDigestOf, verifySourceTokenPayloadForAlloc } from "@/lib/portal-v2/source-alloc-server";
import { buildProfile, checkProfile, type ProfileContext } from "@/lib/portal-v2/source-mapping-profile";
import { insertPolicyDigest } from "@/lib/portal-v2/source-insert-policy";
import { attestDestination, validateDraft, buildPrior, buildPacket, summarizePlan, summarizeStatus, exportText, priorDigest, validRequestId, validateAttestHeaders } from "@/lib/portal-v2/source-baseline-attest";
import { stageGift, exportGift, giftColumns, GiftPreviewError, GIFT_CLIENT, GIFT_TABLE, GIFT_PERSON_COL } from "@/lib/portal-v2/gift-preview";
import { buildDurablePlan, commitBody, proofFor, durableExport, registrationFor, verifyJob, previewQuery, projectPreview, projectJobStatus, renewRecovery, RENEW_MAX_BODY, reviewCheck, REVIEW_MAX_TEXT, REVIEW_MAX_BODY, DurableGiftError, DURABLE_MAX_BODY } from "@/lib/portal-v2/gift-durable";
import { giftRegDigest, previewRowCap, jobRequestId, validOutcome } from "@/lib/portal-v2/gift-identity-plan";
import { validateAttestPlan, projectAttestStatus, capForMapped, ATTEST_MAX_FILE_BYTES, ATTEST_EXPORT_MAX_BYTES, AttestShapeError, REFUSAL_TEXT, REFUSAL_FALLBACK, STATUS_TEXT, CAPS_BY_MAPPED_COUNT } from "@/lib/portal-v2/gift-attest";
import { isReservedGiftHeader } from "@/lib/portal-v2/gift-durable";
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

const exactBody = (o: Record<string, unknown>, ks: string[]) => JSON.stringify(Object.keys(o).sort()) === JSON.stringify([...ks].sort());
function sameOrigin(req: NextRequest) {
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return false;
  const origin = req.headers.get("origin"); const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

async function livePreviewResponse(client: string, table: string, dests: ReturnType<typeof registryDests>, headers: string[], rows: Record<string, string>[], mappingIn: unknown, fileNameIn: unknown, fileDateIn: unknown, csvIn: string, job?: Parameters<typeof livePreview>[2]["job"], alloc?: Parameters<typeof livePreview>[2]["alloc"]) {
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
  // allocator-registered client: inserts ONLY through the reserved first load of the master (Engage enforces the same)
  const reg = approvedAllocators().some((a) => a.client === client);
  if (reg && alloc && mode !== "first-load") return bad("The new client's destination is not in initial-load state; reserved first load refused");
  if (reg && !alloc && mode === "first-load") return bad("New records for this client are added only through the reserved first load (CPTIDs assigned by the shared allocator)");
  const lp = livePreview({ client, table, mode, mapping, rows, headers, prepared }, st, { fileName, csv: csvIn, fileDate, secret: process.env.PORTAL_WRITE_SECRET, ...(job ? { job } : {}), ...(alloc ? { alloc } : {}) });
  if (reg && !alloc && lp.result.rows.some((r) => r.outcome === "insert")) return bad("New records for this client are held: add them only through the reserved first load");
  const { dest: _d, ...result } = lp.result;
  return NextResponse.json({ headers, result, mode, token: lp.token, requestId: lp.requestId, job: lp.job ?? null, fileName, fileDate, applyAvailable: sourceApplyConfigured() && !!lp.token });
}

/** Server allocator context for a client (null = not registered). Identity columns must be listed non-key master columns. */
function allocCtx(client: string): AllocContext | null {
  const hits = approvedAllocators().filter((a) => a.client === client);
  if (!hits.length) return null;
  if (hits.length > 1) throw new AllocError("More than one allocator registration for this client");
  const cfg = hits[0];
  if (!/^[A-Za-z0-9._-]{8,80}$/.test(String(cfg.approvalId)) || !Number.isSafeInteger(cfg.approvalVersion) || cfg.approvalVersion < 1 || !Number.isSafeInteger(cfg.forbiddenFrom) || cfg.forbiddenFrom < 2 || cfg.forbiddenFrom > 2147483647
    || typeof cfg.sourceSystem !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(cfg.sourceSystem) || typeof cfg.externalKeyCol !== "string" || !Array.isArray(cfg.identityCols) || !cfg.identityCols.every((c) => typeof c === "string") || new Set(cfg.identityCols).size !== cfg.identityCols.length)
    throw new AllocError("Allocator registration is invalid");
  const prep = approvedPrepared().find((p) => p.client === client);
  const t = prep?.tables.find((x) => x.table === cfg.masterTable);
  if (!prep || !t) throw new AllocError("Allocator registration has no matching approved prepared master");
  const cols = t.columns.map((c) => c.col);
  if (!cols.includes(cfg.externalKeyCol) || cfg.externalKeyCol === t.key || !cfg.identityCols.length || cfg.identityCols.some((c) => !cols.includes(c) || c === t.key)) throw new AllocError("Allocator identity configuration does not match the prepared master");
  const pd = preparedDigestOf(prep, cfg.masterTable);
  const allocatorDigest = createHash("sha256").update(JSON.stringify(["cptid-alloc/v2", cfg.approvalId, cfg.approvalVersion, cfg.client, cfg.masterTable, cfg.sourceSystem, cfg.forbiddenFrom, pd])).digest("hex");
  const icd = createHash("sha256").update(JSON.stringify(["identity-config/v1", cfg.approvalId, cfg.approvalVersion, cfg.sourceSystem, cfg.externalKeyCol, cfg.identityCols])).digest("hex");
  return { allocatorDigest, preparedDigest: pd, identityConfigDigest: icd, keyCol: t.key, externalKeyCol: cfg.externalKeyCol, identityCols: [...cfg.identityCols], sourceSystem: cfg.sourceSystem, batchRows: jobBatchRows(t.columns.length - 1), columns: cols.filter((c) => c !== t.key), masterTable: cfg.masterTable };
}
function allocCtxOrBad(client: string, table: string) {
  const ctx = allocCtx(client);
  const cfg = approvedAllocators().find((a) => a.client === client);
  if (!ctx || !cfg || cfg.masterTable !== table) throw new AllocError("Reserved first load is only for the registered master of an allocator-registered client");
  return ctx;
}
void identityConfigDigest;

/** Current server context for mapping profiles: registry rev, resolved destination list, prepared/allocator/insert-policy digests. */
function profileContext(client: string, table: string): ProfileContext {
  const prep = approvedPrepared().find((p) => p.client === client);
  const rd = resolveDestination(client, table, prep);
  const ac = allocCtx(client);
  const pol = insertPolicyFor(client, table);
  // allocator-registered master (reserved first load): the required key is the approved EXTERNAL source ID and CPTID
  // is assigned by the shared allocator, so the caller may never map it. Server-owned context only.
  const alloc = ac && ac.masterTable === table ? ac : null;
  return { client, table, registryRev: REGISTRY_META.rev, keyCol: alloc ? alloc.externalKeyCol : rd.key, keyKind: alloc ? "external" : rd.keyKind, forbidden: alloc ? [rd.key] : [], required: alloc ? [...alloc.identityCols] : [],
    dests: rd.dests.map((d) => ({ col: d.col, ty: d.ty, len: d.len, p: d.p, s: d.s, st: d.st, key: d.col === rd.key ? rd.key : "" })),
    preparedDigest: prep ? preparedDigestOf(prep, table) : null, allocatorDigest: alloc ? alloc.allocatorDigest : null, insertPolicyDigest: pol ? insertPolicyDigest(pol) : null };
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
    if (b.op === "allocConfig") {
      const ctx = allocCtx(client);
      // only for the reviewed master table; saveAvailable mirrors the hard server gate (false by default)
      return ctx && ctx.masterTable === table ? NextResponse.json({ ...ctx, saveAvailable: sourceApplyConfigured() }) : bad("No reviewed shared-allocator registration for this table", 404);
    }
    if (b.op === "allocReserveStatus") {
      // read-only; available whenever the read path is configured, even with saving turned off
      if (!sourcePreviewConfigured()) return bad("Source import is not configured", 501);
      const rid = String(b.requestId || ""); if (!/^[a-f0-9]{32}$/.test(rid)) return bad("bad requestId");
      const out = await postToEngage(fetch, process.env, { op: "reserveStatus", client, requestId: rid }, rid);
      return out.ok ? NextResponse.json(out.body) : bad("Status unavailable; try again", 502);
    }
    if (b.op === "jobStatus") {
      if (!sourcePreviewConfigured()) return bad("Source import is not configured", 501);
      const jid = String(b.jobId || ""); if (!/^[a-f0-9]{64}$/.test(jid)) return bad("bad jobId");
      const out = await postToEngage(fetch, process.env, { op: "jobStatus", client, jobId: jid }, "");
      return out.ok ? NextResponse.json(out.body) : bad("Status unavailable; try again", 502);
    }
    // Baseline attestation (review only): read-only gateway to backend baselinePreview/baselineStatus. No apply op exists.
    if (typeof b.op === "string" && b.op.startsWith("baseline") && (typeof b.client !== "string" || typeof b.table !== "string")) return bad("client and table must be text");
    if (b.op === "baselineContext") {
      const r = attestDestination(client, table);
      return NextResponse.json(r.ok ? { available: true, configured: sourcePreviewConfigured(), key: r.dest.key, keyKind: r.dest.keyKind, columns: r.dest.cols, personRequired: !!r.dest.personLink, linkRequired: !!r.dest.xw } : { available: false, reason: r.reason });
    }
    if (b.op === "baselinePreview") {
      if (!exactBody(b, ["op", "client", "table", "fileB64", "draft"])) return bad("bad baselinePreview body");
      const r = attestDestination(client, table); if (!r.ok) return bad(r.reason);
      if (typeof b.fileB64 !== "string" || b.fileB64.length > Math.ceil(CSV_MAX_BYTES / 3) * 4 + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(b.fileB64)) return bad("Choose a CSV file of 2 MB or smaller");
      const bytes = Buffer.from(b.fileB64, "base64"); if (!bytes.length || bytes.length > CSV_MAX_BYTES) return bad("Choose a CSV file of 2 MB or smaller");
      let csvText: string; try { csvText = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return bad("File must be UTF-8 text"); }
      const grid = parseCsv(csvText); const { headers } = rowsFromGrid(grid); validateHeadersAndMapping(headers, {}); validateAttestHeaders(headers);
      const dr = validateDraft(b.draft, r.dest, headers); const prior = buildPrior(grid, r.dest, dr); const packet = buildPacket(r.dest, dr, bytes);
      if (!sourcePreviewConfigured()) return bad("Source import is not configured", 501);
      const out = await postToEngage(fetch, process.env, { op: "baselinePreview", packet, prior }, "");
      // never echo upstream text: fixed messages + typed codes only
      if (!out.ok) return out.unconfirmed ? NextResponse.json({ error: "Preview unavailable; nothing was saved. Try again.", code: "upstream_unavailable" }, { status: 502 })
        : NextResponse.json({ error: "Engage refused this packet (validation failed). Re-check registry revision, mapping and attestation fields.", code: "upstream_refused" }, { status: 400 });
      const plan = summarizePlan(out.body);
      return NextResponse.json({ plan, priorRows: prior.length, priorDigest: priorDigest(prior), fileSha256: packet.priorFile.sha256, export: exportText(packet, prior, dr, plan) });
    }
    if (b.op === "baselineStatus") {
      if (!exactBody(b, ["op", "client", "table", "requestId"]) || !validRequestId(b.requestId)) return bad("bad requestId");
      const r = attestDestination(client, table); if (!r.ok) return bad(r.reason);
      if (!sourcePreviewConfigured()) return bad("Source import is not configured", 501);
      const out = await postToEngage(fetch, process.env, { op: "baselineStatus", client, table, requestId: b.requestId }, b.requestId);
      return out.ok ? NextResponse.json(summarizeStatus(out.body)) : bad("Status unavailable (unconfirmed); try again", 502);
    }
    // Gift baseline attestation (D) gateway: READ-ONLY preview + status. No apply op exists here or on Engage's route.
    if (typeof b.op === "string" && b.op.startsWith("durableGiftAttest")) {
      if (typeof b.client !== "string" || typeof b.table !== "string") return bad("client and table must be text");
      const lookupAvailable = (CSV_CLIENTS as readonly string[]).includes(client) && sourcePreviewConfigured();
      if (b.op === "durableGiftAttestContext") {
        if (!exactBody(b, ["op", "client", "table"])) return bad("bad durableGiftAttestContext body");
        const g = registrationFor(client);
        if (!g || g.table !== table || !sourcePreviewConfigured()) return NextResponse.json({ available: false, lookupAvailable });
        return NextResponse.json({ available: true, lookupAvailable, configured: true, registrationId: g.id, registrationVersion: g.version, columns: g.columns.map((c) => ({ col: c.col, ty: c.ty, len: c.len, p: c.p, s: c.s })), capsByMappedCount: [...CAPS_BY_MAPPED_COUNT], maxFileBytes: ATTEST_MAX_FILE_BYTES });
      }
      if (b.op === "durableGiftAttestStatus") {
        if (!exactBody(b, ["op", "client", "table", "requestId"]) || typeof b.requestId !== "string" || !/^[0-9a-f]{32}$/.test(b.requestId) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(table) || table.length > 128) return bad("bad status request");
        if (!lookupAvailable) return bad("Status lookup is not available", 501);
        const out = await postToEngage(fetch, process.env, { op: "giftAttestStatus", client, table, requestId: b.requestId }, b.requestId);
        if (!out.ok || Buffer.byteLength(JSON.stringify(out.body), "utf8") > 64 * 1024) return bad(STATUS_TEXT.unavailable, 502);
        return NextResponse.json(projectAttestStatus(out.body, { requestId: b.requestId, client, table }));
      }
      if (b.op === "durableGiftAttestPreview") {
        if (!exactBody(b, ["op", "client", "table", "fileB64", "draft"])) return bad("bad durableGiftAttestPreview body");
        const g = registrationFor(client); if (!g || g.table !== table) return bad("No reviewed gift registration for this table", 404);
        if (!sourcePreviewConfigured()) return bad("Source import is not configured", 501);
        const f64 = b.fileB64;
        if (typeof f64 !== "string" || !f64.length || f64.length % 4 !== 0 || f64.length > Math.ceil(ATTEST_MAX_FILE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(f64)) return bad("Choose the original CSV export (2.8 MB or smaller)");
        const bytes = Buffer.from(f64, "base64"); if (bytes.toString("base64") !== f64 || !bytes.length || bytes.length > ATTEST_MAX_FILE_BYTES) return bad("Choose the original CSV export (2.8 MB or smaller)");
        let text: string; try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); } catch { return bad("File must be UTF-8 text"); }
        const grid = parseCsv(text); if (grid.length < 2) return bad("CSV needs a header and at least one row");
        const headers = grid[0], rows = grid.slice(1);
        if (rows.some((r) => r.length !== headers.length)) return bad("Every row must have exactly as many cells as the header");
        if (new Set(headers).size !== headers.length) return bad("Column headers must be unique");
        if (headers.some(isReservedGiftHeader)) return bad("This file has a Catapult Gift ID, Gift ID Status or provisional preview column; attest from the original source export instead");
        const d = b.draft as Record<string, unknown>;
        const DK = ["approvalRef", "approvedAt", "approvedBy", "confirmed", "mapping", "ordinalFrom", "ordinalTo", "sourceDate", "statement"];
        if (!d || typeof d !== "object" || Array.isArray(d) || !exactBody(d, DK)) return bad("bad attestation draft");
        if (d.confirmed !== true) return bad("Confirm that this exact file is the prior export originally loaded into the raw gift table");
        const t = (v: unknown, n: number) => typeof v === "string" && v.trim().length > 0 && v === v.trim() && v.length <= n && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(v);
        if (typeof d.sourceDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.sourceDate) || new Date(`${d.sourceDate}T00:00:00Z`).toISOString().slice(0, 10) !== d.sourceDate) return bad("Source export date required (real YYYY-MM-DD; unknown dates cannot be attested)");
        if (!t(d.statement, 2000) || !/prior source export/i.test(d.statement as string) || !/originally loaded/i.test(d.statement as string)) return bad("Statement must say this prior source export is the file originally loaded into the raw gift table");
        if (!t(d.approvedBy, 200) || !t(d.approvalRef, 200) || typeof d.approvedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(d.approvedAt) || Number.isNaN(Date.parse(d.approvedAt)) || new Date(d.approvedAt).toISOString() !== d.approvedAt.replace("Z", ".000Z")) return bad("Name (as stated), UTC time (YYYY-MM-DDTHH:MM:SSZ) and reference are required");
        const mp = d.mapping; if (!mp || typeof mp !== "object" || Array.isArray(mp)) return bad("bad mapping");
        const regCols = new Set(g.columns.map((c) => c.col)); let personH: string | null = null; const mapped: string[] = []; const seen = new Set<string>();
        for (const [h, c] of Object.entries(mp as Record<string, unknown>)) {
          if (typeof c !== "string" || !headers.includes(h) || h.trim() === "") return bad("Mapped columns must be non-blank headers of this file");
          if (c === "@person") { if (personH !== null) return bad("Map exactly one donor CPTID column"); personH = h; continue; }
          if (!regCols.has(c) || seen.has(c)) return bad(`"${c}" is not a registered column or is mapped twice`);
          seen.add(c); mapped.push(c);
        }
        if (personH === null || !mapped.length) return bad("Map the donor CPTID column and at least one registered column");
        const cap = capForMapped(mapped.length); const from = d.ordinalFrom, to = d.ordinalTo;
        if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || (from as number) < 0 || (from as number) > (to as number) || (to as number) >= rows.length) return bad("Choose a row range inside the file");
        if ((to as number) - (from as number) + 1 > cap) return bad(`At most ${cap} rows per preview with ${mapped.length} mapped columns`);
        const fileSha = createHash("sha256").update(bytes).digest("hex");
        const packet = { client, table, registrationId: g.id, registrationVersion: g.version, registrationDigest: giftRegDigest(g), mapping: mp as Record<string, string>, priorFile: { name: "prior-source-export.csv", sha256: fileSha, sourceDate: d.sourceDate }, provenanceStatement: d.statement as string, approvedBy: d.approvedBy as string, approvedAt: d.approvedAt, approvalRef: d.approvalRef as string };
        const ordinals = Array.from({ length: (to as number) - (from as number) + 1 }, (_, i) => (from as number) + i);
        const input = { packet, ordinals, priorFileB64: f64 };
        if (Buffer.byteLength(JSON.stringify({ op: "giftBaselineAttest", request: { ...input, requestId: "0".repeat(32), planDigest: "0".repeat(64) } }), "utf8") > 3_900_000) return bad("The file is too large for one attestation request", 413);
        const out = await postToEngage(fetch, process.env, { op: "giftAttestPreview", input }, "");
        if (!out.ok) return out.unconfirmed ? NextResponse.json({ error: "Preview unavailable; nothing was saved. Try again.", code: "upstream_unavailable" }, { status: 502 })
          : NextResponse.json({ error: REFUSAL_TEXT[String(out.body.code)] ?? REFUSAL_FALLBACK, code: "upstream_refused" }, { status: 400 });
        if (Buffer.byteLength(JSON.stringify(out.body), "utf8") > 4_000_000) return NextResponse.json({ error: new AttestShapeError().message, code: "upstream_invalid" }, { status: 502 });
        const hIdx = new Map(Object.entries(mp as Record<string, string>).filter(([, c]) => c !== "@person").map(([h, c]) => [c, headers.indexOf(h)]));
        let plan;
        try { plan = validateAttestPlan(out.body, { from: from as number, to: to as number, mapped, cell: (o, c) => rows[o][hIdx.get(c)!] }); }
        catch { return NextResponse.json({ error: new AttestShapeError().message, code: "upstream_invalid" }, { status: 502 }); }
        const exp = JSON.stringify({ kind: "gift-attest-proposal/v1", note: "Metadata only. Not an approval; applying needs a separate reviewed approval.", packet: { ...packet, mapping: packet.mapping }, ordinalFrom: from, ordinalTo: to, planDigest: plan.planDigest, counts: plan.counts }, null, 1);
        if (Buffer.byteLength(exp, "utf8") > ATTEST_EXPORT_MAX_BYTES) return bad("Proposal export would exceed 64 KiB");
        const reply = { plan: out.body, fileSha256: fileSha, export: exp };
        if (Buffer.byteLength(JSON.stringify(reply), "utf8") > 4_000_000) return NextResponse.json({ error: new AttestShapeError().message, code: "upstream_invalid" }, { status: 502 });
        return NextResponse.json(reply);
      }
      return bad("unknown op");
    }
    // Durable gift IDs (review-only, DISABLED): website registry copy is EMPTY and commits need sourceApplyConfigured()
    // (hard SOURCE_TRANSPORT_APPROVED=false). Reads need the configured transport. Fixed messages only; upstream text never echoed.
    if (typeof b.op === "string" && b.op.startsWith("durableGift")) {
      const g = registrationFor(client);
      const now = Date.now(), secret = process.env.RESEARCH_AUTH_SECRET;
      const OPS = ["durableGiftJobLookup", "durableGiftRenew", "durableGiftReviewCheck", "durableGiftContext", "durableGiftPlan", "durableGiftExport", "durableGiftCommit", "durableGiftPreview", "durableGiftProof", "durableGiftJobStatus"];
      if (!OPS.includes(b.op)) return bad("unknown op");
      // Read-only whole-job lookup, independent of the (mutable) gift registration: fixed client code + jobId only,
      // existing backend giftJobStatus (fixed client/job query), strict projection. Never a proof, never enables a write.
      if (b.op === "durableGiftJobLookup") {
        if (typeof b.client !== "string" || typeof b.jobId !== "string") return bad("bad durableGiftJobLookup body");
        const jid = b.jobId;
        if (!exactBody(b, ["op", "client", "jobId"]) || !(CSV_CLIENTS as readonly string[]).includes(client) || !/^[a-f0-9]{64}$/.test(jid)) return bad("bad durableGiftJobLookup body");
        if (!sourcePreviewConfigured()) return bad("Source import is not configured", 501);
        try { const out = await postToEngage(fetch, process.env, { op: "giftJobStatus", client, jobId: jid }, "");
          return out.ok ? NextResponse.json(projectJobStatus(out.body, jid, client)) : bad("Status unavailable (unconfirmed); try again", 502); }
        catch { return bad("Status unavailable (unconfirmed); try again", 502); }
      }
      if (typeof b.table !== "string") return bad("table must be text");
      try {
        if (b.op === "durableGiftContext" && !exactBody(b, ["op", "client", "table"])) return bad("bad durableGiftContext body");
        // context: available only for the actual matching registration; otherwise false + lookupAvailable (allowlisted
        // client, configured read transport) so an earlier job stays reachable read-only after drift/removal
        if (b.op === "durableGiftContext" && !(g && table === g.table)) return NextResponse.json({ available: false, lookupAvailable: (CSV_CLIENTS as readonly string[]).includes(client) && sourcePreviewConfigured(), reason: "No reviewed gift registration for this client and table" });
        if (g && table !== g.table) return bad("This table has no reviewed gift registration");
        if (b.op === "durableGiftContext") return NextResponse.json(g ? { lookupAvailable: sourcePreviewConfigured(), available: true, configured: sourcePreviewConfigured(), saveAvailable: sourceApplyConfigured(), registrationId: g.id, columns: g.columns.map((c) => c.col), colDefs: g.columns.map((c) => ({ col: c.col, ty: c.ty, len: c.len, p: c.p, s: c.s })), required: g.required, rowCap: previewRowCap(g.columns.length), newAllowed: g.locatorVerifiedUnique && !!g.rowAllocator } : { available: false, reason: "No reviewed gift registration for this client" });
        if (!g) return bad("No reviewed gift registration for this client", 404);
        if (b.op === "durableGiftPlan") {
          if (!exactBody(b, ["op", "client", "table", "csv", "mapping", "decisions", "actor", "fileName", "fileDate"]) || typeof b.csv !== "string") return bad("bad durableGiftPlan body");
          if (Buffer.byteLength(text, "utf8") > DURABLE_MAX_BODY) return bad("File plus decisions too large for one plan; split the file", 413);
          return NextResponse.json(buildDurablePlan({ client, csv: b.csv, mapping: b.mapping, decisions: b.decisions, actor: b.actor, fileName: b.fileName, fileDate: b.fileDate, secret, now }));
        }
        if (b.op === "durableGiftRenew") {
          if (Buffer.byteLength(text, "utf8") > RENEW_MAX_BODY) return bad("Renewal request too large", 413);
          if (typeof b.client !== "string" || typeof b.table !== "string" || !exactBody(b, ["op", "client", "table", "header", "headerMac", "jobToken"])) return bad("bad durableGiftRenew body");
          return NextResponse.json(renewRecovery({ client, table, header: b.header, headerMac: b.headerMac, jobToken: b.jobToken, secret, now }));
        }
        if (b.op === "durableGiftReviewCheck") {
          if (Buffer.byteLength(text, "utf8") > REVIEW_MAX_BODY) return bad("Review check request too large", 413);
          if (!exactBody(b, ["op", "client", "table", "original", "reviewCopy", "header", "headerMac", "jobToken", "proofs"]) || typeof b.client !== "string" || typeof b.table !== "string" || typeof b.original !== "string" || typeof b.reviewCopy !== "string") return bad("bad durableGiftReviewCheck body");
          if (Buffer.byteLength(b.original, "utf8") > REVIEW_MAX_TEXT || Buffer.byteLength(b.reviewCopy, "utf8") > REVIEW_MAX_TEXT) return bad("Each file must be 2 MB or smaller", 413);
          return NextResponse.json(reviewCheck({ client, table, original: b.original, reviewCopy: b.reviewCopy, header: b.header, headerMac: b.headerMac, jobToken: b.jobToken, proofs: b.proofs, secret, now }));
        }
        if (b.op === "durableGiftExport") {
          if (!exactBody(b, ["op", "client", "table", "csv", "token", "manifest", "proofs"]) || typeof b.csv !== "string") return bad("bad durableGiftExport body");
          if (Buffer.byteLength(text, "utf8") > DURABLE_MAX_BODY) return bad("Export request too large", 413);
          return NextResponse.json(durableExport({ client, csv: b.csv, token: b.token, manifest: b.manifest, proofs: b.proofs, secret, now }));
        }
        if (b.op === "durableGiftCommit") {
          if (!exactBody(b, ["op", "client", "table", "token", "manifest", "batchIndex", "rows"])) return bad("bad durableGiftCommit body");
          if (!sourceApplyConfigured()) return NextResponse.json({ error: "Saving gift IDs is turned off", code: "disabled" }, { status: 503 });
          const body = commitBody({ client, token: b.token, manifest: b.manifest, batchIndex: b.batchIndex, rows: b.rows, secret, now });
          const out = await postToEngage(fetch, process.env, body, body.request.requestId);
          // committed ONLY when the upstream outcome validates against this exact request/batch; else unconfirmed (never "refused")
          if (out.ok && validOutcome(out.body, { requestId: body.request.requestId, client, registrationId: g.id, rows: body.request.rows })) return NextResponse.json({ committed: true, requestId: body.request.requestId, outcome: out.body });
          if (out.ok) return NextResponse.json({ error: "Save outcome unconfirmed. Check status for this batch before anything else.", code: "unconfirmed", requestId: body.request.requestId }, { status: 502 });
          if (out.unconfirmed) return NextResponse.json({ error: "Save outcome unconfirmed. Check status for this batch before anything else.", code: "unconfirmed", requestId: body.request.requestId }, { status: 502 });
          return NextResponse.json({ error: "Engage refused this batch (validation failed). Nothing in this batch was saved.", code: "refused", requestId: body.request.requestId }, { status: out.status === 503 ? 503 : 400 });
        }
        if (!sourcePreviewConfigured()) return bad("Source import is not configured", 501);
        if (b.op === "durableGiftPreview") {
          if (!exactBody(b, ["op", "client", "table", "query"])) return bad("bad durableGiftPreview body");
          const query = previewQuery(b.query, g);
          const out = await postToEngage(fetch, process.env, { op: "giftPreviewState", request: { client, registrationId: g.id, registrationVersion: g.version, registrationDigest: giftRegDigest(g), query } }, "");
          return out.ok ? NextResponse.json(projectPreview(out.body, g, query as Record<string, unknown>)) : out.unconfirmed ? bad("Preview unavailable; nothing was changed. Retry the read.", 502) : bad("Engage refused this preview request.", 400);
        }
        if (b.op === "durableGiftProof") {
          if (!exactBody(b, ["op", "client", "table", "token", "manifest", "batchIndex"])) return bad("bad durableGiftProof body");
          const { t, m } = verifyJob(b.token, b.manifest, secret, now, client);
          if (!Number.isSafeInteger(b.batchIndex) || (b.batchIndex as number) < 0 || (b.batchIndex as number) >= m.batchCount) return bad("bad batch index");
          const rq = jobRequestId(t.jobId, b.batchIndex as number);
          const out = await postToEngage(fetch, process.env, { op: "giftStatus", client, requestId: rq }, rq);
          if (!out.ok) return NextResponse.json({ confirmed: false, state: "unavailable", error: "Status unavailable (unconfirmed); try again", requestId: rq }, { status: 502 });
          const proof = proofFor({ client, token: b.token, manifest: b.manifest, batchIndex: b.batchIndex, status: out.body, secret, now });
          if (proof) return NextResponse.json({ confirmed: true, proof, requestId: rq });
          // pending ONLY for the owning backend's canonical non-confirm shape (found:false, confirmed:false, optional note,
          // no outcome); the note is never parsed or relayed. Anything else is unavailable: no resend permission.
          const s0 = out.body as Record<string, unknown> | null;
          const canonical = !!s0 && typeof s0 === "object" && !Array.isArray(s0) && Object.keys(s0).every((k) => k === "found" || k === "confirmed" || k === "note") && s0.found === false && s0.confirmed === false && (s0.note === undefined || typeof s0.note === "string");
          return canonical ? NextResponse.json({ confirmed: false, state: "pending", requestId: rq, note: "No committed outcome is recorded for this batch. This does not prove nothing was saved; only the same request may be resent." })
            : NextResponse.json({ confirmed: false, state: "unavailable", requestId: rq, error: "Status unavailable or inconsistent (unconfirmed); try again" }, { status: 502 });
        }
        if (b.op === "durableGiftJobStatus") {
          const jid = String(b.jobId || ""); if (!exactBody(b, ["op", "client", "table", "jobId"]) || !/^[a-f0-9]{64}$/.test(jid)) return bad("bad jobId");
          const out = await postToEngage(fetch, process.env, { op: "giftJobStatus", client, jobId: jid }, "");
          return out.ok ? NextResponse.json(projectJobStatus(out.body, jid, client)) : bad("Status unavailable (unconfirmed); try again", 502);
        }
      } catch (e) { if (e instanceof DurableGiftError) return bad(e.message, e.status); if (e instanceof CsvError) return bad(e.message); return bad("Durable gift request failed", 500); }
      return bad("unknown op");
    }
    // Provisional JAG gift-ID preview (review only): local staging of the uploaded file, no upstream reads, no writes.
    if (typeof b.op === "string" && b.op.startsWith("gift")) {
      if (typeof b.client !== "string" || typeof b.table !== "string") return bad("client and table must be text");
      if (client !== GIFT_CLIENT || table !== GIFT_TABLE) return bad("Provisional gift preview is available only for JAG gift history");
      if (b.op === "giftContext") { if (!exactBody(b, ["op", "client", "table"])) return bad("bad giftContext body"); return NextResponse.json({ columns: giftColumns(), personCol: GIFT_PERSON_COL }); }
      const giftFile = () => {
        if (typeof b!.fileB64 !== "string" || b!.fileB64.length > Math.ceil(CSV_MAX_BYTES / 3) * 4 + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(b!.fileB64)) throw new GiftPreviewError("Choose a CSV file of 2 MB or smaller");
        const bytes = Buffer.from(b!.fileB64, "base64"); if (!bytes.length || bytes.length > CSV_MAX_BYTES) throw new GiftPreviewError("Choose a CSV file of 2 MB or smaller");
        let t: string; try { t = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new GiftPreviewError("File must be UTF-8 text"); }
        return { bytes, grid: parseCsv(t) };
      };
      try {
        if (b.op === "giftStage") {
          if (!exactBody(b, ["op", "client", "table", "fileB64", "mapping"])) return bad("bad giftStage body");
          const f = giftFile();
          return NextResponse.json(stageGift({ client, table, ...f, mapping: b.mapping, secret: process.env.RESEARCH_AUTH_SECRET, now: Date.now() }));
        }
        if (b.op === "giftExport") {
          if (!exactBody(b, ["op", "client", "table", "fileB64", "mapping", "decisions", "token", "fileName"])) return bad("bad giftExport body");
          const f = giftFile();
          return NextResponse.json(exportGift({ client, table, ...f, mapping: b.mapping, decisions: b.decisions, token: b.token, fileName: b.fileName, secret: process.env.RESEARCH_AUTH_SECRET, now: Date.now() }));
        }
      } catch (e) { if (e instanceof GiftPreviewError || e instanceof CsvError) return bad(e.message); return bad("Preview failed", 500); }
      return bad("unknown op");
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
    if (b.op === "mappingProfile") {
      // read-only, metadata only; context always resolved from CURRENT server config, never from the profile
      const ctx = profileContext(client, table);
      if (b.action === "build") return NextResponse.json({ profile: buildProfile(ctx, b.headers, b.mapping) });
      if (b.action === "check") return NextResponse.json(checkProfile(b.profile, ctx, b.headers));
      return bad("unknown action");
    }
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
    if (b.op === "allocReserve") {
      // WRITE (reserves CPTIDs): same gate as saving. Deterministic request id per (job, batch): re-sending the same batch
      // replays Engage's stored outcome; a changed batch is refused. Never generates new keys on an unconfirmed outcome.
      if (!sourceApplyConfigured()) return bad("Saving source data is turned off", 403);
      const ctx = allocCtxOrBad(client, table);
      const v = await verifyAllocChunk(nodeSha, b.manifest, b.jobId, b.batchIndex, b.rows, { client, table, registryRev: REGISTRY_META.rev, actor: String(b.actor ?? ""), ctx });
      validateHeadersAndMapping(v.manifest.headers, v.mapping); // same header/mapping rules as preview, BEFORE reserving
      const request = { client, jobId: b.jobId as string, requestId: v.reserveRequestId, batchIndex: v.index, rows: v.exts.map((e, j) => ({ externalKey: e, identityDigest: v.extDigests[j] })) };
      const out = await postToEngage(fetch, process.env, { op: "reserveIds", request }, v.reserveRequestId);
      if (out.ok) return NextResponse.json({ ...out.body, reserveRequestId: v.reserveRequestId });
      if (out.unconfirmed) return NextResponse.json({ unconfirmed: true, reserveRequestId: v.reserveRequestId, error: "Reservation not confirmed. Check status, or send the same batch again; never start a different file." }, { status: 202 });
      return NextResponse.json(out.body, { status: out.status });
    }
    if (b.op === "allocPreview") {
      // first load of ONE batch using the CPTIDs Engage stored for this batch's reservation (never browser-supplied IDs)
      if (!sourcePreviewConfigured()) return bad("Live source preview is not configured", 501);
      const ctx = allocCtxOrBad(client, table);
      const v = await verifyAllocChunk(nodeSha, b.manifest, b.jobId, b.batchIndex, b.rows, { client, table, registryRev: REGISTRY_META.rev, actor: String(b.actor ?? ""), ctx });
      const st = await postToEngage(fetch, process.env, { op: "reserveStatus", client, requestId: v.reserveRequestId }, v.reserveRequestId);
      if (!st.ok) return bad("Reservation status unavailable; try again", 502);
      const res = st.body as { found?: boolean; payloadHash?: unknown; result?: { rows?: { externalKey: unknown; cptid: unknown; status: unknown }[] } };
      if (res.found !== true || !Array.isArray(res.result?.rows)) return bad("This batch has no confirmed CPTID reservation yet; reserve it first (or check its status)", 409);
      // the stored reservation must be for EXACTLY this client/job/batch/source IDs/identity digests
      if (res.payloadHash !== await reservePayloadHash(nodeSha, client, b.jobId as string, v.index, v.exts, v.extDigests)) return bad("Stored reservation was made for a different payload; this batch cannot use it", 409);
      const rr = res.result!.rows!;
      if (rr.length !== v.exts.length || rr.some((r, j) => r.externalKey !== v.exts[j])) return bad("Stored reservation does not match this batch's source IDs", 409);
      const KH = "__reserved_cptid";
      if (v.manifest.headers.includes(KH)) return bad("Reserved column name collides with a file header");
      const extOf = new Map<number, { ext: string; extDigest: string }>(); const rows2: Record<string, string>[] = []; let extraHeld = 0;
      rr.forEach((r, j) => {
        const ok = (r.status === "reserved" || r.status === "reused") && Number.isSafeInteger(r.cptid) && (r.cptid as number) > 0 && (r.cptid as number) < 2147483648;
        if (!ok) { extraHeld++; return; }
        if (extOf.has(r.cptid as number)) throw new AllocError("Reservation returned one CPTID for two source IDs");
        extOf.set(r.cptid as number, { ext: v.exts[j], extDigest: v.extDigests[j] }); rows2.push({ ...v.rows[j], [KH]: String(r.cptid) });
      });
      if (!rows2.length) return NextResponse.json({ result: null, token: null, held: extraHeld, error: "Every row in this batch is held by the reservation check" });
      const ref = { jobId: b.jobId as string, batchIndex: v.index, batchCount: v.batchCount, batchRows: ctx.batchRows, totalRows: v.manifest.totalRows };
      return await livePreviewResponse(client, table, dests, [...v.manifest.headers, KH], rows2, { ...v.mapping, [KH]: ctx.keyCol }, v.manifest.fileName, v.manifest.fileDate, "", { ref, requestId: v.requestId, fileDigest: v.fileDigest }, { digest: ctx.allocatorDigest, identityConfigDigest: ctx.identityConfigDigest, extOf, extraHeld });
    }
    if (b.op === "apply") {
      if (!sourceApplyConfigured()) return bad("Saving source data is turned off", 403);
      verifySourceTokenPayloadForAlloc(b.token, client, (c) => { const x = allocCtx(c); return x ? { allocatorDigest: x.allocatorDigest, identityConfigDigest: x.identityConfigDigest } : null; });
      const body = applyRequestBody(b.token, b.actor, process.env.PORTAL_WRITE_SECRET);
      if (body.client !== client) return bad("Preview token is for another client", 400);
      const out = await postToEngage(fetch, process.env, body, String(body.request.requestId));
      if (out.ok) return NextResponse.json(out.body);
      if (out.unconfirmed) return NextResponse.json({ unconfirmed: true, requestId: out.requestId, error: "Save not confirmed. Check status before doing anything else." }, { status: 202 });
      return NextResponse.json(out.body, { status: out.status });
    }
    return bad("unknown op");
  } catch (e) {
    if (e instanceof SourceError || e instanceof CsvError || e instanceof JobError || e instanceof AllocError) return bad((e as Error).message);
    return bad("Preview failed", 500);
  }
}
