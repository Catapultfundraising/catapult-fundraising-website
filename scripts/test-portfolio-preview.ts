import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fixture, inspect, mappingProfile, plan, PREVIEW_CLIENTS, previewAvailable, SAMPLE, simulate, type PreviewRequest } from "../lib/portal-v2/portfolio-preview";
const mapping = { CPTID: "", Client_ID: "clientId", "Primary Solicitor": "portfolio", "Secondary Solicitor": "", "Previous Campaign Ask": "", "Campaign Ask": "askAmount", "New Notes": "note", "Historical Notes": "", Task: "", "Due Date": "", FY2024: "", FY2025: "", FY2026: "" };
const request = (client = "pvas"): PreviewRequest => ({ client, state: fixture(client), fileName: "synthetic.csv", bytes: Buffer.from(SAMPLE).toString("base64"), mapping, sourceDate: "2026-10-19", actor: "Fictional reviewer" });
for (const client of PREVIEW_CLIENTS) test(`${client}: exact text identity, manual protection, append-only, repeat-note safety`, () => {
  const input = request(client), before = structuredClone(input.state), p = plan(input);
  assert.equal(p.changes, 5); // two asks/portfolio changes + three notes
  assert.equal(p.reviews[2].cptid, null); assert.match(p.reviews[2].reason!, /ambiguous/);
  assert.equal(p.reviews[3].cptid, null); assert.match(p.reviews[3].reason!, /unknown/);
  assert.match(p.reviews[5].reason!, /contradicts/);
  assert.equal(p.reviews[1].fields.filter(f => f.outcome.includes("protected")).length, 2);
  assert.deepEqual(input.state, before, "preview does not mutate");
  const s = simulate(input, p.binding);
  assert.equal(s.receipt.sqlCommitted, false); assert.equal(s.receipt.published, false);
  assert.deepEqual(s.next.people[0].notes[0], before.people[0].notes[0]);
  assert.equal(s.next.people[0].notes.length, 3); assert.equal(s.next.people[1].notes.length, 1);
  assert.equal(s.next.people[1].askAmount, "2500.00"); assert.equal(s.next.people[1].portfolio, "Manual solicitor");
  const again = plan({ ...input, state: s.next, fileName: "renamed.csv" });
  assert.equal(again.changes, 0); assert.equal(again.reviews.flatMap(r => r.fields).filter(f => f.outcome.includes("Duplicate note")).length, 3);
});
test("file bytes, mapping, source date, actor, client and state invalidate approval", () => {
  const input = request(), p = plan(input);
  for (const changed of [
    { ...input, bytes: Buffer.from(SAMPLE + "\r\n").toString("base64") },
    { ...input, mapping: { ...mapping, "Primary Solicitor": "" } },
    { ...input, sourceDate: "2026-10-20" }, { ...input, actor: "Other staff" },
    { ...input, client: "jag", state: fixture("jag") },
    { ...input, state: { ...input.state, version: 1 } },
  ]) assert.throws(() => simulate(changed, p.binding), /Stale|columns|rows/);
  assert.throws(() => plan({ ...input, client: "jag" }), /Reset/);
});
test("blank=no change, zero stays distinct, duplicate scalar conflicts hold, no numeric ID coercion", () => {
  const input = request();
  input.bytes = Buffer.from("Client_ID,New Notes,Campaign Ask,Primary Solicitor\r\n0001,,, \r\n1,Wrong identity,0,\r\n0001,Zero ask,0,\r\n").toString("base64");
  input.mapping = { Client_ID: "clientId", "New Notes": "note", "Campaign Ask": "askAmount", "Primary Solicitor": "portfolio" };
  const p = plan(input);
  assert.equal(p.reviews[0].fields.filter(f => f.outcome.startsWith("Blank")).length, 3);
  assert.equal(p.reviews[1].cptid, null); assert.equal(p.next.people[0].askAmount, "0.00");
  input.bytes = Buffer.from("Client_ID,Campaign Ask\r\n0001,100\r\n0001,200\r\n").toString("base64"); input.mapping = { Client_ID: "clientId", "Campaign Ask": "askAmount" };
  assert.equal(plan(input).changes, 0); assert.match(plan(input).reviews[0].fields[0].outcome, /conflicting/);
});
test("mapping profile roundtrip and foreign client/schema changes refused", () => {
  const input = request(), p = mappingProfile(input.client, input.bytes, mapping);
  const checked = mappingProfile(input.client, input.bytes, {}, JSON.stringify(p));
  assert.deepEqual({ ...(checked as { mapping: object }).mapping }, mapping);
  assert.throws(() => mappingProfile("jag", input.bytes, mapping, JSON.stringify(p)), /not jag/);
  assert.throws(() => mappingProfile("pvas", Buffer.from("Other,New Notes\r\n0001,x").toString("base64"), {}, JSON.stringify(p)), /missing columns/);
  assert.throws(() => plan({ ...input, mapping: { ...mapping, "Historical Notes": "note" } }), /twice/);
  assert.throws(() => plan({ ...input, mapping: { ...mapping, "Campaign Ask": "arbitrary_sql" } }), /Unknown/);
});
test("original-byte identity preserves BOM; malformed UTF8, impossible dates, oversized rows held/refused", () => {
  const input = request(), raw = Buffer.concat([Buffer.from([239, 187, 191]), Buffer.from(SAMPLE)]);
  assert.equal(inspect(raw.toString("base64")).fileDigest, createHash("sha256").update(raw).digest("hex"));
  assert.notEqual(inspect(input.bytes).fileDigest, inspect(raw.toString("base64")).fileDigest);
  assert.throws(() => inspect(Buffer.from([255, 254]).toString("base64")), /UTF-8/);
  assert.throws(() => plan({ ...input, sourceDate: "2026-02-30" }), /source-as-of/);
  assert.throws(() => inspect(Buffer.from("A,B\r\nx").toString("base64")), /columns/);
});
test("simulation entrypoint production gate cannot be rearmed by preview env flag", () => {
  assert.equal(previewAvailable({ NODE_ENV: "production", VERCEL_ENV: "production" }), false);
  assert.equal(previewAvailable({ NODE_ENV: "production" }), false);
  assert.equal(previewAvailable({ NODE_ENV: "production", VERCEL_ENV: "preview" }), true);
  assert.equal(previewAvailable({ NODE_ENV: "development" }), true);
});
test("hyphens are ordinary punctuation; actual control bytes held; note LF/tab retained intentionally", () => {
  const input = request();
  input.mapping = { Client_ID: "clientId", "New Notes": "note", "Primary Solicitor": "portfolio" };
  input.bytes = Buffer.from('Client_ID,New Notes,Primary Solicitor\r\n0001,"Follow-up: Smith-Jones — thanks!",Smith-Jones\r\n').toString("base64");
  assert.equal(plan(input).changes, 2);
  for (const byte of [0, 1, 8, 11, 12, 14, 31, 127]) {
    input.bytes = Buffer.from(`Client_ID,New Notes\r\n0001,"Text${String.fromCharCode(byte)}more"\r\n`).toString("base64"); input.mapping = { Client_ID: "clientId", "New Notes": "note" };
    if (byte === 0) assert.throws(() => plan(input), /NUL/); // owning strict parser rejects whole file
    else { assert.equal(plan(input).changes, 0, `forbidden byte ${byte}`); assert.match(plan(input).reviews[0].fields[0].outcome, /invalid/); }
  }
  input.bytes = Buffer.from('Client_ID,New Notes\r\n0001,"Line one\nLine two\twith tab"\r\n').toString("base64");
  assert.equal(plan(input).changes, 1);
});
test("optional internal verification and known CPTID column hold contradictory identities even when unmapped", () => {
  const input = request();
  for (const target of ["", "verifyCptid"]) {
    input.mapping = { Client_ID: "clientId", CPTID: target, "New Notes": "note" };
    input.bytes = Buffer.from("Client_ID,CPTID,New Notes\r\n0001,900002,Wrong donor\r\n").toString("base64");
    assert.equal(plan(input).changes, 0); assert.match(plan(input).reviews[0].reason!, /contradicts/);
  }
});
