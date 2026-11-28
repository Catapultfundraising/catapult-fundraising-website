// Campaign-platform slice: a "tenant" is one organization's campaign, built from uploaded files.
// Pure functions only (no server, no SQL) so the six live dashboards are untouched.
import { parseCsv } from "@/lib/portal-v2/csv-parse";
import { buildGiftChart, type GiftChart } from "@/lib/gift-chart";
import { campaignByLevel, type PortalGift, type CampaignLevel } from "@/lib/portal-v2/clients";

export type TenantRecord = { id: string; name: string; goal: number; createdAt: string; gifts: Gift[]; prospects: Prospect[]; constituents?: Constituent[] };
export type Constituent = { name: string; state: string; given: number; profile?: Record<string, string>; lifetime?: number; largest?: number; excluded?: string; ds?: DsResult };
export type DsResult = { rating: string; capacity: number; source: "sample" | "donorsearch"; confidence: "high" | "review" };
export type Gift = { donor: string; amount: number; kind: "gift" | "pledge"; date: string | null };
export type Prospect = { name: string; capacity: number; ds?: DsResult; given?: number };

export type FieldMap = Record<string, number>; // field -> column index (-1 = not mapped)
type F = { key: string; label: string; required: boolean; hints: readonly string[]; group: string };
const f = (group: string, key: string, label: string, hints: string[], required = false): F => ({ group, key, label, required, hints });
/** Mirrors Catapult's Data Specifications sheet (PPHS example), plus campaign gift columns. */
export const GIFT_FIELDS: readonly F[] = [
  f("Name & salutation", "id", "Prospect ID", ["prospect id", "constituent id", "id"]),
  f("Name & salutation", "fullName", "Addressee / full name", ["addressee", "full name", "donor name", "name", "constituent"]),
  f("Name & salutation", "salutation", "Salutation", ["salutation"]),
  f("Name & salutation", "title", "Primary title", ["primary title", "title"]),
  f("Name & salutation", "first", "Primary first name", ["primary first name", "first name", "first"]),
  f("Name & salutation", "middle", "Primary middle name", ["primary middle name", "middle name", "middle"]),
  f("Name & salutation", "last", "Primary last name", ["primary last name", "last name", "last", "surname"]),
  f("Name & salutation", "suffix", "Primary suffix", ["primary suffix", "suffix"]),
  f("Name & salutation", "sTitle", "Spouse title", ["spouse title", "secondary title"]),
  f("Name & salutation", "sFirst", "Spouse first name", ["spouse first name", "secondary first name"]),
  f("Name & salutation", "sMiddle", "Spouse middle name", ["spouse middle name", "secondary middle name"]),
  f("Name & salutation", "sLast", "Spouse last name", ["spouse last name", "secondary last name"]),
  f("Name & salutation", "sSuffix", "Spouse suffix", ["spouse suffix", "secondary suffix"]),
  f("Name & salutation", "birth", "Birthdate or age", ["birthdate", "birth date", "age", "dob"]),
  f("Home contact", "addr1", "Home address line 1", ["home address line 1", "address line 1", "address 1", "address"]),
  f("Home contact", "addr2", "Home address line 2", ["home address line 2", "address line 2", "address 2"]),
  f("Home contact", "city", "Home city", ["home city", "city"]),
  f("Home contact", "state", "Home state", ["home state", "state"]),
  f("Home contact", "zip", "Home zip / zip + four", ["home zip", "zip", "postal"]),
  f("Home contact", "homePhone", "Home phone", ["home phone", "phone"]),
  f("Home contact", "cell", "Cell phone", ["cell phone", "cell", "mobile"]),
  f("Home contact", "email", "Personal email", ["personal e-mail", "personal email", "email", "e-mail"]),
  f("Business contact", "bizPos", "Business position", ["business position", "job title", "position"]),
  f("Business contact", "bizName", "Business name", ["business name", "employer", "company"]),
  f("Business contact", "bizAddr1", "Business address line 1", ["business address line 1", "business address"]),
  f("Business contact", "bizAddr2", "Business address line 2", ["business address line 2"]),
  f("Business contact", "bizCity", "Business city", ["business city"]),
  f("Business contact", "bizState", "Business state", ["business state"]),
  f("Business contact", "bizZip", "Business zip / zip + four", ["business zip"]),
  f("Business contact", "bizPhone", "Business phone", ["business phone"]),
  f("Business contact", "bizEmail", "Business email", ["business e-mail", "business email"]),
  f("Giving history", "annual", "Regular annual giving (by fiscal year)", ["regular annual giving", "annual giving"]),
  f("Giving history", "count", "Total lifetime count of gifts", ["lifetime count", "count of gifts", "gift count"]),
  f("Giving history", "firstAmt", "First gift amount", ["first gift amount"]),
  f("Giving history", "firstDate", "First gift date", ["first gift date"]),
  f("Giving history", "lastAmt", "Last gift amount", ["last gift amount"]),
  f("Giving history", "lastDate", "Last gift date", ["last gift date"]),
  f("Giving history", "lifetime", "Total lifetime amount", ["lifetime amount", "total lifetime", "lifetime giving"]),
  f("Giving history", "largestAmt", "Largest gift amount", ["largest gift amount", "largest gift"]),
  f("Giving history", "largestDate", "Largest gift date", ["largest gift date"]),
  f("Engagement", "interest", "Special interest (how they became involved)", ["special interest", "interest"]),
  f("Engagement", "volunteer", "Volunteer (Yes/No)", ["volunteer"]),
  f("Engagement", "member", "Member (Yes/No, with level)", ["member", "membership"]),
  f("Engagement", "attendee", "Event attendee (Yes/No)", ["event attendee", "attendee"]),
  f("Exclusions & preferences", "deceased", "Deceased indicator", ["deceased"]),
  f("Exclusions & preferences", "board", "Current/past board member", ["board member", "board"]),
  f("Exclusions & preferences", "dnc", "Solicitation preferences (Do Not Contact / Call / Email / Mail / Solicit)", ["solicitation preference", "do not", "dnc"]),
  f("This campaign", "amount", "Campaign gift or pledge amount (blank = not given yet)", ["campaign gift amount", "campaign amount", "gift amount", "amount"]),
  f("This campaign", "kind", "Gift or pledge", ["gift type", "pledge", "kind", "type"]),
  f("This campaign", "date", "Campaign gift date", ["campaign gift date", "gift date", "date"]),
];
export const SPEC_HEADERS = GIFT_FIELDS.map((x) => x.label);
export const REQUIRED_NOTE = "Each person needs a name (full name, or first and last).";

export function readTable(text: string) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("The file needs a header row and at least one data row");
  return { headers: rows[0].map((h) => h.trim()), rows: rows.slice(1) };
}

/** Suggest a mapping by header name: exact hint match first, then contains. Each column used once. */
export function autoMap(headers: string[], fields: readonly { key: string; hints: readonly string[] }[]): FieldMap {
  const used = new Set<number>(); const map: FieldMap = {};
  const lower = headers.map((h) => h.toLowerCase());
  for (const pass of ["exact", "contains"] as const) {
    for (const f of fields) {
      if (map[f.key] !== undefined && map[f.key] >= 0) continue;
      const i = lower.findIndex((h, idx) => !used.has(idx) && f.hints.some((x) => (pass === "exact" ? h === x : h.includes(x))));
      if (i >= 0) { map[f.key] = i; used.add(i); }
    }
  }
  for (const f of fields) if (map[f.key] === undefined) map[f.key] = -1;
  return map;
}

export function money(s: string | undefined): number | null {
  if (!s) return null;
  const neg = /^\(.*\)$/.test(s.trim());
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  if (!isFinite(n) || s.replace(/[^0-9]/g, "") === "") return null;
  return neg ? -Math.abs(n) : n;
}

const yes = (v: string) => /^(y|yes|true|1|x|deceased)/i.test(v.trim());
/** One file holds everyone, in the Data Specifications layout. Rows with a campaign amount are gifts/pledges; the rest are prospects. Deceased and do-not-solicit rows are excluded. */
export function buildGifts(rows: string[][], m: FieldMap) {
  const gifts: Gift[] = []; const problems: string[] = [];
  const people = new Map<string, Constituent>();
  const get = (r: string[], k: string) => (m[k] >= 0 && m[k] !== undefined ? (r[m[k]] ?? "").trim() : "");
  rows.forEach((r, i) => {
    const donor = get(r, "fullName") || [get(r, "first"), get(r, "last")].filter(Boolean).join(" ");
    const raw = get(r, "amount");
    const amount = raw ? money(raw) : 0;
    if (!donor || amount === null || amount < 0) { problems.push(`Row ${i + 2}: needs a name and a valid amount (or leave the amount blank)`); return; }
    const key = (get(r, "id") || donor).toLowerCase();
    let c = people.get(key);
    if (!c) {
      const profile: Record<string, string> = {};
      for (const fd of GIFT_FIELDS) { const v = get(r, fd.key); if (v) profile[fd.key] = v; }
      const dnc = get(r, "dnc");
      c = { name: donor, state: get(r, "state"), given: 0, profile, lifetime: money(get(r, "lifetime")) ?? undefined, largest: money(get(r, "largestAmt")) ?? undefined,
        excluded: yes(get(r, "deceased")) ? "Deceased" : /do not solicit|do not contact/i.test(dnc) ? "Do not solicit" : undefined };
      people.set(key, c);
    }
    if (amount === 0) return;
    const k = get(r, "kind").toLowerCase();
    gifts.push({ donor: c.name, amount, kind: k.includes("pledge") ? "pledge" : "gift", date: get(r, "date") || null });
    c.given += amount;
  });
  return { gifts, constituents: [...people.values()], problems };
}
export function buildProspects(rows: string[][], m: FieldMap) {
  const prospects: Prospect[] = []; const problems: string[] = [];
  rows.forEach((r, i) => {
    const name = (r[m.name] ?? "").trim(); const capacity = money(r[m.capacity]);
    if (!name || capacity === null || capacity <= 0) { problems.push(`Row ${i + 2}: needs a name and a positive capacity`); return; }
    prospects.push({ name, capacity });
  });
  return { prospects, problems };
}

/** GC2P candidates are generated from the uploaded constituent file. Everyone screened and not excluded is a candidate, donors included (they can give again).
 *  Ask capacity = larger of DonorSearch capacity, largest gift and giving to date, less what they have already given to this campaign. */
export function prospectsOf(t: TenantRecord): Prospect[] {
  return (t.constituents ?? []).filter((c) => c.ds && !c.excluded).map((c) => ({ name: c.name, capacity: Math.max(Math.max(c.ds!.capacity, c.largest ?? 0, c.given) - c.given, 0), ds: c.ds, given: c.given }));
}

export type Seat = { level: number; prospect: Prospect };
export type Dashboard = { chart: GiftChart; levels: CampaignLevel[]; raised: number; pledges: number; gifts: number; donors: number; pctOfGoal: number; seats: Seat[]; unseated: Prospect[]; openSlots: Record<number, number> };

/** GC2P: seat open prospects, largest capacity first, at the highest level they can reach that still has an open slot. Donors are candidates for further gifts; their remaining capacity is used. */
export function buildDashboard(t: TenantRecord): Dashboard {
  const chart = buildGiftChart(t.goal);
  const pg: PortalGift[] = t.gifts.map((g, i) => ({ id: i, cptid: null, donor_name: g.donor, kind: g.kind, amount: g.amount, gift_date: g.date }));
  const c = campaignByLevel(chart, pg);
  const open: Record<number, number> = {}; c.levels.forEach((l) => (open[l.level] = l.remaining));
  const levelsDesc = c.levels.map((l) => l.level).sort((a, b) => b - a);
  const seats: Seat[] = []; const unseated: Prospect[] = [];
  for (const p of [...prospectsOf(t)].sort((a, b) => b.capacity - a.capacity)) {
    if (p.capacity <= 0) continue;
    const lvl = levelsDesc.find((l) => l <= p.capacity && open[l] > 0);
    if (lvl === undefined) { unseated.push(p); continue; }
    open[lvl]--; seats.push({ level: lvl, prospect: p });
  }
  return { chart, levels: c.levels, raised: c.raised, pledges: c.totalPledges, gifts: c.totalGifts, donors: c.donors.length, pctOfGoal: t.goal ? c.raised / t.goal : 0, seats, unseated, openSlots: open };
}

export const SAMPLE_GIFTS_CSV = (() => {
  const head = ["Prospect ID", "Addressee / full name", "Primary first name", "Primary last name", "Home city", "Home state", "Total lifetime amount", "Largest gift amount", "Deceased indicator", "Solicitation preferences", "Campaign gift or pledge amount", "Gift or pledge", "Campaign gift date"];
  const r = [
    ["P001", "Harbor Family Trust", "", "", "Newark", "NJ", "300000", "100000", "", "", "250000", "Pledge", "2026-09-14"],
    ["P002", "Alder Foundation", "", "", "Newark", "NJ", "150000", "50000", "", "", "100000", "Gift", "2026-09-30"],
    ["P003", "Marisol Ortega", "Marisol", "Ortega", "Montclair", "NJ", "60000", "25000", "", "", "50000", "Pledge", "2026-10-05"],
    ["P004", "Kestrel Bank", "", "", "Newark", "NJ", "40000", "10000", "", "", "25000", "Gift", "2026-10-12"],
    ["P005", "Priya Nand", "Priya", "Nand", "Summit", "NJ", "30000", "25000", "", "", "25000", "Gift", "2026-10-20"],
    ["P006", "Westfield Rotary", "", "", "Westfield", "NJ", "12000", "10000", "", "", "10000", "Gift", "2026-11-01"],
    ["P007", "Linda Park", "Linda", "Park", "Edison", "NJ", "8000", "5000", "", "", "5000", "Gift", "2026-11-08"],
    ["P008", "Ellis Family Fund", "", "", "Princeton", "NJ", "20000", "10000", "", "", "", "", ""],
    ["P009", "Bright Horizon Partners", "", "", "Newark", "NJ", "5000", "5000", "", "", "", "", ""],
    ["P010", "Samuel Reyes", "Samuel", "Reyes", "Livingston", "NJ", "15000", "7500", "", "", "", "", ""],
    ["P011", "Naomi Fitch", "Naomi", "Fitch", "Maplewood", "NJ", "4000", "2000", "", "", "", "", ""],
    ["P012", "Corliss Construction", "", "", "Paterson", "NJ", "9000", "3000", "", "", "", "", ""],
    ["P013", "Evelyn Strand", "Evelyn", "Strand", "Hoboken", "NJ", "2500", "1000", "Yes", "", "", "", ""],
    ["P014", "Miguel Santos", "Miguel", "Santos", "Newark", "NJ", "7000", "2500", "", "Do Not Solicit", "", "", ""],
  ];
  return [head, ...r].map((x) => x.join(",")).join("\n") + "\n";
})();
/** Blank template with every recommended field from the Data Specifications sheet. */
export const TEMPLATE_CSV = SPEC_HEADERS.map((h) => `"${h}"`).join(",") + "\n";
export const SAMPLE_PROSPECTS_CSV = `Prospect,Capacity
Ellis Family Fund,250000
Bright Horizon Partners,100000
Dr. Samuel Reyes,50000
Naomi Fitch,50000
Corliss Construction,25000
Janet & Rob Whitaker,25000
Oakmont Credit Union,10000
Miguel Santos,10000
Harbor Family Trust,250000
Evelyn Strand,5000
`;
