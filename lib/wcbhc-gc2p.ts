import { buildGiftChart, type GiftChart, type GiftChartRow, type GiftTier } from "@/lib/gift-chart";
import type { WcbhcSnapshot, IndexRow } from "@/lib/wcbhc-data-store";
import { STATUS_RANK, type WcbhcTracking } from "@/lib/wcbhc-tracking-types";

// WCBHC rules (see skills/gc2p/clients/wcbhc/data.py and skills/gc/clients/wcbhc_12m.json):
//  - The approved $12M gift chart (May 18, 2026), not the house formula. 3 prospects per gift.
//  - Every level is shown. Prospects are seated where the committee and Catapult placed them
//    (the curated seating table), not by a formula. A committee update in the portal that sets
//    a level wins. Within a level: readiness order (Received ... Hold), then lifetime giving.
//  - Received / pledged / verbal / committed gifts stay on the chart in their seats.
export const WCBHC_GOAL = 12_000_000;
export const GC2P_MIN_LEVEL = 5_000;
export const GC2P_RATIO = 3;
export const WCBHC_LEVELS: [number, number][] = [[1, 2_500_000], [2, 1_000_000], [2, 750_000], [5, 500_000], [5, 250_000],
  [8, 100_000], [12, 50_000], [13, 25_000], [18, 10_000], [21, 5_000]];
export const STATUS_ORDER = ["Received", "Pledged", "Verbal", "Committed", "Active", "Assigned", "Cultivate", "Apply", "New referral", "Hold"];
export type PoolPerson = WcbhcSnapshot["pool"][number];
export interface SeatedLevel { row: GiftChartRow; level: number; need: number; people: PoolPerson[] }
const OFF = new Set(["Disqualified", "Committed"]);

const tierOf = (lvl: number): GiftTier => (lvl >= 50_000 ? "leadership" : lvl >= 10_000 ? "major" : "base");
const LABELS: Record<GiftTier, string> = { leadership: "Leadership gifts", major: "Major gifts", base: "Community gifts", many: "Many smaller gifts" };

/** The approved WCBHC $12M chart. Other goals fall back to the Catapult house chart. */
export function wcbhcChart(goal: number): GiftChart {
  if (goal !== WCBHC_GOAL) return buildGiftChart(goal);
  let cum = 0;
  const rows: GiftChartRow[] = WCBHC_LEVELS.map(([gifts, level]) => {
    const value = gifts * level; cum += value;
    return { gifts, level, value, cumulative: cum, prospects: gifts * GC2P_RATIO, shareOfGoal: value / goal, tier: tierOf(level) };
  });
  const namedTotal = cum;
  const tiers = (["leadership", "major", "base"] as GiftTier[]).map((tier) => {
    const tr = rows.filter((r) => r.tier === tier); const value = tr.reduce((a, r) => a + r.value, 0);
    return { tier, label: LABELS[tier], gifts: tr.reduce((a, r) => a + (r.gifts ?? 0), 0), value, shareOfGoal: value / goal };
  });
  const totalGifts = rows.reduce((a, r) => a + (r.gifts ?? 0), 0);
  const sorted = WCBHC_LEVELS.flatMap(([g, l]) => Array(g).fill(l) as number[]);
  return {
    goal, rows, tiers, totalGifts, totalProspects: totalGifts * GC2P_RATIO, namedTotal, manyValue: goal - namedTotal,
    leadGift: WCBHC_LEVELS[0][1], topTenShare: sorted.slice(0, 10).reduce((a, b) => a + b, 0) / goal,
    leadershipShare: tiers[0].value / goal,
  };
}

// Prospects the committee placed at a level who are not in the portfolio pool.
export function extrasFromIndex(index: IndexRow[] | null | undefined, t: WcbhcTracking | null | undefined, pool: PoolPerson[]): PoolPerson[] {
  if (!index || !t) return [];
  const inPool = new Set(pool.map((p) => p.cptid));
  const byId = new Map(index.map((r) => [r.cptid, r]));
  return Object.entries(t.prospects)
    .filter(([id, s]) => s.level && !OFF.has(s.status) && !inPool.has(Number(id)) && byId.has(Number(id)))
    .map(([id, s]) => {
      const r = byId.get(Number(id)) as IndexRow;
      return { cptid: r.cptid, name: r.name, lifetime: r.lifetime, gifts: r.gifts, first: "", last: r.last, largest: r.largest, years: r.years, ds: r.ds ?? "", capacity: r.capacity ?? "", capMin: r.capMin, qs: "",
        rating: s.level as number, basis: "Committee", ask: s.level as number, solicitor: s.solicitor || "Unassigned", donorType: "" };
    });
}

export function seatGc2p(goal: number, pool: PoolPerson[], t?: WcbhcTracking | null, extras: PoolPerson[] = []): { chart: GiftChart; seated: SeatedLevel[]; notShown: number; removed: { committed: number; disqualified: number }; below: PoolPerson[]; belowLevel: number } {
  const chart = wcbhcChart(goal);
  const st = t?.prospects ?? {};
  const all = [...pool, ...extras].filter((p) => !OFF.has(st[p.cptid]?.status ?? ""));
  const allLevels = chart.rows.filter((r) => r.level !== null && r.gifts !== null).map((r) => r.level as number);
  const levels = chart.rows.filter((r) => r.level !== null && r.gifts !== null && (r.level as number) >= GC2P_MIN_LEVEL);
  // Committee-pinned level wins; otherwise the curated seat, rounded down to a chart level.
  const seatOf = (p: PoolPerson) => {
    const v = st[p.cptid]?.level || p.rating || p.ask;
    return allLevels.find((l) => v >= l) ?? null;
  };
  const rank = (p: PoolPerson) => {
    const t = st[p.cptid]?.status; if (t && STATUS_RANK[t] !== undefined) return STATUS_RANK[t];
    const i = STATUS_ORDER.indexOf(p.status ?? ""); return i < 0 ? 99 : 100 + i;
  };
  const seated = levels.map((r) => {
    const level = r.level as number;
    const people = all.filter((p) => seatOf(p) === level).sort((a, b) => rank(a) - rank(b) || b.lifetime - a.lifetime);
    return { row: r, level, need: (r.gifts as number) * GC2P_RATIO, people };
  });
  // Prospects whose amount (pinned level, ask or rating) is under the lowest level shown: listed on a final "Below $X" row, never dropped.
  const belowLevel = Math.min(...seated.map((x) => x.level));
  const seatedIds = new Set(seated.flatMap((x) => x.people.map((p) => p.cptid)));
  const amountOf = (p: PoolPerson) => Number(st[p.cptid]?.level || (p as { ask?: number }).ask || p.rating || 0);
  const below = all.filter((p) => !seatedIds.has(p.cptid) && amountOf(p) > 0 && amountOf(p) < belowLevel).sort((a, b) => amountOf(b) - amountOf(a) || b.lifetime - a.lifetime);
  const notShown = goal - seated.reduce((s, x) => s + x.row.value, 0);
  const vals = Object.values(st);
  return { chart, seated, notShown, removed: { committed: vals.filter((s) => s.status === "Committed").length, disqualified: vals.filter((s) => s.status === "Disqualified").length }, below, belowLevel };
}
