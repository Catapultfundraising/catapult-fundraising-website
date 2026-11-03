// REVIEW-ONLY baseline attestation packet builder + read-only gateway helpers (website side). DEFAULT OFF:
// it only reaches the backend through the existing read path (SOURCE_IMPORT_PREVIEW + URL + secret, all absent by
// default) and only for backend ops baselinePreview / baselineStatus. There is NO baselineApply call anywhere here.
//
// Ownership is never inferred: the packet carries an explicit, user-supplied statement that this exact prior file is the
// export originally loaded into the destination, plus a user-supplied attestor name, UTC attestation time and reference.
// None of these are defaulted (no server time, no shared-login name). The backend's three-way classification decides
// eligibility; this module never rewrites prior values (no trim/case/date/blank/decimal normalization).
import { createHash } from "node:crypto";
import { SOURCE_FIELDS, REGISTRY_META } from "./source-registry";
import { approvedPrepared, rowsFromGrid, SourceError, SOURCE_MAX_OPS } from "./source-reconcile";
import { TEXT_KEY } from "./source-keys";
import { SOURCE_MAX_WRITE_STATEMENTS } from "./source-jobs";

export const ATTEST_EXPORT_MAX_BYTES = 64 * 1024;
const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const RESERVED = new Set(["__proto__", "constructor", "prototype"]);
const HEX64 = /^[a-f0-9]{64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const REF = /^[A-Za-z0-9._-]{8,80}$/;
const INT_MAX = 2147483647;

/** canonical JSON + sha256 identical to backend lib/sourceBaselineAttest.ts (c836a12) */
const canon = (x: unknown): unknown => Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, canon((x as Record<string, unknown>)[k])])) : x;
const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(canon(x)), "utf8").digest("hex");
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const bad = (m: string): never => { throw new SourceError(m); };
const txt = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max && !CTRL.test(v);

type Xw = { table: string; from: string; to: string; fromKind: "text" | "int" };
export interface AttestDest { client: string; schema: string; table: string; key: string; keyKind: "int" | "bigint" | "text"; personLink: string | null; xw: Xw | null; cols: string[]; digest: string }

/** Mirror of backend resolve() for EXISTING (non-prepared) destinations, from the synchronized registry: only
 *  candidate fields are backend destinations. Returns a reason instead of guessing when the scope cannot be attested. */
export function attestDestination(client: string, table: string): { ok: true; dest: AttestDest } | { ok: false; reason: string } {
  if (approvedPrepared().some((p) => p.client === client)) return { ok: false, reason: "Prepared destinations establish baselines through first load, not attestation" };
  const ds = SOURCE_FIELDS.filter((f) => f.c === client && f.t === table && f.st === "candidate");
  if (!ds.length) return { ok: false, reason: "No approved destination for this client/table" };
  const key = ds[0].k; const pl = ds[0].pl || null; const kk = ds[0].kk; const xwS = ds[0].xw || "";
  if (!key || ds.some((d) => d.k !== key || (d.pl || null) !== pl || d.kk !== kk || (d.xw || "") !== xwS)) return { ok: false, reason: "Destination key/link configuration unverified (held)" };
  if (pl && (pl === key || ds.some((d) => d.col === pl))) return { ok: false, reason: "Person link misconfigured (held)" };
  const xs = xwS.split("|");
  const xw: Xw | null = xwS ? { table: xs[0], from: xs[1], to: xs[2], fromKind: xs[3] === "text" ? "text" : "int" } : null;
  if (xw && !pl) return { ok: false, reason: "Crosswalk without person link (held)" };
  if (kk === "text" && !pl) return { ok: false, reason: "Text-keyed table without a person link cannot be checked for portal protection (held)" };
  const sorted = [...ds].sort((a, b) => cmp(a.col, b.col));
  const digest = sha(["attest-dest/v1", client, client, table, key, kk, pl, xw, sorted.map((d) => [d.col, d.ty, d.len, d.p, d.s])]);
  return { ok: true, dest: { client, schema: client, table, key, keyKind: kk, personLink: pl, xw, cols: sorted.map((d) => d.col), digest } };
}

export interface AttestDraft {
  client: string; table: string; fileName: string; sourceDate: string;
  mapping: Record<string, string>; personHeader: string; linkHeader: string;
  provenanceStatement: string; attestedBy: string; attestedAt: string; reference: string; confirmed: boolean;
}
const DRAFT_KEYS = ["attestedAt", "attestedBy", "client", "confirmed", "fileName", "linkHeader", "mapping", "personHeader", "provenanceStatement", "reference", "sourceDate", "table"];
export interface PriorRow { key: number | string; person?: number; link?: string; values: Record<string, string | null> }

const realDate = (s: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; };
const realUtc = (v: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString() === v.replace("Z", ".000Z");
/** exact positive whole number text -> number, only when lossless (no leading zeros/sign/space/decimal point) */
const exactInt = (s: string, max: number) => (/^[1-9]\d{0,15}$/.test(s) && Number.isSafeInteger(Number(s)) && Number(s) <= max ? Number(s) : null);

/** Strict draft validation. Every provenance/attestor field is user-supplied; nothing is defaulted. */
export function validateDraft(raw: unknown, dest: AttestDest, headers: string[]): AttestDraft {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || JSON.stringify(Object.keys(raw).sort()) !== JSON.stringify(DRAFT_KEYS)) bad("Packet draft has missing or unknown fields");
  const d = raw as Record<string, unknown>;
  for (const k of DRAFT_KEYS) if (k !== "mapping" && k !== "confirmed" && typeof d[k] !== "string") bad(`${k} must be text`);
  if (d.client !== dest.client || d.table !== dest.table) bad("Client/table mismatch");
  if (d.confirmed !== true) bad("Confirm that this exact file is the prior export originally loaded into this destination");
  if (!txt(d.fileName, 300)) bad("Original file name required");
  if (!realDate(d.sourceDate as string)) bad("Source export date required (real YYYY-MM-DD; unknown dates cannot be attested)");
  const st = d.provenanceStatement as string;
  if (!txt(st, 2000) || !/prior source export/i.test(st) || !/originally loaded/i.test(st)) bad("Statement must say this prior source export is the file originally loaded into this destination");
  if (!txt(d.attestedBy, 200)) bad("Attestor name required");
  if (!realUtc(d.attestedAt as string)) bad("Attestation time required as UTC YYYY-MM-DDTHH:MM:SSZ");
  if (!REF.test(d.reference as string)) bad("Reference required: 8-80 letters, digits, dot, dash or underscore");
  const hs = new Set(headers);
  const m = d.mapping;
  if (!m || typeof m !== "object" || Array.isArray(m)) bad("Mapping required");
  const entries = Object.entries(m as Record<string, unknown>).filter(([, v]) => v !== "");
  const mapping: Record<string, string> = Object.create(null);
  for (const [h, v] of entries) {
    if (RESERVED.has(h.trim().toLowerCase()) || !hs.has(h)) bad(`Unknown or disallowed header ${h}`);
    if (typeof v !== "string" || !dest.cols.includes(v)) bad(`${h} must map to an approved column`);
    mapping[h] = v as string;
  }
  const cols = Object.values(mapping);
  if (new Set(cols).size !== cols.length) bad("Each column can be mapped once");
  if (!cols.includes(dest.key)) bad(`Map a column to the key ${dest.key}`);
  if (cols.length < 2) bad("Map at least one value column");
  const ph = d.personHeader as string, lh = d.linkHeader as string;
  const needP = !!dest.personLink, needL = !!dest.xw;
  if (needP ? !hs.has(ph) : ph !== "") bad(needP ? "Choose the column holding the immutable person CPTID" : "This table has no person link");
  if (needL ? !hs.has(lh) : lh !== "") bad(needL ? "Choose the column holding the exact source link" : "This table has no source link");
  if (ph && (mapping[ph] !== undefined || ph === lh)) bad("Person column must be separate from mapped and link columns");
  if (lh && mapping[lh] !== undefined) bad("Link column must be separate from mapped columns");
  return { ...(d as unknown as AttestDraft), mapping };
}

/** CSV grid -> backend prior rows. Values are the exact parsed strings (never trimmed/normalized). */
export function buildPrior(grid: string[][], dest: AttestDest, dr: AttestDraft): PriorRow[] {
  const { headers, rows } = rowsFromGrid(grid);
  if (grid.slice(1).some((r) => r.length !== headers.length)) bad("Every row must have exactly one value per header");
  if (!rows.length || rows.length > SOURCE_MAX_OPS) bad(`1-${SOURCE_MAX_OPS} rows per packet; split the file`);
  const keyH = Object.keys(dr.mapping).find((h) => dr.mapping[h] === dest.key)!;
  const valH = Object.keys(dr.mapping).filter((h) => h !== keyH);
  const writes = rows.length * valH.length * 2 + 1;
  if (writes > SOURCE_MAX_WRITE_STATEMENTS) bad(`Packet would need ${writes} write statements (limit ${SOURCE_MAX_WRITE_STATEMENTS}); split the file`);
  return rows.map((r, i) => {
    const ks = r[keyH];
    const key = dest.keyKind === "text" ? (TEXT_KEY.test(ks) ? ks : null) : exactInt(ks, dest.keyKind === "int" ? INT_MAX : Number.MAX_SAFE_INTEGER);
    if (key === null) bad(`Line ${i + 2}: key must be ${dest.keyKind === "text" ? "exact text" : "an exact positive whole number"} (never rewritten)`);
    const values: Record<string, string | null> = {};
    for (const h of valH) { if (CTRL.test(r[h])) bad(`Line ${i + 2}: control characters`); values[dr.mapping[h]] = r[h]; }
    const p: PriorRow = { key: key as number | string, values };
    if (dest.personLink) { const pv = exactInt(r[dr.personHeader], INT_MAX); if (pv === null) bad(`Line ${i + 2}: person must be an exact positive whole CPTID`); p.person = pv as number; }
    if (dest.xw) { const lv = r[dr.linkHeader]; const ok = dest.xw.fromKind === "text" ? TEXT_KEY.test(lv) : exactInt(lv, Number.MAX_SAFE_INTEGER) !== null; if (!ok) bad(`Line ${i + 2}: source link must be exact canonical text`); p.link = lv; }
    return p;
  });
}

export const priorDigest = (prior: PriorRow[]) => sha(prior.map((p) => JSON.stringify(canon({ key: String(p.key), kind: typeof p.key, person: p.person ?? null, link: p.link ?? null, values: p.values }))).sort(cmp));
export const fileSha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export function buildPacket(dest: AttestDest, dr: AttestDraft, fileBytes: Uint8Array) {
  return {
    client: dest.client, table: dest.table, registryRev: REGISTRY_META.rev, destDigest: dest.digest,
    mapping: { ...dr.mapping }, priorFile: { name: dr.fileName, sha256: fileSha(fileBytes), sourceDate: dr.sourceDate },
    provenanceStatement: dr.provenanceStatement, approvedBy: dr.attestedBy, approvedAt: dr.attestedAt, approvalRef: dr.reference,
  };
}
export type Packet = ReturnType<typeof buildPacket>;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exactKeys = (o: Record<string, unknown>, ks: string[]) => JSON.stringify(Object.keys(o).sort()) === JSON.stringify([...ks].sort());
export interface PlanSummary { planDigest: string; eligible: number; held: number; reasons: { reason: string; count: number }[] }
/** Strict validation of the backend preview response. Anything unexpected (extra fields, approval/current/secret
 *  injection, wrong types) is refused; only counts and reason categories reach the browser. */
export function summarizePlan(body: unknown): PlanSummary {
  if (!isObj(body) || !exactKeys(body, ["planDigest", "rows", "held", "counts"])) bad("Unexpected preview response");
  const b = body as Record<string, unknown>;
  if (typeof b.planDigest !== "string" || !HEX64.test(b.planDigest) || !Array.isArray(b.rows) || !Array.isArray(b.held) || !isObj(b.counts)) bad("Unexpected preview response");
  for (const r of b.rows as unknown[]) if (!isObj(r) || !exactKeys(r, ["key", "col", "value"]) || typeof r.key !== "string" || typeof r.col !== "string" || !(r.value === null || typeof r.value === "string")) bad("Unexpected preview response");
  const reasons = new Map<string, number>();
  for (const h of b.held as unknown[]) {
    if (!isObj(h) || !(exactKeys(h, ["key", "reason"]) || exactKeys(h, ["key", "col", "reason"])) || !(typeof h.key === "string" || typeof h.key === "number") || typeof h.reason !== "string" || h.reason.length > 200 || CTRL.test(h.reason) || ("col" in h && typeof h.col !== "string")) bad("Unexpected preview response");
    const rs = (h as Record<string, unknown>).reason as string; reasons.set(rs, (reasons.get(rs) ?? 0) + 1);
  }
  const c = b.counts as Record<string, unknown>;
  if (c.eligible !== (b.rows as unknown[]).length || c.held !== (b.held as unknown[]).length || Object.values(c).some((v) => !Number.isSafeInteger(v))) bad("Unexpected preview response");
  return { planDigest: b.planDigest as string, eligible: (b.rows as unknown[]).length, held: (b.held as unknown[]).length, reasons: [...reasons].sort(([a], [z]) => cmp(a, z)).map(([reason, count]) => ({ reason, count })) };
}

/** Metadata-only export (no rows, keys, names or values). Returns exact bytes; refuses over 64 KiB. Status is always
 *  "proposed"; it is not an approval and not a claim that the packet is ready to approve. */
export function exportText(packet: Packet, prior: PriorRow[], dr: AttestDraft, plan: PlanSummary) {
  const doc = {
    format: "catapult-baseline-attestation-proposal/v1",
    status: "proposed (review only; not an approval; nothing saved)",
    client: packet.client, table: packet.table, registryRev: packet.registryRev, destDigest: packet.destDigest,
    mapping: packet.mapping, personHeader: dr.personHeader || null, linkHeader: dr.linkHeader || null,
    priorFile: packet.priorFile, provenanceStatement: packet.provenanceStatement,
    attestor: { name: dr.attestedBy, attestedAtUtc: dr.attestedAt, reference: dr.reference, note: "as stated by the user; identity not verified" },
    priorRows: prior.length, priorDigest: priorDigest(prior), packetDigest: sha(["attest-packet/v1", packet]), planDigest: plan.planDigest,
    counts: { eligible: plan.eligible, held: plan.held, heldByReason: plan.reasons },
  };
  const s = JSON.stringify(doc, null, 2) + "\n";
  if (Buffer.byteLength(s, "utf8") > ATTEST_EXPORT_MAX_BYTES) bad("Export would exceed 64 KiB; shorten the statement or mapping");
  return s;
}

/** baselineStatus response: only found/status pass through. found:false is never "not saved". */
export function summarizeStatus(body: unknown): { found: boolean; status: string | null; message: string } {
  if (!isObj(body) || typeof body.found !== "boolean") bad("Unexpected status response");
  const b = body as Record<string, unknown>;
  if (!b.found) return { found: false, status: null, message: "Unconfirmed: not committed yet, still in flight, or never received." };
  const st = typeof b.status === "string" && b.status.length <= 40 && !CTRL.test(b.status) ? b.status : "unknown";
  return { found: true, status: st, message: `Recorded with status: ${st}.` };
}
export const validRequestId = (s: unknown): s is string => typeof s === "string" && HEX32.test(s);
