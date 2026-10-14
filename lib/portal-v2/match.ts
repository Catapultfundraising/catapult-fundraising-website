import * as XLSX from "xlsx";

// Parse a client file (xlsx / xls / csv) into normalized rows. Header names vary by
// client CRM, so columns are mapped by alias. Client files carry the client's own id,
// never CPTID.
export interface FileRow {
  line: number; clientId: string; firstName: string; lastName: string; fullName: string; orgName: string;
  address1: string; city: string; state: string; zip: string; email: string; phone: string;
  gifts: { kind: "gift" | "pledge"; amount: number; date: string | null }[];
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES: Record<string, string[]> = {
  clientId: ["clientid", "constituentid", "accountid", "donorid", "id", "givebutterid", "contactid", "externalid", "lookupid", "recordid", "crmid", "account18"],
  firstName: ["firstname", "first", "fname"], lastName: ["lastname", "last", "lname", "surname"],
  fullName: ["name", "fullname", "accountname", "donorname", "constituentname", "displayname", "contactname"],
  orgName: ["organization", "organizationname", "company", "companyname", "orgname", "business"],
  address1: ["address", "address1", "addressline1", "street", "streetaddress", "mailingstreet", "primaryaddress"],
  city: ["city", "mailingcity"], state: ["state", "st", "mailingstate", "province"],
  zip: ["zip", "zipcode", "postalcode", "postcode", "mailingzip", "mailingzippostalcode"],
  email: ["email", "emailaddress", "email1", "primaryemail"], phone: ["phone", "phonenumber", "phone1", "homephone", "mobile", "cellphone"],
  amount: ["amount", "giftamount", "donationamount", "transactionamount", "total"],
  pledgeAmount: ["pledgeamount", "pledge", "pledgetotal", "commitment", "commitmentamount"],
  kind: ["type", "gifttype", "kind", "transactiontype", "recordtype", "paymenttype"],
  date: ["date", "giftdate", "pledgedate", "transactiondate", "closedate", "donationdate"],
};
export function mapHeaders(headers: string[]) {
  const m: Record<string, string> = {};
  for (const [field, al] of Object.entries(ALIASES)) {
    const h = al.map((a) => headers.find((x) => norm(x) === a)).find(Boolean);
    if (h) m[field] = h;
  }
  return m;
}
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const money = (v: unknown) => { const n = typeof v === "number" ? v : Number(s(v).replace(/[$,\s]/g, "")); return Number.isFinite(n) ? n : 0; };
function date(v: unknown): string | null {
  if (v instanceof Date && !isNaN(+v)) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) { const d = XLSX.SSF.parse_date_code(v); return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`; }
  const t = s(v); if (!t) return null;
  const d = new Date(t); return isNaN(+d) ? null : d.toISOString().slice(0, 10);
}
const cleanId = (v: unknown) => { const t0 = s(v); const t = /^\d+\.0+$/.test(t0) ? t0.replace(/\.0+$/, "") : t0; return t === "0" ? "" : t; };

export function parseClientFile(buf: Buffer): { rows: FileRow[]; headers: string[]; mapped: Record<string, string> } {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
  const headers = raw.length ? Object.keys(raw[0]) : [];
  const m = mapHeaders(headers);
  const g = (r: Record<string, unknown>, f: string) => (m[f] ? r[m[f]] : "");
  const rows: FileRow[] = [];
  raw.forEach((r, i) => {
    const first = s(g(r, "firstName")), last = s(g(r, "lastName")), org = s(g(r, "orgName"));
    const full = s(g(r, "fullName")) || `${first} ${last}`.trim() || org;
    const clientId = cleanId(g(r, "clientId"));
    if (!full && !clientId) return;
    const gifts: FileRow["gifts"] = [];
    const d = date(g(r, "date"));
    const amt = money(g(r, "amount")), pl = money(g(r, "pledgeAmount"));
    if (amt > 0) gifts.push({ kind: /pledge|commit/i.test(s(g(r, "kind"))) && !m.pledgeAmount ? "pledge" : "gift", amount: amt, date: d });
    if (pl > 0) gifts.push({ kind: "pledge", amount: pl, date: d });
    rows.push({ line: i + 2, clientId, firstName: first, lastName: last, fullName: full, orgName: org, address1: s(g(r, "address1")), city: s(g(r, "city")),
      state: s(g(r, "state")), zip: s(g(r, "zip")).slice(0, 10), email: s(g(r, "email")), phone: s(g(r, "phone")), gifts });
  });
  return { rows, headers, mapped: m };
}

// --- matching ---------------------------------------------------------------
export interface Known { cptid: number; clientId: string; name: string; address: string; city: string; zip: string; email?: string; phone?: string }
export const nameKey = (n: string) => n.toLowerCase().replace(/\b(mr|mrs|ms|dr|jr|sr|ii|iii|the)\b/g, "").replace(/[^a-z0-9]/g, "");
export const addrKey = (a: string) => a.toLowerCase().replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|suite|ste|apt|unit)\b/g, "").replace(/[^a-z0-9]/g, "");
const zip5 = (z: string) => z.replace(/[^0-9]/g, "").slice(0, 5);

export function buildMatcher(known: Known[]) {
  const byId = new Map<string, Known>(), byNameAddr = new Map<string, Known>(), byName = new Map<string, Known[]>();
  for (const k of known) {
    if (k.clientId) byId.set(k.clientId.toLowerCase(), k);
    const nk = nameKey(k.name); if (!nk) continue;
    if (k.address) byNameAddr.set(`${nk}|${addrKey(k.address)}`, k);
    byName.set(nk, [...(byName.get(nk) ?? []), k]);
  }
  return {
    /** Client id first, then exact name + address. */
    match(r: { clientId?: string; fullName: string; address1?: string }): { k: Known; how: "client id" | "name + address" } | null {
      const id = (r.clientId ?? "").toLowerCase();
      if (id && byId.has(id)) return { k: byId.get(id)!, how: "client id" };
      const nk = nameKey(r.fullName);
      if (nk && r.address1) { const k = byNameAddr.get(`${nk}|${addrKey(r.address1)}`); if (k) return { k, how: "name + address" }; }
      return null;
    },
    /** Possible duplicates for a new record: same name, or same address + zip. */
    similar(r: { fullName: string; address1?: string; zip?: string }): Known[] {
      const nk = nameKey(r.fullName); const out = new Map<number, Known>();
      for (const k of byName.get(nk) ?? []) out.set(k.cptid, k);
      if (r.address1) {
        const ak = addrKey(r.address1), z = zip5(r.zip ?? "");
        for (const k of known) if (k.address && addrKey(k.address) === ak && (!z || !k.zip || zip5(k.zip) === z)) out.set(k.cptid, k);
      }
      return [...out.values()].slice(0, 10);
    },
  };
}

/** Fields a client file may change on an existing record (only when the file has a value and it differs). */
export const DIFF_FIELDS: [keyof FileRow & keyof Known | "address1" | "email" | "phone", string][] = [["address1", "address"], ["city", "city"], ["zip", "zip"], ["email", "email"], ["phone", "phone"]];
export function diffRow(r: FileRow, k: Known) {
  const changes: { field: string; oldValue: string | null; newValue: string }[] = [];
  const cmp = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9@]/g, "") === b.toLowerCase().replace(/[^a-z0-9@]/g, "");
  for (const [rf, kf] of DIFF_FIELDS) {
    const nv = String((r as unknown as Record<string, string>)[rf] ?? ""); const ov = String((k as unknown as Record<string, string>)[kf] ?? "");
    if (nv && !cmp(nv, ov)) changes.push({ field: kf, oldValue: ov || null, newValue: nv });
  }
  if (r.clientId && !k.clientId) changes.push({ field: "client_id", oldValue: null, newValue: r.clientId });
  return changes;
}
