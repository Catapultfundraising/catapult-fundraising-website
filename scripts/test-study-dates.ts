import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatStudyDate } from "../lib/study-dates";
import { buildPortalDataFromVanillaSoft } from "../lib/vs-sync";
import { STUDY_PORTALS } from "../lib/study-portals";
import { buildContactList } from "../lib/jag-data";
import type { VsContact, VsCallRecord } from "../lib/vanillasoft";

const cases: Array<[string, string]> = [
  // Actual incident's timestamp only; no real prospect data in the fixture.
  ["2026-11-11T00:00:00Z", "11/10/2026"],
  ["2026-11-11T00:30:00Z", "11/10/2026"],
  ["2026-11-10T16:00:00-08:00", "11/10/2026"],
  ["2026-11-11T07:59:59Z", "11/10/2026"],
  ["2026-11-11T08:00:00Z", "11/11/2026"],
  ["2026-07-11T06:59:59Z", "7/10/2026"],
  ["2026-07-11T07:00:00Z", "7/11/2026"],
  ["2026-01-01T00:00:00Z", "12/31/2025"],
  ["2026-03-01T07:59:59Z", "2/28/2026"],
  ["2028-03-01T07:59:59Z", "2/29/2028"],
  // Spring and autumn DST changes, both sides of the transition.
  ["2026-03-08T07:59:59Z", "3/7/2026"],
  ["2026-03-08T08:00:00Z", "3/8/2026"],
  ["2026-03-08T09:59:59Z", "3/8/2026"],
  ["2026-03-08T10:00:00Z", "3/8/2026"],
  ["2026-11-01T06:59:59Z", "10/31/2026"],
  ["2026-11-01T07:00:00Z", "11/1/2026"],
  ["2026-11-01T08:59:59Z", "11/1/2026"],
  ["2026-11-01T09:00:00Z", "11/1/2026"],
  ["2026-11-11", "11/11/2026"],
  ["11/11/2026", "11/11/2026"],
  ["2028-02-29", "2/29/2028"],
  ["2026-02-29", ""],
  ["2/30/2026", ""],
  ["2026-11-11T00:00:00", ""],
  ["not a date", ""],
  ["", ""],
];

async function main() {
  const oldTz = process.env.TZ;
  for (const tz of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
    process.env.TZ = tz;
    for (const [input, expected] of cases) {
      assert.equal(formatStudyDate(input), expected, `${tz}: ${input}`);
    }
  }
  if (oldTz === undefined) delete process.env.TZ; else process.env.TZ = oldTz;

  const contact = (id: number, name: string, scheduled: string | null): VsContact => ({
    contact_id: id, project_id: 1, first_name: name, last_name: "Fixture",
    added_date_time_utc: "2026-11-02T00:00:00Z",
    modified_date_time_utc: "2026-11-02T00:00:00Z",
    scheduled_call_date_time: scheduled, custom_fields: [],
  });
  const contacts = [
    contact(1, "Scheduled", "2026-11-11T00:00:00Z"),
    contact(2, "Completed", null),
    contact(3, "Callback", "2026-11-11T00:00:00Z"),
  ];
  const calls: VsCallRecord[] = [
    {contact_id: 1, project_id: 1, call_date_time_utc: "2026-11-02T18:00:00Z", result_code: "I", event_type: 2},
    {contact_id: 2, project_id: 1, call_date_time_utc: "2026-11-03T00:00:00Z", result_code: "Completed"},
    {contact_id: 3, project_id: 1, call_date_time_utc: "2026-11-02T18:00:00Z", result_code: "CB", event_type: 1},
  ];
  const originalContacts = JSON.stringify(contacts);
  const originalCalls = JSON.stringify(calls);
  const originalFetch = globalThis.fetch;
  const oldKey = process.env.VANILLASOFT_API_KEY;
  process.env.VANILLASOFT_API_KEY = "fixture-only-not-a-real-key";
  const requested: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    requested.push(url.pathname);
    assert.equal(init?.method ?? "GET", "GET", "no write requests in fixture");
    // Fail all other network access, including private storage. The existing
    // contact-store fallback is exercised without credentials or live traffic.
    assert.equal(url.origin, "https://vanillasoft.net");
    if (url.pathname.endsWith("/Contacts")) return Response.json({contacts});
    assert.ok(url.pathname.endsWith("/GetCallHistory"));
    return Response.json({call_histories: calls});
  };
  try {
    const {data} = await buildPortalDataFromVanillaSoft({
      ...STUDY_PORTALS.csnf, projectId: 1,
      contactsPath: "test-fixtures/missing-study-contacts.json",
      historyStart: "2026-11-02",
    }, {asOf: new Date("2026-11-09T00:00:00Z"), persistContacts: false});
    assert.deepEqual(data.scheduledInterviews, [{name: "Scheduled Fixture", org: "", date: "11/10/2026"}]);
    assert.deepEqual(data.completedInterviews, [{name: "Completed Fixture", org: "", date: "11/2/2026"}]);
    assert.equal(data.stats.scheduled, 1);
    assert.equal(data.stats.completed, 1);
    assert.equal(data.stats.inCallingProcess, 1, "callbacks stay out of interview list");
    const rows = buildContactList(data);
    assert.equal(rows.find(r => r.status === "Scheduled")?.date, "11/10/2026");
    assert.equal(rows.find(r => r.status === "Completed")?.date, "11/2/2026");
    assert.equal(JSON.stringify(contacts), originalContacts, "source appointment untouched");
    assert.equal(JSON.stringify(calls), originalCalls, "source call history untouched");
    assert.ok(requested.some(p => p.endsWith("/Contacts")));
    assert.ok(requested.some(p => p.endsWith("/GetCallHistory")));
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.VANILLASOFT_API_KEY; else process.env.VANILLASOFT_API_KEY = oldKey;
  }
  // Frozen/manual dates are never fed back through the instant formatter.
  const source = readFileSync("lib/vs-sync.ts", "utf8");
  assert.match(source, /date: formatStudyDate\(outcome.lastDate\)/);
  assert.match(source, /date: formatStudyDate\(scheduledAt\)/);
  assert.match(source, /row, \.\.\.spare/);
  console.log(`Study dates: ${cases.length * 3} timezone assertions and scheduled/completed builder + contact-list regressions passed`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
