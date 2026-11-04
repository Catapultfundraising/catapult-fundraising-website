// SYNTHETIC TESTS for PLAN-N on the website (fictional data; no network, no SQL). Preview parity for the active
// dashboard gift correction hold, prepared giftClass + digest v3 parity with Engage. Protects ALREADY ACTIVE overrides only.
import test from "node:test";
import assert from "node:assert/strict";
import { REGISTRY_META, OVERRIDE_HELD_TABLES } from "../lib/portal-v2/source-registry";
import { livePreview, GIFT_OVERRIDE_HELD_TEXT, type EngageState } from "../lib/portal-v2/source-import-apply";
import { preparedDigest, validatePrepared, type PreparedClient } from "../lib/portal-v2/source-reconcile";

const SECRET = "x".repeat(32);
const meta = { fileName: "f.csv", csv: "TID,P,N\n11,7011,New\n", fileDate: null, secret: SECRET, now: 1000 };
const base = { client: "wcbhc", table: "giving_history", mode: "update" as const, mapping: { TID: "Transaction_ID", P: "CPTID", N: "Donor_Name" }, rows: [{ TID: "11", P: "7011", N: "New" }, { TID: "12", P: "7012", N: "Same" }] };
const state = (over: Partial<EngageState> = {}): EngageState => ({ registryRev: REGISTRY_META.rev, personLink: "CPTID", duplicateKeys: [],
  current: [{ key: 11, person: 7011, values: { Donor_Name: "Old" }, unreadable: [] }, { key: 12, person: 7012, values: { Donor_Name: "Same" }, unreadable: [] }],
  baseline: [{ key: 11, col: "Donor_Name", value: "Old" }, { key: 12, col: "Donor_Name", value: "Same" }], overlayKeys: [], prospectKeys: [], ...over });

test("held list equals Engage's exact 5 native gift tables", () => {
  assert.deepEqual([...OVERRIDE_HELD_TABLES].sort(), ["csnf.Raw_Data_Gift_File", "pvas.givebutter_pledges", "pvas.givebutter_transactions", "wcbhc.giving_history", "wcbhc.non_campaign_giving_history"]);
  assert.equal(REGISTRY_META.rev, "7c9dea6f2783fdce54f43cf7cee8946a3dd7b524445ca559800b7fde09425fc0");
});
test("no active override: normal token for the changed row", () => {
  const lp = livePreview(base, state({ overrideHold: false }), meta);
  assert.equal(lp.overrideHold, false); assert.ok(lp.token); assert.equal(lp.result.rows[0].outcome, "update");
});
test("active override: every would-save row held with fixed text, no token, counts consistent; unchanged stays unchanged", () => {
  const lp = livePreview(base, state({ overrideHold: true }), meta);
  assert.equal(lp.overrideHold, true); assert.equal(lp.token, null); assert.equal(lp.ops, 0);
  assert.equal(lp.result.rows[0].outcome, "held"); assert.equal(lp.result.rows[0].reason, GIFT_OVERRIDE_HELD_TEXT);
  assert.equal(lp.result.rows[1].outcome, "unchanged");
  assert.equal(lp.result.counts.update, 0); assert.equal(lp.result.counts.applyValues, 0); assert.ok(lp.result.counts.held >= 1);
});
test("held table without a strict boolean from Engage fails closed; non-held tables ignore it", () => {
  for (const v of [undefined, "true", 1, null]) assert.throws(() => livePreview(base, state({ overrideHold: v as unknown as boolean }), meta), /gift correction check/);
  const nb = { client: "pvas", table: "donorsearch_results", mode: "update" as const, mapping: { ID: "CPTID", Q: "Quality_Score" }, rows: [{ ID: "101", Q: "B" }] };
  const ns: EngageState = { registryRev: REGISTRY_META.rev, duplicateKeys: [], current: [{ key: 101, values: { Quality_Score: "A" }, unreadable: [] }], baseline: [{ key: 101, col: "Quality_Score", value: "A" }], overlayKeys: [], prospectKeys: [] };
  assert.ok(livePreview(nb, ns, { ...meta, csv: "ID,Q\n101,B\n" }).token);
});
const PREP = (g?: unknown): PreparedClient => ({ approvalId: "review-fictional-n", approvalVersion: 1, client: "fictional_n", schema: "fictional_n", registryVersion: REGISTRY_META.version, approvedBy: "Fictional Reviewer", approvedAt: "2026-11-03",
  tables: [{ table: "gifts", key: "GiftID", ...(g === undefined ? {} : { giftClass: g }), columns: [{ col: "GiftID", ty: "int", len: null, p: 10, s: 0 }, { col: "Amount", ty: "nvarchar", len: 40, p: null, s: null }] }] } as PreparedClient);
test("prepared giftClass explicit per table; digest prepared/v3 equals Engage golden", () => {
  for (const g of [undefined, "", "gift", "NATIVE_GIFT"]) assert.throws(() => validatePrepared(PREP(g)), /giftClass/);
  validatePrepared(PREP("native_gift")); validatePrepared(PREP("non_gift"));
  assert.equal(preparedDigest(PREP("native_gift"), "gifts"), "0ebebb878c03c1294b3c0a31dedf0a39037edd9423c87af03295b07f54316676", "Engage scripts/tests/source-import-override.test.ts golden");
  assert.notEqual(preparedDigest(PREP("non_gift"), "gifts"), preparedDigest(PREP("native_gift"), "gifts"));
});
