import { buildGiftChart, type GiftChart, type GiftChartRow, type GiftTier } from "@/lib/gift-chart";
import type { PvasSnapshot, IndexRow } from "@/lib/pvas-data-store";
import { STATUS_RANK, type PvasTracking } from "@/lib/pvas-tracking-types";

// PVAS rules (Jeff, 10/6/26; see skills/gc2p/clients/pvas/data.py):
//  - The approved $9M gift chart (prepared September 18, 2026), not the house formula.
//  - GC2P shows the Top 10 gifts only: levels of $250K and up.
//  - Every prospect is seated by the Campaign Ask in the portfolio, rounded DOWN
//    to the nearest gift-chart level (a $400K ask sits at $250K). All prospects at a
//    level are shown, largest ask first. Primary Solicitor only; Unassigned stays on.
//  - Stewardship (committed) records are off the chart.
export const PVAS_GOAL = 9_000_000;
export const GC2P_MIN_LEVEL = 250_000;
export const GC2P_RATIO = 3;
export const PVAS_LEVELS: [number, number][] = [[1, 1_500_000], [1, 1_000_000], [4, 500_000], [4, 250_000], [12, 100_000],
  [16, 50_000], [20, 25_000], [60, 10_000], [80, 5_000]];
export type PoolPerson = PvasSnapshot["pool"][number];
export interface SeatedLevel { row: GiftChartRow; level: number; need: number; people: PoolPerson[] }
const OFF = new Set(["Disqualified", "Committed"]);

const tierOf = (lvl: number): GiftTier => (lvl >= GC2P_MIN_LEVEL ? "leadership" : lvl >= 25_000 ? "major" : "base");
const LABELS: Record<GiftTier, string> = { leadership: "Leadership gifts (Top 10)", major: "Major gifts", base: "Broad base", many: "Many smaller gifts" };

/** The approved PVAS $9M chart. Other goals fall back to the Catapult house chart. */
export function pvasChart(goal: number): GiftChart {
  if (goal !== PVAS_GOAL) return buildGiftChart(goal);
  let cum = 0;
  const rows: GiftChartRow[] = PVAS_LEVELS.map(([gifts, level]) => {
    const value = gifts * level; cum += value;
    return { gifts, level, value, cumulative: cum, prospects: gifts * GC2P_RATIO, shareOfGoal: value / goal, tier: tierOf(level) };
  });
  const namedTotal = cum;
  const tiers = (["leadership", "major", "base"] as GiftTier[]).map((tier) => {
    const tr = rows.filter((r) => r.tier === tier); const value = tr.reduce((a, r) => a + r.value, 0);
    return { tier, label: LABELS[tier], gifts: tr.reduce((a, r) => a + (r.gifts ?? 0), 0), value, shareOfGoal: value / goal };
  });
  const totalGifts = rows.reduce((a, r) => a + (r.gifts ?? 0), 0);
  const sorted = PVAS_LEVELS.flatMap(([g, l]) => Array(g).fill(l) as number[]);
  return {
    goal, rows, tiers, totalGifts, totalProspects: totalGifts * GC2P_RATIO, namedTotal, manyValue: goal - namedTotal,
    leadGift: PVAS_LEVELS[0][1], topTenShare: sorted.slice(0, 10).reduce((a, b) => a + b, 0) / goal,
    leadershipShare: tiers[0].value / goal,
  };
}

// Prospects the committee placed at a level who are not in the portfolio pool.
export function extrasFromIndex(index: IndexRow[] | null | undefined, t: PvasTracking | null | undefined, pool: PoolPerson[]): PoolPerson[] {
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

export function seatGc2p(goal: number, pool: PoolPerson[], t?: PvasTracking | null, extras: PoolPerson[] = []): { chart: GiftChart; seated: SeatedLevel[]; notShown: number; removed: { committed: number; disqualified: number } } {
  const chart = pvasChart(goal);
  const st = t?.prospects ?? {};
  const all = [...pool, ...extras].filter((p) => !OFF.has(st[p.cptid]?.status ?? ""));
  const allLevels = chart.rows.filter((r) => r.level !== null && r.gifts !== null).map((r) => r.level as number);
  const levels = chart.rows.filter((r) => r.level !== null && r.gifts !== null && (r.level as number) >= GC2P_MIN_LEVEL);
  // Committee-pinned level wins; otherwise the Campaign Ask, rounded down to a chart level.
  const seatOf = (p: PoolPerson) => {
    const v = st[p.cptid]?.level || p.ask || p.rating;
    return allLevels.find((l) => v >= l) ?? null;
  };
  const rank = (p: PoolPerson) => STATUS_RANK[st[p.cptid]?.status ?? ""] ?? 99;
  const seated = levels.map((r) => {
    const level = r.level as number;
    const people = all.filter((p) => seatOf(p) === level).sort((a, b) => (b.ask || 0) - (a.ask || 0) || rank(a) - rank(b) || b.lifetime - a.lifetime);
    return { row: r, level, need: (r.gifts as number) * GC2P_RATIO, people };
  });
  const notShown = goal - seated.reduce((s, x) => s + x.row.value, 0);
  const vals = Object.values(st);
  return { chart, seated, notShown, removed: { committed: vals.filter((s) => s.status === "Committed").length, disqualified: vals.filter((s) => s.status === "Disqualified").length } };
}
