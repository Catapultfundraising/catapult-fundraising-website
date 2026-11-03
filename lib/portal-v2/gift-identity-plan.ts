// VERBATIM COPY of the pure planner/manifest/outcome contract from Engage lib/giftIdentity.ts (backend 67b6c0d).
// Parity is pinned by scripts/fixtures/gift-identity-golden.json (identical jobId/hashes/slices on both sides).
// Only the imports below differ. No SQL, no network.
import { createHash } from "node:crypto";
export class SourceImportError extends Error { constructor(public status: number, public code: string, message: string, public detail?: unknown) { super(message); } }
const HEX32 = /^[a-f0-9]{32}$/, HEX64 = /^[a-f0-9]{64}$/, IDENT = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const SOURCE_MAX_OPS = 500, SOURCE_MAX_WRITE_STATEMENTS = 900;
export const jobRequestId = (jobId: string, i: number) => createHash("sha256").update(`${jobId}:${i}`, "utf8").digest("hex").slice(0, 32);
void HEX32; void IDENT; void CTRL;
type Col = { col: string; ty: string; len: number | null; p: number | null; s: number | null };

/** Server-owned reviewed registration. EMPTY until owner review; there is no env or request-supplied registration. */
export interface GiftRegistration {
  id: string; version: number; client: string; scope: string;
  schema: string; table: string;
  /** physical row locator column (int); never identity */ locator: string;
  /** immutable donor column (int CPTID); never writable */ person: string;
  /** native transaction column that new rows leave NULL and nothing writes */ native: string | null;
  columns: Col[]; required: string[];
  master: { schema: string; table: string; col: string };
  /** V1 preflight result: locator verified unique/not-null and no IDENTITY/default conflict. false => no new rows. */
  locatorVerifiedUnique: boolean;
  rowAllocator: { kind: "locked-max"; min: number; max: number } | null;
}
export const APPROVED_GIFT_REGISTRATIONS: readonly GiftRegistration[] = Object.freeze([]);
export function giftRegDigest(g: GiftRegistration) {
  const cols = [...g.columns].sort((a, b) => (a.col < b.col ? -1 : 1)).map((c) => [c.col, c.ty, c.len, c.p, c.s]);
  return createHash("sha256").update(JSON.stringify(["gift-reg/v1", g.id, g.version, g.client, g.scope, g.schema, g.table, g.locator, g.person, g.native, cols, [...g.required].sort(), g.master, g.locatorVerifiedUnique, g.rowAllocator])).digest("hex");
}

export type GiftAction = "new" | "adopt" | "correct";
export interface GiftRow { ordinal: number; action: GiftAction; giftId?: string; locator?: number; person: number; values: Record<string, string>; expected: Record<string, string | null> | null }
export interface ManifestEntry { o: number; a: GiftAction; t: string | null; l: number | null; p: number; h: string }
export interface GiftJobManifest { v: 1; client: string; registrationId: string; registrationVersion: number; registrationDigest: string; fileDigest: string; fileName: string; fileDate: string | null; actor: string; totalOrdinals: number; batchRows: number; batchCount: number; decided: ManifestEntry[]; held: number[]; batches: { first: number; last: number; hash: string }[] }
export interface GiftJobRef { expectedJobId: string; batchIndex: number; manifest: GiftJobManifest }
export interface GiftCommitRequest { job?: GiftJobRef; requestId: string; client: string; registrationId: string; registrationVersion: number; registrationDigest: string; actor: string; fileName: string; fileDigest: string; fileDate: string | null; rows: GiftRow[] }

export const GIFT_MODE = "gift-identity";
export const GIFT_MAX_COLS = 64;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** fixed read statements per commit (request lock, assoc, identity x2, raw, baseline, master, overlays, prospects, max, post-check, slack) */
/** read slots per commit: request, job, manifest, assoc, ids x2, raw, baseline, master, overrides, overlays, prospects, max, post-count + 2 spare */
export const GIFT_FIXED_READS = 16;
/** worst-case fixed writes: requests, ledger, import_job, gift_job_manifest, import_job_batch, import_log */
export const GIFT_FIXED_WRITES = 6;
/** exact UTF-8 bytes of the whole serialized commit envelope ({op,request}); below the route's 4,000,000-byte body cap */
export const GIFT_MAX_ENVELOPE_BYTES = 3_900_000;
export const GIFT_MAX_MANIFEST_BYTES = 1_500_000;
export const GIFT_JOB_MAX_BATCHES = 100, GIFT_JOB_MAX_ORDINALS = 5000;
/** worst-case write statements for one row; C = registration column count */
export const giftRowCost = (action: GiftAction, cols: number) => (action === "new" ? 4 + 2 * cols : action === "adopt" ? 3 : 3 + 2 * cols);
export const giftBatchCost = (rows: { action: GiftAction }[], cols: number) => GIFT_FIXED_READS + GIFT_FIXED_WRITES + rows.reduce((a, r) => a + giftRowCost(r.action, cols), 0);
/** max rows per call when every row is worst case (new/correct of all columns) */
export const giftMaxRows = (cols: number) => Math.max(0, Math.min(SOURCE_MAX_OPS, Math.floor((SOURCE_MAX_WRITE_STATEMENTS - GIFT_FIXED_READS - GIFT_FIXED_WRITES) / giftRowCost("new", cols))));

const bad = (m: string, d?: unknown) => new SourceImportError(400, "invalid", m, d);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exactKeys = (o: Record<string, unknown>, req: string[], opt: string[] = []) => Object.keys(o).every((k) => req.includes(k) || opt.includes(k)) && req.every((k) => k in o);
const posInt = (v: unknown, max = 2147483647): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v <= max;
const txt = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max && v === v.trim() && !CTRL.test(v);
const realDate = (v: string) => { const [y, m, d] = v.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
const canon = (x: unknown): unknown => Array.isArray(x) ? x.map(canon) : isObj(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x;
/** Server-computed hash of the exact request values (never caller-supplied). */
export const giftPayloadHash = (r: GiftCommitRequest) => createHash("sha256").update(JSON.stringify(canon(r)), "utf8").digest("hex");
/** Strict returned/registered gift ID: canonical lowercase v4 UUID. PROV-... preview labels and anything else refused. */
export const validGiftId = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
/** DB uniqueidentifier text (SQL Server CONVERT returns UPPERCASE): strict case-insensitive UUID shape, then lowercase. */
export const dbGiftId = (v: unknown): string | null => (typeof v === "string" && UUID_RE.test(v.toLowerCase()) ? v.toLowerCase() : null);
const same = (a: string | null, b: string | null) => (a === null || b === null ? a === b : Buffer.from(a, "utf8").equals(Buffer.from(b, "utf8")));
export const giftRowHash = (w: GiftRow) => createHash("sha256").update(JSON.stringify(canon(w)), "utf8").digest("hex");
const sliceHash = (hs: string[]) => createHash("sha256").update(JSON.stringify(hs), "utf8").digest("hex");
export const giftJobId = (m: GiftJobManifest) => createHash("sha256").update(JSON.stringify(canon(m)), "utf8").digest("hex");
export const canonManifestJson = (m: GiftJobManifest) => JSON.stringify(canon(m));
export const giftEnvelopeBytes = (r: GiftCommitRequest) => Buffer.byteLength(JSON.stringify({ op: "giftCommit", request: r }), "utf8");
const entryOf = (w: GiftRow): ManifestEntry => ({ o: w.ordinal, a: w.action, t: w.giftId ?? null, l: w.locator ?? null, p: w.person, h: giftRowHash(w) });

type Base = Omit<GiftCommitRequest, "rows" | "requestId" | "job">;
/** Build a manifest from decided rows (ascending ordinal) and held ordinals, slicing contiguously by BOTH the work budget
 *  (batchRows) and the exact envelope byte budget. Throws 413 if a single row cannot fit. Shared by tests/website. */
export function planGiftJob(base: Base, decided: GiftRow[], held: number[], totalOrdinals: number, cols: number): { manifest: GiftJobManifest; jobId: string; requests: GiftCommitRequest[] } {
  const batchRows = giftMaxRows(cols); if (batchRows < 1) throw new SourceImportError(413, "over-budget", "registration too wide for one row per batch");
  if (!decided.length) throw bad("all rows are held: nothing to submit (an all-held file stays preview-only)");
  const rows = [...decided].sort((a, b) => a.ordinal - b.ordinal);
  const mk = (slices: [number, number][]): GiftJobManifest => ({ v: 1, client: base.client, registrationId: base.registrationId, registrationVersion: base.registrationVersion, registrationDigest: base.registrationDigest, fileDigest: base.fileDigest, fileName: base.fileName, fileDate: base.fileDate, actor: base.actor, totalOrdinals, batchRows, batchCount: slices.length, decided: rows.map(entryOf), held: [...held].sort((a, b) => a - b), batches: slices.map(([f, l]) => ({ first: f, last: l, hash: sliceHash(rows.slice(f, l + 1).map(giftRowHash)) })) });
  // manifest size grows with batch count; reserve for the worst case (one batch per row) when slicing by bytes
  const worst = Buffer.byteLength(canonManifestJson(mk(rows.map((_, i) => [i, i] as [number, number]))), "utf8");
  if (worst > GIFT_MAX_MANIFEST_BYTES) throw new SourceImportError(413, "manifest-too-large", "file manifest exceeds 1.5 MB; split the file");
  const room = GIFT_MAX_ENVELOPE_BYTES - worst - 2048;
  const slices: [number, number][] = []; let f = 0, bytes = 0;
  for (let i = 0; i < rows.length; i++) {
    const b = Buffer.byteLength(JSON.stringify(rows[i]), "utf8") + 1;
    if (b > room) throw new SourceImportError(413, "row-too-large", "one row exceeds the request byte budget", rows[i].ordinal);
    if (i > f && (i - f >= batchRows || bytes + b > room)) { slices.push([f, i - 1]); f = i; bytes = 0; }
    bytes += b;
  }
  if (rows.length) slices.push([f, rows.length - 1]);
  const manifest = mk(slices); validateManifest(manifest); const jobId = giftJobId(manifest);
  const requests = slices.map(([a, b], i) => ({ ...base, requestId: jobRequestId(jobId, i), rows: rows.slice(a, b + 1), job: { expectedJobId: jobId, batchIndex: i, manifest } }));
  return { manifest, jobId, requests };
}

/** Pure structural manifest checks + actual-row binding (before the DB). Returns the recomputed jobId. */
/** Full structural/coverage/uniqueness/hash validation of a manifest (pure). Typed 400/413. */
export function validateManifest(m: GiftJobManifest): void {
  if (!isObj(m) || !exactKeys(m as unknown as Record<string, unknown>, ["v", "client", "registrationId", "registrationVersion", "registrationDigest", "fileDigest", "fileName", "fileDate", "actor", "totalOrdinals", "batchRows", "batchCount", "decided", "held", "batches"]) || m.v !== 1) throw bad("bad manifest shape");
  if (Buffer.byteLength(canonManifestJson(m), "utf8") > GIFT_MAX_MANIFEST_BYTES) throw new SourceImportError(413, "manifest-too-large", "manifest exceeds 1.5 MB");
  if (!posInt(m.totalOrdinals, GIFT_JOB_MAX_ORDINALS) || !posInt(m.batchRows, SOURCE_MAX_OPS) || m.totalOrdinals > GIFT_JOB_MAX_BATCHES * m.batchRows) throw bad("file exceeds job limits (min(100 x batchRows, 5000) ordinals)");
  if (!Array.isArray(m.decided) || !Array.isArray(m.held) || !Array.isArray(m.batches) || !m.decided.length) throw bad("manifest needs at least one decided row (all-held files are not submittable)");
  const seen = new Set<number>(), ts = new Set<string>(), ls = new Set<number>(); let prev = -1;
  for (const e of m.decided as unknown[]) {
    if (!isObj(e) || !exactKeys(e, ["o", "a", "t", "l", "p", "h"])) throw bad("bad manifest entry");
    const x = e as unknown as ManifestEntry;
    if (!(Number.isSafeInteger(x.o) && x.o > prev && x.o < m.totalOrdinals) || typeof x.h !== "string" || !HEX64.test(x.h) || !posInt(x.p)) throw bad("manifest entry ordinal/hash/person invalid", x.o);
    prev = x.o; seen.add(x.o);
    if (x.a === "new") { if (x.t !== null || x.l !== null) throw bad("new entry carries target", x.o); }
    else if (x.a === "adopt") { if (x.t !== null || !posInt(x.l) || ls.has(x.l)) throw bad("adopt locator invalid/duplicate across file", x.o); ls.add(x.l); }
    else if (x.a === "correct") { if (x.l !== null || !validGiftId(x.t) || ts.has(x.t)) throw bad("correct target invalid/duplicate across file", x.o); ts.add(x.t); }
    else throw bad("bad manifest action", x.o);
  }
  let hp = -1;
  for (const o of m.held as unknown[]) { if (typeof o !== "number" || !Number.isSafeInteger(o) || o <= hp || o >= m.totalOrdinals || seen.has(o)) throw bad("held ordinals invalid/overlapping", o); hp = o; seen.add(o); }
  if (seen.size !== m.totalOrdinals) throw bad("manifest must cover every file ordinal exactly once");
  if (m.batchCount !== m.batches.length || m.batchCount < 1 || m.batchCount > GIFT_JOB_MAX_BATCHES) throw bad("bad batch count");
  let nf = 0;
  for (const b of m.batches as unknown[]) {
    if (!isObj(b) || !exactKeys(b, ["first", "last", "hash"])) throw bad("bad batch entry");
    const x = b as unknown as { first: number; last: number; hash: string };
    if (x.first !== nf || !Number.isSafeInteger(x.last) || x.last < x.first || x.last - x.first + 1 > m.batchRows || typeof x.hash !== "string" || !HEX64.test(x.hash)) throw bad("batches must partition decided rows contiguously within batchRows");
    if (sliceHash(m.decided.slice(x.first, x.last + 1).map((e) => e.h)) !== x.hash) throw bad("batch hash does not match its declared rows");
    nf = x.last + 1;
  }
  if (nf !== m.decided.length) throw bad("batches must cover all decided rows");
}

export function verifyGiftJob(r: GiftCommitRequest): string {
  const j = r.job!;
  if (!isObj(j) || !exactKeys(j as unknown as Record<string, unknown>, ["expectedJobId", "batchIndex", "manifest"]) || typeof j.expectedJobId !== "string" || !HEX64.test(j.expectedJobId)) throw bad("bad job envelope");
  const m = j.manifest;
  validateManifest(m);
  for (const k of ["client", "registrationId", "registrationVersion", "registrationDigest", "fileDigest", "fileName", "fileDate", "actor"] as const) if (m[k] !== r[k]) throw bad(`manifest ${k} differs from request`);
  const jobId = giftJobId(m);
  if (jobId !== j.expectedJobId) throw new SourceImportError(409, "job-changed", "manifest differs from the expected job; this is a different job, not a resume");
  if (!Number.isSafeInteger(j.batchIndex) || j.batchIndex < 0 || j.batchIndex >= m.batchCount) throw bad("bad batch index");
  if (r.requestId !== jobRequestId(jobId, j.batchIndex)) throw bad("requestId must be derived from jobId and batch index");
  const sl = m.batches[j.batchIndex], want = m.decided.slice(sl.first, sl.last + 1);
  if (want.length !== r.rows.length) throw bad("batch rows differ from the manifest slice");
  r.rows.forEach((w, i) => { const e = entryOf(w), d = want[i]; if (e.o !== d.o || e.a !== d.a || e.t !== d.t || e.l !== d.l || e.p !== d.p || e.h !== d.h) throw bad("actual row does not match its declared manifest entry", w.ordinal); });
  return jobId;
}

/** Strict stored-outcome validation, bound to request/client/registration (and to the request rows on replay). */
/** Expected per-row target for a stored outcome: ordinal + action + correction UUID / adopt locator. */
export type OutcomeTarget = { o: number; a: GiftAction; t: string | null; l: number | null };
export function validOutcome(o: unknown, want: { requestId: string; client: string; registrationId: string; rows?: GiftRow[]; targets?: OutcomeTarget[] }): o is GiftOutcome {
  if (!isObj(o) || o.committed !== true || o.requestId !== want.requestId || o.client !== want.client || o.registrationId !== want.registrationId || !Array.isArray(o.rows) || o.rows.length < 1 || o.rows.length > SOURCE_MAX_OPS || !isObj(o.counts)) return false;
  const c = { new: 0, adopt: 0, correct: 0 } as Record<GiftAction, number>; const seen = new Set<number>(), ids = new Set<string>();
  for (const x of o.rows as unknown[]) {
    if (!isObj(x) || !(Number.isSafeInteger(x.ordinal) && (x.ordinal as number) >= 0 && (x.ordinal as number) <= 1_000_000) || seen.has(x.ordinal as number) || !["new", "adopt", "correct"].includes(x.action as string) || !validGiftId(x.giftId) || ids.has(x.giftId) || !posInt(x.locator)) return false;
    seen.add(x.ordinal as number); ids.add(x.giftId); c[x.action as GiftAction]++;
  }
  const k = o.counts as Record<string, unknown>;
  if (k.new !== c.new || k.adopt !== c.adopt || k.correct !== c.correct) return false;
  if (want.rows) { const m = new Map((o.rows as GiftOutcome["rows"]).map((x) => [x.ordinal, x]));
    if (m.size !== want.rows.length) return false;
    for (const w of want.rows) { const x = m.get(w.ordinal); if (!x || x.action !== w.action || (w.action === "correct" && x.giftId !== w.giftId) || (w.action === "adopt" && x.locator !== w.locator)) return false; } }
  if (want.targets) { const m = new Map((o.rows as GiftOutcome["rows"]).map((x) => [x.ordinal, x]));
    if (m.size !== want.targets.length) return false;
    for (const e of want.targets) { const x = m.get(e.o); if (!x || x.action !== e.a || (e.a === "correct" && x.giftId !== e.t) || (e.a === "adopt" && x.locator !== e.l)) return false; } }
  return true;
}

export interface GiftOutcome { requestId: string; client: string; registrationId: string; rows: { ordinal: number; action: GiftAction; giftId: string; locator: number }[]; counts: { new: number; adopt: number; correct: number }; committed: true; replayed?: boolean }
void realDate; void txt; void same;
/** Same formula as Engage giftPreviewState (rows per preview call for C registered columns). */
export const previewRowCap = (cols: number) => Math.max(1, Math.min(50, Math.floor(3_000_000 / (cols * 12_000 + 2_000))));
