// FICTIONAL local fixture for the CSV updater preview (names, CPTIDs and contacts are invented).
// Only reachable when demoAllowed() is true (local dev with CSV_UPDATES_DEMO=1); never touches Engage, SQL or Blob.
import type { CsvClient, PreviewInputs } from "@/lib/portal-v2/csv-updates";

export const DEMO_CSV = [
  "CPTID,Name,Street,City,State,ZIP,Phone,Email",
  "1001,Avery Lindqvist,12 Orchard Lane,Maple Ridge,TX,78501,(956) 555-0101,avery@example.org",
  "1002,Brook Okafor,,Cedar Falls,,,,",
  "1003,Casey Marchetti,,,,,(956) 555-0133,",
  "1004,Devon Ashworth,\"400 Main St, Apt 2\",Maple Ridge,TX,78504,,devon.ashworth@example.org",
  "1005,Emery Castellanos,,,,7850,,not-an-email",
  "1006,Finley Novak,,Pine Hollow,,,,",
  "1007,Gray Whitfield,,Pine Hollow,,,,",
  "9999,Unknown Person,,Elm City,,,,",
  "1008,Harper Quint,,,,,,",
].join("\r\n") + "\r\n";

export function demoSource(_client: CsvClient): Omit<PreviewInputs, "client"> {
  const rec = (name: string, contact: Record<string, string>) => ({ name, contact });
  return {
    asOf: "2026-01-05",
    records: {
      "1001": rec("Avery Lindqvist", { address: "12 Orchard Ln", city: "Maple Ridge", state: "TX", zip: "78501", phone: "(956) 555-0100", email: "avery@example.org" }),
      "1002": rec("Brook Okafor", { street: "88 River Rd", city: "Maple Ridge", state: "TX", zip: "78502" }),
      "1003": rec("Casey Marchetti", { street: "5 Hill St", city: "Maple Ridge", phone: "(956) 555-0130" }),
      "1004": rec("Devon Ashworth", { street: "17 Pecan Ct", city: "Maple Ridge", state: "TX", zip: "78504", email: "devon@example.org" }),
      "1005": rec("Emery Castellanos", { city: "Maple Ridge", zip: "78505" }),
      "1007": rec("Gray Whitfield", { city: "Maple Ridge" }),
      "1008": rec("Harper Quint", { city: "Maple Ridge" }),
    },
    // 1002 city was edited by hand in the dashboard (protected); 1003 phone came from an earlier CSV-updater batch (updatable).
    updates: [
      { id: 501, cptid: 1002, field: "contact:city", new_value: "Lakeview", batch_id: 41, created_by: "Staff (shared login)" },
      { id: 502, cptid: 1003, field: "contact:phone", new_value: "(956) 555-0131", batch_id: 42, created_by: "Staff (shared login)" },
      { id: 503, cptid: 1007, field: "deleted", new_value: "Duplicate", batch_id: 43, created_by: "Staff (shared login)" },
    ],
    prospects: [{ cptid: 1006, source: "manual" }],
    ownedBatchIds: [42],
    maxBatchId: 43,
  };
}
