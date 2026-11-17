import { pvasCanonicalEnabled } from "./pvas-canonical";

/** This is archive provenance, not an Undo capability or a canonical batch ID.
 * Original BIGINT IDs remain strings in their own namespace. */
export interface PreCutoverUploadUndo {
  kind: "pre-cutover";
  namespace: "legacy-engage";
}
export interface UploadHistoryIdentity {
  id: number | string;
  _undo?: PreCutoverUploadUndo | { kind: "unverified"; namespace: "canonical-pvas" };
}
export interface HistoricalBatchPage { next: string | null; done: boolean }
export const HISTORICAL_UPLOAD_READ_ONLY = {
  code: "pvas-historical-upload-read-only",
  error: "Pre-cutover upload history is read-only; Undo is unavailable.",
  retry: false,
  unconfirmed: false,
} as const;

export function uploadUndoPolicy(client: string, batch: UploadHistoryIdentity) {
  if (!pvasCanonicalEnabled(client)) return { kind: "legacy" as const, allowed: true, reason: "" };
  if (batch._undo?.kind === "pre-cutover" && batch._undo.namespace === "legacy-engage")
    return { kind: "pre-cutover" as const, allowed: false, reason: HISTORICAL_UPLOAD_READ_ONLY.error };
  // Absence of archive provenance is NOT proof of a new actionable batch.
  // No canonical namespace/capability or new-upload Undo has been integrated.
  return { kind: "unverified" as const, allowed: false,
    reason: "Undo for new or unverified uploads is not yet available in this view." };
}

export function uploadHistoryRowKey(client: string, batch: UploadHistoryIdentity) {
  return `${uploadUndoPolicy(client, batch).kind}:${typeof batch.id}:${batch.id}`;
}

/** Map only the backend's explicit, definitive refusal. Never copy raw errors
 * or turn an ambiguous response into proof that no write occurred. */
export function historicalUploadRejection(op: string, status: number, body: Record<string, unknown>) {
  return ["pvasBatchUndo", "undoBatch"].includes(op) && status === 410 &&
    body.code === HISTORICAL_UPLOAD_READ_ONLY.code && body.retry === false
    ? HISTORICAL_UPLOAD_READ_ONLY : null;
}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const archiveId = (value: unknown): value is string => typeof value === "string" &&
  /^[1-9][0-9]{0,18}$/.test(value) && BigInt(value) <= BigInt("9223372036854775807");
export function historicalUploadsReadBody(value: Record<string, unknown>) {
  const before = value.before === undefined ? null : value.before;
  const limit = value.limit === undefined ? 100 : value.limit;
  if (Object.keys(value).some(key => !["op", "before", "limit"].includes(key)) ||
      before !== null && !archiveId(before) || typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 200)
    throw new Error("Invalid PVAS upload history page request");
  return { before, limit };
}
function pageMetadata(value: unknown): HistoricalBatchPage {
  if (!object(value) || !exactKeys(value, ["next", "done"]) || typeof value.done !== "boolean" ||
      (value.next !== null && !archiveId(value.next)) || value.done !== (value.next === null))
    throw new Error("PVAS upload history pagination unavailable");
  return value as unknown as HistoricalBatchPage;
}

/** Complete archive headers only. Never applies effects, sorts shared batches,
 * converts IDs to Number, or manufactures Undo capability. A partial page
 * sequence rejects, so the provider cannot label partial history current. */
export async function completePvasUploadHistory<T extends { batches: UploadHistoryIdentity[]; historicalBatchPage?: HistoricalBatchPage }>(
  state: T, readPage: (before: string) => Promise<unknown>,
): Promise<T> {
  let page = pageMetadata(state.historicalBatchPage);
  const batches = [...state.batches], seen = new Set<string>();
  function inspect(rows: unknown[], before: string | null) {
    let previous = before;
    for (const row of rows) {
      if (!object(row) || !archiveId(row.id) || !object(row._undo) ||
          !exactKeys(row._undo, ["kind", "namespace"]) || row._undo.kind !== "pre-cutover" ||
          row._undo.namespace !== "legacy-engage" || seen.has(row.id) ||
          previous !== null && BigInt(row.id) >= BigInt(previous))
        throw new Error("PVAS upload history identity/order unavailable");
      seen.add(row.id); previous = row.id;
    }
    return previous;
  }
  const initial = batches.filter(row => row._undo?.kind === "pre-cutover");
  if (initial.length > 200) throw new Error("PVAS upload history page exceeds contract");
  let last = inspect(initial, null);
  if (!page.done && (!initial.length || page.next !== last)) throw new Error("PVAS upload history cursor mismatch");
  while (!page.done) {
    const before = page.next!;
    const raw = await readPage(before);
    if (!object(raw) || !exactKeys(raw, ["v", "namespace", "rows", "next", "done"]) ||
        raw.v !== 1 || raw.namespace !== "legacy-engage" || !Array.isArray(raw.rows) || raw.rows.length > 200)
      throw new Error("PVAS upload history page unavailable");
    page = pageMetadata({ next: raw.next, done: raw.done });
    last = inspect(raw.rows, before);
    if (!page.done && (!raw.rows.length || page.next !== last)) throw new Error("PVAS upload history cursor mismatch");
    batches.push(...raw.rows);
  }
  return { ...state, batches, historicalBatchPage: page };
}
