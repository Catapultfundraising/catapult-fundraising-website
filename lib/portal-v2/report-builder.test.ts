import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { buildReportRows, reportRoute } from "./report-route";
import { parseCapacity, runReport, sanitizeQuery, describeFilters, filterError, queryErrors, XLSX_MAX_ROWS } from "./report-fields";
import type { PortalState } from "./clients";

// Synthetic records only (ZZTEST). No storage or SQL is touched.
const idx = (cptid: number, name: string, lifetime: number, extra: Record<string, unknown> = {}) => ({ cptid, name, kind: "Individual", city: "Testville", lifetime, gifts: 2, largest: lifetime / 2, last: "2024-05-01", years: 2, band: "", capMin: 0, ...extra });
const data = {
  asOf: "2026-10-01",
  index: [idx(1, "ZZTEST Keep", 1000, { ds: "DS3", capacity: "$100K" }), idx(2, "ZZTEST Merged", 500), idx(3, "ZZTEST Deleted", 9000), idx(4, "ZZTEST Other", 50, { city: "Reno" }), idx(5, "ZZTEST Screened", 0, { city: "Index City" })],
  records: {
    "1": { cptid: 1, contact: { street: "1 Test St", city: "Testville", state: "NV", phone: "555-0100", email: "keep@example.test" }, flags: ["Board"], summary: { first: "2010-01-01" } },
    "2": { cptid: 2, contact: { city: "Mergetown" }, summary: { first: "2001-02-03" } }, "3": { cptid: 3, contact: {} }, "4": { cptid: 4, contact: { city: "Reno", state: "NV" } }, "5": { cptid: 5, contact: { email: "x@example.test" } },
  },
};
const u = (id: number, cptid: number, field: string, new_value: string, old_value: string | null = null) => ({ id, cptid, field, new_value, old_value, client_id: null, batch_id: null, created_at: "2026-10-01" });
const g = (id: number, cptid: number, kind: "gift" | "pledge", amount: number) => ({ id, cptid, kind, amount, donor_name: `ZZTEST ${cptid}`, client_id: null, gift_date: "2026-09-01", note: null, source: "manual", batch_id: null, created_by: "ZZTEST", created_at: "" });
const state = {
  prospects: [{ id: 1, cptid: 900, client_id: null, full_name: "ZZTEST Added Prospect", first_name: null, last_name: null, org_name: null, address1: "9 New Rd", city: "Henderson", state: "NV", zip: "89002", email: "new@example.test", phone: null, source: "manual", batch_id: null, created_by: "ZZTEST", created_at: "" }],
  gifts: [g(1, 1, "pledge", 100000), g(2, 2, "gift", 2500), g(3, 4, "gift", 10)],
  updates: [u(1, 2, "merged_into", "1"), u(2, 3, "deleted", "Test duplicate"), u(3, 1, "contact:phone", "555-0199", "555-0100"), u(4, 1, "wealth:capacity", "$250K", "$100K"), u(5, 1, "solicitor2", "ZZTEST Sol"), u(6, 4, "contact:city", "", "Reno"), u(7, 4, "contact:email", "", "old@example.test"),
    u(8, 5, "wealth:ds", JSON.stringify({ status: "matched", fields: { "DS Rating": "DS2", "Wealth-Based Capacity": "$1M+" } })), u(9, 5, "contact:city", "", "")],
  batches: [],
} as unknown as PortalState;
const tracking = { prospects: { "1": { status: "Active", solicitor: "ZZTEST Lead" } } };

async function main() {
  const rows = buildReportRows(data as never, state, tracking);
  const by = new Map(rows.map((r) => [r.cptid, r]));
  assert.deepEqual([...by.keys()].sort((a, b) => Number(a) - Number(b)), [1, 4, 5, 900], "merged + deleted records leave the report");
  assert.equal(by.get(4)!.city, "", "staff-cleared city stays blank (no index fallback)");
  assert.equal(by.get(4)!.email, "", "staff-cleared email stays blank");
  assert.equal(by.get(5)!.city, "", "staff-cleared city stays blank even when the client file had none");
  assert.equal(by.get(5)!.ds, "DS2", "latest dashboard DonorSearch result fills rating when the file had none");
  assert.equal(by.get(5)!.capacity, "$1M+");
  assert.equal(by.get(1)!.first, "2001-02-03", "first gift is the earliest across merged records");
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
  // Malformed entered values are errors and never broaden the query.
  assert.equal(filterError({ field: "lifetime", op: "gte", value: "abc" }), "Lifetime giving: enter a number");
  assert.equal(filterError({ field: "lifetime", op: "gte", value: "$1,000.50" }), null);
  assert.equal(filterError({ field: "last", op: "gte", value: "13/45/2024" }), "Last gift date: use MM/DD/YYYY");
  assert.equal(filterError({ field: "last", op: "gte", value: "02/30/2024" }), "Last gift date: use MM/DD/YYYY");
  assert.equal(filterError({ field: "last", op: "gte", value: "" }), null);
  assert.equal(runReport(rows, sanitizeQuery({ filters: [{ field: "lifetime", op: "gte", value: "abc" }] })).length, 0);
  assert.deepEqual(runReport(rows, sanitizeQuery({ filters: [{ field: "last", op: "gte", value: "01/01/2024" }] })).map((r) => r.cptid).sort(), [1, 4, 5], "blank dates excluded from date comparisons");
  assert.deepEqual(runReport(rows, sanitizeQuery({ filters: [{ field: "lifetime", op: "gte", value: "" }] })).length, 4, "incomplete filter ignored");
  assert.deepEqual(runReport(rows, sanitizeQuery({ search: "other" })).map((r) => r.cptid), [4]);
  assert.deepEqual(describeFilters(q), ["Lifetime giving is at least $1,000"]);

  // Campaign source unavailable: unknown (null), not $0; numeric filters exclude unknowns; sorting puts them last.
  const un = buildReportRows(data as never, null, tracking);
  assert.ok(un.every((r) => r.campaignPledged === null && r.campaignReceived === null));
  assert.equal(runReport(un, sanitizeQuery({ filters: [{ field: "campaignPledged", op: "lte", value: "0" }] })).length, 0);
  const route2 = reportRoute("jag", async () => true, async () => data as never, async () => tracking, undefined, async () => null);
  const post = (b: unknown) => route2.POST(new NextRequest("http://x/api/jag-data-report-builder", { method: "POST", body: JSON.stringify(b) }));
  let r2 = await post({ query: { fields: ["name", "campaignPledged"] } });
  assert.equal(r2.status, 503, "whole report fails closed without SQL state (no resurrected merged/deleted rows)");
  r2 = await post({ query: { fields: ["name"] }, format: "xlsx" }); assert.equal(r2.status, 503);
  r2 = await post({ query: { fields: ["name"], filters: [{ field: "lifetime", op: "gte", value: "abc" }] } }); assert.equal(r2.status, 400, "malformed filter rejected by API");
  // Tracking unavailable: assignment fields refused, other reports still run.
  const route5 = reportRoute("jag", async () => true, async () => data as never, async () => { throw new Error("blob down"); }, undefined, async () => state);
  const post5 = (b: unknown) => route5.POST(new NextRequest("http://x", { method: "POST", body: JSON.stringify(b) }));
  assert.equal((await post5({ query: { fields: ["name", "status"] } })).status, 503);
  assert.equal((await post5({ query: { fields: ["name"], filters: [{ field: "solicitor", op: "not_empty" }] } })).status, 503);
  assert.equal((await post5({ query: { fields: ["name"], sort: { field: "status", dir: 1 } } })).status, 503);
  assert.equal((await post5({ query: { fields: ["name", "solicitor2"] } })).status, 200, "secondary solicitor comes from SQL, not tracking");
  // Excel cap: oversize lists are refused (no partial file).
  const big = { asOf: "x", records: {}, index: Array.from({ length: XLSX_MAX_ROWS + 1 }, (_, i) => idx(10_000 + i, `ZZTEST Big ${i}`, 1)) };
  let built = false;
  const route3 = reportRoute("jag", async () => true, async () => big as never, async () => tracking, { clientName: "Synthetic", filePrefix: "QA", build: async () => { built = true; return Buffer.from(""); } }, async () => state);
  r2 = await route3.POST(new NextRequest("http://x", { method: "POST", body: JSON.stringify({ query: { fields: ["name"] }, format: "xlsx" }) }));
  assert.equal(r2.status, 413); assert.equal(built, false);
  r2 = await route3.POST(new NextRequest("http://x", { method: "POST", body: JSON.stringify({ query: { fields: ["name"], filters: [{ field: "cptid", op: "lte", value: "10100" }] }, format: "xlsx" }) }));
  assert.equal(r2.status, 200); assert.equal(r2.headers.get("x-report-rows"), "104"); // 101 big rows + live campaign/prospect records 1, 4, 900 assert.equal(built, true);
  assert.equal(queryErrors(sanitizeQuery({ filters: [{ field: "zip", op: "contains", value: "abc" }] })).length, 0);

  // Capacity parsing is conservative; unknown stays null.
  assert.deepEqual(parseCapacity("$500K-$1M").min, 500000);
  assert.deepEqual(parseCapacity("$500,000 - $999,999").min, 500000);
  assert.deepEqual(parseCapacity("$1M+").min, 1000000);
  assert.deepEqual(parseCapacity("$1.5M and up").min, 1500000);
  assert.deepEqual(parseCapacity("<$500K"), { min: 0, read: "Under $500,000" });
  assert.equal(parseCapacity("Under $25K").min, 0);
  assert.equal(parseCapacity("$250K").min, 250000);
  for (const bad of ["High", "500", "$1M-$500K", "DS3", "$5K-", "TBD"]) assert.equal(parseCapacity(bad).min, null, bad);
  assert.equal(parseCapacity("").min, null);
  assert.equal(by.get(1)!.capacityMin, 250000, "parsed from staff override $250K");
  assert.equal(by.get(5)!.capacityMin, 1000000); assert.equal(by.get(4)!.capacityMin, null);
  // $500K+ capacity filter excludes unknown capacity.
  assert.deepEqual(runReport(rows, sanitizeQuery({ filters: [{ field: "capacityMin", op: "gte", value: "500000" }] })).map((r) => r.cptid), [5]);
  // Top N applies after filter + sort, and the API total equals the capped count.
  assert.deepEqual(runReport(rows, sanitizeQuery({ top: 2, sort: { field: "lifetime", dir: -1 } })).map((r) => r.cptid), [1, 4]);
  assert.equal(sanitizeQuery({ top: 999999 }).top, 25000); assert.equal(sanitizeQuery({ top: 0 }).top, undefined); assert.equal(sanitizeQuery({ top: "x" }).top, undefined);
  const r4 = await reportRoute("jag", async () => true, async () => data as never, async () => tracking, undefined, async () => state).POST(new NextRequest("http://x", { method: "POST", body: JSON.stringify({ query: { fields: ["name"], top: 2 } }) }));
  const j4 = await r4.json(); assert.equal(j4.total, 2); assert.equal(j4.rows.length, 2);

  // Strict per-client auth: unauthorized requests never load data.
  let loaded = false;
  const route = reportRoute("jag", async () => false, async () => { loaded = true; return data as never; }, async () => tracking);
  const res = await route.POST(new NextRequest("http://x/api/jag-data-report-builder", { method: "POST", body: "{}" }));
  assert.equal(res.status, 401); assert.equal(loaded, false);
  console.log("report builder tests passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
