// TEST-ONLY H3a fixtures (PLAN-H3-A1 §1). FICTIONAL: schema "fict" is NOT the real WCBHC schema; client code "wcbhc" is used
// only so the website CSV client allowlist passes. Never imported by production code.
export const H3_REG = Object.freeze({
  id: "h3_fict_gifts", version: 1, client: "wcbhc", scope: "h3-fict-gift-export",
  schema: "fict", table: "raw_gifts", locator: "row_id", person: "CPTID", native: "Transaction",
  columns: [{ col: "Gift_Amount", ty: "decimal", len: null, p: 19, s: 4 }, { col: "Gift_Date", ty: "datetime2", len: null, p: null, s: null }, { col: "Record_Type", ty: "nvarchar", len: -1, p: null, s: null }],
  required: ["Gift_Amount", "Gift_Date"], master: { schema: "fict", table: "constituents", col: "CPTID" },
  locatorVerifiedUnique: true, rowAllocator: { kind: "locked-max" as const, min: 1, max: 2147483647 },
});
const REC = { client: "wcbhc", approvalId: "h3-fict-approval-01", approvalVersion: 1, approvedBy: "Fictional Reviewer", approvedAt: "2026-01-01T00:00:00Z" };
export const H3_ACT = Object.freeze({ approvals: [REC], latch: [REC] });
export const H3_ACT_NONE = Object.freeze({ approvals: [], latch: [] });
export const T = {
  RQ: "source_import.requests", LG: "source_import.gift_ledger", JB: "source_import.import_job", MF: "source_import.gift_job_manifest",
  BT: "source_import.import_job_batch", AS: "source_import.gift_source_association", ID: "source_import.gift_identity", DC: "source_import.gift_decision",
  BL: "source_import.baseline", AU: "source_import.audit", LOG: "source_import.import_log", PU: "engage.portal_updates", PP: "engage.portal_prospects",
  GO: "engage.portal_gift_overrides", RAW: "fict.raw_gifts", MS: "fict.constituents",
} as const;
export const H3_TABLES = Object.freeze(Object.values(T));
export const H3_SEED = Object.freeze({ [T.MS]: [{ CPTID: 7001 }, { CPTID: 7002 }] });
// H3b (PLAN-H3B §3): pre-existing raw rows L41 (7001) and L42 (7002) WITHOUT identities, plus donor 7003 in the master.
// Raw cells are canonical text the backend accepts (decimal at scale 4, datetime2 seconds). FICTIONAL.
const RAW = (row_id: number, CPTID: number, amt: string, dt: string) => ({ row_id, CPTID, Transaction: null, Gift_Amount: amt, Gift_Date: dt, Record_Type: "Gift" });
export const H3B_SEED = Object.freeze({ [T.MS]: [{ CPTID: 7001 }, { CPTID: 7002 }, { CPTID: 7003 }], [T.RAW]: [RAW(41, 7001, "5.0000", "2025-03-01T00:00:00"), RAW(42, 7002, "7.0000", "2025-04-01T00:00:00")] });
