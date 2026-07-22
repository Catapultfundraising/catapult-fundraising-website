export interface TierRow {
  key: string;
  constituent: string;
  year: string;
}

export const STANDARD_ROWS: TierRow[] = [
  { key: "current", constituent: "Current", year: "Current FY" },
  { key: "lapsed1", constituent: "Lapsed 1", year: "FY - 1" },
  { key: "lapsed2", constituent: "Lapsed 2", year: "FY - 2" },
  { key: "lapsed3", constituent: "Lapsed 3", year: "FY - 3" },
  { key: "lapsed4", constituent: "Lapsed 4", year: "FY - 4" },
  { key: "lapsed5plus", constituent: "Lapsed 5+", year: "FY - 5 or more" },
];

export const NON_DONORS_ROW: TierRow = {
  key: "nonDonors",
  constituent: "Non-Donors",
  year: "—",
};

export interface TierConfig {
  id: string;
  defaultLabel: string;
  placeholder: string;
  rows: TierRow[];
}

export const TIER_CONFIGS: TierConfig[] = [
  {
    id: "tier1",
    defaultLabel: "$1 - $999",
    placeholder: "e.g. $1 - $999",
    rows: [...STANDARD_ROWS, NON_DONORS_ROW],
  },
  {
    id: "tier2",
    defaultLabel: "$1,000 - $9,999",
    placeholder: "e.g. $1,000 - $9,999",
    rows: STANDARD_ROWS,
  },
  {
    id: "tier3",
    defaultLabel: "",
    placeholder: "e.g. $10,000 - $24,999",
    rows: STANDARD_ROWS,
  },
  {
    id: "tier4",
    defaultLabel: "",
    placeholder: "e.g. $25,000 - $49,999",
    rows: STANDARD_ROWS,
  },
  {
    id: "tier5",
    defaultLabel: "",
    placeholder: "e.g. $50,000 - $99,999",
    rows: STANDARD_ROWS,
  },
  {
    id: "tier6",
    defaultLabel: "",
    placeholder: "e.g. $100,000+",
    rows: STANDARD_ROWS,
  },
];

export interface TierRowValue {
  count: string;
  avgGift: string;
}

export type TierData = Record<string, TierRowValue>;

export function emptyTierData(rows: TierRow[]): TierData {
  return Object.fromEntries(rows.map((row) => [row.key, { count: "", avgGift: "" }]));
}

export function defaultTierLabels(): Record<string, string> {
  return Object.fromEntries(TIER_CONFIGS.map((tier) => [tier.id, tier.defaultLabel]));
}

export function emptyAllTierData(): Record<string, TierData> {
  return Object.fromEntries(TIER_CONFIGS.map((tier) => [tier.id, emptyTierData(tier.rows)]));
}
