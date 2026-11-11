import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { POST } from "../app/api/nj-conference/route";
import { NJ_CUTOFF, NJ_EVENT, NJ_NOTE_PREFIX, NJ_CONSENT_TEXT, NJ_CONSENT_VERSION, validateNjFields, excludedNjEmail } from "../lib/nj-conference";

async function main() {
  const realFetch = global.fetch;
  const realNow = Date.now;
  const RealDate = Date;
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  let clock = Date.parse("2026-11-12T18:00:00.000Z");
  // Both Date.now and new Date are controlled so cutoff/receipt tests agree.
  class TestDate extends RealDate {
    constructor(value?: string | number) { super(value === undefined ? clock : value); }
    static now() { return clock; }
  }
  global.Date = TestDate as DateConstructor;
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = "mock-only";
  const valid = { firstName: "Ada", lastName: "Lovelace", email: " ADA@NONPROFIT.ORG ", organization: "Community Fund" };
  let saved: any[] = [];
  let mode = "ok";
  global.fetch = async (url, init) => {
    assert.equal(String(url), "https://api.hubapi.com/crm/v3/objects/notes");
    assert.equal(init?.method, "POST");
    const payload = JSON.parse(String(init?.body));
    saved.push(payload);
    if (mode === "throw") throw new Error("mock network");
    if (mode === "failure") return Response.json({}, { status: 503 });
    if (mode === "malformed") return Response.json({});
    if (mode === "invalid-json") return new Response("invalid");
    return Response.json({ id: String(saved.length) }, { status: 201 });
  };
  const request = (data: unknown = valid, origin = "https://www.catapultfr.com") => new NextRequest("https://www.catapultfr.com/api/nj-conference", {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  try {
    assert.equal((await POST(request())).status, 200);
    const row = JSON.parse(saved[0].properties.hs_note_body.slice(NJ_NOTE_PREFIX.length));
    assert.equal(row.email, "ada@nonprofit.org");
    assert.equal(row.eventId, NJ_EVENT);
    assert.equal(row.marketingConsent, true);
    assert.equal(row.consentText, NJ_CONSENT_TEXT);
    assert.equal(row.consentVersion, NJ_CONSENT_VERSION);
    assert.equal(row.acceptedAt, "2026-11-12T18:00:00.000Z");
    assert.equal(row.entryKey, createHash("sha256").update(`${NJ_EVENT}\nada@nonprofit.org`).digest("hex"));
    assert.equal(saved[0].properties.hs_timestamp, row.acceptedAt);
    assert.equal(saved[0].associations, undefined);
    for (const clientValue of [false, "false", null]) {
      const response = await POST(request({ ...valid, marketingConsent: clientValue, consentText: "tampered", consentVersion: "tampered" }));
      assert.equal(response.status, 200);
      const receipt = JSON.parse(saved[saved.length - 1].properties.hs_note_body.slice(NJ_NOTE_PREFIX.length));
      assert.equal(receipt.marketingConsent, true);
      assert.equal(receipt.consentText, NJ_CONSENT_TEXT);
      assert.equal(receipt.consentVersion, NJ_CONSENT_VERSION);
    }
    await Promise.all([POST(request()), POST(request())]);
    const keys = saved.map(s => JSON.parse(s.properties.hs_note_body.slice(NJ_NOTE_PREFIX.length)).entryKey);
    assert.equal(new Set(keys).size, 1, "concurrent duplicate receipts share the draw identity");
    for (const bad of [
      {}, null, [], { ...valid, firstName: "" }, { ...valid, lastName: "x".repeat(81) },
      { ...valid, organization: "" }, { ...valid, email: "bad@" },
      { ...valid, phone: [] }, { ...valid, serviceInterest: "injected" },
      { ...valid, website: "bot" },
      { ...valid, firstName: "<script>" }, { ...valid, email: "staff@catapultfr.com" },
      { ...valid, email: "qa@example.com" },
    ]) {
      const before = saved.length;
      assert.equal((await POST(request(bad))).status, 400);
      assert.equal(saved.length, before);
    }
    assert.equal((await POST(request(valid, "https://attacker.invalid"))).status, 403);
    assert.equal((await POST(new NextRequest("https://www.catapultfr.com/api/nj-conference", { method: "POST", body: "x".repeat(8193) }))).status, 413);
    delete process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    assert.equal((await POST(request())).status, 503);
    process.env.HUBSPOT_PRIVATE_APP_TOKEN = "mock-only";
    for (mode of ["throw", "failure", "malformed", "invalid-json"]) assert.equal((await POST(request())).status, 503);
    mode = "ok";
    clock = Date.parse(NJ_CUTOFF) - 1;
    assert.equal((await POST(request())).status, 200);
    clock++;
    const count = saved.length;
    assert.equal((await POST(request())).status, 410);
    clock++;
    assert.equal((await POST(request())).status, 410);
    assert.equal(saved.length, count);
    for (const clientValue of [undefined, false, true, "false", "on", null]) {
      assert.equal(validateNjFields({ ...valid, marketingConsent: clientValue })?.marketingConsent, true);
    }
    assert.equal(excludedNjEmail("staff@sub.catapultfr.com"), true);
    console.log("PASS: validation, server-owned consent evidence/backward clients, durable success, concurrent identity, failures, origin, body size and cutoff boundary (all mocked)");
  } finally {
    global.fetch = realFetch; global.Date = RealDate; Date.now = realNow;
    if (token === undefined) delete process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    else process.env.HUBSPOT_PRIVATE_APP_TOKEN = token;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
