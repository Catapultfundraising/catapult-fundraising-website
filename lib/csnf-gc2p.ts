import { buildGiftChart, type GiftChart, type GiftChartRow } from "@/lib/gift-chart";
import type { CsnfSnapshot } from "@/lib/csnf-data-store";

export const GC2P_MIN_LEVEL = 50_000;
export const GC2P_RATIO = 3;
export type PoolPerson = CsnfSnapshot["pool"][number];
export interface SeatedLevel { row: GiftChartRow; level: number; need: number; people: PoolPerson[] }

// GC2P house rules: levels of $50K and up only, 3 prospects per gift.
// Individuals are rated at the low end of their DonorSearch capacity band,
// unscreened records at their largest gift. A prospect is seated at the
// highest level they qualify for that still has room; the strongest giving
// history is seated first and the rest move down.
export function seatGc2p(goal: number, pool: PoolPerson[]): { chart: GiftChart; seated: SeatedLevel[]; notShown: number } {
  const chart = buildGiftChart(goal);
  const used = new Set<number>();
  const seated = chart.rows
    .filter((r) => r.level !== null && r.gifts !== null && (r.level as number) >= GC2P_MIN_LEVEL)
    .map((r) => {
      const level = r.level as number;
      const need = (r.gifts as number) * GC2P_RATIO;
      const people = pool
        .filter((p) => !used.has(p.cptid) && p.rating >= level)
        .sort((a, b) => b.lifetime - a.lifetime || b.rating - a.rating)
        .slice(0, need);
      people.forEach((p) => used.add(p.cptid));
      return { row: r, level, need, people };
    });
  const notShown = goal - seated.reduce((s, x) => s + x.row.value, 0);
  return { chart, seated, notShown };
}
