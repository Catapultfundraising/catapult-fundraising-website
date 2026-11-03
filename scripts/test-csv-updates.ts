// Synthetic offline tests for the staff CSV contact updater (fictional data; no network, no Engage, no SQL).
// Run: npx tsx --test scripts/test-csv-updates.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { parseCsv, buildPreview, changesOf, validateMapping, suggestMapping, signToken, verifyToken, demoAllowed, csvApplyEnabled, CsvError, type TokenPayload } from "../lib/portal-v2/csv-updates";
import { applyCsvPreview } from "../lib/portal-v2/csv-updates-apply";
import { postApply } from "../lib/portal-v2/csv-updates-client";
import { inspectCsv } from "../lib/portal-v2/csv-updates";
import { demoSource, DEMO_CSV } from "../lib/portal-v2/csv-updates-demo";
import { CONTACT_KEYS } from "../lib/portal-v2/record-overlay";

const SECRET = "x".repeat(32);
const src = () => ({ client: "pvas" as const, ...demoSource("pvas") });

test("CSV parser: BOM, quotes, escaped quotes, embedded newlines, CRLF; malformed rejected", () => {
  assert.deepEqual(parseCsv("\ufeffa,b\r\n\"x, y\",\"he said \"\"hi\"\"\"\r\n\"multi\nline\",z\n"), [["a", "b"], ["x, y", 'he said "hi"'], ["multi\nline", "z"]]);
  assert.throws(() => parseCsv('a,b\n"open,1\n'), CsvError);
  assert.throws(() => parseCsv('a,b\nx"y,1\n'), CsvError);
  assert.throws(() => parseCsv('a,b\n"x"y,1\n'), CsvError);
  assert.throws(() => parseCsv("a,b\rc,d"), CsvError);
});

test("mapping: duplicate headers, duplicate targets, unsupported fields, CPTID required", () => {
  assert.throws(() => validateMapping(["CPTID", "City", "city"], {}), /Duplicate column header/);
  assert.throws(() => validateMapping(["A", "B"], { A: "cptid", B: "name" }), /unsupported/);
  assert.throws(() => validateMapping(["A", "B", "C"], { A: "cptid", B: "city", C: "city" }), /Two columns/);
  assert.throws(() => validateMapping(["A", "B"], { A: "city" }), /CPTID/);
  assert.throws(() => validateMapping(["A"], { A: "cptid", Z: "city" }), /not in the file/);
  assert.deepEqual(suggestMapping(["CPTID", "Name", "E-mail", "Work Email"]), { CPTID: "cptid", Name: "", "E-mail": "email", "Work Email": "workEmail" });
  assert.equal(CONTACT_KEYS.length, 12);
});

test("demo preview: changed / unchanged / blank / invalid / protected / held / unknown / updater-owned", () => {
  const p = buildPreview(DEMO_CSV, null, src());
  const by = (id: string) => p.rows.find((r) => r.cptidRaw === id)!;
  const f = (id: string, k: string) => by(id).fields.find((x) => x.key === k)!;
  assert.equal(by("1001").status, "changed"); assert.equal(f("1001", "street").state, "changed"); assert.equal(f("1001", "street").old, "12 Orchard Ln");
  assert.equal(f("1001", "city").state, "unchanged"); assert.equal(f("1001", "phone").old, "(956) 555-0100");
  assert.equal(f("1002", "city").state, "protected"); assert.equal(f("1002", "street").state, "blank"); assert.equal(by("1002").status, "held");
  assert.equal(f("1003", "phone").state, "changed", "prior CSV-updater value is updatable"); assert.equal(f("1003", "phone").expectedUpdateId, 502);
  assert.equal(by("1005").status, "invalid"); assert.equal(by("1006").status, "held"); assert.equal(by("1007").status, "held");
  assert.equal(by("9999").status, "invalid"); assert.match(by("9999").reason!, /not found/);
  assert.equal(by("1008").status, "unchanged", "all blanks leave values as is");
  const ch = changesOf(p);
  assert.ok(ch.every((c) => (CONTACT_KEYS as readonly string[]).includes(c.key) && c.newValue));
  assert.ok(!ch.some((c) => [1002, 1005, 1006, 1007, 9999, 1008].includes(c.cptid)), "only changed rows/fields are sent");
  assert.equal(p.counts.changedValues, ch.length);
});

test("ID validation and duplicates: no name matching, no guessing", () => {
  const s = src();
  const p = buildPreview("CPTID,Name,City\n1001,Someone Else,Austin\n1001,Dup,Waco\n01004,X,Y\n1.5,X,Y\n-3,X,Y\n,Avery Lindqvist,Y\n1004,X\n", { CPTID: "cptid", Name: "", City: "city" }, s);
  assert.deepEqual(p.rows.map((r) => r.status), ["invalid", "invalid", "invalid", "invalid", "invalid", "invalid", "invalid"]);
  assert.match(p.rows[0].reason!, /more than once/); assert.match(p.rows[6].reason!, /columns/);
  assert.throws(() => buildPreview("CPTID,City\n" + "1001,A\n".repeat(501), null, s), /500/);
  assert.match(buildPreview("CPTID,Email\n1004,a\u0007@x.org\n", null, s).rows[0].reason!, /invalid/);
});

test("manual overlay edited after preview changes expectations (stale detection inputs)", () => {
  const s = src();
  const before = changesOf(buildPreview("CPTID,City\n1004,Austin\n", null, s));
  assert.deepEqual([before[0].expectedUpdateId, before[0].expectedValue, before[0].baseOld], [null, null, "Maple Ridge"]);
  s.updates.push({ id: 600, cptid: 1004, field: "contact:city", new_value: "Waco", batch_id: 44, created_by: "Staff" });
  const after = buildPreview("CPTID,City\n1004,Austin\n", null, s);
  assert.equal(after.rows[0].fields[0].state, "protected");
});

test("cross-client: token bound to client; tamper rejected; expiry", () => {
  const payload: TokenPayload = { v: 1, client: "pvas", fileName: "a.csv", mapping: {}, asOf: "2026-01-05", maxBatchId: 43, requestId: "a".repeat(32), exp: Date.now() + 60_000, changes: [] };
  const t = signToken(payload, SECRET);
  const v = verifyToken(t, SECRET); assert.equal(v.payload.client, "pvas"); assert.equal(v.hash.length, 64);
  const [body, sig] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ ...payload, client: "csnf" })).toString("base64url");
  assert.throws(() => verifyToken(`${forged}.${sig}`, SECRET), /not valid/);
  assert.throws(() => verifyToken(t, "y".repeat(32)), /not valid/);
  assert.throws(() => verifyToken(t, ""), /not configured/);
  assert.throws(() => verifyToken(signToken({ ...payload, exp: Date.now() - 1 }, SECRET), SECRET), /expired/);
  assert.ok(body);
});

const goodToken = (over: Partial<TokenPayload> = {}) => signToken({ v: 1, client: "pvas", fileName: "a.csv", mapping: {}, asOf: "2026-01-05", maxBatchId: 43, requestId: "a".repeat(32), exp: Date.now() + 60_000,
  changes: [{ cptid: 1004, key: "city", newValue: "Austin", baseOld: "Maple Ridge", expectedUpdateId: null, expectedValue: null }], ...over }, SECRET);
const ON = { CSV_UPDATES_APPLY: "enabled" };
const recs = async () => ({ asOf: "2026-01-05", records: { "1004": { contact: { city: "Maple Ridge" } } } });

test("apply: default OFF, name required, stale snapshot, cross-client, lost response is unconfirmed (no retry)", async () => {
  assert.equal(csvApplyEnabled({}), false);
  let calls = 0;
  const engageCall = async () => { calls++; throw new Error("network"); };
  assert.equal((await applyCsvPreview({ token: goodToken(), by: "Pat" }, "pvas", SECRET, { env: {}, recordsFor: recs, engageCall })).status, 403);
  assert.equal((await applyCsvPreview({ token: goodToken(), by: " " }, "pvas", SECRET, { env: ON, recordsFor: recs, engageCall })).status, 400);
  assert.equal((await applyCsvPreview({ token: goodToken(), by: "Pat" }, "csnf", SECRET, { env: ON, recordsFor: recs, engageCall })).status, 409);
  assert.equal((await applyCsvPreview({ token: goodToken(), by: "Pat" }, "pvas", SECRET, { env: ON, recordsFor: async () => ({ asOf: "2026-01-12", records: { "1004": { contact: { city: "Maple Ridge" } } } }), engageCall })).body.code, "stale");
  assert.equal(calls, 0, "no Engage call before checks pass");
  const r = await applyCsvPreview({ token: goodToken(), by: "Pat" }, "pvas", SECRET, { env: ON, recordsFor: recs, engageCall });
  assert.deepEqual([r.status, r.body.unconfirmed, r.body.requestId, calls], [502, true, "a".repeat(32), 1]);
  const r5 = await applyCsvPreview({ token: goodToken(), by: "Pat" }, "pvas", SECRET, { env: ON, recordsFor: recs, engageCall: async () => ({ status: 500, body: {} }) });
  assert.equal(r5.body.unconfirmed, true);
});

test("apply forwards exactly the signed changes + preview hash; held passes through as not saved", async () => {
  let sent: Record<string, unknown> = {};
  const t = goodToken();
  const ok = await applyCsvPreview({ token: t, by: "Pat", changes: [{ cptid: 1, key: "city", newValue: "EVIL" }] }, "pvas", SECRET, { env: ON, recordsFor: recs, engageCall: async (_c, op, body) => { sent = { op, ...body }; return { status: 200, body: { batchId: 9, changed: 1, records: 1, alreadyApplied: false } }; } });
  assert.equal(ok.body.saved, true); assert.equal(sent.op, "applyCsvContactUpdates");
  assert.deepEqual(sent.changes, [{ cptid: 1004, key: "city", newValue: "Austin", baseOld: "Maple Ridge", expectedUpdateId: null, expectedValue: null }]);
  assert.equal(sent.previewHash, createHash("sha256").update(Buffer.from(t.split(".")[0], "base64url").toString("utf8")).digest("hex"));
  assert.equal(sent.expectedMaxBatchId, 43);
  const held = await applyCsvPreview({ token: t, by: "Pat" }, "pvas", SECRET, { env: ON, recordsFor: recs, engageCall: async () => ({ status: 409, body: { error: "Nothing was saved", code: "held" } }) });
  assert.deepEqual([held.status, held.body.saved], [409, false]);
});

test("route: staff auth required (password configured), same-origin JSON, demo unavailable in production", async () => {
  const { POST } = await import("../app/api/research-csv-updates/route");
  const pw = "pw-test", sec = "sec-test";
  const cookie = createHash("sha256").update(`${pw}:${sec}`).digest("hex");
  const req = (body: unknown, h: Record<string, string> = {}) => new NextRequest("https://local.test/api/research-csv-updates", { method: "POST", body: JSON.stringify(body),
    headers: { host: "local.test", origin: "https://local.test", "content-type": "application/json", cookie: `catapult_research_auth=${cookie}`, ...h } });
  const env = process.env as Record<string, string | undefined>;
  Object.assign(env, { RESEARCH_PASSWORD: "", RESEARCH_AUTH_SECRET: "" });
  assert.equal((await POST(req({ op: "preview", client: "pvas" }, { cookie: `catapult_research_auth=${createHash("sha256").update(":").digest("hex")}` }))).status, 401, "empty password never authenticates");
  Object.assign(env, { RESEARCH_PASSWORD: pw, RESEARCH_AUTH_SECRET: sec, CSV_UPDATES_DEMO: "1" });
  delete env.VERCEL_ENV; delete env.CSV_UPDATES_APPLY;
  assert.equal((await POST(req({ op: "preview", client: "pvas" }, { cookie: "catapult_pvas_data=whatever" }))).status, 401, "client cookie alone is not staff");
  assert.equal((await POST(req({ op: "preview", client: "pvas" }, { origin: "https://evil.test" }))).status, 403);
  assert.equal((await POST(req({ op: "preview", client: "pvas" }, { "content-type": "text/plain" }))).status, 403);
  assert.equal((await POST(req({ op: "preview", client: "acme" }))).status, 400);
  const demo = await POST(req({ op: "preview", client: "jag", demo: true, csv: DEMO_CSV, fileName: "fictional-demo.csv" }));
  const j = await demo.json(); assert.equal(demo.status, 200); assert.equal(j.applyEnabled, false); assert.ok(j.token); assert.ok(j.preview.counts.changedRows > 0);
  assert.equal((await POST(req({ op: "apply", client: "jag", demo: true, token: j.token, by: "Pat" }))).status, 403, "demo can never save");
  assert.equal(demoAllowed({ NODE_ENV: "production", CSV_UPDATES_DEMO: "1" }), false);
  assert.equal(demoAllowed({ NODE_ENV: "development", VERCEL_ENV: "preview", CSV_UPDATES_DEMO: "1" }), false);
  env.VERCEL_ENV = "production";
  assert.equal((await POST(req({ op: "preview", client: "jag", demo: true, csv: DEMO_CSV, fileName: "x.csv" }))).status, 403);
  delete env.VERCEL_ENV;
  const off = await POST(req({ op: "apply", client: "pvas", token: "x.y", by: "Pat" }));
  assert.equal(off.status, 403, "apply default OFF");
});

test("unknown headers: inspect returns headers without dashboard data; manual mapping then previews", () => {
  const csv = "Internal constituent number,Home town\n1004,Austin\n";
  const i = inspectCsv(csv);
  assert.deepEqual(i.headers, ["Internal constituent number", "Home town"]); assert.deepEqual(i.mapping, { "Internal constituent number": "", "Home town": "" }); assert.equal(i.rows, 1);
  assert.throws(() => buildPreview(csv, null, src()), /CPTID/);
  const p = buildPreview(csv, { "Internal constituent number": "cptid", "Home town": "city" }, src());
  assert.equal(p.rows[0].status, "changed"); assert.equal(p.rows[0].fields[0].new, "Austin");
  assert.throws(() => inspectCsv("A,a\n1,2\n"), /Duplicate/);
});

test("same asOf but changed source value is stale; no Engage call", async () => {
  let calls = 0;
  const r = await applyCsvPreview({ token: goodToken(), by: "Pat" }, "pvas", SECRET, { env: ON, engageCall: async () => { calls++; return { status: 200, body: {} }; },
    recordsFor: async () => ({ asOf: "2026-01-05", records: { "1004": { contact: { city: "Lakeview" } } } }) });
  assert.deepEqual([r.status, r.body.code, calls], [409, "stale", 0]);
  const ok = await applyCsvPreview({ token: goodToken(), by: "Pat" }, "pvas", SECRET, { env: ON, engageCall: async () => { calls++; return { status: 200, body: { batchId: 1 } }; }, recordsFor: recs });
  assert.equal(ok.body.saved, true); assert.equal(calls, 1);
});

test("browser: fetch rejection / unreadable reply / 5xx are unconfirmed with the preview requestId", async () => {
  const rq = "f".repeat(32);
  const rej = await postApply((async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch, {}, rq);
  assert.deepEqual([rej.kind, (rej as { requestId: string }).requestId], ["unconfirmed", rq]);
  const garbled = await postApply((async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch, {}, rq);
  assert.equal(garbled.kind, "unconfirmed");
  const gw = await postApply((async () => new Response(JSON.stringify({ error: "x", unconfirmed: true, requestId: rq }), { status: 502 })) as unknown as typeof fetch, {}, rq);
  assert.equal(gw.kind, "unconfirmed");
  const held = await postApply((async () => new Response(JSON.stringify({ error: "Nothing was saved", code: "held" }), { status: 409 })) as unknown as typeof fetch, {}, rq);
  assert.equal(held.kind, "rejected");
  const ok = await postApply((async () => new Response(JSON.stringify({ saved: true, batchId: 3 }), { status: 200 })) as unknown as typeof fetch, {}, rq);
  assert.equal(ok.kind, "saved");
});

test("page: mapping change and file/client change invalidate the plan; apply needs token+requestId", () => {
  const page = readFileSync(new URL("../app/research/csv-updates/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function changeMapping\(h: string, v: string\) \{ setPreview\(null\); setToken\(null\); setRequestId\(null\);/);
  assert.match(page, /onChange=\{\(e\) => changeMapping\(h, e\.target\.value\)\}/);
  assert.match(page, /disabled=\{!applyEnabled \|\| !token \|\| !requestId/);
  assert.match(page, /postApply\(fetch,/);
});
