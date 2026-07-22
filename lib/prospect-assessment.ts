export interface TierRow {
  key: string;
  constituent: string;
  year: string;
}

export const TIER_1_LABEL = "Donors that have given $1 - $999";

export const TIER_1_ROWS: TierRow[] = [
  { key: "current", constituent: "Current", year: "FY26" },
  { key: "lapsed1", constituent: "Lapsed 1", year: "FY25" },
  { key: "lapsed2", constituent: "Lapsed 2", year: "FY24" },
  { key: "lapsed3", constituent: "Lapsed 3", year: "FY23" },
  { key: "lapsed4", constituent: "Lapsed 4", year: "FY22" },
  { key: "lapsed5plus", constituent: "Lapsed 5+", year: "FY21 and prior" },
  { key: "nonDonors", constituent: "Non-Donors", year: "—" },
];

export const TIER_2_LABEL = "Donors that have given $1,000 - $9,999";

export const TIER_2_ROWS: TierRow[] = TIER_1_ROWS.filter((row) => row.key !== "nonDonors");

export interface TierRowValue {
  count: string;
  avgGift: string;
}

export type TierData = Record<string, TierRowValue>;

export function emptyTierData(rows: TierRow[]): TierData {
  return Object.fromEntries(rows.map((row) => [row.key, { count: "", avgGift: "" }]));
}

export interface ProspectAssessmentPayload {
  orgName: string;
  contactName: string;
  title: string;
  email: string;
  phone: string;
  caseForSupport: string;
  solicitationHistory: string;
  tier1: TierData;
  tier2: TierData;
}
