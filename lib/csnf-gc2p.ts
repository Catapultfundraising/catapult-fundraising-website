import { buildGiftChart, type GiftChart, type GiftChartRow } from "@/lib/gift-chart";
import type { CsnfSnapshot, IndexRow } from "@/lib/csnf-data-store";
import { STATUS_RANK, type CsnfTracking } from "@/lib/csnf-tracking-types";

export const GC2P_MIN_LEVEL = 50_000;
export const GC2P_RATIO = 3;
export type PoolPerson = CsnfSnapshot["pool"][number];
export interface SeatedLevel { row: GiftChartRow; level: number; need: number; people: PoolPerson[] }
const OFF = new Set(["Disqualified", "Committed"]);

// Prospects the committee placed at a level who are not in the screened pool.
export function extrasFromIndex(index: IndexRow[] | null | undefined, t: CsnfTracking | null | undefined, pool: PoolPerson[]): PoolPerson[] {
  if (!index || !t) return [];
  const inPool = new Set(pool.map((p) => p.cptid));
  const byId = new Map(index.map((r) => [r.cptid, r]));
  return Object.entries(t.prospects)
    .filter(([id, s]) => s.level && !OFF.has(s.status) && !inPool.has(Number(id)) && byId.has(Number(id)))
    .map(([id, s]) => {
      const r = byId.get(Number(id)) as IndexRow;
      return { cptid: r.cptid, name: r.name, lifetime: r.lifetime, gifts: r.gifts, first: "", last: r.last, largest: r.largest, years: r.years, ds: r.ds ?? "", capacity: r.capacity ?? "", capMin: r.capMin, qs: "", rating: s.level as number, basis: "Committee" };
    });
}

// GC2P house rules: levels of $50K and up only, 3 prospects per gift.
// Committee updates come first: Disqualified and Committed prospects drop off,
// and anyone the committee placed at a gift level is seated there. Remaining
// seats are filled automatically: individuals at the low end of their
// DonorSearch capacity, unscreened records at their largest gift, strongest
// giving history first, the rest moving down a level.
export function seatGc2p(goal: number, pool: PoolPerson[], t?: CsnfTracking | null, extras: PoolPerson[] = []): { chart: GiftChart; seated: SeatedLevel[]; notShown: number; removed: { committed: number; disqualified: number } } {
  const chart = buildGiftChart(goal);
  const st = t?.prospects ?? {};
  const all = [...pool, ...extras].filter((p) => !OFF.has(st[p.cptid]?.status ?? ""));
  const levels = chart.rows.filter((r) => r.level !== null && r.gifts !== null && (r.level as number) >= GC2P_MIN_LEVEL);
  const levelVals = levels.map((r) => r.level as number);
  // A pinned level snaps to the nearest chart level at or below it.
  const pinOf = (p: PoolPerson) => {
    const lv = st[p.cptid]?.level;
    if (!lv) return null;
    return levelVals.find((v) => v <= lv) ?? null;
  };
  const used = new Set<number>(all.filter((p) => pinOf(p) !== null).map((p) => p.cptid));
  const rank = (p: PoolPerson) => STATUS_RANK[st[p.cptid]?.status ?? ""] ?? 99;
  const seated = levels.map((r) => {
    const level = r.level as number;
    const need = (r.gifts as number) * GC2P_RATIO;
    const pinned = all.filter((p) => pinOf(p) === level);
    const auto = all
      .filter((p) => !used.has(p.cptid) && p.rating >= level)
      .sort((a, b) => rank(a) - rank(b) || b.lifetime - a.lifetime || b.rating - a.rating)
      .slice(0, Math.max(0, need - pinned.length));
    auto.forEach((p) => used.add(p.cptid));
    const people = [...pinned, ...auto].sort((a, b) => rank(a) - rank(b) || b.lifetime - a.lifetime);
    return { row: r, level, need, people };
  });
  const notShown = goal - seated.reduce((s, x) => s + x.row.value, 0);
  const vals = Object.values(st);
  return { chart, seated, notShown, removed: { committed: vals.filter((s) => s.status === "Committed").length, disqualified: vals.filter((s) => s.status === "Disqualified").length } };
}
