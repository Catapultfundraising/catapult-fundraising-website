/**
 * Suggested gift chart math for the public campaign gift chart calculator.
 *
 * House rules this follows (Catapult standard, see the printed charts we
 * produce for clients):
 *  - Round gift levels only ($2M, $1M, $500K, $250K, $100K, $50K, $25K and so
 *    on). No odd figures like $1.8M or $225K.
 *  - One lead gift at roughly 20 percent of goal.
 *  - The named levels reach the goal by the end of the chart. There is no
 *    unpriced "many smaller gifts" line carrying the balance.
 *  - Roughly three qualified prospects identified for every gift needed.
 *
 * A calculated chart is a planning starting point. A real chart is built
 * against an organization's own prospect data during a feasibility study,
 * which is the point the calculator makes to the visitor.
 */

export type GiftChartRow = {
  /** Number of gifts needed at this level. */
  gifts: number;
  /** The gift level in dollars. */
  level: number;
  /** gifts * level */
  value: number;
  /** Running total through this row. */
  cumulative: number;
  /** Qualified prospects to identify for this row. */
  prospects: number;
  /** Share of the goal this row represents, 0-1. */
  shareOfGoal: number;
};

export type GiftChart = {
  goal: number;
  rows: GiftChartRow[];
  totalGifts: number;
  totalProspects: number;
  /** Sum of all rows. Equals the goal for every goal the UI allows. */
  total: number;
  leadGift: number;
  /** Share of the goal carried by the top three levels, 0-1. */
  topThreeLevelsShare: number;
};

export const MIN_GOAL = 100_000;
export const MAX_GOAL = 500_000_000;

/**
 * Round levels used for the levels below the lead gift. This is a clean
 * doubling ladder, so halving from any level always lands on another level.
 */
const DESCENT_LEVELS = [
  50_000_000, 25_000_000, 10_000_000, 5_000_000, 2_500_000, 1_000_000, 500_000, 250_000, 100_000,
  50_000, 25_000, 10_000, 5_000, 2_500, 1_000,
];

/**
 * Lead gifts may also sit on the in-between round numbers fundraisers
 * actually use, like a $2M lead on a $9M campaign.
 */
const LEAD_LEVELS = [...DESCENT_LEVELS, 20_000_000, 2_000_000, 200_000].sort((a, b) => b - a);

function snapTo(levels: number[], amount: number): number {
  return levels.reduce((best, level) =>
    Math.abs(level - amount) < Math.abs(best - amount) ? level : best
  );
}

/**
 * Share of the remaining goal (after the lead gift) carried by each level
 * below the lead. Declining shares down the chart are what produce the
 * familiar pyramid: a few large gifts doing most of the work.
 */
const TIER_SHARES = [0.235, 0.22, 0.205, 0.19, 0.15];

const PROSPECTS_PER_GIFT = 3;

export function buildGiftChart(goal: number): GiftChart {
  const clamped = Math.min(Math.max(Math.round(goal), MIN_GOAL), MAX_GOAL);

  // Lead gift at roughly 20 percent of goal, snapped to a round level.
  const leadGift = snapTo(LEAD_LEVELS, clamped * 0.2);

  // Levels below the lead: halve, then snap, then drop duplicates and
  // anything too small to belong on a chart for this goal.
  const levels: number[] = [leadGift];
  let candidate = leadGift;
  while (levels.length < TIER_SHARES.length + 1) {
    candidate = candidate / 2;
    const snapped = snapTo(DESCENT_LEVELS, candidate);
    if (snapped < clamped * 0.002) break;
    if (snapped >= levels[levels.length - 1]) break;
    levels.push(snapped);
  }

  const remaining = clamped - leadGift;
  const shares = TIER_SHARES.slice(0, levels.length - 1);
  const shareTotal = shares.reduce((a, b) => a + b, 0);

  const counts: number[] = [1];
  levels.slice(1).forEach((level, i) => {
    const target = (remaining * shares[i]) / shareTotal;
    const previous = counts[counts.length - 1];
    counts.push(Math.max(previous + 1, Math.round(target / level)));
  });

  // Balance on the lowest level so the chart reaches the goal exactly.
  const lowestLevel = levels[levels.length - 1];
  const before = counts.reduce((sum, c, i) => sum + c * levels[i], 0);
  const adjustment = Math.round((clamped - before) / lowestLevel);
  counts[counts.length - 1] = Math.max(
    counts[counts.length - 2],
    counts[counts.length - 1] + adjustment
  );

  let cumulative = 0;
  const rows: GiftChartRow[] = counts.map((gifts, i) => {
    const level = levels[i];
    const value = gifts * level;
    cumulative += value;
    return {
      gifts,
      level,
      value,
      cumulative,
      prospects: gifts * PROSPECTS_PER_GIFT,
      shareOfGoal: value / clamped,
    };
  });

  const total = cumulative;
  const totalGifts = rows.reduce((sum, r) => sum + r.gifts, 0);

  return {
    goal: clamped,
    rows,
    totalGifts,
    totalProspects: totalGifts * PROSPECTS_PER_GIFT,
    total,
    leadGift,
    topThreeLevelsShare: rows.slice(0, 3).reduce((sum, r) => sum + r.value, 0) / total,
  };
}

/** "$2,500,000" */
export function formatDollars(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

/** "$2.5M" / "$250K" for tight spaces like the pyramid graphic. */
export function formatCompactDollars(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${millions % 1 === 0 ? millions : millions.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `$${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K`;
  }
  return formatDollars(amount);
}
