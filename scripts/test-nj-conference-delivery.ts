import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/nj-conference/route";
import { NJ_NOTE_PREFIX, NJ_CUTOFF } from "../lib/nj-conference";
import { freeze } from "./freeze-nj-conference.cjs";

type Call = { url: string; method: string; body: any; headers: Record<string, string> };
const fields = {
  firstName: "Anne-Marie", lastName: "O'Neil", email: " ANNE@NONPROFIT.ORG ",
  organization: "Community & Friends", phone: "555-123-4567", serviceInterest: "Mid-level donor programs",
};
const request = (body: unknown = fields) => new NextRequest("https://www.catapultfr.com/api/nj-conference", {
  method: "POST", headers: { origin: "https://www.catapultfr.com", "Content-Type": "application/json" }, body: JSON.stringify(body),
});

async function main() {
  const realFetch = global.fetch, RealDate = Date, realError = console.error;
  const env = { hubspot: process.env.HUBSPOT_PRIVATE_APP_TOKEN, resend: process.env.RESEND_API_KEY };
  const acceptedAt = "2026-11-12T18:00:00.000Z";
  let clock = Date.parse(acceptedAt);
  class TestDate extends RealDate {
    constructor(value?: string | number) { super(value === undefined ? clock : value); }
    static now() { return clock; }
  }
  global.Date = TestDate as DateConstructor;
  const logs: unknown[][] = [];
  console.error = (...args) => { logs.push(args); };
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = "mock-secret-hubspot";
  process.env.RESEND_API_KEY = "mock-secret-resend";
  let mode = "existing", calls: Call[] = [], lookups = 0;
  let receipts: any[] = [];
  const existing = Object.freeze({
    id: "123", properties: Object.freeze({ firstname: "Staff identity", lastname: "Retained", company: "Existing org", phone: "Existing phone", hubspot_owner_id: "999", hs_lead_status: "CONNECTED", hs_email_optout: "true", hs_marketable_status: "false" }),
  });
  global.fetch = async (url, init) => {
    const c: Call = { url: String(url), method: init?.method || "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined, headers: init?.headers as Record<string, string> };
    calls.push(c);
    if (c.url.endsWith("/crm/v3/objects/notes")) {
      assert.equal(c.method, "POST");
      if (mode === "receipt_failure") return Response.json({}, { status: 503 });
      receipts.push(JSON.parse(JSON.stringify(c.body)));
      return Response.json({ id: String(1000 + receipts.length) }, { status: 201 });
    }
    if (c.url.startsWith("https://api.hubapi.com/crm/v3/objects/contacts/")) {
      lookups++;
      if (mode === "lookup_failure") return Response.json({}, { status: 503 });
      if (mode === "lookup_throw") throw new Error("PII raw error anne@nonprofit.org mock-secret-hubspot");
      if (mode === "lookup_malformed") return Response.json({});
      if (["create", "race", "create_failure", "create_malformed"].includes(mode) && lookups === 1) return Response.json({}, { status: 404 });
      return Response.json(existing);
    }
    if (c.url.endsWith("/crm/v3/objects/contacts")) {
      if (mode === "race") return Response.json({ message: "Do not parse PII upstream error" }, { status: 409 });
      if (mode === "create_failure") return Response.json({}, { status: 503 });
      if (mode === "create_malformed") return Response.json({ id: "" });
      return Response.json({ id: "456" }, { status: 201 });
    }
    if (c.url.startsWith("https://api.hubapi.com/crm/v4/objects/notes/")) {
      if (mode === "association_failure") return Response.json({}, { status: 503 });
      return new Response(null, { status: 204 });
    }
    if (c.url === "https://api.resend.com/emails") {
      if (mode === "notification_throw") throw new Error("PII raw error anne@nonprofit.org mock-secret-resend");
      if (mode === "notification_failure") return Response.json({}, { status: 503 });
      return Response.json({ id: "email-mock" });
    }
    throw new Error("Unexpected URL");
  };
  try {
    for (mode of ["existing", "create", "race", "lookup_failure", "lookup_throw", "lookup_malformed", "create_failure", "create_malformed", "association_failure", "notification_failure", "notification_throw", "notification_unconfigured"]) {
      calls = []; lookups = 0;
      if (mode === "notification_unconfigured") delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = "mock-secret-resend";
      const before = JSON.stringify(receipts), count = receipts.length;
      const response = await POST(request());
      assert.equal(response.status, 200, mode);
      assert.deepEqual(await response.json(), { ok: true, message: "Your entry is saved. One entry per email; repeat submissions do not add chances." });
      assert.equal(receipts.length, count + 1);
      assert.equal(JSON.stringify(receipts.slice(0, count)), before, "all prior snapshots unchanged");
      assert.equal(calls[0].url, "https://api.hubapi.com/crm/v3/objects/notes", "persist before any contact/email");
      assert.equal(calls[0].body.associations, undefined, "standalone authoritative snapshot");
      const snapshot = JSON.parse(receipts[count].properties.hs_note_body.slice(NJ_NOTE_PREFIX.length));
      assert.equal(snapshot.email, "anne@nonprofit.org");
      assert.equal(snapshot.acceptedAt, acceptedAt);
      assert.equal(snapshot.firstName, fields.firstName);
      const contactCalls = calls.filter(c => c.url.includes("/contacts"));
      assert(contactCalls.every(c => c.method !== "PATCH"), "never patch existing identity/owner/opt-outs");
      assert.equal(contactCalls[0].url, "https://api.hubapi.com/crm/v3/objects/contacts/anne%40nonprofit.org?idProperty=email");
      const creates = contactCalls.filter(c => c.method === "POST");
      assert.equal(creates.length, ["create", "race", "create_failure", "create_malformed"].includes(mode) ? 1 : 0, mode);
      if (creates.length) assert.deepEqual(creates[0].body, { properties: { email: "anne@nonprofit.org", firstname: fields.firstName, lastname: fields.lastName, company: fields.organization, phone: fields.phone } });
      if (mode === "race") assert.equal(lookups, 2, "409 resolves using normalized email without another create");
      const associations = calls.filter(c => c.method === "PUT");
      const contactFailed = ["lookup_failure", "lookup_throw", "lookup_malformed", "create_failure", "create_malformed"].includes(mode);
      assert.equal(associations.length, contactFailed ? 0 : 1);
      if (associations.length) {
        assert.equal(associations[0].url, `https://api.hubapi.com/crm/v4/objects/notes/${1000 + receipts.length}/associations/contacts/${mode === "create" ? "456" : "123"}`);
        assert.deepEqual(associations[0].body, [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }]);
      }
      const emails = calls.filter(c => c.url === "https://api.resend.com/emails");
      assert.equal(emails.length, mode === "notification_unconfigured" ? 0 : 1, "email independent of CRM failure");
      if (emails.length) {
        const email = emails[0];
        assert.deepEqual(email.body.to, ["anthonya@catapultfr.com", "gwenp@catapultfr.com"]);
        assert.equal(email.body.cc, undefined); assert.equal(email.body.bcc, undefined);
        assert.equal(email.body.from, "Catapult Fundraising Website <website@catapultfr.com>");
        assert.equal(email.body.reply_to, "anne@nonprofit.org");
        assert.equal(email.headers["Idempotency-Key"], `nj-entry-${1000 + receipts.length}`);
        for (const value of ["Anne-Marie O'Neil", "anne@nonprofit.org", "Community &amp; Friends", fields.phone, fields.serviceInterest, acceptedAt, "not a winner announcement"]) assert(email.body.html.includes(value), value);
      }
    }
    mode = "receipt_failure"; calls = [];
    assert.equal((await POST(request())).status, 503);
    assert.equal(calls.length, 1, "receipt failure creates no contact/email");
    for (const bad of [null, [], {}, { ...fields, website: "bot" }, { ...fields, email: "staff@catapultfr.com" }, { ...fields, email: "qa@example.com" }, { ...fields, serviceInterest: "invalid" }]) {
      calls = []; assert.equal((await POST(request(bad))).status, 400); assert.equal(calls.length, 0);
    }
    clock = Date.parse(NJ_CUTOFF); calls = [];
    assert.equal((await POST(request())).status, 410); assert.equal(calls.length, 0);
    const notes = receipts.map((r, index) => ({ id: String(1001 + index), createdAt: acceptedAt, properties: r.properties }));
    const frozen = freeze([{ results: notes }], Date.parse(NJ_CUTOFF) + 30000);
    assert.equal(frozen.count, 1); assert.equal(frozen.receipts, receipts.length);
    assert.equal(frozen.duplicateReceipts, receipts.length - 1);
    assert.equal(frozen.entrants[0].firstName, fields.firstName, "draw uses receipt, never CRM identity");
    const logged = JSON.stringify(logs);
    for (const secret of ["anne@nonprofit.org", "mock-secret", fields.firstName, fields.organization, "PII raw"]) assert(!logged.includes(secret), "no PII/credentials/upstream errors logged");
    for (const stage of ["contact_lookup", "contact_create", "contact_association"]) assert(logged.includes(stage));
    assert(logged.includes("noteId"), "durable reconciliation reference");
    console.log("PASS: 12 mocked delivery scenarios; normalized create/reuse/409, no property overwrite, note association202, independent fixed-recipient notices, safe failures, rejected-input isolation and immutable deduplicated draw");
  } finally {
    global.fetch = realFetch; global.Date = RealDate; console.error = realError;
    if (env.hubspot === undefined) delete process.env.HUBSPOT_PRIVATE_APP_TOKEN; else process.env.HUBSPOT_PRIVATE_APP_TOKEN = env.hubspot;
    if (env.resend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = env.resend;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
