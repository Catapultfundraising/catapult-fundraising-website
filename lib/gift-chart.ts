/**
 * Suggested gift chart math for the public campaign gift chart calculator.
 *
 * The shape follows the charts Catapult builds for clients (the College of
 * Southern Nevada Foundation $10M chart is the reference):
 *  - Round gift levels only ($2M, $1M, $750K, $500K, $250K, $100K, $50K,
 *    $25K, $10K, $5K). No odd figures like $1.8M or $225K.
 *  - One lead gift at roughly 20 percent of goal.
 *  - The top ten gifts always carry 60 percent or more of the goal. On most
 *    goals they carry closer to 75 percent, which is the real lesson of a
 *    gift chart.
 *  - Named levels stop just short of the goal. A closing "Many" line of
 *    smaller gifts carries the last 1 percent and completes the campaign.
 *  - Roughly three qualified prospects identified for every gift needed.
 *
 * A calculated chart is a planning starting point. A real chart is built
 * against an organization's own prospect data during a feasibility study,
 * which is the point the calculator makes to the visitor.
 */

export type GiftTier = "leadership" | "major" | "base" | "many";

export type GiftChartRow = {
  /** Number of gifts needed at this level. Null on the "Many" row. */
  gifts: number | null;
  /** The gift level in dollars. Null on the "Many" row. */
  level: number | null;
  /** Upper bound of the "Many" row, e.g. 2500 renders as "Under $2,500". */
  under?: number;
  /** gifts * level */
  value: number;
  /** Running total through this row. */
  cumulative: number;
  /** Qualified prospects to identify. Null on the "Many" row. */
  prospects: number | null;
  /** Share of the goal this row represents, 0-1. */
  shareOfGoal: number;
  tier: GiftTier;
};

export type GiftTierSummary = {
  tier: GiftTier;
  label: string;
  gifts: number | null;
  value: number;
  shareOfGoal: number;
};

export type GiftChart = {
  goal: number;
  /** Named levels plus the closing "Many" row. */
  rows: GiftChartRow[];
  tiers: GiftTierSummary[];
  /** Named gifts only, excluding the "Many" row. */
  totalGifts: number;
  totalProspects: number;
  /** Value of the named levels, just short of the goal. */
  namedTotal: number;
  /** What the "Many" row carries. Named total plus this equals the goal. */
  manyValue: number;
  leadGift: number;
  /** Share of the goal carried by the largest ten gifts, 0-1. */
  topTenShare: number;
  /** Share of the goal carried by the leadership tier, 0-1. */
  leadershipShare: number;
};

export const MIN_GOAL = 100_000;
export const MAX_GOAL = 500_000_000;

const PROSPECTS_PER_GIFT = 3;

/** No named level below this, whatever the goal. */
const MIN_NAMED_LEVEL = 100;

/** Nothing smaller than this share of the goal gets its own line. */
const MIN_LEVEL_SHARE = 0.0004;

function levelFloor(goal: number): number {
  return Math.max(MIN_NAMED_LEVEL, goal * MIN_LEVEL_SHARE);
}

/** The "Many" row carries this share of the goal. */
const MANY_SHARE = 0.01;

/** Round numbers fundraisers actually put on a chart. */
const MANTISSAS = [1, 2, 2.5, 5, 7.5];

const ROUND_LEVELS: number[] = (() => {
  const levels: number[] = [];
  for (let exponent = 8; exponent >= 2; exponent -= 1) {
    for (const mantissa of MANTISSAS) {
      levels.push(mantissa * 10 ** exponent);
    }
  }
  return levels.filter((l) => l <= MAX_GOAL).sort((a, b) => b - a);
})();

/** Nearest round level on a ratio scale, so $600K goes to $500K not $750K. */
function snapLevel(amount: number, below?: number, floor: number = MIN_NAMED_LEVEL): number {
  const options = ROUND_LEVELS.filter((l) => (below === undefined || l < below) && l >= floor);
  if (options.length === 0) return 0;
  return options.reduce((best, level) =>
    Math.abs(Math.log(level / amount)) < Math.abs(Math.log(best / amount)) ? level : best
  );
}

/** The round number just below a level, used for the "Many" row bound. */
function levelBelow(level: number): number {
  const lower = ROUND_LEVELS.filter((l) => l < level);
  return lower.length > 0 ? lower[0] : Math.round(level / 2);
}

type TemplateRow = { gifts: number; share: number; tier: GiftTier };

/**
 * Shares of the goal by tier, taken from the CSN $10M chart. The top ten
 * gifts (rows one to four) carry 75 percent.
 */
const TEMPLATE: TemplateRow[] = [
  { gifts: 1, share: 0.2, tier: "leadership" },
  { gifts: 1, share: 0.1, tier: "leadership" },
  { gifts: 2, share: 0.15, tier: "leadership" },
  { gifts: 6, share: 0.3, tier: "leadership" },
  { gifts: 3, share: 0.075, tier: "major" },
  { gifts: 6, share: 0.06, tier: "major" },
  { gifts: 8, share: 0.04, tier: "major" },
  { gifts: 12, share: 0.03, tier: "major" },
  { gifts: 20, share: 0.02, tier: "base" },
  { gifts: 30, share: 0.015, tier: "base" },
];

type Draft = { gifts: number; level: number; tier: GiftTier };

/**
 * The named levels above the broad base. Gift counts are fixed, which is what
 * keeps the shape of the chart (and the top-ten rule) stable at every goal.
 * Levels are the round number nearest the share of goal that tier carries.
 */
function draftNamedRows(goal: number, boosts: number[] = []): Draft[] {
  const drafts: Draft[] = [];

  TEMPLATE.filter((row) => row.tier !== "base").forEach((row, index) => {
    const previous = drafts.length > 0 ? drafts[drafts.length - 1].level : undefined;
    let level = snapLevel((goal * row.share) / row.gifts, previous, levelFloor(goal));

    // Top rows can be nudged up a rung when the top ten gifts would
    // otherwise fall short of 60 percent of the goal.
    for (let i = 0; i < (boosts[index] ?? 0); i += 1) {
      const higher = ROUND_LEVELS.filter((l) => l > level && (previous === undefined || l < previous)).pop();
      if (higher && higher <= goal * 0.35) level = higher;
    }

    if (level >= levelFloor(goal)) drafts.push({ gifts: row.gifts, level, tier: row.tier });
  });

  return drafts;
}

/**
 * Nudges tried, in order, until the top ten gifts carry 60 percent of the
 * goal. Each entry boosts the level of the first four rows by that many
 * rungs on the round-level ladder.
 */
const TOP_TEN_BOOSTS = [
  [0, 0, 0, 0],
  [0, 0, 0, 1],
  [1, 0, 0, 1],
  [0, 0, 1, 1],
  [1, 1, 1, 1],
  [1, 1, 1, 2],
  [2, 1, 1, 2],
];

/**
 * Two broad-base levels below the major gifts, sized to carry whatever is
 * left after the named levels and before the closing "Many" row.
 */
function addBroadBase(drafts: Draft[], goal: number): void {
  const namedTotal = () => drafts.reduce((sum, r) => sum + r.gifts * r.level, 0);

  for (let row = 0; row < 2; row += 1) {
    const budget = goal * (1 - MANY_SHARE) - namedTotal();
    if (budget <= goal * 0.004) break;

    const previous = drafts[drafts.length - 1].level;
    const level = snapLevel(previous / 2.5, previous, levelFloor(goal));
    if (level < levelFloor(goal) || level >= previous) break;

    // The first broad-base level carries about half of what is left and the
    // second carries the rest, so counts climb as the dollars fall.
    const share = row === 1 ? budget : budget * 0.5;
    const gifts = Math.round(share / level);
    if (gifts < 1) break;
    drafts.push({ gifts, level, tier: "base" });
  }

  // Trim the smallest level so the named total never reaches the goal: the
  // "Many" row has to have something left to carry.
  for (let guard = 0; guard < 5000 && namedTotal() > goal * (1 - MANY_SHARE); guard += 1) {
    const last = drafts[drafts.length - 1];
    if (last.gifts > 1) last.gifts -= 1;
    else if (last.tier === "base") drafts.pop();
    else break;
    if (drafts.length === 0) break;
  }
}

/** Value of the largest ten gifts on the chart. */
function topTenValue(drafts: Draft[]): number {
  let remaining = 10;
  let value = 0;
  for (const row of drafts) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, row.gifts);
    value += take * row.level;
    remaining -= take;
  }
  return value;
}

const TIER_LABELS: Record<GiftTier, string> = {
  leadership: "Leadership gifts",
  major: "Major gifts",
  base: "Broad base",
  many: "Many smaller gifts",
};

export function buildGiftChart(goal: number): GiftChart {
  const clamped = Math.min(Math.max(Math.round(goal), MIN_GOAL), MAX_GOAL);

  // Build the named levels, nudging the lead gift up if the top ten gifts
  // do not carry at least 60 percent of the goal.
  let drafts = draftNamedRows(clamped);
  for (const boosts of TOP_TEN_BOOSTS) {
    const candidate = draftNamedRows(clamped, boosts);
    drafts = candidate;
    if (topTenValue(candidate) / clamped >= 0.6) break;
  }

  // If the named levels overshoot the goal, thin the smallest ones out.
  // Leave a few percent of the goal for the broad base and the closing
  // "Many" row. When a goal sits between round levels the named section can
  // overshoot, so scale the gift counts down proportionally rather than
  // pulling levels off the chart.
  const ceiling = clamped * 0.955;
  const named = drafts.reduce((sum, r) => sum + r.gifts * r.level, 0);
  if (named > ceiling) {
    const factor = ceiling / named;
    drafts = drafts.map((row, index) => ({
      ...row,
      gifts: index === 0 ? 1 : Math.max(1, Math.round(row.gifts * factor)),
    }));
  }

  addBroadBase(drafts, clamped);

  // Safety net: the "Many" row must always have something left to carry.
  for (let guard = 0; guard < 5000; guard += 1) {
    const total = drafts.reduce((sum, r) => sum + r.gifts * r.level, 0);
    if (total <= clamped * (1 - MANY_SHARE / 2)) break;
    const last = drafts[drafts.length - 1];
    if (last.gifts > 1) last.gifts -= 1;
    else if (drafts.length > 4) drafts.pop();
    else break;
  }

  const namedTotal = drafts.reduce((sum, r) => sum + r.gifts * r.level, 0);

  let cumulative = 0;
  const rows: GiftChartRow[] = drafts.map((row) => {
    const value = row.gifts * row.level;
    cumulative += value;
    return {
      gifts: row.gifts,
      level: row.level,
      value,
      cumulative,
      prospects: row.gifts * PROSPECTS_PER_GIFT,
      shareOfGoal: value / clamped,
      tier: row.tier,
    };
  });

  const manyValue = clamped - namedTotal;
  const smallestNamed = drafts.length > 0 ? drafts[drafts.length - 1].level : MIN_NAMED_LEVEL * 2;
  rows.push({
    gifts: null,
    level: null,
    under: levelBelow(smallestNamed),
    value: manyValue,
    cumulative: clamped,
    prospects: null,
    shareOfGoal: manyValue / clamped,
    tier: "many",
  });

  const totalGifts = drafts.reduce((sum, r) => sum + r.gifts, 0);

  const tiers: GiftTierSummary[] = (["leadership", "major", "base", "many"] as GiftTier[])
    .map((tier) => {
      const tierRows = rows.filter((r) => r.tier === tier);
      if (tierRows.length === 0) return null;
      const value = tierRows.reduce((sum, r) => sum + r.value, 0);
      const gifts = tier === "many" ? null : tierRows.reduce((sum, r) => sum + (r.gifts ?? 0), 0);
      return { tier, label: TIER_LABELS[tier], gifts, value, shareOfGoal: value / clamped };
    })
    .filter((t): t is GiftTierSummary => t !== null);

  const leadershipValue = rows
    .filter((r) => r.tier === "leadership")
    .reduce((sum, r) => sum + r.value, 0);

  return {
    goal: clamped,
    rows,
    tiers,
    totalGifts,
    totalProspects: totalGifts * PROSPECTS_PER_GIFT,
    namedTotal,
    manyValue,
    leadGift: drafts.length > 0 ? drafts[0].level : clamped,
    topTenShare: topTenValue(drafts) / clamped,
    leadershipShare: leadershipValue / clamped,
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

/** "12%" style share, rounded to the nearest half point above 1 percent. */
export function formatShare(share: number): string {
  const percent = share * 100;
  if (percent >= 10) return `${Math.round(percent)}%`;
  return `${Math.round(percent * 10) / 10}%`;
}
