// Shared CPTID allocator: website side of the reserved first load for PREPARED NEW CLIENTS (DEFAULT OFF; registry EMPTY).
// Pure helpers used by the browser (manifest) and the route (verification). No CPTID is ever chosen in the browser.
// Flow: whole-file EXTERNAL-identity manifest (no CPTIDs) -> jobId = sha256(manifest) -> per batch: route verifies the
// chunk against the manifest + server identity config -> Engage reserveIds (namespace-first, ledgered) -> route reads
// the stored reservation outcome -> first-load preview with key=reserved CPTID and ext/extDigest proof per row -> signed
// token (bound to allocator + prepared digests) -> existing apply. Same jobId is used for reservation and first load.
import type { Sha } from "./source-jobs";

export interface AllocatorConfig {
  approvalId: string; approvalVersion: number; client: string; masterTable: string; sourceSystem: string; forbiddenFrom: number;
  /** server-owned identity config: prepared master column carrying the exact source ID, and the columns of the identity digest */
  externalKeyCol: string; identityCols: string[];
}
/** Reviewed server config. EMPTY until owner review. Must match Engage APPROVED_ALLOCATORS (digest checked under lock). */
export const APPROVED_ALLOCATORS: readonly AllocatorConfig[] = Object.freeze([]);
let override: readonly AllocatorConfig[] | null = null;
export const approvedAllocators = (): readonly AllocatorConfig[] => override ?? APPROVED_ALLOCATORS;
export function __setAllocatorsForTests(a: readonly AllocatorConfig[] | null) {
  if (process.env.SOURCE_PREPARED_TEST_HOOK !== "1") throw new Error("test hook disabled");
  override = a;
}
export class AllocError extends Error { constructor(m: string, readonly detail?: unknown) { super(m); } }
export const ALLOC_BATCH_MAX = 500;
const CTRL = /[\x00-\x1F\x7F]/;
const HEX64 = /^[a-f0-9]{64}$/;
/** exact external key: the cell as given; blank, padded, control characters or >200 chars => null (row cannot be reserved) */
export const canonExt = (cell: unknown) => typeof cell === "string" && cell.length > 0 && cell.length <= 200 && cell === cell.trim() && !CTRL.test(cell) ? cell : null;
export async function identityDigestOf(sha: Sha, cfg: Pick<AllocatorConfig, "sourceSystem" | "identityCols">, row: Record<string, string>, colToHeader: Record<string, string>) {
  return sha(JSON.stringify(["identity/v1", cfg.sourceSystem, cfg.identityCols.map((c) => [c, row[colToHeader[c]] ?? ""])]));
}
export const identityConfigDigest = (sha: Sha, cfg: AllocatorConfig) => sha(JSON.stringify(["identity-config/v1", cfg.approvalId, cfg.approvalVersion, cfg.sourceSystem, cfg.externalKeyCol, cfg.identityCols]));

export interface AllocManifest {
  v: 1; kind: "alloc-first-load"; client: string; table: string; mapping: [string, string][]; headers: string[];
  fileName: string; fileDate: string | null; actor: string; registryRev: string;
  allocatorDigest: string; preparedDigest: string; identityConfigDigest: string;
  totalRows: number; batchRows: number; batchHashes: string[]; exts: string[]; extDigests: string[];
}
export interface AllocContext { allocatorDigest: string; preparedDigest: string; identityConfigDigest: string; keyCol: string; externalKeyCol: string; identityCols: string[]; sourceSystem: string; batchRows: number; /** non-key prepared master columns (mapping targets) */ columns: string[]; masterTable: string; saveAvailable?: boolean }
const rowArray = (h: string[], r: Record<string, string>) => h.map((x) => r[x] ?? "");
const batchHash = (sha: Sha, h: string[], rows: Record<string, string>[]) => sha(JSON.stringify(rows.map((r) => rowArray(h, r))));
export const allocJobId = (sha: Sha, m: AllocManifest) => sha(JSON.stringify(m));
/** Must equal Engage reservePayloadHash (stored with the reservation; compared by allocPreview). */
export const reservePayloadHash = (sha: Sha, client: string, jobId: string, batchIndex: number, exts: string[], digests: string[]) => sha(JSON.stringify(["reserve/v1", client, jobId, batchIndex, exts.map((e, i) => [e, digests[i]])]));
export const allocReserveRequestId = async (sha: Sha, jobId: string, i: number) => (await sha(`${jobId}:reserve:${i}`)).slice(0, 32);
export const allocBatchRequestId = async (sha: Sha, jobId: string, i: number) => (await sha(`${jobId}:${i}`)).slice(0, 32);

function colHeaders(mapping: Record<string, string>, ctx: AllocContext, headers?: string[]) {
  const inv: Record<string, string> = {};
  for (const [h, c] of Object.entries(mapping)) {
    if (typeof c !== "string") throw new AllocError("Mapping values must be column names");
    if (headers && !headers.includes(h)) throw new AllocError(`Mapped header ${h} is not in the file`);
    if (c && c !== ctx.keyCol && !ctx.columns.includes(c)) throw new AllocError(`${c} is not a column of the reviewed destination`);
  }
  for (const [h, c] of Object.entries(mapping)) if (c) { if (inv[c]) throw new AllocError(`${c} is mapped twice`); inv[c] = h; }
  if (inv[ctx.keyCol]) throw new AllocError(`Do not map ${ctx.keyCol}: CPTIDs for a new client are assigned by the shared allocator`);
  if (!inv[ctx.externalKeyCol]) throw new AllocError(`Map the source ID column to ${ctx.externalKeyCol}`);
  for (const c of ctx.identityCols) if (!inv[c]) throw new AllocError(`Map a column to ${c} (part of the reviewed identity check)`);
  return inv;
}

/** Whole-file check BEFORE any reservation: every row has a valid exact external key, unique across the file. */
export async function buildAllocManifest(sha: Sha, p: { client: string; table: string; mapping: Record<string, string>; headers: string[]; rows: Record<string, string>[]; fileName: string; fileDate: string | null; actor: string; registryRev: string; ctx: AllocContext }) {
  const BR = p.ctx.batchRows;
  if (!Number.isSafeInteger(BR) || BR < 1 || BR > ALLOC_BATCH_MAX) throw new AllocError("Bad batch size");
  if (!p.rows.length) throw new AllocError("The file has no data rows");
  if (p.rows.length > 50_000) throw new AllocError("At most 50,000 rows per file");
  if (!p.actor.trim()) throw new AllocError("Enter your name (recorded as the shared-login author)");
  const hs = p.headers.map((h) => h.trim().toLowerCase());
  if (!p.headers.length || hs.some((h) => !h) || new Set(hs).size !== hs.length) throw new AllocError("Every column needs a unique header");
  const hset = JSON.stringify([...p.headers].sort());
  if (p.rows.some((r) => JSON.stringify(Object.keys(r).sort()) !== hset || !Object.values(r).every((v) => typeof v === "string"))) throw new AllocError("Every row must have exactly the file's columns");
  const inv = colHeaders(p.mapping, p.ctx, p.headers);
  const eh = inv[p.ctx.externalKeyCol];
  const exts: string[] = []; const bad: number[] = []; const seen = new Set<string>(); const dup = new Set<string>();
  p.rows.forEach((r, i) => { const e = canonExt(r[eh]); if (e === null) bad.push(i + 2); else { if (seen.has(e)) dup.add(e); seen.add(e); } exts.push(e ?? ""); });
  if (bad.length) throw new AllocError(`${bad.length} row(s) have a blank, padded or invalid source ID; nothing will be reserved`, { lines: bad.slice(0, 50) });
  if (dup.size) throw new AllocError(`${dup.size} source ID(s) appear more than once in the file; nothing will be reserved`, { duplicates: [...dup].slice(0, 50) });
  const extDigests: string[] = [];
  for (const r of p.rows) extDigests.push(await identityDigestOf(sha, p.ctx, r, inv));
  const batchHashes: string[] = [];
  for (let i = 0; i < p.rows.length; i += BR) batchHashes.push(await batchHash(sha, p.headers, p.rows.slice(i, i + BR)));
  const m: AllocManifest = { v: 1, kind: "alloc-first-load", client: p.client, table: p.table, mapping: Object.entries(p.mapping).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)), headers: p.headers,
    fileName: p.fileName, fileDate: p.fileDate, actor: p.actor.trim(), registryRev: p.registryRev, allocatorDigest: p.ctx.allocatorDigest, preparedDigest: p.ctx.preparedDigest, identityConfigDigest: p.ctx.identityConfigDigest,
    totalRows: p.rows.length, batchRows: BR, batchHashes, exts, extDigests };
  if (JSON.stringify(m).length > 3_000_000) throw new AllocError("File manifest too large; split the file");
  return { manifest: m, jobId: await allocJobId(sha, m) };
}

const isStr = (x: unknown): x is string => typeof x === "string";
/** Server side: everything re-derived from the SERVER identity config; any mismatch refuses before Engage is called. */
export async function verifyAllocChunk(sha: Sha, raw: unknown, jobId: unknown, index: unknown, rows: unknown, expect: { client: string; table: string; registryRev: string; actor: string; ctx: AllocContext }) {
  const m = raw as AllocManifest;
  if (!m || typeof m !== "object" || m.v !== 1 || m.kind !== "alloc-first-load" || !Array.isArray(m.headers) || !m.headers.every(isStr) || !Array.isArray(m.mapping) || !m.mapping.every((e) => Array.isArray(e) && e.length === 2 && isStr(e[0]) && isStr(e[1]))
    || !Array.isArray(m.batchHashes) || !m.batchHashes.every(isStr) || !Array.isArray(m.exts) || !m.exts.every(isStr) || !Array.isArray(m.extDigests) || !m.extDigests.every((d) => isStr(d) && HEX64.test(d))) throw new AllocError("Malformed reservation manifest");
  if (m.client !== expect.client || m.table !== expect.table) throw new AllocError("Job is for another client or table");
  if (m.registryRev !== expect.registryRev) throw new AllocError("Field registry changed since this job started; start again");
  if (m.allocatorDigest !== expect.ctx.allocatorDigest || m.preparedDigest !== expect.ctx.preparedDigest || m.identityConfigDigest !== expect.ctx.identityConfigDigest) throw new AllocError("The reviewed allocator, registration or identity configuration changed; start again");
  if (typeof expect.actor !== "string" || m.actor !== expect.actor.trim()) throw new AllocError("Job was started under another author name");
  if (m.batchRows !== expect.ctx.batchRows || !Number.isSafeInteger(m.totalRows) || m.totalRows < 1 || m.totalRows > 50_000 || m.exts.length !== m.totalRows || m.extDigests.length !== m.totalRows || m.batchHashes.length !== Math.ceil(m.totalRows / m.batchRows)) throw new AllocError("Manifest sizes are inconsistent");
  if (new Set(m.headers).size !== m.headers.length) throw new AllocError("Duplicate headers in manifest");
  if (!m.exts.every((e) => canonExt(e) === e) || new Set(m.exts).size !== m.exts.length) throw new AllocError("Source IDs must be valid and unique across the whole file");
  if ((await allocJobId(sha, m)) !== jobId) throw new AllocError("Job identity does not match its manifest (file changed?)");
  if (!Number.isSafeInteger(index) || (index as number) < 0 || (index as number) >= m.batchHashes.length) throw new AllocError("Bad batch number");
  const i = index as number;
  if (!Array.isArray(rows) || !rows.every((r) => r && typeof r === "object" && !Array.isArray(r) && Object.values(r).every(isStr))) throw new AllocError("Batch rows malformed");
  const rs = rows as Record<string, string>[];
  const hs = m.headers.map((h) => h.trim().toLowerCase());
  if (!m.headers.length || hs.some((h) => !h) || new Set(hs).size !== hs.length) throw new AllocError("Every column needs a unique header");
  const hset = JSON.stringify([...m.headers].sort());
  if (rs.some((r) => JSON.stringify(Object.keys(r).sort()) !== hset)) throw new AllocError("Batch rows must have exactly the file's columns");
  colHeaders(Object.fromEntries(m.mapping) as Record<string, string>, expect.ctx, m.headers);
  const want = Math.min(m.batchRows, m.totalRows - i * m.batchRows);
  if (rs.length !== want) throw new AllocError(`Batch ${i + 1} must have ${want} rows`);
  if ((await batchHash(sha, m.headers, rs)) !== m.batchHashes[i]) throw new AllocError(`Batch ${i + 1} content differs from the file this job was started with`);
  const mapping = Object.fromEntries(m.mapping) as Record<string, string>;
  const inv = colHeaders(mapping, expect.ctx, m.headers);
  const off = i * m.batchRows;
  for (let j = 0; j < rs.length; j++) {
    if (canonExt(rs[j][inv[expect.ctx.externalKeyCol]]) !== m.exts[off + j]) throw new AllocError(`Batch ${i + 1} source IDs differ from the file's ID list`);
    if ((await identityDigestOf(sha, expect.ctx, rs[j], inv)) !== m.extDigests[off + j]) throw new AllocError(`Batch ${i + 1} identity values differ from the manifest`);
  }
  return { manifest: m, mapping, index: i, rows: rs, exts: m.exts.slice(off, off + rs.length), extDigests: m.extDigests.slice(off, off + rs.length),
    reserveRequestId: await allocReserveRequestId(sha, jobId as string, i), requestId: await allocBatchRequestId(sha, jobId as string, i), fileDigest: await sha(m.batchHashes.join(",")), batchCount: m.batchHashes.length };
}
