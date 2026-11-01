import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { buildReportRows, reportRoute } from "./report-route";
import { runReport, sanitizeQuery, describeFilters } from "./report-fields";
import type { PortalState } from "./clients";

// Synthetic records only (ZZTEST). No storage or SQL is touched.
const idx = (cptid: number, name: string, lifetime: number, extra: Record<string, unknown> = {}) => ({ cptid, name, kind: "Individual", city: "Testville", lifetime, gifts: 2, largest: lifetime / 2, last: "2024-05-01", years: 2, band: "", capMin: 0, ...extra });
const data = {
  asOf: "2026-10-01",
  index: [idx(1, "ZZTEST Keep", 1000, { ds: "DS3", capacity: "$100K" }), idx(2, "ZZTEST Merged", 500), idx(3, "ZZTEST Deleted", 9000), idx(4, "ZZTEST Other", 50, { city: "Reno" })],
  records: {
    "1": { cptid: 1, contact: { street: "1 Test St", city: "Testville", state: "NV", phone: "555-0100", email: "keep@example.test" }, flags: ["Board"] },
    "2": { cptid: 2, contact: { city: "Mergetown" } }, "3": { cptid: 3, contact: {} }, "4": { cptid: 4, contact: { city: "Reno", state: "NV" } },
  },
};
const u = (id: number, cptid: number, field: string, new_value: string, old_value: string | null = null) => ({ id, cptid, field, new_value, old_value, client_id: null, batch_id: null, created_at: "2026-10-01" });
const g = (id: number, cptid: number, kind: "gift" | "pledge", amount: number) => ({ id, cptid, kind, amount, donor_name: `ZZTEST ${cptid}`, client_id: null, gift_date: "2026-09-01", note: null, source: "manual", batch_id: null, created_by: "ZZTEST", created_at: "" });
const state = {
  prospects: [{ id: 1, cptid: 900, client_id: null, full_name: "ZZTEST Added Prospect", first_name: null, last_name: null, org_name: null, address1: "9 New Rd", city: "Henderson", state: "NV", zip: "89002", email: "new@example.test", phone: null, source: "manual", batch_id: null, created_by: "ZZTEST", created_at: "" }],
  gifts: [g(1, 1, "pledge", 100000), g(2, 2, "gift", 2500), g(3, 4, "gift", 10)],
  updates: [u(1, 2, "merged_into", "1"), u(2, 3, "deleted", "Test duplicate"), u(3, 1, "contact:phone", "555-0199", "555-0100"), u(4, 1, "wealth:capacity", "$250K", "$100K"), u(5, 1, "solicitor2", "ZZTEST Sol")],
  batches: [],
} as unknown as PortalState;
const tracking = { prospects: { "1": { status: "Active", solicitor: "ZZTEST Lead" } } };

async function main() {
  const rows = buildReportRows(data as never, state, tracking);
  const by = new Map(rows.map((r) => [r.cptid, r]));
  assert.deepEqual([...by.keys()].sort((a, b) => Number(a) - Number(b)), [1, 4, 900], "merged + deleted records leave the report");
  const k = by.get(1)!;
  assert.equal(k.lifetime, 1500, "merged duplicate's giving history folds into the survivor");
  assert.equal(k.campaignPledged, 100000); assert.equal(k.campaignReceived, 2500, "merged campaign gift follows the survivor");
  assert.notEqual(k.lifetime, 1500 + 100000, "campaign pledges never enter giving history");
  assert.equal(k.phone, "555-0199", "staff contact edit wins"); assert.equal(k.capacity, "$250K", "staff wealth override wins"); assert.equal(k.ds, "DS3");
  assert.equal(k.status, "Active"); assert.equal(k.solicitor, "ZZTEST Lead"); assert.equal(k.solicitor2, "ZZTEST Sol");
  assert.equal(by.get(900)!.lifetime, 0); assert.equal(by.get(900)!.street, "9 New Rd"); assert.equal(by.get(900)!.flags, "Added on the dashboard");

  const q = sanitizeQuery({ fields: ["name", "bogus", "lifetime"], filters: [{ field: "lifetime", op: "gte", value: "$1,000" }, { field: "x", op: "gte", value: "1" }, { field: "name", op: "drop table", value: "" }], sort: { field: "lifetime", dir: -1 } });
  assert.deepEqual(q.fields, ["name", "lifetime"]); assert.equal(q.filters.length, 1);
  assert.deepEqual(runReport(rows, q).map((r) => r.cptid), [1]);
  assert.deepEqual(runReport(rows, sanitizeQuery({ filters: [{ field: "state", op: "equals", value: "nv" }, { field: "email", op: "not_empty" }] })).map((r) => r.cptid).sort(), [1, 900]);
  assert.deepEqual(runReport(rows, sanitizeQuery({ filters: [{ field: "last", op: "gte", value: "01/01/2024" }] })).map((r) => r.cptid).sort(), [1, 4], "blank dates excluded from date comparisons");
  assert.deepEqual(runReport(rows, sanitizeQuery({ filters: [{ field: "lifetime", op: "gte", value: "" }] })).length, 3, "incomplete filter ignored");
  assert.deepEqual(runReport(rows, sanitizeQuery({ search: "reno" })).map((r) => r.cptid), [4]);
  assert.deepEqual(describeFilters(q), ["Lifetime giving is at least $1,000"]);

  // Strict per-client auth: unauthorized requests never load data.
  let loaded = false;
  const route = reportRoute("jag", async () => false, async () => { loaded = true; return data as never; }, async () => tracking);
  const res = await route.POST(new NextRequest("http://x/api/jag-data-report-builder", { method: "POST", body: "{}" }));
  assert.equal(res.status, 401); assert.equal(loaded, false);
  console.log("report builder tests passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
