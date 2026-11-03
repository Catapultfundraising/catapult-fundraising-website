// REVIEW-ONLY provisional gift-ID preview for JAG (raw_master_giving_history), whose latest export has no Transaction
// column. Entirely local staging: no SQL, no upstream reads, no persistence, no reservation, no apply.
//  - CPTID is checked for SYNTAX only. Donor existence, donor link, gift history and ownership are UNVERIFIED.
//  - Every row is HELD pending reconciliation; nothing is ever proposed automatically. Operator choices are proposals
//    exported as "not recorded"; they never change the held status.
//  - Provisional IDs are PROV-<128-bit hex>, derived from a fresh per-preview nonce. They are NOT identities: a new
//    preview gives different IDs, and they must never be stored, sent back or reused.
//  - The session token is STATELESS (HMAC + short expiry). A new preview invalidates the old state in this browser
//    only; an earlier token stays cryptographically valid until it expires. There is no server-side revocation.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { SOURCE_FIELDS } from "./source-registry";

export class GiftPreviewError extends Error {}
function bad(m: string): never { throw new GiftPreviewError(m); }

export const GIFT_CLIENT = "jag";
export const GIFT_TABLE = "raw_master_giving_history";
export const GIFT_PERSON_COL = "CPTID";
export const GIFT_MAX_ROWS = 5000;
export const GIFT_MAX_CELL = 2000;
export const GIFT_TOKEN_TTL_MS = 15 * 60 * 1000;
export const GIFT_EXPORT_MAX_BYTES = 4 * 1024 * 1024;
export const GIFT_SIDECAR_MAX_BYTES = 64 * 1024;
export const APPENDED = ["Provisional Preview ID", "Preview Status", "Proposed Decision (not recorded)", "Hold Reasons", "Preview Warning"] as const;
const RESERVED = new Set([...APPENDED, "Catapult Gift ID"].map((h) => fold(h)));
export const PENDING = "pending reconciliation: donor, gift history and ownership unverified";
export const STATUS = "HELD - pending reconciliation (not recorded)";
export const WARNING = "PROVISIONAL preview ID: do not store, send back or reuse; not a Catapult Gift ID";
export const DECISIONS = ["held", "proposed-new", "proposed-existing"] as const;
export type Decision = (typeof DECISIONS)[number];
const DECISION_TEXT: Record<Decision, string> = { held: "held", "proposed-new": "proposed new (unverified, not recorded)", "proposed-existing": "proposed existing (unverified, not recorded)" };
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function fold(h: string) { return h.trim().replace(/\s+/g, " ").toLowerCase(); }
export const giftColumns = () => SOURCE_FIELDS.filter((f) => f.c === GIFT_CLIENT && f.t === GIFT_TABLE).map((f) => f.col);
const sha = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const key = (secret: string) => createHmac("sha256", secret).update("jag-gift-preview/v1").digest();
const mapDigest = (m: Record<string, string>) => sha(JSON.stringify(Object.keys(m).sort().map((k) => [k, m[k]])));

export type GiftRow = { ordinal: number; line: number; pid: string; cptid: string; cptidStatus: "syntax-ok" | "blank" | "invalid" | "out-of-range"; values: Record<string, string>; reasons: string[] };
type Session = { v: 1; c: string; t: string; sha: string; map: string; nonce: string; rows: number; exp: number };

/** Validate headers + mapping. Reserved/returned-ID headers refuse the WHOLE file whether or not they are mapped. */
export function validateGiftInputs(grid: string[][], mappingIn: unknown) {
  const headers = grid[0] ?? [];
  if (!headers.length || headers.length > 500) bad("1-500 column headers required");
  const seen = new Set<string>();
  for (const h of headers) {
    if (typeof h !== "string" || !h.trim() || h.length > 200 || CTRL.test(h) || /[\t\r\n]/.test(h)) bad(`Header not allowed: ${String(h).slice(0, 40)}`);
    const f = fold(h);
    if (RESERVED.has(f)) bad(`Header "${h.slice(0, 40)}" is reserved (provisional/returned gift IDs are not accepted); remove that column`);
    if (["__proto__", "constructor", "prototype"].includes(f)) bad(`Header not allowed: ${h.slice(0, 40)}`);
    if (seen.has(f)) bad("duplicate column headers"); seen.add(f);
  }
  if (grid.length - 1 > GIFT_MAX_ROWS) bad(`At most ${GIFT_MAX_ROWS} rows per preview`);
  if (grid.length < 2) bad("The file has no data rows");
  for (const r of grid.slice(1)) for (const c of r) if (/^\s*prov-/i.test(c)) bad("The file contains a provisional preview ID (PROV-...). Provisional IDs are not identities and cannot be sent back; use the original export");
  if (!mappingIn || typeof mappingIn !== "object" || Array.isArray(mappingIn)) bad("mapping must be an object");
  const cols = giftColumns(); const mapping: Record<string, string> = {};
  for (const [h, v] of Object.entries(mappingIn as Record<string, unknown>)) {
    if (!headers.includes(h)) bad(`unknown header ${h.slice(0, 40)}`);
    if (typeof v !== "string") bad(`mapping for ${h.slice(0, 40)} must be text`);
    if (v === "") continue;
    if (!cols.includes(v)) bad(`${v.slice(0, 40)} is not a JAG gift column`);
    mapping[h] = v;
  }
  const dest = Object.values(mapping);
  if (new Set(dest).size !== dest.length) bad("A column is mapped twice");
  const personHeader = Object.keys(mapping).find((h) => mapping[h] === GIFT_PERSON_COL);
  if (!personHeader) bad("Map the donor CPTID column");
  return { headers, mapping, personHeader: personHeader as string };
}

function cptidStatus(s: string): GiftRow["cptidStatus"] {
  if (s === "") return "blank";
  if (!/^[1-9][0-9]*$/.test(s)) return "invalid"; // exact text only: no trimming, signs, decimals or leading zeros
  return s.length > 10 || Number(s) > 2147483647 ? "out-of-range" : "syntax-ok";
}
const CPT_REASON = { blank: "CPTID blank", invalid: "CPTID is not a positive whole number as written", "out-of-range": "CPTID exceeds the int range", "syntax-ok": "" };

function stageRows(grid: string[][], headers: string[], mapping: Record<string, string>, personHeader: string, k: Buffer, nonce: string, fileSha: string): GiftRow[] {
  const pi = headers.indexOf(personHeader);
  const ids = new Set<string>();
  return grid.slice(1).map((r, i) => {
    const pid = "PROV-" + createHmac("sha256", k).update(`id\u0000${nonce}\u0000${fileSha}\u0000${i}`).digest("hex").slice(0, 32);
    if (ids.has(pid)) bad("Provisional ID collision; preview again"); ids.add(pid);
    const cp = r[pi] ?? ""; const st = cptidStatus(cp);
    const reasons = [PENDING];
    if (st !== "syntax-ok") reasons.push(CPT_REASON[st]);
    if (r.length !== headers.length) reasons.push("row has a different number of cells than the header");
    if (r.some((c) => c.length > GIFT_MAX_CELL)) reasons.push(`a value is longer than ${GIFT_MAX_CELL} characters`);
    if (r.some((c) => CTRL.test(c))) reasons.push("a value contains control characters");
    const values: Record<string, string> = {};
    for (const [h, col] of Object.entries(mapping)) { const v = r[headers.indexOf(h)] ?? ""; values[col] = v.length > 200 ? v.slice(0, 200) + "…" : v; }
    return { ordinal: i, line: i + 2, pid, cptid: cp.length > 40 ? cp.slice(0, 40) + "…" : cp, cptidStatus: st, values, reasons };
  });
}

const sign = (k: Buffer, p: string) => createHmac("sha256", k).update(`token\u0000${p}`).digest("base64url");
export function stageGift(o: { client: string; table: string; bytes: Uint8Array; grid: string[][]; mapping: unknown; secret: string | undefined; now: number; nonce?: string }) {
  if (!o.secret) bad("Preview is not configured");
  if (o.client !== GIFT_CLIENT || o.table !== GIFT_TABLE) bad("Provisional gift preview is available only for JAG gift history");
  const { headers, mapping, personHeader } = validateGiftInputs(o.grid, o.mapping);
  const k = key(o.secret as string); const fileSha = sha(o.bytes); const nonce = o.nonce ?? randomBytes(16).toString("hex");
  const rows = stageRows(o.grid, headers, mapping, personHeader, k, nonce, fileSha);
  const s: Session = { v: 1, c: o.client, t: o.table, sha: fileSha, map: mapDigest(mapping), nonce, rows: rows.length, exp: o.now + GIFT_TOKEN_TTL_MS };
  const p = Buffer.from(JSON.stringify(s)).toString("base64url");
  const counts: Record<string, number> = {}; for (const r of rows) for (const x of r.reasons) counts[x] = (counts[x] ?? 0) + 1;
  return { token: `${p}.${sign(k, p)}`, fileSha256: fileSha, expiresAt: new Date(s.exp).toISOString(), rows, counts: { rows: rows.length, held: rows.length, proposedNew: 0, reasons: counts } };
}

export function verifyGiftToken(token: unknown, secret: string | undefined, now: number): Session {
  if (!secret) bad("Preview is not configured");
  if (typeof token !== "string" || token.length > 2000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) bad("Preview session invalid; preview again");
  const [p, sg] = (token as string).split(".");
  const want = Buffer.from(sign(key(secret as string), p)); const got = Buffer.from(sg);
  if (want.length !== got.length || !timingSafeEqual(want, got)) bad("Preview session invalid; preview again");
  let s: Session; try { s = JSON.parse(Buffer.from(p, "base64url").toString("utf8")); } catch { return bad("Preview session invalid; preview again"); }
  if (s.v !== 1 || typeof s.exp !== "number" || typeof s.nonce !== "string" || !/^[a-f0-9]{32}$/.test(s.nonce)) bad("Preview session invalid; preview again");
  if (now > s.exp) bad("Preview session expired; preview again");
  return s;
}

/** Leading-formula neutralization for the REVIEW COPY only (changes those cells; the copy is not exact). */
export function neutralize(c: string): { v: string; changed: boolean } {
  // leading whitespace = JS \s (incl. NBSP, BOM, em space, other Unicode spaces) plus C0 controls and DEL
  return /^[\s\u0000-\u001F\u007F]*[=+\-@]/.test(c) || /^[\t\r\n]/.test(c) ? { v: "'" + c, changed: true } : { v: c, changed: false };
}
const q = (c: string) => `"${c.replace(/"/g, '""')}"`;

export function exportGift(o: { client: string; table: string; bytes: Uint8Array; grid: string[][]; mapping: unknown; decisions: unknown; token: unknown; secret: string | undefined; now: number; fileName: unknown }) {
  const s = verifyGiftToken(o.token, o.secret, o.now);
  if (s.c !== o.client || s.t !== o.table) bad("Preview session belongs to another client/table; preview again");
  const { headers, mapping, personHeader } = validateGiftInputs(o.grid, o.mapping);
  const fileSha = sha(o.bytes);
  if (s.sha !== fileSha) bad("File changed since preview; preview again");
  if (s.map !== mapDigest(mapping)) bad("Mapping changed since preview; preview again");
  const rows = stageRows(o.grid, headers, mapping, personHeader, key(o.secret as string), s.nonce, fileSha);
  if (rows.length !== s.rows) bad("Row count changed since preview; preview again");
  if (!Array.isArray(o.decisions) || o.decisions.length !== rows.length || o.decisions.some((d) => !(DECISIONS as readonly unknown[]).includes(d))) bad("Decisions must be held, proposed-new or proposed-existing for every row");
  const dec = o.decisions as Decision[];
  // a ragged row cannot be represented under the header without padding/truncation: refuse rather than emit malformed CSV
  if (o.grid.slice(1).some((r) => r.length !== headers.length)) bad("Some rows have a different number of cells than the header; fix the file before exporting a review copy");
  let escaped = 0; const esc = (c: string) => { const n = neutralize(c); if (n.changed) escaped++; return q(n.v); };
  const lines = [[...headers.map(esc), ...APPENDED.map(q)].join(",")];
  rows.forEach((r, i) => {
    lines.push([...o.grid[i + 1].map(esc), q(r.pid), q(STATUS), q(DECISION_TEXT[dec[i]]), q(r.reasons.join("; ")), q(WARNING)].join(","));
  });
  const csv = (o.bytes[0] === 0xef && o.bytes[1] === 0xbb && o.bytes[2] === 0xbf ? "\ufeff" : "") + lines.join("\r\n") + "\r\n";
  if (Buffer.byteLength(csv, "utf8") > GIFT_EXPORT_MAX_BYTES) bad("Review copy would exceed 4 MB");
  const dCount: Record<string, number> = { held: 0, "proposed-new": 0, "proposed-existing": 0 }; for (const d of dec) dCount[d]++;
  const reasons: Record<string, number> = {}; for (const r of rows) for (const x of r.reasons) reasons[x] = (reasons[x] ?? 0) + 1;
  const base = typeof o.fileName === "string" ? o.fileName.replace(/\.[^.]*$/, "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80) || "export" : "export";
  const sidecar = JSON.stringify({
    kind: "jag-gift-provisional-preview/v1", warning: "REVIEW COPY ONLY. Provisional preview IDs are not identities and must not be stored, sent back or reused. Nothing was recorded. Formula-like cells were prefixed with an apostrophe, so this copy is not exact and not reimport-safe; the original file is unchanged.",
    client: s.c, table: s.t, originalFileSha256: fileSha, sessionDigest: sha(String(o.token)), rows: rows.length, held: rows.length, operatorProposalsNotRecorded: dCount,
    escapedCells: escaped, holdReasonCounts: reasons, generatedAt: new Date(o.now).toISOString(), sessionExpiresAt: new Date(s.exp).toISOString(), reviewCopySha256: sha(csv),
  }, null, 2);
  if (Buffer.byteLength(sidecar) > GIFT_SIDECAR_MAX_BYTES) bad("Metadata too large");
  return { csv, sidecar, escapedCells: escaped, fileName: `${base}.PROVISIONAL-REVIEW-COPY.csv`, sidecarName: `${base}.PROVISIONAL-REVIEW-COPY.meta.json` };
}
