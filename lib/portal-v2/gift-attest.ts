// Gift baseline attestation (D) — website side, READ-ONLY. Browser-safe (no node: imports): the SAME strict validators run
// on the server gateway and again in the browser. There is no apply/save path anywhere in this module.
// The reason grammar and per-mapped-count caps come from the shared golden file (byte-identical in Catapult-Calling).
import G from "./gift-attest-golden.json";

export const ROW_REASONS: readonly string[] = Object.freeze([...G.rowReasons, ...G.overflowReasons]);
export const COLUMN_REASONS: readonly string[] = Object.freeze([...G.columnReasons]);
/** whole-plan holds: when present on one candidate they must be on every candidate and nothing may be eligible */
export const WHOLE_REASONS: readonly string[] = Object.freeze(["client has active portal gift edits/voids (protected)", ...G.overflowReasons]);
export const CAPS_BY_MAPPED_COUNT: readonly number[] = Object.freeze([...G.capsByMappedCount]);
export const ATTEST_MAX_FILE_BYTES: number = G.maxFileBytes;
export const ATTEST_EXPORT_MAX_BYTES = 64 * 1024;
export const capForMapped = (m: number) => (Number.isInteger(m) && m >= 1 && m <= 64 ? CAPS_BY_MAPPED_COUNT[m - 1] : 0);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HEX64 = /^[0-9a-f]{64}$/, HEX32 = /^[0-9a-f]{32}$/, IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keysAre = (o: Record<string, unknown>, ks: string[]) => JSON.stringify(Object.keys(o).sort()) === JSON.stringify([...ks].sort());
const nat = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= max;
const txt = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v === v.trim() && v.length <= max;
const realDate = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

/** One fixed message for every malformed upstream plan/status; the cause is never echoed. */
export class AttestShapeError extends Error { constructor() { super("Engage returned a preview that failed validation; nothing was saved. Try again or report it."); } }
const no = (): never => { throw new AttestShapeError(); };

export interface PlanCtx { from: number; to: number; mapped: readonly string[]; cell: (o: number, col: string) => string }
export interface ValidPlan {
  planDigest: string;
  candidates: { o: number; giftId: string; locator: number | null; person: number | null }[];
  rows: { o: number; key: string; col: string; value: string | null }[];
  held: { o: number; col?: string; reason: string }[];
  counts: Record<string, number>;
  byOrdinal: ({ o: number; kind: "held"; reason: string } | { o: number; kind: "covered"; giftId: string; eligible: string[]; colHolds: { col: string; reason: string }[] })[];
}

/** Strict whole-plan projection: exact keys, finite reason grammar, full COVERAGE of every requested ordinal x mapped column,
 *  exact recomputed counts, and every value equal to the operator's own parsed cell (blank = null). */
export function validateAttestPlan(body: unknown, c: PlanCtx): ValidPlan {
  if (!isObj(body) || !keysAre(body, ["candidates", "counts", "held", "planDigest", "rows"])) no();
  const b = body as Record<string, unknown>;
  if (typeof b.planDigest !== "string" || !HEX64.test(b.planDigest) || !Array.isArray(b.candidates) || !Array.isArray(b.rows) || !Array.isArray(b.held) || !isObj(b.counts)) no();
  if (!(Number.isSafeInteger(c.from) && Number.isSafeInteger(c.to) && c.from >= 0 && c.from <= c.to) || !c.mapped.length) no();
  const M = new Set(c.mapped); const inR = (o: unknown): o is number => Number.isSafeInteger(o) && (o as number) >= c.from && (o as number) <= c.to;
  const cand = new Map<number, ValidPlan["candidates"][number]>(); const gids = new Set<string>(); let lastO = -1;
  for (const x0 of b.candidates as unknown[]) {
    if (!isObj(x0)) no();
    const x = x0 as Record<string, unknown>;
    if ( !keysAre(x, ["giftId", "locator", "o", "person"]) || !inR(x.o) || (x.o as number) <= lastO || typeof x.giftId !== "string" || !UUID_RE.test(x.giftId) || gids.has(x.giftId)
      || !(x.locator === null || (Number.isSafeInteger(x.locator) && (x.locator as number) > 0)) || !(x.person === null || (Number.isSafeInteger(x.person) && (x.person as number) >= 1 && (x.person as number) <= 2147483647))) no();
    lastO = x.o as number; gids.add(x.giftId as string); cand.set(x.o as number, x as ValidPlan["candidates"][number]);
  }
  const rowHold = new Map<number, string>(); const colSeen = new Map<number, Map<string, "row" | "hold">>();
  const seeCol = (o: number, col: string, k: "row" | "hold") => { const m = colSeen.get(o) ?? new Map(); if (m.has(col)) no(); m.set(col, k); colSeen.set(o, m); };
  for (const h0 of b.held as unknown[]) {
    if (!isObj(h0)) no();
    const h = h0 as Record<string, unknown>;
    if (!inR(h.o) || typeof h.reason !== "string") no();
    const hh = h as { o: number; col?: unknown; reason: string };
    if (keysAre(h, ["o", "reason"])) { if (!ROW_REASONS.includes(hh.reason) || rowHold.has(hh.o)) no(); rowHold.set(hh.o, hh.reason); }
    else if (keysAre(h, ["col", "o", "reason"])) { if (typeof hh.col !== "string" || !M.has(hh.col) || !COLUMN_REASONS.includes(hh.reason)) no(); seeCol(hh.o, hh.col as string, "hold"); }
    else no();
  }
  for (const r0 of b.rows as unknown[]) {
    if (!isObj(r0)) no();
    const r = r0 as Record<string, unknown>;
    if (!keysAre(r, ["col", "key", "o", "value"]) || !inR(r.o) || typeof r.col !== "string" || !M.has(r.col)) no();
    const rr = r as { o: number; key: unknown; col: string; value: unknown };
    const k = cand.get(rr.o); if (!k || rr.key !== `gift:${k.giftId}`) no();
    if (!(rr.value === null || (typeof rr.value === "string" && rr.value.length <= 4000))) no();
    const cell = c.cell(rr.o, rr.col); const want = cell === "" ? null : cell;
    if (rr.value !== want) no();
    seeCol(rr.o, rr.col, "row");
  }
  // coverage: every requested ordinal is exactly one of (a) row-held or (b) covered
  const byOrdinal: ValidPlan["byOrdinal"] = []; let anyEligible = false; const whole = new Set<string>();
  for (let o = c.from; o <= c.to; o++) {
    const rh = rowHold.get(o), cols = colSeen.get(o);
    if (rh !== undefined) { if (cols) no(); if (WHOLE_REASONS.includes(rh)) whole.add(rh); byOrdinal.push({ o, kind: "held", reason: rh }); continue; }
    const k = cand.get(o); if (!k || !cols || cols.size !== M.size) no();
    const eligible: string[] = [], colHolds: { col: string; reason: string }[] = [];
    for (const col of [...c.mapped].sort()) { const s = cols!.get(col); if (!s) no(); if (s === "row") eligible.push(col); else colHolds.push({ col, reason: (b.held as { o: number; col?: string; reason: string }[]).find((h) => h.o === o && h.col === col)!.reason }); }
    if (eligible.length) anyEligible = true;
    byOrdinal.push({ o, kind: "covered", giftId: k!.giftId, eligible, colHolds });
  }
  if (cand.size && [...cand.keys()].some((o) => !byOrdinal.some((x) => x.o === o))) no();
  if (whole.size) { if (whole.size !== 1 || anyEligible || [...cand.keys()].some((o) => rowHold.get(o) !== [...whole][0])) no(); }
  // counts recomputed exactly
  const want: Record<string, number> = { candidates: cand.size, eligible: (b.rows as unknown[]).length, held: (b.held as unknown[]).length };
  for (const h of b.held as { reason: string }[]) want[h.reason] = (want[h.reason] ?? 0) + 1;
  const cnt = b.counts as Record<string, unknown>;
  if (!nat(cnt.outOfScopeAssociated, 5000)) no();
  if (!keysAre(cnt, [...Object.keys(want), "outOfScopeAssociated"])) no();
  for (const [k, v] of Object.entries(want)) if (cnt[k] !== v) no();
  return { planDigest: b.planDigest as string, candidates: [...cand.values()], rows: b.rows as ValidPlan["rows"], held: b.held as ValidPlan["held"], counts: cnt as Record<string, number>, byOrdinal };
}

export type AttestContext = { available: false; lookupAvailable: boolean } | { available: true; lookupAvailable: boolean; configured: true; registrationId: string; registrationVersion: number; columns: { col: string; ty: string; len: number | null; p: number | null; s: number | null }[]; capsByMappedCount: number[]; maxFileBytes: number };
/** browser-side strict context projection; anything else => treated as unavailable */
export function validateAttestContext(v: unknown): AttestContext {
  const off = { available: false as const, lookupAvailable: false };
  if (!isObj(v)) return off;
  if (v.available === false) return keysAre(v, ["available", "lookupAvailable"]) && typeof v.lookupAvailable === "boolean" ? { available: false, lookupAvailable: v.lookupAvailable } : off;
  if (!keysAre(v, ["available", "capsByMappedCount", "columns", "configured", "lookupAvailable", "maxFileBytes", "registrationId", "registrationVersion"]) || v.available !== true || v.configured !== true || typeof v.lookupAvailable !== "boolean"
    || !txt(v.registrationId, 64) || !nat(v.registrationVersion) || v.maxFileBytes !== ATTEST_MAX_FILE_BYTES || JSON.stringify(v.capsByMappedCount) !== JSON.stringify(CAPS_BY_MAPPED_COUNT)
    || !Array.isArray(v.columns) || v.columns.length < 1 || v.columns.length > 64) return off;
  for (const c of v.columns as unknown[]) if (!isObj(c) || !keysAre(c, ["col", "len", "p", "s", "ty"]) || typeof c.col !== "string" || !IDENT.test(c.col) || typeof c.ty !== "string") return off;
  return v as AttestContext;
}

// ---------- status: full upstream projection FIRST (server), then a separate redacted output (server -> browser) ----------
const RESULT_KEYS = ["approvalRef", "approvedBy", "client", "counts", "kind", "payloadHash", "planDigest", "priorFileSha256", "priorSourceDate", "registrationId", "registrationVersion", "requestId", "table"];
export type AttestStatusOut =
  | { requestId: string; found: false; state: "unconfirmed" }
  | { requestId: string; found: true; state: "unreadable" }
  | { requestId: string; found: true; state: "committed"; result: { client: string; table: string; registrationId: string; registrationVersion: number; planDigest: string; approvalRef: string; priorSourceDate: string; counts: { records: number; values: number } } };
export const STATUS_TEXT = {
  unconfirmed: "Not confirmed: not committed, still in flight, or never received.",
  unreadable: "Stored record unreadable; not confirmed.",
  committed: "Committed attestation found for this request id.",
  unavailable: "Status unavailable; still unconfirmed. Try again.",
} as const;
/** Server: strict projection of the FULL backend status body for the requested id/client/table, then redaction. */
export function projectAttestStatus(body: unknown, q: { requestId: string; client: string; table: string }): AttestStatusOut {
  const unreadable = { requestId: q.requestId, found: true as const, state: "unreadable" as const };
  if (!isObj(body)) return unreadable;
  if (keysAre(body, ["confirmed", "found", "note", "state"]) && body.found === false && body.confirmed === false && body.state === "unconfirmed" && typeof body.note === "string") return { requestId: q.requestId, found: false, state: "unconfirmed" };
  if (keysAre(body, ["confirmed", "found", "state"]) && body.found === true && body.confirmed === false && body.state === "unreadable") return unreadable;
  if (!keysAre(body, ["confirmed", "found", "result", "state"]) || body.found !== true || body.confirmed !== true || body.state !== "committed" || !isObj(body.result)) return unreadable;
  const r = body.result; const c = r.counts;
  const ok = keysAre(r, RESULT_KEYS) && r.kind === "gift-attest" && r.requestId === q.requestId && r.client === q.client && r.table === q.table
    && typeof r.payloadHash === "string" && HEX64.test(r.payloadHash) && typeof r.planDigest === "string" && HEX64.test(r.planDigest) && typeof r.priorFileSha256 === "string" && HEX64.test(r.priorFileSha256)
    && realDate(r.priorSourceDate) && txt(r.registrationId, 64) && Number.isSafeInteger(r.registrationVersion) && (r.registrationVersion as number) >= 1 && txt(r.approvalRef, 200) && txt(r.approvedBy, 200)
    && isObj(c) && keysAre(c, ["records", "values"]) && Number.isSafeInteger(c.records) && Number.isSafeInteger(c.values) && (c.records as number) >= 1 && (c.records as number) <= (c.values as number) && (c.values as number) <= 32000;
  if (!ok) return unreadable;
  return { requestId: q.requestId, found: true, state: "committed", result: { client: r.client as string, table: r.table as string, registrationId: r.registrationId as string, registrationVersion: r.registrationVersion as number, planDigest: r.planDigest as string, approvalRef: r.approvalRef as string, priorSourceDate: r.priorSourceDate as string, counts: { records: c!.records as number, values: c!.values as number } } };
}
/** Browser: re-validate the redacted output and bind it to the id this lookup asked for. */
export function validateAttestStatusOut(v: unknown, requestId: string, client: string, table: string): AttestStatusOut | null {
  if (!isObj(v) || v.requestId !== requestId || !HEX32.test(requestId)) return null;
  if (keysAre(v, ["found", "requestId", "state"]) && v.found === false && v.state === "unconfirmed") return v as AttestStatusOut;
  if (keysAre(v, ["found", "requestId", "state"]) && v.found === true && v.state === "unreadable") return v as AttestStatusOut;
  if (!keysAre(v, ["found", "requestId", "result", "state"]) || v.found !== true || v.state !== "committed" || !isObj(v.result)) return null;
  const r = v.result, c = r.counts;
  if (!keysAre(r, ["approvalRef", "client", "counts", "planDigest", "priorSourceDate", "registrationId", "registrationVersion", "table"]) || r.client !== client || r.table !== table || typeof r.planDigest !== "string" || !HEX64.test(r.planDigest)
    || !realDate(r.priorSourceDate) || !txt(r.registrationId, 64) || !Number.isSafeInteger(r.registrationVersion) || !txt(r.approvalRef, 200)
    || !isObj(c) || !keysAre(c, ["records", "values"]) || !Number.isSafeInteger(c.records) || !Number.isSafeInteger(c.values) || (c.records as number) < 1 || (c.records as number) > (c.values as number)) return null;
  return v as AttestStatusOut;
}

/** Fixed refusal text per backend code (upstream text is never echoed). */
export const REFUSAL_TEXT: Record<string, string> = {
  unregistered: "Engage has no reviewed gift registration for this client. Nothing was saved.",
  "registry-changed": "The gift registration changed on Engage; reload and try again. Nothing was saved.",
  prepared: "This is a prepared new-client destination; its baselines come from the first load, not attestation.",
  invalid: "Engage refused the packet (validation failed). Re-check the file, mapping and attestation fields.",
  "over-budget": "Too many rows for one preview with this many mapped columns. Narrow the row range.",
  "too-large": "The file or preview is too large. Narrow the row range or split the file.",
  "preview-too-large": "The preview response is too large. Narrow the row range.",
};
export const REFUSAL_FALLBACK = "Engage refused this preview. Nothing was saved.";
