// Campaign-platform slice: a "tenant" is one organization's campaign, built from uploaded files.
// Pure functions only (no server, no SQL) so the six live dashboards are untouched.
import { parseCsv } from "@/lib/portal-v2/csv-parse";
import { buildGiftChart, type GiftChart } from "@/lib/gift-chart";
import { campaignByLevel, type PortalGift, type CampaignLevel } from "@/lib/portal-v2/clients";

export type TenantRecord = { id: string; name: string; goal: number; createdAt: string; gifts: Gift[]; prospects: Prospect[]; constituents?: Constituent[] };
export type Constituent = { name: string; state: string; given: number; ds?: DsResult };
export type DsResult = { rating: string; capacity: number; source: "sample" | "donorsearch"; confidence: "high" | "review" };
export type Gift = { donor: string; amount: number; kind: "gift" | "pledge"; date: string | null };
export type Prospect = { name: string; capacity: number; ds?: DsResult; given?: number };

export type FieldMap = Record<string, number>; // field -> column index (-1 = not mapped)
export const GIFT_FIELDS = [
  { key: "donor", label: "Donor name", required: true, hints: ["donor", "name", "constituent", "full name"] },
  { key: "amount", label: "Gift amount (blank = not given yet)", required: false, hints: ["amount", "gift amount", "total", "value"] },
  { key: "state", label: "State (for DonorSearch)", required: false, hints: ["state"] },
  { key: "kind", label: "Gift or pledge", required: false, hints: ["type", "kind", "gift type", "pledge"] },
  { key: "date", label: "Date", required: false, hints: ["date", "gift date"] },
] as const;
export const PROSPECT_FIELDS = [
  { key: "name", label: "Prospect name", required: true, hints: ["name", "prospect", "donor", "full name"] },
  { key: "capacity", label: "Capacity / ask", required: true, hints: ["capacity", "ask", "rating", "potential", "amount"] },
] as const;

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

/** One file holds everyone: rows with an amount are gifts/pledges; rows without are prospects not yet giving. */
export function buildGifts(rows: string[][], m: FieldMap) {
  const gifts: Gift[] = []; const problems: string[] = [];
  const people = new Map<string, Constituent>();
  rows.forEach((r, i) => {
    const donor = (r[m.donor] ?? "").trim(); const raw = m.amount >= 0 ? (r[m.amount] ?? "").trim() : "";
    const amount = raw ? money(raw) : 0;
    if (!donor || amount === null || amount < 0) { problems.push(`Row ${i + 2}: needs a donor name and a valid amount (or leave the amount blank)`); return; }
    const key = donor.toLowerCase();
    const c = people.get(key) ?? { name: donor, state: m.state >= 0 ? (r[m.state] ?? "").trim() : "", given: 0 };
    people.set(key, c);
    if (amount === 0) return;
    const k = m.kind >= 0 ? (r[m.kind] ?? "").toLowerCase() : "";
    gifts.push({ donor, amount, kind: k.includes("pledge") ? "pledge" : "gift", date: m.date >= 0 ? (r[m.date] ?? "").trim() || null : null });
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

/** GC2P source: the uploaded file itself. Ask = larger of DonorSearch capacity and giving history; a separate prospect list still works as a fallback. */
export function prospectsOf(t: TenantRecord): Prospect[] {
  const fromFile = (t.constituents ?? []).filter((c) => c.given === 0 && c.ds).map((c) => ({ name: c.name, capacity: Math.max(c.ds!.capacity, c.given), ds: c.ds, given: c.given }));
  return fromFile.length ? fromFile : t.prospects;
}

export type Seat = { level: number; prospect: Prospect };
export type Dashboard = { chart: GiftChart; levels: CampaignLevel[]; raised: number; pledges: number; gifts: number; donors: number; pctOfGoal: number; seats: Seat[]; unseated: Prospect[]; openSlots: Record<number, number> };

/** GC2P: seat open prospects, largest capacity first, at the highest level they can reach that still has an open slot. Prospects already giving are skipped. */
export function buildDashboard(t: TenantRecord): Dashboard {
  const chart = buildGiftChart(t.goal);
  const pg: PortalGift[] = t.gifts.map((g, i) => ({ id: i, cptid: null, donor_name: g.donor, kind: g.kind, amount: g.amount, gift_date: g.date }));
  const c = campaignByLevel(chart, pg);
  const open: Record<number, number> = {}; c.levels.forEach((l) => (open[l.level] = l.remaining));
  const levelsDesc = c.levels.map((l) => l.level).sort((a, b) => b - a);
  const giving = new Set(t.gifts.map((g) => g.donor.trim().toLowerCase()));
  const seats: Seat[] = []; const unseated: Prospect[] = [];
  for (const p of [...prospectsOf(t)].sort((a, b) => b.capacity - a.capacity)) {
    if (giving.has(p.name.trim().toLowerCase())) continue;
    const lvl = levelsDesc.find((l) => l <= p.capacity && open[l] > 0);
    if (lvl === undefined) { unseated.push(p); continue; }
    open[lvl]--; seats.push({ level: lvl, prospect: p });
  }
  return { chart, levels: c.levels, raised: c.raised, pledges: c.totalPledges, gifts: c.totalGifts, donors: c.donors.length, pctOfGoal: t.goal ? c.raised / t.goal : 0, seats, unseated, openSlots: open };
}

export const SAMPLE_GIFTS_CSV = `Donor Name,Amount,Type,Date,State
Harbor Family Trust,250000,Pledge,2026-09-14,NJ
Alder Foundation,100000,Gift,2026-09-30,NJ
Marisol & Dean Ortega,50000,Pledge,2026-10-05,NJ
Kestrel Bank,25000,Gift,2026-10-12,NJ
Priya Nand,25000,Gift,2026-10-20,NJ
Westfield Rotary,10000,Gift,2026-11-01,NJ
Tom Albrecht,10000,Pledge,2026-11-03,NJ
Linda Park,5000,Gift,2026-11-08,NJ
Greene Hardware,2500,Gift,2026-11-10,NJ
Ruth Calloway,1000,Gift,2026-11-12,NJ
Ellis Family Fund,,,,NJ
Bright Horizon Partners,,,,NJ
Dr. Samuel Reyes,,,,NJ
Naomi Fitch,,,,NJ
Corliss Construction,,,,NJ
Janet & Rob Whitaker,,,,NJ
Oakmont Credit Union,,,,NJ
Miguel Santos,,,,NJ
Evelyn Strand,,,,NJ
`;
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
