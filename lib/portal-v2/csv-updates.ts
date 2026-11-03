// Staff CSV contact updater (review-only; apply gate DEFAULT OFF).
// Pure helpers: strict CSV parsing, header mapping, preview against the base snapshot + Engage overlay, and a signed
// preview token. Only contact:<key> overlay fields on EXISTING CPTIDs are ever proposed; no inserts, deletes, gifts or asks.
// The Engage op "applyCsvContactUpdates" re-checks every overlay value under SQL locks; this file never writes.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { CONTACT_KEYS, CONTACT_LABELS, type ContactKey } from "@/lib/portal-v2/record-overlay";

export const CSV_CLIENTS = ["pvas", "csnf", "jag", "wcbhc", "baq"] as const;
export type CsvClient = (typeof CSV_CLIENTS)[number];
export const CSV_MAX_BYTES = 2 * 1024 * 1024;
export const CSV_MAX_ROWS = 500;
export const CSV_MAX_VALUE = 300;
export const CSV_TOKEN_TTL_MS = 15 * 60_000;
/** Same prefix the Engage guard writes; only these batches count as updater-owned. */
export const CSV_MARKER = '{"csvContactUpdater":1,';
export const ID_FIELD = "cptid" as const;
export type MapTarget = typeof ID_FIELD | ContactKey;
export const FIELD_LABELS: Record<MapTarget, string> = { cptid: "CPTID (required)", ...CONTACT_LABELS };

export function csvApplyEnabled(env: Record<string, string | undefined> = process.env) {
  return env.CSV_UPDATES_APPLY === "enabled";
}
/** Local fictional fixture only (lib/portal-v2/csv-updates-demo.ts): never in production or on Vercel. */
export function demoAllowed(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV !== "production" && env.VERCEL_ENV === undefined && env.CSV_UPDATES_DEMO === "1";
}

// ---------------------------------------------------------------- strict CSV
export { CsvError, parseCsv } from "./csv-parse";
import { CsvError, parseCsv } from "./csv-parse";
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/;

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");
const SUGGEST: Record<string, MapTarget> = {
  cptid: "cptid", cpt: "cptid", constituentid: "cptid", id: "cptid",
  street: "street", address: "street", address1: "street", streetaddress: "street", city: "city", state: "state", zip: "zip", zipcode: "zip", postalcode: "zip",
  phone: "phone", homephone: "phone", mobile: "mobile", cell: "mobile", cellphone: "mobile", phone2: "phone2", phone3: "phone3",
  email: "email", email2: "email2", email3: "email3", workemail: "workEmail",
};
export function suggestMapping(headers: string[]): Record<string, MapTarget | ""> {
  const used = new Set<string>(); const out: Record<string, MapTarget | ""> = {};
  for (const h of headers) { const t = SUGGEST[norm(h)]; out[h] = t && !used.has(t) ? t : ""; if (t) used.add(t); }
  return out;
}

// ---------------------------------------------------------------- value typing (mirrors Engage lib/portalCsvUpdates.ts)
const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[A-Za-z]{2,}$/;
export function checkValue(key: ContactKey, v: string): string {
  if (!v) return "blank";
  if (v.length > CSV_MAX_VALUE) return `Longer than ${CSV_MAX_VALUE} characters`;
  if (CTRL.test(v) || /[\r\n\t]/.test(v)) return "Contains control characters or line breaks";
  if (key.toLowerCase().includes("email")) return EMAIL.test(v) && v.length <= 200 ? "" : "Not a valid email address";
  if (key.startsWith("phone") || key === "mobile") { const d = v.replace(/\D/g, "").length; return /^[0-9+().\-\s/#xXextEXT]+$/.test(v) && d >= 7 && d <= 15 && v.length <= 40 ? "" : "Not a valid phone number"; }
  if (key === "zip") return /^\d{5}(-\d{4})?$/.test(v) ? "" : "ZIP must be 12345 or 12345-6789";
  if (key === "state") return /^[A-Za-z][A-Za-z .]{1,29}$/.test(v) ? "" : "Not a valid state";
  return "";
}

// ---------------------------------------------------------------- preview
export interface BaseRecord { name: string; contact?: Record<string, string> }
export interface OverlayRow { id: number; cptid: number; field: string; new_value: string | null; batch_id: number | null; created_by?: string | null }
export interface PreviewInputs {
  client: CsvClient; asOf: string; records: Record<string, BaseRecord>;
  updates: OverlayRow[]; prospects: { cptid: number; source?: string }[]; ownedBatchIds: number[];
  maxBatchId: number;
}
export type FieldState = "changed" | "unchanged" | "blank" | "invalid" | "protected";
export interface PreviewField { key: ContactKey; label: string; old: string; new: string; state: FieldState; reason?: string; expectedUpdateId: number | null; expectedValue: string | null; baseOld: string | null }
export interface PreviewRow { line: number; cptidRaw: string; cptid: number | null; name: string; status: "changed" | "unchanged" | "invalid" | "held"; reason?: string; fields: PreviewField[] }
export interface Preview { headers: string[]; mapping: Record<string, MapTarget | "">; rows: PreviewRow[]; counts: { rows: number; changedRows: number; changedValues: number; unchanged: number; invalid: number; held: number; protectedValues: number }; asOf: string }

export function validateMapping(headers: string[], mapping: Record<string, unknown>): Record<string, MapTarget | ""> {
  const seen = new Set<string>();
  for (const h of headers) { if (seen.has(h.trim().toLowerCase())) throw new CsvError(`Duplicate column header "${h}"`); seen.add(h.trim().toLowerCase()); }
  if (Object.keys(mapping).some((k) => !headers.includes(k))) throw new CsvError("Mapping names a column that is not in the file");
  const out: Record<string, MapTarget | ""> = {}; const used = new Set<string>();
  for (const h of headers) {
    const t = mapping[h] ?? "";
    if (t !== "" && t !== ID_FIELD && !(CONTACT_KEYS as readonly string[]).includes(t as string)) throw new CsvError(`Column "${h}" is mapped to an unsupported field`);
    if (t && used.has(t as string)) throw new CsvError(`Two columns are mapped to ${FIELD_LABELS[t as MapTarget]}`);
    if (t) used.add(t as string);
    out[h] = t as MapTarget | "";
  }
  if (!used.has(ID_FIELD)) throw new CsvError("Map one column to CPTID");
  if (used.size < 2) throw new CsvError("Map at least one contact field");
  return out;
}

export const baseValue = (r: BaseRecord | undefined, k: ContactKey) => String((k === "street" ? r?.contact?.street || r?.contact?.address : r?.contact?.[k]) ?? "");

/** Parse only (no dashboard data): headers, suggested mapping and row count so staff can map any header first. */
export function inspectCsv(text: string) {
  const all = parseCsv(text);
  if (!all.length) throw new CsvError("The file is empty");
  const headers = all[0].map((h) => h.trim());
  const seen = new Set<string>();
  for (const h of headers) { if (seen.has(h.toLowerCase())) throw new CsvError(`Duplicate column header "${h}"`); seen.add(h.toLowerCase()); }
  if (all.length - 1 > CSV_MAX_ROWS) throw new CsvError(`At most ${CSV_MAX_ROWS} data rows per file (this file has ${all.length - 1})`);
  return { headers, mapping: suggestMapping(headers), rows: all.length - 1 };
}

export function buildPreview(text: string, mappingIn: Record<string, unknown> | null, inp: PreviewInputs): Preview {
  const all = parseCsv(text);
  if (!all.length) throw new CsvError("The file is empty");
  const headers = all[0].map((h) => h.trim());
  const body = all.slice(1);
  if (body.length > CSV_MAX_ROWS) throw new CsvError(`At most ${CSV_MAX_ROWS} data rows per file (this file has ${body.length})`);
  const mapping = validateMapping(headers, mappingIn ?? suggestMapping(headers));
  const idCol = headers.findIndex((h) => mapping[h] === ID_FIELD);
  const cols = headers.map((h, i) => ({ i, key: mapping[h] })).filter((c) => c.key && c.key !== ID_FIELD) as { i: number; key: ContactKey }[];
  // Authoritative overlay state (latest non-voided per cptid+field, by id).
  const owned = new Set(inp.ownedBatchIds.map(Number)); // batches carrying the CSV updater marker (from Engage csvUpdateContext)
  const latest = new Map<string, OverlayRow>(); const recFlag = new Map<string, OverlayRow>();
  for (const u of [...inp.updates].sort((a, b) => a.id - b.id)) {
    if (u.field.startsWith("contact:")) latest.set(`${u.cptid}|${u.field.slice(8)}`, u);
    else if (u.field === "deleted" || u.field === "merged_into") recFlag.set(`${u.cptid}|${u.field}`, u);
  }
  const gone = new Set<number>(); recFlag.forEach((u) => { if (u.new_value) gone.add(Number(u.cptid)); });
  const portal = new Set(inp.prospects.map((p) => Number(p.cptid)));
  const idCount = new Map<string, number>();
  for (const r of body) { const k = (r[idCol] ?? "").trim(); idCount.set(k, (idCount.get(k) ?? 0) + 1); }
  const rows: PreviewRow[] = body.map((r, n) => {
    const line = n + 2; const raw = (r[idCol] ?? "").trim();
    const row: PreviewRow = { line, cptidRaw: raw, cptid: null, name: "", status: "invalid", fields: [] };
    if (r.length !== headers.length) return { ...row, reason: `Has ${r.length} columns; the header has ${headers.length}` };
    if (!/^[1-9][0-9]{0,9}$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > 2_147_483_647) return { ...row, reason: "CPTID must be a positive whole number" };
    if ((idCount.get(raw) ?? 0) > 1) return { ...row, reason: "CPTID appears more than once in this file" };
    const cptid = Number(raw); row.cptid = cptid;
    const rec = inp.records[String(cptid)];
    if (portal.has(cptid)) return { ...row, status: "held", name: rec?.name ?? "", reason: "Prospect added in the dashboard; edit it there" };
    if (!rec) return { ...row, reason: "CPTID not found in this client's records" };
    row.name = rec.name;
    if (gone.has(cptid)) return { ...row, status: "held", reason: "Record was deleted or merged in the dashboard" };
    for (const c of cols) {
      const v = (r[c.i] ?? "").trim();
      const cur = latest.get(`${cptid}|${c.key}`);
      const base = baseValue(rec, c.key);
      const old = cur ? cur.new_value ?? "" : base;
      const f: PreviewField = { key: c.key, label: CONTACT_LABELS[c.key], old, new: v, state: "unchanged", expectedUpdateId: cur ? cur.id : null, expectedValue: cur ? cur.new_value ?? "" : null, baseOld: cur ? null : base || null };
      if (!v) f.state = "blank";
      else if (checkValue(c.key, v)) { f.state = "invalid"; f.reason = checkValue(c.key, v); }
      else if (v === old) f.state = "unchanged";
      else if (cur && !owned.has(Number(cur.batch_id))) { f.state = "protected"; f.reason = `Edited in the dashboard${cur.created_by ? ` by ${cur.created_by}` : ""}; not overwritten`; }
      else f.state = "changed";
      row.fields.push(f);
    }
    if (row.fields.some((f) => f.state === "invalid")) return { ...row, status: "invalid", reason: "Fix the invalid value(s); nothing in this row will be saved" };
    row.status = row.fields.some((f) => f.state === "changed") ? "changed" : row.fields.some((f) => f.state === "protected") ? "held" : "unchanged";
    if (row.status === "held") row.reason = "Only protected values differ";
    return row;
  });
  const counts = { rows: rows.length, changedRows: 0, changedValues: 0, unchanged: 0, invalid: 0, held: 0, protectedValues: 0 };
  for (const r of rows) {
    if (r.status === "changed") counts.changedRows++; else if (r.status === "unchanged") counts.unchanged++; else if (r.status === "invalid") counts.invalid++; else counts.held++;
    if (r.status === "changed") counts.changedValues += r.fields.filter((f) => f.state === "changed").length;
    counts.protectedValues += r.fields.filter((f) => f.state === "protected").length;
  }
  return { headers, mapping, rows, counts, asOf: inp.asOf };
}

/** Exactly the changes that would be sent to Engage (changed fields of rows with status "changed"). */
export function changesOf(p: Preview) {
  return p.rows.filter((r) => r.status === "changed").flatMap((r) => r.fields.filter((f) => f.state === "changed").map((f) => ({
    cptid: r.cptid as number, key: f.key, newValue: f.new, baseOld: f.baseOld, expectedUpdateId: f.expectedUpdateId, expectedValue: f.expectedValue,
  })));
}

// ---------------------------------------------------------------- signed preview token
export interface TokenPayload { v: 1; client: CsvClient; fileName: string; mapping: Record<string, string>; asOf: string; maxBatchId: number; requestId: string; exp: number; changes: ReturnType<typeof changesOf> }
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
function key(secret: string | undefined) {
  if (!secret || secret.length < 24) throw new CsvError("CSV updates are not configured on this server");
  return createHmac("sha256", secret).update("csv-contact-updates/v1").digest();
}
export const newRequestId = () => randomBytes(16).toString("hex");
export const previewHash = (payloadJson: string) => createHash("sha256").update(payloadJson).digest("hex");
export function signToken(p: TokenPayload, secret: string | undefined) {
  const body = b64(JSON.stringify(p));
  return `${body}.${createHmac("sha256", key(secret)).update(body).digest("base64url")}`;
}
export function verifyToken(token: unknown, secret: string | undefined, now = Date.now()): { payload: TokenPayload; hash: string } {
  if (typeof token !== "string" || token.length > 3_000_000) throw new CsvError("Preview token missing");
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) throw new CsvError("Preview token malformed");
  const want = createHmac("sha256", key(secret)).update(body).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw new CsvError("Preview token is not valid; preview the file again");
  const json = Buffer.from(body, "base64url").toString("utf8");
  const payload = JSON.parse(json) as TokenPayload;
  if (payload.v !== 1 || !(CSV_CLIENTS as readonly string[]).includes(payload.client)) throw new CsvError("Preview token malformed");
  if (!(payload.exp > now)) throw new CsvError("This preview expired; preview the file again");
  return { payload, hash: previewHash(json) };
}
