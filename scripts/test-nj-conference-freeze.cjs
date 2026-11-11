const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { freeze } = require("./freeze-nj-conference.cjs");
const eventId = "nj-conference-2026-11-12";
const cutoff = "2026-11-12T20:15:00.000Z";
const now = Date.parse(cutoff) + 60000;
function note(id, email = "ada@nonprofit.org", acceptedAt = "2026-11-12T18:00:00.000Z", extra = {}) {
  const row = { schemaVersion: 1, eventId, cutoff, acceptedAt,
    entryKey: createHash("sha256").update(`${eventId}\n${email}`).digest("hex"),
    firstName: "Ada", lastName: "Lovelace", email, organization: "Community Fund",
    phone: "", serviceInterest: "", marketingConsent: false, ...extra };
  return { id, createdAt: acceptedAt, properties: {
    hs_timestamp: acceptedAt, hs_note_body: "CATAPULT_GIVEAWAY_V1\n" + JSON.stringify(row),
  } };
}
test("multiple pages, concurrent duplicates, deterministic first receipt, staff/test and cutoff exclusion", () => {
  const pages = [
    { results: [note("2"), note("1"), note("3", "staff@catapultfr.com")], paging: { next: { after: "3" } } },
    { results: [note("4", "qa@example.invalid"), note("5", "late@nonprofit.org", cutoff), note("6", "other@nonprofit.org")] },
  ];
  const result = freeze(pages, now);
  assert.equal(result.count, 2);
  assert.equal(result.ineligible, 3);
  assert.equal(result.duplicateReceipts, 1);
  assert.equal(result.entrants.find(e => e.email === "ada@nonprofit.org").noteId, "1");
  assert.equal(result.entrantsSha256, freeze(pages, now + 1).entrantsSha256);
});
test("fails closed for malformed event data, identity/timestamp mismatch and partial pagination", () => {
  const bad = note("1"); bad.properties.hs_note_body = `Missing machine prefix: ${eventId}`;
  const missing = note("2"); delete missing.properties.hs_note_body;
  const json = note("3"); json.properties.hs_note_body = `CATAPULT_GIVEAWAY_V1\n{"eventId":"${eventId}"`;
  for (const row of [bad, missing, json,
    note("4", undefined, undefined, { acceptedAt: "invalid" }),
    note("5", undefined, undefined, { entryKey: "tampered" }),
    note("6", undefined, undefined, { organization: "" }),
    note("7", undefined, undefined, { marketingConsent: "false" }),
  ]) assert.throws(() => freeze([{ results: [row] }], now));
  assert.throws(() => freeze([{ results: [], paging: { next: { after: "100" } } }], now), /Incomplete/);
  assert.throws(() => freeze([{ results: [] }, { results: [] }], now), /Extra page/);
  assert.throws(() => freeze([{ results: [note("1"), note("1")] }], now), /Duplicate/);
  assert.throws(() => freeze([{ results: [] }], now - 60000), /Wait/);
});
test("unrelated notes ignored; zero entrants explicit; pre-cutoff in-flight receipt included", () => {
  assert.equal(freeze([{ results: [{ id: "1", properties: { hs_note_body: "Unrelated CRM note" } }] }], now).count, 0);
  const row = note("2", "ada@nonprofit.org", "2026-11-12T20:14:59.999Z");
  row.createdAt = "2026-11-12T20:15:02.000Z";
  assert.equal(freeze([{ results: [row] }], now).count, 1);
});
