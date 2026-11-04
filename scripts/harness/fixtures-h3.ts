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
