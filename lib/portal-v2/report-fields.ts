// Self-service report builder: field catalog + filter/sort logic shared by the five
// internal data dashboards (JAG, CSNF, PVAS, WCBHC, BAQ). Client-safe (no server imports).
//
// Giving is kept in separate, clearly labelled groups:
//   "Giving history" = the client's giving file (paid gifts, as shown on Lifetime everywhere else)
//   "Campaign"       = campaign pledges / campaign gifts recorded on the dashboard (Engage SQL).
// Campaign pledges are never added to giving-history totals.

export type FieldKind = "text" | "usd" | "num" | "date";
export interface ReportField { id: string; label: string; group: string; kind: FieldKind; help?: string }

export const REPORT_FIELDS: ReportField[] = [
  { id: "cptid", label: "CPTID", group: "Record", kind: "num" },
  { id: "name", label: "Name", group: "Record", kind: "text" },
  { id: "kind", label: "Record type", group: "Record", kind: "text" },
  { id: "flags", label: "Flags", group: "Record", kind: "text" },
  { id: "street", label: "Street address", group: "Contact", kind: "text" },
  { id: "city", label: "City", group: "Contact", kind: "text" },
  { id: "state", label: "State", group: "Contact", kind: "text" },
  { id: "zip", label: "ZIP", group: "Contact", kind: "text" },
  { id: "phone", label: "Phone", group: "Contact", kind: "text" },
  { id: "mobile", label: "Mobile", group: "Contact", kind: "text" },
  { id: "phone2", label: "Phone 2", group: "Contact", kind: "text" },
  { id: "phone3", label: "Phone 3", group: "Contact", kind: "text" },
  { id: "email", label: "Email", group: "Contact", kind: "text" },
  { id: "email2", label: "Email 2", group: "Contact", kind: "text" },
  { id: "email3", label: "Email 3", group: "Contact", kind: "text" },
  { id: "workEmail", label: "Work email", group: "Contact", kind: "text" },
  { id: "lifetime", label: "Lifetime giving", group: "Giving history", kind: "usd", help: "Client giving file. Excludes campaign pledges." },
  { id: "gifts", label: "# Gifts", group: "Giving history", kind: "num" },
  { id: "largest", label: "Largest gift", group: "Giving history", kind: "usd" },
  { id: "first", label: "First gift date", group: "Giving history", kind: "date" },
  { id: "last", label: "Last gift date", group: "Giving history", kind: "date" },
  { id: "years", label: "Years giving", group: "Giving history", kind: "num" },
  { id: "band", label: "Giving band", group: "Giving history", kind: "text" },
  { id: "ds", label: "DS rating", group: "Wealth", kind: "text", help: "Staff edit, then client screening file, then latest dashboard DonorSearch result. PIR values are not included." },
  { id: "capacity", label: "Capacity", group: "Wealth", kind: "text", help: "Staff edit, then client screening file, then latest dashboard DonorSearch result. PIR values are not included." },
  { id: "capacityMin", label: "Capacity minimum (parsed)", group: "Wealth", kind: "usd", help: "Lower bound read from the Capacity text: $500K-$1M = $500,000; $1M+ = $1,000,000; under/<$500K = $0. Blank when the text can't be read." },
  { id: "capacityRead", label: "Capacity read as", group: "Wealth", kind: "text", help: "How the Capacity text was interpreted for the parsed minimum." },
  { id: "campaignPledged", label: "Campaign pledges", group: "Campaign", kind: "usd", help: "Pledged to the campaign. Not paid giving. Blank when campaign data is unavailable." },
  { id: "campaignReceived", label: "Campaign gifts received", group: "Campaign", kind: "usd", help: "Campaign gifts entered on the dashboard. Not added to Lifetime giving." },
  { id: "status", label: "Prospect status", group: "Committee tracking", kind: "text" },
  { id: "solicitor", label: "Solicitor", group: "Committee tracking", kind: "text" },
  { id: "solicitor2", label: "Secondary solicitor", group: "Committee tracking", kind: "text" },
];
export const FIELD_BY_ID = new Map(REPORT_FIELDS.map((f) => [f.id, f]));
export const DEFAULT_FIELDS = ["cptid", "name", "kind", "city", "state", "phone", "email", "lifetime", "last"];

export type ReportValue = string | number | null;
export type ReportRow = Record<string, ReportValue>;

export const OPS = {
  contains: "contains", equals: "is", not_contains: "does not contain", empty: "is blank", not_empty: "is not blank", gte: "is at least", lte: "is at most",
} as const;
export type FilterOp = keyof typeof OPS;
export interface ReportFilter { field: string; op: FilterOp; value?: string }
export interface ReportQuery { fields: string[]; filters: ReportFilter[]; search?: string; sort?: { field: string; dir: 1 | -1 }; /** Keep only the first N rows after filtering and sorting. */ top?: number }
export const TOP_MAX = 25_000;

export function opsFor(kind: FieldKind): FilterOp[] {
  return kind === "text" ? ["contains", "equals", "not_contains", "empty", "not_empty"] : ["gte", "lte", "equals", "empty", "not_empty"];
}

const blank = (v: ReportValue | undefined) => v === null || v === undefined || v === "";
const toNum = (s: string) => Number(String(s).replace(/[$,\s]/g, ""));
/** MM/DD/YYYY or YYYY-MM-DD -> YYYY-MM-DD for comparison. */
function isoDate(s: string): string {
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return s.trim().slice(0, 10);
}

const validIso = (iso: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); if (!m) return false; const d = new Date(`${iso}T00:00:00Z`); return d.getUTCFullYear() === +m[1] && d.getUTCMonth() + 1 === +m[2] && d.getUTCDate() === +m[3]; };
/** User-visible problem with an entered filter value, or null. Empty values are "not filled in yet" and ignored. */
export function filterError(f: ReportFilter): string | null {
  const field = FIELD_BY_ID.get(f.field);
  if (!field || f.op === "empty" || f.op === "not_empty") return null;
  const want = String(f.value ?? "").trim();
  if (!want) return null;
  if (field.kind === "usd" || field.kind === "num") return /^\$?\s*-?[\d,]*\.?\d+$/.test(want) && Number.isFinite(toNum(want)) ? null : `${field.label}: enter a number`;
  if (field.kind === "date") return validIso(isoDate(want)) ? null : `${field.label}: use MM/DD/YYYY`;
  return null;
}
export const queryErrors = (q: ReportQuery) => q.filters.map(filterError).filter((e): e is string => !!e);

export function matchFilter(row: ReportRow, f: ReportFilter): boolean {
  const field = FIELD_BY_ID.get(f.field);
  if (!field) return true; // unknown fields never silently drop rows
  const v = row[f.field];
  if (f.op === "empty") return blank(v);
  if (f.op === "not_empty") return !blank(v);
  const want = String(f.value ?? "").trim();
  if (!want) return true; // incomplete filter row: ignore until a value is entered
  if (filterError(f)) return false; // never broaden a query on a malformed value (routes reject these first)
  if (field.kind === "usd" || field.kind === "num") {
    if (blank(v)) return false; // unknown is not zero
    const n = toNum(want), x = Number(v);
    return f.op === "gte" ? x >= n : f.op === "lte" ? x <= n : x === n;
  }
  if (field.kind === "date") {
    if (blank(v)) return false;
    const x = isoDate(String(v)), w = isoDate(want);
    return f.op === "gte" ? x >= w : f.op === "lte" ? x <= w : x === w;
  }
  const s = String(v ?? "").toLowerCase(), w = want.toLowerCase();
  return f.op === "contains" ? s.includes(w) : f.op === "not_contains" ? !s.includes(w) : f.op === "equals" ? s === w : true;
}

export function runReport(rows: ReportRow[], q: ReportQuery): ReportRow[] {
  const search = (q.search ?? "").trim().toLowerCase();
  let out = rows.filter((r) => q.filters.every((f) => matchFilter(r, f)));
  if (search) out = out.filter((r) => `${r.name ?? ""} ${r.cptid ?? ""} ${r.city ?? ""} ${r.email ?? ""}`.toLowerCase().includes(search));
  const s = q.sort && FIELD_BY_ID.has(q.sort.field) ? q.sort : { field: "lifetime", dir: -1 as const };
  const k = FIELD_BY_ID.get(s.field)?.kind ?? "text";
  const sorted = [...out].sort((a, b) => {
    const x = a[s.field], y = b[s.field];
    if (blank(x) && blank(y)) return 0; if (blank(x)) return 1; if (blank(y)) return -1; // blanks last
    const c = k === "usd" || k === "num" ? (Number(x) || 0) - (Number(y) || 0) : k === "date" ? isoDate(String(x)).localeCompare(isoDate(String(y))) : String(x).localeCompare(String(y));
    return c * s.dir;
  });
  return q.top ? sorted.slice(0, q.top) : sorted;
}

const money = (n: string, unit?: string) => { const v = Number(n.replace(/,/g, "")); const m = (unit ?? "").toUpperCase(); return Number.isFinite(v) ? v * (m === "B" ? 1e9 : m === "M" ? 1e6 : m === "K" ? 1e3 : 1) : NaN; };
const AMT = String.raw`\$?\s*(\d[\d,]*(?:\.\d+)?)\s*([KMB])?`;
/** Conservative lower bound from a capacity band/amount. null = can't tell (never guessed). */
export function parseCapacity(raw: string | null | undefined): { min: number | null; read: string } {
  const t = String(raw ?? "").trim();
  if (!t) return { min: null, read: "" };
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  let m = new RegExp(`^(?:<|under|less than|below)\\s*${AMT}$`, "i").exec(t);
  if (m) { const v = money(m[1], m[2]); return Number.isFinite(v) ? { min: 0, read: `Under ${fmt(v)}` } : { min: null, read: "Not readable" }; }
  m = new RegExp(`^${AMT}\\s*(?:\\+|and up|or more|plus)$`, "i").exec(t);
  if (m) { const v = money(m[1], m[2]); return Number.isFinite(v) ? { min: v, read: `${fmt(v)} or more` } : { min: null, read: "Not readable" }; }
  m = new RegExp(`^${AMT}\\s*(?:-|–|—|to)\\s*${AMT}$`, "i").exec(t);
  if (m) {
    const a = money(m[1], m[2] ?? m[4]), b = money(m[3], m[4]);
    return Number.isFinite(a) && Number.isFinite(b) && a <= b ? { min: a, read: `${fmt(a)} to ${fmt(b)}` } : { min: null, read: "Not readable" };
  }
  m = new RegExp(`^${AMT}$`, "i").exec(t);
  if (m && (t.includes("$") || m[2])) { const v = money(m[1], m[2]); if (Number.isFinite(v)) return { min: v, read: fmt(v) }; }
  return { min: null, read: "Not readable" };
}

/** Keep only known fields and supported operators from an untrusted saved/posted query. */
export function sanitizeQuery(raw: unknown): ReportQuery {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fields = Array.isArray(r.fields) ? [...new Set(r.fields.map(String).filter((f) => FIELD_BY_ID.has(f)))].slice(0, REPORT_FIELDS.length) : [];
  const filters = Array.isArray(r.filters) ? r.filters.slice(0, 20).flatMap((x) => {
    const f = (x ?? {}) as Record<string, unknown>; const field = String(f.field ?? ""); const op = String(f.op ?? "") as FilterOp;
    return FIELD_BY_ID.has(field) && op in OPS ? [{ field, op, value: String(f.value ?? "").slice(0, 200) }] : [];
  }) : [];
  const so = (r.sort ?? null) as { field?: unknown; dir?: unknown } | null;
  const sort = so && FIELD_BY_ID.has(String(so.field)) ? { field: String(so.field), dir: (so.dir === 1 ? 1 : -1) as 1 | -1 } : undefined;
  const topN = Math.floor(Number(r.top));
  const top = Number.isFinite(topN) && topN >= 1 ? Math.min(TOP_MAX, topN) : undefined;
  return { fields: fields.length ? fields : [...DEFAULT_FIELDS], filters, search: String(r.search ?? "").slice(0, 200), sort, top };
}

export function describeFilters(q: ReportQuery): string[] {
  const out = q.filters.filter((f) => f.op === "empty" || f.op === "not_empty" || String(f.value ?? "").trim())
    .map((f) => `${FIELD_BY_ID.get(f.field)?.label ?? f.field} ${OPS[f.op]}${f.op === "empty" || f.op === "not_empty" ? "" : ` ${f.value}`}`);
  if (q.search?.trim()) out.push(`Search: "${q.search.trim()}"`);
  if (q.top) out.push(`Top ${q.top.toLocaleString()} by ${FIELD_BY_ID.get(q.sort?.field ?? "lifetime")?.label ?? "Lifetime giving"} (${q.sort?.dir === 1 ? "lowest" : "highest"} first)`);
  return out;
}

export const CAMPAIGN_FIELDS = ["campaignPledged", "campaignReceived"];
export const usesCampaign = (q: ReportQuery) => q.filters.some((f) => CAMPAIGN_FIELDS.includes(f.field)) || CAMPAIGN_FIELDS.includes(q.sort?.field ?? "");
const TRACKING_FIELDS = ["status", "solicitor"];
export const usesTracking = (q: ReportQuery) => q.fields.some((f) => TRACKING_FIELDS.includes(f)) || q.filters.some((f) => TRACKING_FIELDS.includes(f.field)) || TRACKING_FIELDS.includes(q.sort?.field ?? "");
export const XLSX_MAX_ROWS = 60_000;
export const PDF_MAX_ROWS = 5_000;

/** Footnotes printed on every report download. */
export function reportNotes(q: ReportQuery, campaignAvailable: boolean): string[] {
  const crit = describeFilters(q);
  const notes = [crit.length ? `Filters: ${crit.join("; ")}.` : "Filters: none (all live records).", "Merged and deleted records are excluded; staff contact and wealth edits are applied."];
  if (q.fields.some((f) => ["lifetime", "largest", "gifts", "first", "last", "years"].includes(f))) notes.push("Giving history comes from the client giving file and does not include campaign pledges.");
  if (q.fields.some((f) => CAMPAIGN_FIELDS.includes(f))) notes.push(campaignAvailable ? "Campaign pledges and campaign gifts are shown separately and are not added to giving history." : "Campaign figures were unavailable when this file was built and are left blank (unknown, not $0).");
  return notes;
}
