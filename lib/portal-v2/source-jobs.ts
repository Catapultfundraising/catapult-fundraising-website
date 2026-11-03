// Large-file source import jobs (REVIEW-ONLY; same gates as source-import-apply.ts).
// The browser parses the whole CSV locally and builds a manifest that binds the ordered content (per-batch hashes),
// every row key (cross-batch duplicate detection), mapping, registry revision, source date and actor.
// jobId = sha256(manifest). Each 500-row batch is then uploaded as its own bounded request (well under the
// platform request-body limit), previewed against current state, and saved with requestId = sha256(jobId:index)[0:32].
import { parseKeyOf, type Key, type KeyKind } from "./source-keys";
// Pure module: runs in the browser (WebCrypto) and on the server (node:crypto) with an injected hash.

export type Sha = (s: string) => Promise<string>;
export const JOB_BATCH_ROWS = 500;
export const JOB_MAX_ROWS = 50_000;
export const JOB_CHUNK_MAX_BYTES = 3_500_000; // per request; deployed functions accept ~4.5 MB bodies
export const JOB_MANIFEST_MAX_BYTES = 1_000_000;

export class JobError extends Error { constructor(m: string, readonly detail?: unknown) { super(m); } }

export interface JobManifest {
  v: 1; client: string; table: string; mapping: [string, string][]; headers: string[];
  fileName: string; fileDate: string | null; actor: string; registryRev: string;
  totalRows: number; batchRows: number; batchHashes: string[]; keys: (Key | null)[]; keyKind: KeyKind;
}
const rowArray = (headers: string[], r: Record<string, string>) => headers.map((h) => r[h] ?? "");
export const batchCount = (m: Pick<JobManifest, "totalRows" | "batchRows">) => Math.ceil(m.totalRows / m.batchRows);
export async function batchHash(sha: Sha, headers: string[], rows: Record<string, string>[]) { return sha(JSON.stringify(rows.map((r) => rowArray(headers, r)))); }
export async function jobIdOf(sha: Sha, m: JobManifest) { return sha(JSON.stringify(m)); }
export async function contentDigest(sha: Sha, m: JobManifest) { return sha(m.batchHashes.join(",")); }
export async function batchRequestId(sha: Sha, jobId: string, index: number) { return (await sha(`${jobId}:${index}`)).slice(0, 32); }

/** Whole-file checks before any upload: row cap, mapped key, every key valid and unique ACROSS the file. */
export async function buildJobManifest(sha: Sha, p: { client: string; table: string; keyCol: string; keyKind?: KeyKind; mapping: Record<string, string>; headers: string[]; rows: Record<string, string>[]; fileName: string; fileDate: string | null; actor: string; registryRev: string }) {
  if (!p.rows.length) throw new JobError("The file has no data rows");
  if (p.rows.length > JOB_MAX_ROWS) throw new JobError(`At most ${JOB_MAX_ROWS.toLocaleString()} rows per file`);
  const kh = Object.keys(p.mapping).find((h) => p.mapping[h] === p.keyCol);
  if (!kh) throw new JobError(`Map a column to the key ${p.keyCol}`);
  const kk: KeyKind = p.keyKind ?? "int";
  const keys = p.rows.map((r) => parseKeyOf(kk, r[kh]));
  const seen = new Map<Key, number>(); const dup = new Set<Key>();
  keys.forEach((k) => { if (k !== null) { if (seen.has(k)) dup.add(k); seen.set(k, (seen.get(k) ?? 0) + 1); } });
  if (dup.size) throw new JobError(`${dup.size} ID${dup.size === 1 ? "" : "s"} appear more than once in the file; nothing will be uploaded until the file has one row per ID`, { duplicateKeys: [...dup].slice(0, 50) });
  const batchHashes: string[] = [];
  for (let i = 0; i < p.rows.length; i += JOB_BATCH_ROWS) batchHashes.push(await batchHash(sha, p.headers, p.rows.slice(i, i + JOB_BATCH_ROWS)));
  const m: JobManifest = { v: 1, client: p.client, table: p.table, mapping: Object.entries(p.mapping).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)), headers: p.headers, fileName: p.fileName, fileDate: p.fileDate, actor: p.actor.trim(), registryRev: p.registryRev, keyKind: kk, totalRows: p.rows.length, batchRows: JOB_BATCH_ROWS, batchHashes, keys };
  if (JSON.stringify(m).length > JOB_MANIFEST_MAX_BYTES) throw new JobError("File manifest too large; split the file");
  return { manifest: m, jobId: await jobIdOf(sha, m), invalidKeyRows: keys.filter((k) => k === null).length };
}

const isStr = (x: unknown): x is string => typeof x === "string";
/** Server-side: re-derive jobId from the supplied manifest, re-check whole-file key uniqueness, and verify this
 *  chunk is exactly batch `index` of the bound content. Rejects anything changed (a resumed file must be identical). */
export async function verifyJobChunk(sha: Sha, raw: unknown, jobId: unknown, index: unknown, rows: unknown, expect: { client: string; table: string; registryRev: string; actor: string; keyCol: string; keyKind?: KeyKind }) {
  const m = raw as JobManifest;
  if (!m || typeof m !== "object" || m.v !== 1 || !Array.isArray(m.headers) || !m.headers.every(isStr) || !Array.isArray(m.mapping) || !m.mapping.every((e) => Array.isArray(e) && e.length === 2 && isStr(e[0]) && isStr(e[1])) || !Array.isArray(m.batchHashes) || !Array.isArray(m.keys)) throw new JobError("Malformed job manifest");
  if (JSON.stringify(m).length > JOB_MANIFEST_MAX_BYTES) throw new JobError("Job manifest too large");
  if (m.client !== expect.client || m.table !== expect.table) throw new JobError("Job is for another client or table");
  if (m.registryRev !== expect.registryRev) throw new JobError("Field registry changed since this job started; start the upload again");
  if (m.actor !== expect.actor.trim()) throw new JobError("Job was started under another author name");
  if (m.batchRows !== JOB_BATCH_ROWS || !Number.isSafeInteger(m.totalRows) || m.totalRows < 1 || m.totalRows > JOB_MAX_ROWS || m.keys.length !== m.totalRows || m.batchHashes.length !== batchCount(m)) throw new JobError("Job manifest sizes are inconsistent");
  if (new Set(m.headers).size !== m.headers.length) throw new JobError("Duplicate headers in job manifest");
  if (m.keyKind !== (expect.keyKind ?? "int")) throw new JobError("Job key type does not match this table");
  const ks = m.keys.filter((k) => k !== null);
  if (!m.keys.every((k) => k === null || parseKeyOf(m.keyKind, String(k)) === k) || new Set(ks).size !== ks.length) throw new JobError("Job keys must be unique across the whole file");
  if ((await jobIdOf(sha, m)) !== jobId) throw new JobError("Job identity does not match its manifest (file changed?)");
  if (!Number.isSafeInteger(index) || (index as number) < 0 || (index as number) >= m.batchHashes.length) throw new JobError("Bad batch number");
  const i = index as number;
  if (!Array.isArray(rows) || !rows.every((r) => r && typeof r === "object" && !Array.isArray(r) && Object.values(r).every(isStr))) throw new JobError("Batch rows malformed");
  const rs = rows as Record<string, string>[];
  const want = Math.min(JOB_BATCH_ROWS, m.totalRows - i * JOB_BATCH_ROWS);
  if (rs.length !== want) throw new JobError(`Batch ${i + 1} must have ${want} rows`);
  if ((await batchHash(sha, m.headers, rs)) !== m.batchHashes[i]) throw new JobError(`Batch ${i + 1} content differs from the file this job was started with`);
  const mapping = Object.fromEntries(m.mapping) as Record<string, string>;
  // the ACTUAL keys in this chunk must equal the manifest's ordered key slice (a forged unique manifest cannot hide duplicates)
  const kh = Object.keys(mapping).find((h) => mapping[h] === expect.keyCol);
  if (!kh || !m.headers.includes(kh)) throw new JobError(`Map a column to the key ${expect.keyCol}`);
  const slice = m.keys.slice(i * JOB_BATCH_ROWS, i * JOB_BATCH_ROWS + rs.length);
  if (rs.some((r, j) => parseKeyOf(m.keyKind, r[kh]) !== slice[j])) throw new JobError(`Batch ${i + 1} keys differ from the file's key list`);
  return { manifest: m, mapping, index: i, rows: rs, requestId: await batchRequestId(sha, jobId as string, i), fileDigest: await contentDigest(sha, m), batchCount: m.batchHashes.length };
}

export type BatchState = "pending" | "previewed" | "verified_unchanged" | "saved" | "saved_with_holds" | "held_only" | "unconfirmed" | "failed";
export interface BatchStatus { index: number; state: BatchState; savedRecords?: number; heldRows?: number; error?: string }
/** Whole-file status. "complete" ONLY when every batch saved and nothing was held; partial commits never imply completeness. */
export function summarizeJob(batchTotal: number, statuses: BatchStatus[]) {
  const by = new Map(statuses.map((s) => [s.index, s]));
  const all = Array.from({ length: batchTotal }, (_, i) => by.get(i) ?? { index: i, state: "pending" as const });
  const c = (st: BatchState[]) => all.filter((s) => st.includes(s.state)).length;
  const saved = c(["saved", "saved_with_holds"]), heldRows = all.reduce((n, s) => n + (s.heldRows ?? 0), 0);
  const unconfirmed = c(["unconfirmed"]), failed = c(["failed"]), pending = c(["pending", "previewed"]);
  const savedRecords = all.reduce((n, s) => n + (s.savedRecords ?? 0), 0);
  const same = c(["verified_unchanged"]);
  // verified_unchanged = checked at preview with nothing to change and nothing held; not stored by Engage (re-checked on resume)
  const state = unconfirmed ? "unconfirmed" : saved + same === batchTotal && saved > 0 && heldRows === 0 ? "complete" : saved + same === batchTotal && heldRows === 0 ? "no_changes" : pending || failed ? "partial" : "done_with_holds";
  const label = state === "complete" ? `All ${batchTotal} batches saved or already up to date${same ? ` (${same} had nothing to change at preview)` : ""}; no rows or fields held.`
    : state === "no_changes" ? "Nothing in this file differs from current data (checked at preview); nothing saved."
    : state === "unconfirmed" ? `${unconfirmed} batch${unconfirmed === 1 ? "" : "es"} not confirmed. Check status before doing anything else. This file is NOT fully applied.`
    : `${saved} of ${batchTotal} batches saved (${savedRecords} records); ${heldRows} rows held or partly held${same ? `; ${same} had nothing to change` : ""}${failed ? `; ${failed} failed` : ""}${pending ? `; ${pending} not yet saved` : ""}. This file is NOT fully applied.`;
  return { state, saved, same, pending, failed, unconfirmed, heldRows, savedRecords, label, batches: all };
}
