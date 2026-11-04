// TEST-ONLY H3c fixtures (PLAN-H3C-A1/A2 scenario 9). FICTIONAL rows for the REGISTERED destination pvas.donorsearch_results
// (CPTID float key, keyKind int, no person link, additions held). The "source" baseline rows are MOCK-SEEDED; they are NOT
// provenance evidence and NOT production data. Never imported by production code.
export const C = {
  RQ: "source_import.requests", BL: "source_import.baseline", AU: "source_import.audit", LOG: "source_import.import_log",
  PU: "engage.portal_updates", PP: "engage.portal_prospects", RAW: "pvas.donorsearch_results", XRAW: "wcbhc.donorsearch_results",
} as const;
export const H3C_TABLES = Object.freeze(Object.values(C));
export const TBL = "donorsearch_results";
/** fixed mapping, INSERTION ORDER = preview column order [DS_Rating, Major_Gift_Score] */
export const MAP = Object.freeze({ CPTID: "CPTID", "DS Rating": "DS_Rating", "Major Gift Score": "Major_Gift_Score" });
export const HDR = "CPTID,DS Rating,Major Gift Score\r\n";
// float column cells are numbers (driver returns a JS number for FLOAT); nvarchar cells are strings
const raw = (CPTID: number, DS_Rating: string, Major_Gift_Score: number) => ({ CPTID, DS_Rating, Major_Gift_Score });
const bl = (k: number, col: string, value: string, provenance = "source") => ({ client: "pvas", table_name: TBL, record_key: String(k), column_name: col, value, provenance, request_id: "seed" });
export const ROWS = { 9101: raw(9101, "R1", 10), 9102: raw(9102, "R2", 20), 9105: raw(9105, "R5", 50) } as const;
export function seedH3c(o: { unknownMgs9102?: boolean } = {}) {
  return {
    [C.RAW]: [ROWS[9101], ROWS[9102], ROWS[9105]],
    [C.BL]: [bl(9101, "DS_Rating", "R1"), bl(9101, "Major_Gift_Score", "10"), bl(9102, "DS_Rating", "R2"),
      bl(9102, "Major_Gift_Score", "20", o.unknownMgs9102 ? "unknown" : "source"), bl(9105, "DS_Rating", "R5"), bl(9105, "Major_Gift_Score", "50")],
    // cross-client row with the SAME CPTID: must never be read or written by any pvas statement
    [C.XRAW]: [{ CPTID: 9101, DS_Rating: "W1", Major_Gift_Score: 99 }],
    [C.PU]: [], [C.PP]: [],
  };
}
