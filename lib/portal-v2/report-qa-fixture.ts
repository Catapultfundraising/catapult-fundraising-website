import type { PortalState } from "./clients";

// Synthetic-only fixture for the ReportBuilder QA harness (no real names, emails use example.test).
const cities = ["Las Vegas", "Henderson", "Reno", "Carson City"];
const index = Array.from({ length: 40 }, (_, i) => ({
  cptid: 1000 + i, name: `ZZTEST Donor ${String(i + 1).padStart(2, "0")}`, kind: i % 5 ? "Individual" : "Organization", city: cities[i % 4],
  lifetime: (i + 1) * 750, gifts: i + 1, largest: (i + 1) * 250, last: `20${String(15 + (i % 10)).padStart(2, "0")}-06-15`, years: 1 + (i % 9), band: "", capMin: 0,
  ds: i % 3 ? `DS${1 + (i % 5)}` : "", capacity: i % 3 ? `$${(i + 1) * 10}K` : "",
}));
const records = Object.fromEntries(index.map((r) => [String(r.cptid), { cptid: r.cptid, contact: { city: r.city, state: "NV", email: `donor${r.cptid}@example.test`, phone: `555-01${String(r.cptid % 100).padStart(2, "0")}` }, summary: { first: "2012-01-10" } }]));
export const QA_DATA = { asOf: "Synthetic fixture", index, records };
export const QA_STATE = {
  prospects: [], batches: [],
  gifts: [{ id: 1, cptid: 1036, kind: "pledge", amount: 250000, donor_name: "ZZTEST Donor 37" }, { id: 2, cptid: 1036, kind: "gift", amount: 50000, donor_name: "ZZTEST Donor 37" }],
  updates: [{ id: 1, cptid: 1001, field: "merged_into", new_value: "1000", old_value: null }, { id: 2, cptid: 1002, field: "deleted", new_value: "QA", old_value: null }],
} as unknown as PortalState;
export const QA_TRACKING = { prospects: {} };
