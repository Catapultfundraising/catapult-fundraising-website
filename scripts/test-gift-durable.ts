// SYNTHETIC tests for the durable gift-ID website gateway (lib/portal-v2/gift-durable.ts + route ops). Fictional data;
// Engage is a stubbed fetch; no network, no SQL. The registration exists ONLY through the test hook (production copy EMPTY).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

Object.assign(process.env, { RESEARCH_PASSWORD: "localpw", RESEARCH_AUTH_SECRET: "fictional-local-test-secret-0123456789", SOURCE_IMPORT_PREVIEW: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: "w".repeat(32), SOURCE_PREPARED_TEST_HOOK: "1", SOURCE_IMPORT_APPLY: "enabled" });
const COOKIE = createHash("sha256").update("localpw:fictional-local-test-secret-0123456789").digest("hex");
const SECRET = "fictional-local-test-secret-0123456789", NOW = 1_800_000_000_000;
const REG = { id: "fict_gifts", version: 1, client: "jag", scope: "fict-gift-export", schema: "jag", table: "raw_master_giving_history", locator: "row_id", person: "CPTID", native: "Transaction",
  columns: [{ col: "Gift_Amount", ty: "decimal", len: null, p: 19, s: 4 }, { col: "Gift_Date", ty: "datetime2", len: null, p: null, s: null }, { col: "Record_Type", ty: "nvarchar", len: -1, p: null, s: null }],
  required: ["Gift_Amount", "Gift_Date"], master: { schema: "jag", table: "constituents", col: "CPTID" }, locatorVerifiedUnique: true, rowAllocator: { kind: "locked-max" as const, min: 1, max: 2147483647 } };
const CSV = "Donor,Amount,Date,Type\r\n7001,100,2026-01-05T00:00:00,Gift\r\n7002,=SUM(A1),2026-01-06T00:00:00,\r\n7003,5,2026-01-07T00:00:00,Pledge\r\n7001,7,2026-01-08T00:00:00,Gift\r\n";
const MAP = { Donor: "@person", Amount: "Gift_Amount", Date: "Gift_Date", Type: "Record_Type" };
const EXP = { Gift_Amount: "5", Gift_Date: "2025-03-01T00:00:00", Record_Type: "Gift" };
const UUID1 = "0000aaaa-0000-4000-8000-00000000abcd";
const DEC = [{ o: 0, d: "new" }, { o: 1, d: "held" }, { o: 2, d: "adopt", locator: 41, expected: EXP }, { o: 3, d: "correct", giftId: UUID1, expected: { Gift_Amount: "7", Gift_Date: "2026-01-08T00:00:00", Record_Type: "Pledge" } }];

async function lib() {
  const d = await import("../lib/portal-v2/gift-durable");
  const p = await import("../lib/portal-v2/gift-identity-plan");
  d.__setGiftRegistrationsForTests([REG]);
  return { ...d, ...p };
}
const plan = async (o: Record<string, unknown> = {}) => { const L = await lib(); return L.buildDurablePlan({ client: "jag", csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat Example", fileName: "jag gifts_2026.csv", fileDate: null, secret: SECRET, now: NOW, ...o }); };

test("plan: decisions -> manifest; held/unchanged stay held; token binds every field; mapping change keeps jobId but token differs", async () => {
  const L = await lib(); const p = await plan();
  assert.equal(p.summary.decided, 3); assert.equal(p.summary.held, 1); assert.deepEqual(p.manifest.held, [1]);
  assert.deepEqual(p.manifest.decided.map((e) => e.a), ["new", "adopt", "correct"]);
  assert.deepEqual(p.batches.flat().find((r) => r.action === "correct")!.values, { Record_Type: "Gift" }, "correct sends only changed columns");
  const { t } = L.verifyJob(p.token, p.manifest, SECRET, NOW, "jag"); assert.equal(t.jobId, p.jobId); assert.equal(t.fileName, "jag gifts_2026.csv");
  const p2 = await plan({ mapping: { Type: "Record_Type", Date: "Gift_Date", Amount: "Gift_Amount", Donor: "@person", } });
  assert.equal(p2.jobId, p.jobId, "same rows => same jobId"); assert.equal(p2.token, p.token, "same mapping digest (key order irrelevant)");
  const p3 = await plan({ mapping: { ...MAP, Extra: undefined } as never }).catch((e) => e); assert.ok(p3 instanceof L.DurableGiftError);
  // a genuinely DIFFERENT mapping (duplicate Type column mapped instead) that yields identical rows: same jobId, different token
  const csv2 = CSV.split("\r\n").map((l) => (l ? `${l},${l.split(",")[3]}` : l)).join("\r\n").replace("Type,Type", "Type,Type Copy");
  const alt = await plan({ csv: csv2, mapping: { Donor: "@person", Amount: "Gift_Amount", Date: "Gift_Date", "Type Copy": "Record_Type" } });
  const same = await plan({ csv: csv2 });
  assert.equal(alt.jobId, same.jobId, "same file + identical rows => same jobId");
  assert.notEqual(alt.token, same.token, "different mapping => different token");
  assert.deepEqual(alt.batches, same.batches, "identical rows");
  // tamper each signed field via a forged manifest
  for (const k of ["actor", "fileName", "fileDate", "totalOrdinals", "registrationVersion"] as const) {
    const m = JSON.parse(JSON.stringify(p.manifest)); m[k] = k === "totalOrdinals" ? 5 : k === "registrationVersion" ? 2 : k === "fileDate" ? "2026-01-01" : "X";
    assert.throws(() => L.verifyJob(p.token, m, SECRET, NOW, "jag"), L.DurableGiftError, k);
  }
  assert.throws(() => L.verifyJob(p.token, p.manifest, SECRET, NOW + 61 * 60_000, "jag"), /expired/);
  assert.throws(() => L.verifyJob(p.token, p.manifest, SECRET, NOW, "csnf"), /another client/);
  const [body, mac] = p.token.split("."); assert.throws(() => L.verifyJob(`${body}.${mac.slice(0, -2)}AA`, p.manifest, SECRET, NOW, "jag"), /signature/);
});

test("plan refusals: all held => nothing to save; donor not exact int; ragged rows; bad mapping", async () => {
  const L = await lib();
  await assert.rejects(plan({ decisions: DEC.map((d) => ({ o: d.o, d: "held" })) }), (e: unknown) => e instanceof L.DurableGiftError && /held/.test(e.message));
  await assert.rejects(plan({ csv: CSV.replace("7003", "07003") }), /exact positive whole number/);
  await assert.rejects(plan({ csv: CSV + "1,2\r\n", decisions: [...DEC, { o: 4, d: "held" }] }), /as many cells/);
  await assert.rejects(plan({ mapping: { Amount: "Gift_Amount" } }), /donor CPTID/);
  await assert.rejects(plan({ mapping: { ...MAP, Type: "Gift_Amount" } }), /mapped twice/);
  // backend-equivalent row contract before signing
  await assert.rejects(plan({ csv: CSV.replace("7001,100,", "7001,abc,") }), /not a number|invalid value for Gift_Amount/);
  await assert.rejects(plan({ csv: CSV.replace("7001,100,2026-01-05T00:00:00,", "7001,100,,") }), /required Gift_Date/);
  await assert.rejects(plan({ decisions: DEC.map((d) => (d.o === 2 ? { ...d, expected: {} } : d)) }), /expected must list exactly every registered column/);
  await assert.rejects(plan({ fileDate: "2026-02-31" }), /fileDate/);
  await assert.rejects(plan({ decisions: DEC.map((d) => (d.o === 0 ? { ...d, giftId: UUID1 } : d)) }), /unexpected fields/);
  await assert.rejects(plan({ decisions: DEC.map((d) => (d.o === 1 ? { ...d, note: "x" } : d)) }), /unexpected fields/);
  // returned-ID / provisional columns are refused (reimport unfinished); never read as identities
  for (const h of ["Catapult Gift ID", " catapult  gift id ", "Gift ID Status", "Provisional Preview ID"]) {
    const csv = CSV.replace("Donor,Amount,Date,Type", `Donor,Amount,Date,Type,${h}`).split("\r\n").map((l, i) => (i && l ? l + ",00000001-0000-4000-8000-00000000abcd" : l)).join("\r\n");
    await assert.rejects(plan({ csv }), /give that column another name/, h);
  }
  // long cells are carried exactly (no preview truncation)
  const long = "L".repeat(3000); const p = await plan({ csv: CSV.replace(",Gift\r\n7002", `,${long}\r\n7002`), decisions: [{ o: 0, d: "new" }, { o: 1, d: "held" }, { o: 2, d: "held" }, { o: 3, d: "held" }] });
  assert.equal(p.batches[0][0].values.Record_Type, long);
});

test("commit body: rows must equal the manifest slice; jobRequestId derived; proof/job token types are not interchangeable", async () => {
  const L = await lib(); const p = await plan();
  const b = L.commitBody({ client: "jag", token: p.token, manifest: p.manifest, batchIndex: 0, rows: p.batches[0], secret: SECRET, now: NOW });
  assert.equal(b.request.requestId, L.jobRequestId(p.jobId, 0));
  const forged = JSON.parse(JSON.stringify(p.batches[0])); forged[0].values.Gift_Amount = "999";
  assert.throws(() => L.commitBody({ client: "jag", token: p.token, manifest: p.manifest, batchIndex: 0, rows: forged, secret: SECRET, now: NOW }), L.DurableGiftError);
  const st = { found: true, confirmed: true, outcome: { requestId: b.request.requestId, client: "jag", registrationId: REG.id, committed: true, counts: { new: 1, adopt: 1, correct: 1 }, rows: [{ ordinal: 0, action: "new", giftId: "0000bbbb-0000-4000-8000-00000000abcd", locator: 90 }, { ordinal: 2, action: "adopt", giftId: "0000cccc-0000-4000-8000-00000000abcd", locator: 41 }, { ordinal: 3, action: "correct", giftId: UUID1, locator: 12 }] } };
  const proof = L.proofFor({ client: "jag", token: p.token, manifest: p.manifest, batchIndex: 0, status: st, secret: SECRET, now: NOW })!;
  assert.ok(proof);
  assert.throws(() => L.verifyJob(proof, p.manifest, SECRET, NOW, "jag"), /signature|type/);
  assert.throws(() => L.durableExport({ client: "jag", csv: CSV, token: p.token, manifest: p.manifest, proofs: [p.token], secret: SECRET, now: NOW }), /signature|type/);
});

test("proof: only a fully consistent committed outcome becomes a proof (scope, counts, action/target drift, unconfirmed)", async () => {
  const L = await lib(); const p = await plan(); const rq = L.jobRequestId(p.jobId, 0);
  const good = { requestId: rq, client: "jag", registrationId: REG.id, committed: true, counts: { new: 1, adopt: 1, correct: 1 }, rows: [{ ordinal: 0, action: "new", giftId: "0000bbbb-0000-4000-8000-00000000abcd", locator: 90 }, { ordinal: 2, action: "adopt", giftId: "0000cccc-0000-4000-8000-00000000abcd", locator: 41 }, { ordinal: 3, action: "correct", giftId: UUID1, locator: 12 }] };
  const pf = (outcome: unknown, extra: Record<string, unknown> = {}) => L.proofFor({ client: "jag", token: p.token, manifest: p.manifest, batchIndex: 0, status: { found: true, confirmed: true, outcome, ...extra }, secret: SECRET, now: NOW });
  assert.ok(pf(good));
  assert.equal(pf(good, { confirmed: false }), null);
  assert.equal(pf({ ...good, client: "csnf" }), null);
  assert.equal(pf({ ...good, requestId: L.jobRequestId(p.jobId, 1) }), null);
  assert.equal(pf({ ...good, rows: good.rows.slice(0, 2), counts: { new: 1, adopt: 1, correct: 0 } }), null, "partial slice");
  assert.equal(pf({ ...good, rows: good.rows.map((r) => (r.ordinal === 0 ? { ...r, action: "adopt" } : r)), counts: { new: 0, adopt: 2, correct: 1 } }), null, "action drift");
  assert.equal(pf({ ...good, rows: good.rows.map((r) => (r.ordinal === 3 ? { ...r, giftId: "0000dddd-0000-4000-8000-00000000abcd" } : r)) }), null, "correction UUID drift");
  assert.equal(pf({ ...good, rows: good.rows.map((r) => (r.ordinal === 2 ? { ...r, locator: 42 } : r)) }), null, "adopt locator drift");
  assert.equal(pf({ ...good, rows: good.rows.map((r) => (r.ordinal === 0 ? { ...r, giftId: "PROV-0123456789abcdef0123456789abcdef" } : r)) }), null);
});

test("export: IDs only for proven rows; held/unconfirmed blank; formula escaped; hyphen filename; forged/expired/cross-job/duplicate proofs refused", async () => {
  const L = await lib(); const p = await plan(); const rq = L.jobRequestId(p.jobId, 0);
  const good = { requestId: rq, client: "jag", registrationId: REG.id, committed: true, counts: { new: 1, adopt: 1, correct: 1 }, rows: [{ ordinal: 0, action: "new", giftId: "0000bbbb-0000-4000-8000-00000000abcd", locator: 90 }, { ordinal: 2, action: "adopt", giftId: "0000cccc-0000-4000-8000-00000000abcd", locator: 41 }, { ordinal: 3, action: "correct", giftId: UUID1, locator: 12 }] };
  const proof = L.proofFor({ client: "jag", token: p.token, manifest: p.manifest, batchIndex: 0, status: { found: true, confirmed: true, outcome: good }, secret: SECRET, now: NOW })!;
  const none = L.durableExport({ client: "jag", csv: CSV, token: p.token, manifest: p.manifest, proofs: [], secret: SECRET, now: NOW });
  assert.equal(none.proven, 0); assert.ok(!/0000bbbb/.test(none.csv)); assert.match(none.csv, /not confirmed - check status/);
  const ex = L.durableExport({ client: "jag", csv: CSV, token: p.token, manifest: p.manifest, proofs: [proof], secret: SECRET, now: NOW });
  assert.equal(ex.proven, 3); assert.equal(ex.fileName, "jag gifts-2026-catapult-gift-ids.csv"); assert.ok(!ex.fileName.includes("_"));
  const lines = ex.csv.trim().split("\r\n"); assert.match(lines[0], /"Catapult Gift ID","Gift ID Status"$/);
  assert.match(lines[1], /0000bbbb-0000-4000-8000-00000000abcd","saved \(committed, verified\)"$/); assert.match(lines[2], /"'=SUM\(A1\)".*"","held - not saved"$/);
  assert.ok(!/PROV-/.test(ex.csv));
  assert.throws(() => L.durableExport({ client: "jag", csv: CSV, token: p.token, manifest: p.manifest, proofs: [proof, proof], secret: SECRET, now: NOW }), /duplicate|bad proofs/);
  assert.throws(() => L.durableExport({ client: "jag", csv: CSV, token: p.token, manifest: p.manifest, proofs: [proof], secret: SECRET, now: NOW + 2 * 60 * 60_000 }), /expired/);
  assert.throws(() => L.durableExport({ client: "jag", csv: CSV.replace("Pledge", "Pledged"), token: p.token, manifest: p.manifest, proofs: [proof], secret: SECRET, now: NOW }), /not the file/);
  const other = await plan({ actor: "Someone Else" });
  assert.throws(() => L.durableExport({ client: "jag", csv: CSV, token: other.token, manifest: other.manifest, proofs: [proof], secret: SECRET, now: NOW }), /another job/);
  const [body] = proof.split("."); assert.throws(() => L.durableExport({ client: "jag", csv: CSV, token: p.token, manifest: p.manifest, proofs: [`${body}.AAAA`], secret: SECRET, now: NOW }), /signature/);
});

test("signing refuses a short (<24 chars) secret", async () => {
  const L = await lib();
  assert.throws(() => L.buildDurablePlan({ client: "jag", csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat Example", fileName: "a.csv", fileDate: null, secret: "short-secret", now: NOW }), /secret not configured/);
});

test("size bounds: >4 MB plan request refused before parsing; oversized responses refused", async () => {
  const L = await lib();
  assert.equal(L.DURABLE_MAX_BODY, 4_000_000); assert.equal(L.DURABLE_MAX_RESPONSE, 4_000_000);
  const wide = { ...REG, columns: Array.from({ length: 12 }, (_, i) => ({ col: `N${i}`, ty: "nvarchar", len: -1, p: null, s: null })), required: [] };
  L.__setGiftRegistrationsForTests([wide]);
  const cell = "\u20ac".repeat(3999) + "y";
  const hdr = ["Donor", ...wide.columns.map((c) => c.col)].join(",");
  const rows = Array.from({ length: 30 }, () => ["7001", ...wide.columns.map(() => cell)].join(","));
  const csv = [hdr, ...rows].join("\r\n") + "\r\n";
  const mapping = Object.fromEntries([["Donor", "@person"], ...wide.columns.map((c) => [c.col, c.col])]);
  assert.throws(() => L.buildDurablePlan({ client: "jag", csv, mapping, decisions: rows.map((_, o) => ({ o, d: "new" })), actor: "Pat", fileName: "w.csv", fileDate: null, secret: SECRET, now: NOW }), (e: unknown) => e instanceof L.DurableGiftError && e.status === 413);
  L.__setGiftRegistrationsForTests([REG]);
});

test("[ROUTE] auth, same-origin, empty-registry refusal, hard SOURCE_TRANSPORT_APPROVED=false => commit 503 before any upstream call", async () => {
  const calls: unknown[] = [];
  globalThis.fetch = (async (_u: unknown, init: { body: string }) => { calls.push(JSON.parse(init.body)); return Response.json({}); }) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route");
  const D = await import("../lib/portal-v2/gift-durable");
  const post = (body: Record<string, unknown>, h: Record<string, string> = {}) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", cookie: `catapult_research_auth=${COOKIE}`, ...h }, body: JSON.stringify(body) }));
  D.__setGiftRegistrationsForTests([]);
  assert.equal((await post({ op: "durableGiftContext", client: "jag", table: "raw_master_giving_history" }, { cookie: "" })).status, 401);
  assert.equal((await post({ op: "durableGiftContext", client: "jag", table: "raw_master_giving_history" }, { origin: "https://evil.example" })).status, 403);
  const ctx = await (await post({ op: "durableGiftContext", client: "jag", table: "raw_master_giving_history" })).json(); assert.equal(ctx.available, false);
  assert.equal((await post({ op: "durableGiftPlan", client: "jag", table: "raw_master_giving_history", csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null })).status, 404);
  D.__setGiftRegistrationsForTests([REG]);
  const c2 = await (await post({ op: "durableGiftContext", client: "jag", table: "raw_master_giving_history" })).json(); assert.equal(c2.available, true); assert.equal(c2.saveAvailable, false, "hard false even with SOURCE_IMPORT_APPLY=enabled");
  const pl = await (await post({ op: "durableGiftPlan", client: "jag", table: "raw_master_giving_history", csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null })).json();
  assert.ok(pl.token);
  const r = await post({ op: "durableGiftCommit", client: "jag", table: "raw_master_giving_history", token: pl.token, manifest: pl.manifest, batchIndex: 0, rows: pl.batches[0] });
  assert.equal(r.status, 503); assert.equal((await r.json()).code, "disabled"); assert.equal(calls.length, 0, "no upstream call");
  assert.equal((await post({ op: "durableGiftPlan", client: "jag", table: "raw_master_giving_history", csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null, extra: 1 })).status, 400);
  const big = "x".repeat(4_000_001);
  assert.equal((await post({ op: "durableGiftPlan", client: "jag", table: "raw_master_giving_history", csv: big, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null })).status, 413);
  D.__setGiftRegistrationsForTests([]);
});

test("[ROUTE] table scope, unknown op, context body, preview preflight/projection, proof range: refused before any upstream call", async () => {
  const calls: Record<string, unknown>[] = [];
  let reply: unknown = {};
  globalThis.fetch = (async (_u: unknown, init: { body: string }) => { calls.push(JSON.parse(init.body)); return Response.json(reply); }) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route");
  const D = await import("../lib/portal-v2/gift-durable");
  D.__setGiftRegistrationsForTests([REG]);
  const post = (body: Record<string, unknown>) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", cookie: `catapult_research_auth=${COOKIE}` }, body: JSON.stringify(body) }));
  const T = REG.table;
  assert.equal((await post({ op: "durableGiftPlan", client: "jag", table: "unrelated_table", csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null })).status, 400);
  { const r0 = await post({ op: "durableGiftContext", client: "jag", table: "unrelated_table" }); assert.equal(r0.status, 200); assert.equal((await r0.json()).available, false, "F1b: other table => available:false (+lookupAvailable), never a registration"); }
  assert.equal((await post({ op: "durableGiftContext", client: "jag", table: T, extra: 1 })).status, 400);
  assert.equal((await post({ op: "durableGiftNope", client: "jag", table: T })).status, 400);
  for (const query of [{ kind: "locators", locators: Array.from({ length: 51 }, (_, i) => i + 1) }, { kind: "gifts", giftIds: ["PROV-0123456789abcdef0123456789abcdef"] }, { kind: "persons", persons: [1, 1] }, { kind: "history", person: 7001, after: -1 }, { kind: "locators", locators: [1], x: 1 }])
    assert.equal((await post({ op: "durableGiftPreview", client: "jag", table: T, query })).status, 400, JSON.stringify(query));
  assert.equal(calls.length, 0, "nothing reached Engage");
  const pl = await (await post({ op: "durableGiftPlan", client: "jag", table: T, csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null })).json();
  assert.equal((await post({ op: "durableGiftProof", client: "jag", table: T, token: pl.token, manifest: pl.manifest, batchIndex: 5 })).status, 400);
  assert.equal(calls.length, 0, "proof batch range checked before upstream");
  const cells = { Gift_Amount: { v: "5", readable: true }, Gift_Date: { v: null, readable: true }, Record_Type: { readable: false, v: "SHOULD_NOT_RELAY" } };
  reply = { registrationId: REG.id, rowCap: 50, giftOverridesActive: false, rows: [{ locator: 1, person: 7001, personReadable: true, values: cells, giftId: null, donorMismatch: false, baseline: null, privateOtherScopeData: "x" }, { locator: 2, matches: 2, giftId: null }], note: "n", secretLeak: "x".repeat(10) };
  const pr = await (await post({ op: "durableGiftPreview", client: "jag", table: T, query: { kind: "locators", locators: [1, 2] } })).json();
  assert.equal(pr.secretLeak, undefined, "projected to known fields"); assert.equal(pr.rows[0].privateOtherScopeData, undefined); assert.deepEqual(pr.rows[0].values.Record_Type, { readable: false }, "unreadable v never relayed");
  assert.equal(calls.length, 1);
  reply = { rows: "bad" };
  assert.equal((await post({ op: "durableGiftPreview", client: "jag", table: T, query: { kind: "locators", locators: [1] } })).status, 502);
  D.__setGiftRegistrationsForTests([]);
});

test("projectPreview: strict rebuild per registration/query; malformed nested data is 502, never relayed; query-donor drift held", async () => {
  const L = await lib(); const R = L.previewRowCap(3);
  const cells = { Gift_Amount: { v: "5", readable: true }, Gift_Date: { v: null, readable: true }, Record_Type: { v: "Gift", readable: true } };
  const okRow = { locator: 1, person: 7001, personReadable: true, values: cells, giftId: null, donorMismatch: false, baseline: null };
  const base = { registrationId: REG.id, rowCap: R, giftOverridesActive: false, note: "x" };
  const P = (body: unknown, q: Record<string, unknown>) => L.projectPreview(body, REG as never, q);
  const loc = { kind: "locators", locators: [1] };
  assert.equal((P({ ...base, rows: [okRow] }, loc) as { rows: unknown[] }).rows.length, 1);
  const bad502 = (body: unknown, q: Record<string, unknown> = loc, why = "") => assert.throws(() => P(body, q), (e: unknown) => e instanceof L.DurableGiftError && e.status === 502, why);
  bad502({ ...base, registrationId: "other_scope", rows: [okRow] }, loc, "registration");
  bad502({ ...base, rowCap: "unbounded", rows: [okRow] }, loc, "rowCap");
  bad502({ ...base, rows: [{ ...okRow, locator: "abc" }] }, loc, "locator");
  bad502({ ...base, rows: [{ ...okRow, person: "wrong" }] }, loc, "person");
  bad502({ ...base, rows: [{ ...okRow, person: null, personReadable: true }] }, loc, "personReadable");
  bad502({ ...base, rows: [{ ...okRow, values: { ...cells, Gift_Amount: { v: "abc", readable: true } } }] }, loc, "invalid decimal readable");
  bad502({ ...base, rows: [{ ...okRow, values: { ...cells, Extra: { v: "1", readable: true } } }] }, loc, "extra column");
  bad502({ ...base, rows: [{ ...okRow, giftId: "PROV-0123456789abcdef0123456789abcdef" }] }, loc, "PROV id");
  bad502({ ...base, rows: [{ ...okRow, giftId: "0000aaaa-0000-4000-8000-00000000abcd", identityConflict: true }] }, loc, "conflict with id");
  bad502({ ...base, rows: [{ locator: 1, matches: 1 }] }, loc, "matches 1");
  bad502({ ...base, rows: [okRow, okRow] }, { kind: "locators", locators: [1, 2] }, "duplicate/coverage");
  bad502({ ...base, rows: [{ ...okRow, giftId: "0000aaaa-0000-4000-8000-00000000abcd", baseline: { Gift_Amount: { present: "yes" } } }] }, loc, "baseline");
  bad502({ ...base, persons: [{ person: 7001, masterMatches: -1, portalOverlay: false, portalProspect: false }] }, { kind: "persons", persons: [7001] }, "counts");
  bad502({ ...base, persons: [{ person: 7002, masterMatches: 1, portalOverlay: false, portalProspect: false }] }, { kind: "persons", persons: [7001] }, "person order");
  bad502({ ...base, gifts: [{ giftId: "0000bbbb-0000-4000-8000-00000000abcd", found: false }], rows: [] }, { kind: "gifts", giftIds: ["0000aaaa-0000-4000-8000-00000000abcd"] }, "gift scope/order");
  bad502({ ...base, rows: [okRow], hasMore: true, next: 99 }, { kind: "history", person: 7001 }, "cursor");
  const u = P({ ...base, rows: [{ ...okRow, values: { ...cells, Record_Type: { readable: false, v: "SHOULD_NOT_RELAY" } } }] }, loc) as { rows: { values: Record<string, unknown> }[] };
  assert.deepEqual(u.rows[0].values.Record_Type, { readable: false });
  const h = P({ ...base, rows: [{ ...okRow, person: 7002 }], hasMore: false, next: null }, { kind: "history", person: 7001 }) as { rows: { donorMismatch: boolean }[] };
  assert.equal(h.rows[0].donorMismatch, true, "query-donor drift held");
});

test("source cells are canonicalized with source-reconcile normalize; expected snapshots are kept exactly; bad conversion refuses", async () => {
  const L = await lib();
  const csv = "Donor,Amount,Date,Type\r\n7001,\"$1,100.50\",2026-01-05,Gift\r\n7001,100.00,1/6/2026,Pledge\r\n";
  const p = await plan({ csv, decisions: [{ o: 0, d: "new" }, { o: 1, d: "correct", giftId: UUID1, expected: { Gift_Amount: "100", Gift_Date: "2026-01-06T00:00:00", Record_Type: "Gift" } }] });
  const [a, b] = p.batches.flat();
  assert.deepEqual(a.values, { Gift_Amount: "1100.5", Gift_Date: "2026-01-05T00:00:00", Record_Type: "Gift" });
  assert.deepEqual(b.expected, { Gift_Amount: "100", Gift_Date: "2026-01-06T00:00:00", Record_Type: "Gift" }, "expected kept exactly");
  assert.deepEqual(b.values, { Record_Type: "Pledge" }, "100.00 canonicalizes to 100 == expected, so only the real change is sent");
  // a non-canonical expected snapshot is never normalized: it is refused by the backend-equivalent contract
  await assert.rejects(plan({ csv, decisions: [{ o: 0, d: "held" }, { o: 1, d: "correct", giftId: UUID1, expected: { Gift_Amount: "100.0000", Gift_Date: "2026-01-06T00:00:00", Record_Type: "Gift" } }] }), /invalid expected for Gift_Amount/);
  await assert.rejects(plan({ csv: csv.replace("100.00", "1.00001"), decisions: [{ o: 0, d: "held" }, { o: 1, d: "new" }] }), /decimal places/);
  await assert.rejects(plan({ csv: csv.replace("1/6/2026", "13/45/2026"), decisions: [{ o: 0, d: "held" }, { o: 1, d: "new" }] }), /date/);
});

test("job status projection: only a self-consistent known shape passes; malformed/unknown => unavailable, never complete; extra fields dropped", async () => {
  const L = await lib(); const J = "f".repeat(64);
  const ok = { confirmed: true, state: "partial", batchCount: 3, committedBatches: [0, 2], missingBatches: [1], heldRows: 2, decidedRows: 10, note: "upstream text", secret: "x" };
  const p = L.projectJobStatus(ok, J, "jag");
  assert.equal(p.state, "partial"); assert.equal(p.jobId, J); assert.equal(p.client, "jag"); assert.ok(!("secret" in p)); assert.notEqual(p.note, "upstream text");
  assert.equal(L.projectJobStatus({ ...ok, missingBatches: [], committedBatches: [0, 1, 2], heldRows: 0, state: "complete" }, J, "jag").state, "complete");
  for (const bad of [{ ...ok, batchCount: -99 }, { ...ok, committedBatches: ["wrong"] }, { ...ok, committedBatches: [2, 0] }, { ...ok, missingBatches: [] }, { ...ok, missingBatches: [1, 2] }, { ...ok, state: "complete" }, { ...ok, missingBatches: [], committedBatches: [0, 1, 2], state: "complete" }, { ...ok, heldRows: -1 }, { confirmed: "yes" }, null, [], { confirmed: false, state: "complete" }])
    assert.equal(L.projectJobStatus(bad, J, "jag").state, "unavailable", JSON.stringify(bad));
  assert.equal(L.projectJobStatus({ confirmed: false, state: "unconfirmed" }, J, "jag").state, "unconfirmed");
});

test("[ROUTE] durableGiftJobStatus relays only the strict projection bound to the requested job/client", async () => {
  let reply: unknown = {};
  globalThis.fetch = (async () => Response.json(reply)) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route");
  const D = await import("../lib/portal-v2/gift-durable"); D.__setGiftRegistrationsForTests([REG]);
  const post = (body: Record<string, unknown>) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", cookie: `catapult_research_auth=${COOKIE}` }, body: JSON.stringify(body) }));
  const J = "e".repeat(64);
  reply = { confirmed: true, state: "complete", batchCount: -99, committedBatches: ["wrong"], missingBatches: [], heldRows: 0, decidedRows: 1, private: "leak" };
  const r = await (await post({ op: "durableGiftJobStatus", client: "jag", table: REG.table, jobId: J })).json();
  assert.equal(r.state, "unavailable"); assert.equal(r.jobId, J); assert.ok(!("private" in r));
  assert.equal((await post({ op: "durableGiftJobStatus", client: "jag", table: REG.table, jobId: "short" })).status, 400);
  D.__setGiftRegistrationsForTests([]);
});

test("browser parser parity: the panel's csv-parse grid has the same rows/ordinals as the server plan (BOM, blank lines, embedded newlines); refusals agree", async () => {
  const L = await lib(); const { parseCsv } = await import("../lib/portal-v2/csv-parse");
  const csv = "\uFEFFDonor,Amount,Date,Type\r\n7001,1,2026-01-05,\"Gift\nline two\"\r\n\r\n7002,2,2026-01-06,Gift\r\n\r\n";
  const grid = parseCsv(csv); assert.equal(grid.length - 1, 2); assert.equal(grid[0][0], "Donor"); assert.equal(grid[1][3], "Gift\nline two");
  const p = L.buildDurablePlan({ client: "jag", csv, mapping: MAP, decisions: [{ o: 0, d: "held" }, { o: 1, d: "new" }], actor: "Pat", fileName: "a.csv", fileDate: null, secret: SECRET, now: NOW });
  assert.equal(p.summary.total, 2); assert.equal(p.batches.flat()[0].ordinal, 1); assert.equal(p.batches.flat()[0].person, 7002);
  for (const bad of ["Donor,Amount\r\n7001,\"x\"y\r\n", "Donor,Amount\r\n7001,\"open\r\n", "Donor,Amount\r7001,1\r\n"]) {
    assert.throws(() => parseCsv(bad)); assert.throws(() => L.buildDurablePlan({ client: "jag", csv: bad, mapping: {}, decisions: [], actor: "Pat", fileName: "a.csv", fileDate: null, secret: SECRET, now: NOW }));
  }
});

test("browser-safe normalize is the SAME function the server uses; changed-column eligibility inputs canonicalize identically", async () => {
  const a = await import("../lib/portal-v2/source-normalize"); const b = await import("../lib/portal-v2/source-reconcile");
  assert.equal(a.normalize, b.normalize);
  const dec = { ty: "decimal", len: null, p: 19, s: 4 };
  assert.equal(a.normalize(dec, "$1,100.50").v, "1100.5"); assert.equal(a.normalize(dec, "100.00").v, "100"); assert.equal(a.normalize(dec, "").v, null, "blank = unchanged");
  assert.equal(a.normalize({ ty: "datetime2", len: null, p: null, s: null }, "1/6/2026").v, "2026-01-06T00:00:00");
  assert.match(String(a.normalize(dec, "1.00001").err), /decimal places/);
  const fs = await import("node:fs"); assert.ok(!/from "node:/.test(fs.readFileSync("lib/portal-v2/source-normalize.ts", "utf8")) && !/from "node:/.test(fs.readFileSync("lib/portal-v2/csv-parse.ts", "utf8")), "browser-safe modules have no node: imports");
  const panel = fs.readFileSync("app/research/source-import/DurableGiftPanel.tsx", "utf8");
  assert.ok(panel.includes('from "@/lib/portal-v2/csv-parse"') && panel.includes('from "@/lib/portal-v2/source-normalize"') && !/function parse\(/.test(panel), "panel uses the owning parser and normalize");
});

test("job status projection: impossible counts refused (decided < batches, >100 batches, >5000 rows); partial/held preserved", async () => {
  const L = await lib(); const J = "f".repeat(64);
  const all = (n: number) => Array.from({ length: n }, (_, i) => i);
  const c = (n: number, dec: number, held = 0) => ({ confirmed: true, state: held ? "partial" : "complete", batchCount: n, committedBatches: all(n), missingBatches: [], heldRows: held, decidedRows: dec });
  assert.equal(L.projectJobStatus(c(1, 0), J, "jag").state, "unavailable", "decidedRows 0 with 1 batch");
  assert.equal(L.projectJobStatus(c(101, 101), J, "jag").state, "unavailable", "101 batches");
  assert.equal(L.projectJobStatus(c(2, 6000), J, "jag").state, "unavailable", "6000 decided");
  assert.equal(L.projectJobStatus(c(2, 4000, 1001), J, "jag").state, "unavailable", "decided+held > 5000");
  assert.equal(L.projectJobStatus(c(100, 5000), J, "jag").state, "complete");
  assert.equal(L.projectJobStatus(c(2, 10, 3), J, "jag").state, "partial");
});

// ---------- F1a recovery ----------
const recFile = (p: { token: string; batches: unknown[]; recovery: { header: unknown; headerMac: string } }) => ({ header: p.recovery.header, headerMac: p.recovery.headerMac, jobToken: p.token, parts: p.batches.map((rows, index) => ({ index, rows })) });

test("F1a recovery: server-signed header from the validated plan; exact keys; no states; caps; renew changes exp only (same jobId/request ids)", async () => {
  const L = await lib(); const p = await plan();
  const h = p.recovery.header as unknown as Record<string, unknown>;
  assert.deepEqual(Object.keys(h).sort(), ["actor", "batchCount", "batchRows", "client", "createdAt", "fileDate", "fileDigest", "fileName", "jobId", "manifest", "mapping", "mappingDigest", "partHashes", "registrationDigest", "registrationId", "registrationVersion", "table", "type", "v"]);
  assert.ok(!JSON.stringify(h).includes('"expected"'), "header carries no expected snapshots (parts do)");
  const late = NOW + 3 * 60 * 60_000;
  assert.throws(() => L.verifyJob(p.token, p.manifest, SECRET, late, "jag"), /expired/);
  const r = L.renewRecovery({ client: "jag", table: REG.table, header: h, headerMac: p.recovery.headerMac, jobToken: p.token, secret: SECRET, now: late });
  assert.equal(r.jobId, p.jobId);
  const { t } = L.verifyJob(r.token, p.manifest, SECRET, late, "jag");
  const old = JSON.parse(Buffer.from(p.token.split(".")[0], "base64url").toString());
  assert.deepEqual({ ...t, exp: 0 }, { ...old, exp: 0 }, "renewed payload identical except exp");
  assert.equal(L.jobRequestId(r.jobId, 0), L.jobRequestId(p.jobId, 0));
  const b = L.commitBody({ client: "jag", token: r.token, manifest: p.manifest, batchIndex: 0, rows: p.batches[0], secret: SECRET, now: late });
  assert.deepEqual(b.request.rows, p.batches[0], "same part rows (incl. old expected) accepted under renewed token");
  const tampered = JSON.parse(JSON.stringify(p.batches[0])); tampered[0].values.Gift_Amount = "999";
  assert.throws(() => L.commitBody({ client: "jag", token: r.token, manifest: p.manifest, batchIndex: 0, rows: tampered, secret: SECRET, now: late }));
});

test("F1a renew refusals: forged header/token MAC, each cross-bound field, other client/table, registration drift/removal", async () => {
  const L = await lib(); const p = await plan(); const h = p.recovery.header as unknown as Record<string, unknown>;
  const renew = (o: Record<string, unknown> = {}) => L.renewRecovery({ client: "jag", table: REG.table, header: h, headerMac: p.recovery.headerMac, jobToken: p.token, secret: SECRET, now: NOW, ...o });
  assert.throws(() => renew({ headerMac: p.recovery.headerMac.slice(0, -2) + (p.recovery.headerMac.endsWith("AA") ? "BB" : "AA") }), /signature/);
  const [tb, tm] = p.token.split("."); assert.throws(() => renew({ jobToken: `${tb}.${tm.slice(0, -2)}AA` }), /signature/);
  assert.throws(() => renew({ header: { ...h, states: ["saved"] } }), /bad recovery header/);
  for (const [k, v] of [["actor", "X"], ["fileName", "x.csv"], ["fileDate", "2026-01-01"], ["table", "other"], ["batchRows", 1], ["mappingDigest", "0".repeat(64)], ["partHashes", []]] as const)
    assert.throws(() => renew({ header: { ...h, [k]: v } }), /signature/, `${k} change breaks the header MAC`);
  // a correctly re-MACed header (server key) whose field disagrees with the token is still refused by cross-binding
  const other = await plan({ actor: "Someone Else" });
  assert.throws(() => renew({ header: other.recovery.header, headerMac: other.recovery.headerMac }), /does not match the signed job \(jobId\)/);
  assert.throws(() => renew({ client: "csnf" }), /does not match|client/);
  assert.throws(() => renew({ table: "other" }), /\(table\)/);
  L.__setGiftRegistrationsForTests([{ ...REG, version: 2 }]);
  assert.throws(() => renew(), (e: unknown) => e instanceof L.DurableGiftError && e.status === 409 && /read-only job lookup/.test((e as Error).message));
  L.__setGiftRegistrationsForTests([]);
  assert.throws(() => renew(), /changed or was removed/);
  L.__setGiftRegistrationsForTests([REG]);
});

test("F1a browser/server hash parity (key order, null vs absent, multibyte, full 13-column snapshot) and recovery-file verification", async () => {
  const P = await import("../lib/portal-v2/gift-identity-plan"); const B = await import("../lib/portal-v2/gift-hash-browser");
  const wide = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`C${i}`, i % 3 ? `v${i} é 中文 😀 e\u0301` : null]));
  const rows = [
    { ordinal: 0, action: "new", person: 7001, values: { b: "2", a: "1" }, expected: null },
    { expected: { a: null, z: "x" }, values: { a: "1" }, person: 7002, action: "correct", giftId: "0000aaaa-0000-4000-8000-00000000abcd", ordinal: 3 },
    { ordinal: 4, action: "adopt", locator: 41, person: 7003, values: wide, expected: wide },
    { ordinal: 5, action: "correct", person: 7003, values: { a: "1" }, expected: { a: "" } },
  ];
  for (const r of rows) assert.equal(await B.browserGiftRowHash(r), P.giftRowHash(r as never));
  assert.notEqual(await B.browserGiftRowHash({ x: null }), await B.browserGiftRowHash({}), "null differs from absent");
  assert.equal(await B.browserGiftRowHash({ b: 1, a: 2 }), await B.browserGiftRowHash({ a: 2, b: 1 }), "key order canonical");
  const L = await lib(); const p = await plan(); const f = recFile(p);
  assert.deepEqual(await B.verifyRecoveryFile(f), { ok: true });
  assert.equal((await B.verifyRecoveryFile({ ...f, states: ["saved"] })).ok, false, "added states refused");
  const t2 = JSON.parse(JSON.stringify(f)); t2.parts[0].rows[0].expected = { Gift_Amount: "1" }; assert.equal((await B.verifyRecoveryFile(t2)).ok, false);
  const t3 = JSON.parse(JSON.stringify(f)); t3.parts.pop(); assert.equal((await B.verifyRecoveryFile(t3)).ok, false);
  void L;
  const fs = await import("node:fs"); assert.ok(!/from "node:/.test(fs.readFileSync("lib/portal-v2/gift-hash-browser.ts", "utf8")));
});

test("[ROUTE] F1a renew + registration-independent job lookup (stub backend; save still off; no gate bypass)", async () => {
  const calls: Record<string, unknown>[] = []; let reply: unknown = { confirmed: false, state: "unconfirmed" };
  globalThis.fetch = (async (_u: unknown, init: { body: string }) => { calls.push(JSON.parse(init.body)); return Response.json(reply); }) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route");
  const D = await import("../lib/portal-v2/gift-durable"); D.__setGiftRegistrationsForTests([REG]);
  const post = (body: Record<string, unknown>, raw?: string) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", cookie: `catapult_research_auth=${COOKIE}` }, body: raw ?? JSON.stringify(body) }));
  const T = REG.table;
  const pl = await (await post({ op: "durableGiftPlan", client: "jag", table: T, csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null })).json();
  const rn = await post({ op: "durableGiftRenew", client: "jag", table: T, header: pl.recovery.header, headerMac: pl.recovery.headerMac, jobToken: pl.token });
  assert.equal(rn.status, 200); assert.equal((await rn.json()).jobId, pl.jobId);
  assert.equal((await post({ op: "durableGiftRenew", client: "jag", table: T, header: pl.recovery.header, headerMac: pl.recovery.headerMac, jobToken: pl.token, extra: 1 })).status, 400);
  const big = JSON.stringify({ op: "durableGiftRenew", client: "jag", table: T, header: pl.recovery.header, headerMac: pl.recovery.headerMac, jobToken: pl.token, pad: "x".repeat(2_000_001) });
  assert.equal((await post({}, big)).status, 413);
  assert.equal(calls.length, 0, "renew never calls Engage");
  // drift/removal: renew refused, read-only job lookup still works and is projected
  D.__setGiftRegistrationsForTests([]);
  assert.equal((await post({ op: "durableGiftRenew", client: "jag", table: T, header: pl.recovery.header, headerMac: pl.recovery.headerMac, jobToken: pl.token })).status, 404);
  reply = { confirmed: true, state: "complete", batchCount: 1, committedBatches: [0], missingBatches: [], heldRows: 0, decidedRows: 3, private: "x" };
  const lk = await (await post({ op: "durableGiftJobLookup", client: "jag", jobId: pl.jobId })).json();
  assert.equal(lk.state, "complete"); assert.equal(lk.jobId, pl.jobId); assert.ok(!("private" in lk) && !("proof" in lk));
  assert.deepEqual(calls.at(-1), { op: "giftJobStatus", client: "jag", jobId: pl.jobId }, "fixed client/job query only");
  for (const body of [{ op: "durableGiftJobLookup", client: "zzz", jobId: pl.jobId }, { op: "durableGiftJobLookup", client: "jag", jobId: "x" }, { op: "durableGiftJobLookup", client: "jag", jobId: pl.jobId, table: T }])
    assert.equal((await post(body)).status, 400);
  const n0 = calls.length;
  for (const v of [["jag"], { c: "jag" }, 1, null, true]) {
    assert.equal((await post({ op: "durableGiftJobLookup", client: v, jobId: pl.jobId })).status, 400, `client=${JSON.stringify(v)}`);
    assert.equal((await post({ op: "durableGiftJobLookup", client: "jag", jobId: v === null ? null : Array.isArray(v) ? [pl.jobId] : v })).status, 400, `jobId=${JSON.stringify(v)}`);
  }
  D.__setGiftRegistrationsForTests([REG]);
  for (const v of [["jag"], { c: "jag" }, 1, null]) {
    assert.equal((await post({ op: "durableGiftRenew", client: v, table: T, header: pl.recovery.header, headerMac: pl.recovery.headerMac, jobToken: pl.token })).status, 400, `renew client=${JSON.stringify(v)}`);
    assert.equal((await post({ op: "durableGiftRenew", client: "jag", table: Array.isArray(v) ? [T] : v, header: pl.recovery.header, headerMac: pl.recovery.headerMac, jobToken: pl.token })).status, 400, `renew table=${JSON.stringify(v)}`);
  }
  assert.equal(calls.length, n0, "no upstream call for non-text client/jobId/table");
  D.__setGiftRegistrationsForTests([]);
});

test("F1a verifyRecoveryFile never throws on malformed shapes (typed {ok:false})", async () => {
  const B = await import("../lib/portal-v2/gift-hash-browser"); const p = await plan(); const f = recFile(p);
  const withBatches = (v: unknown) => { const x = JSON.parse(JSON.stringify(f)); x.header.manifest.batches = v; return x; };
  for (const v of [{}, 1, "x", null, true, [null], [1], ["x"], [{}], [{ hash: 1 }]]) assert.equal((await B.verifyRecoveryFile(withBatches(v))).ok, false, JSON.stringify(v));
  for (const v of [null, 1, "x", [], true]) assert.equal((await B.verifyRecoveryFile(v)).ok, false);
  for (const k of ["header", "parts"] as const) for (const v of [null, 1, "x", {}]) assert.equal((await B.verifyRecoveryFile({ ...f, [k]: v })).ok, false, `${k}=${JSON.stringify(v)}`);
  const x = JSON.parse(JSON.stringify(f)); x.header.manifest = 5; assert.equal((await B.verifyRecoveryFile(x)).ok, false);
  const y = JSON.parse(JSON.stringify(f)); y.parts = [null]; assert.equal((await B.verifyRecoveryFile(y)).ok, false);
});

test("F1a size caps on real serialized bytes: 4 MB plan response, 8 MB recovery file, 1.6 MB header", async () => {
  const L = await lib();
  const wide = { ...REG, columns: Array.from({ length: 13 }, (_, i) => ({ col: `N${i}`, ty: "nvarchar", len: -1, p: null, s: null })), required: [] };
  L.__setGiftRegistrationsForTests([wide]);
  const cell = "y".repeat(3990);
  const build = (n: number, hdr = (i: number) => `H${i}`) => {
    const heads = ["Donor", ...Array.from({ length: 13 }, (_, i) => hdr(i))];
    const csv = [heads.join(","), ...Array.from({ length: n }, (_, r) => [7001 + r, ...Array(13).fill(cell)].join(","))].join("\r\n") + "\r\n";
    const mapping = Object.fromEntries([["Donor", "@person"], ...heads.slice(1).map((h, i) => [h, `N${i}`])]);
    return L.buildDurablePlan({ client: "jag", csv, mapping, decisions: Array.from({ length: n }, (_, o) => ({ o, d: "new" })), actor: "Pat", fileName: "w.csv", fileDate: null, secret: SECRET, now: NOW });
  };
  const ok = build(70); assert.ok(Buffer.byteLength(JSON.stringify(ok)) <= L.DURABLE_MAX_RESPONSE, "70x13x3990 fits the 4 MB response");
  assert.throws(() => build(80), (e: unknown) => e instanceof L.DurableGiftError && e.status === 413 && /too large for one response/.test((e as Error).message), "80 rows trip the 4 MB response cap");
  assert.throws(() => build(160), (e: unknown) => e instanceof L.DurableGiftError && e.status === 413 && /over 8 MB/.test((e as Error).message), "160 rows trip the 8 MB recovery-file cap first");
  L.__setGiftRegistrationsForTests([{ ...wide, columns: wide.columns.slice(0, 1) }]);
  const longH = "L".repeat(1_700_000);
  const csv = `Donor,${longH}\r\n7001,1\r\n`;
  assert.throws(() => L.buildDurablePlan({ client: "jag", csv, mapping: { Donor: "@person", [longH]: "N0" }, decisions: [{ o: 0, d: "new" }], actor: "Pat", fileName: "w.csv", fileDate: null, secret: SECRET, now: NOW }), (e: unknown) => e instanceof L.DurableGiftError && e.status === 413 && /header too large/.test((e as Error).message), "header > 1.6 MB refused");
  L.__setGiftRegistrationsForTests([REG]);
});

test("[ROUTE] F1b proof projection: pending only for canonical backend non-confirm; malformed/contradictory/failed => 502 unavailable (same id); context lookupAvailable", async () => {
  let reply: unknown = {}; let status = 200; const calls: unknown[] = [];
  globalThis.fetch = (async (_u: unknown, init: { body: string }) => { calls.push(JSON.parse(init.body)); return Response.json(reply, { status }); }) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route");
  const D = await import("../lib/portal-v2/gift-durable"); const P = await import("../lib/portal-v2/gift-identity-plan"); D.__setGiftRegistrationsForTests([REG]);
  const post = (body: Record<string, unknown>) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", cookie: `catapult_research_auth=${COOKIE}` }, body: JSON.stringify(body) }));
  const T = REG.table;
  const pl = await (await post({ op: "durableGiftPlan", client: "jag", table: T, csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null })).json();
  const rq = P.jobRequestId(pl.jobId, 0);
  const proof = () => post({ op: "durableGiftProof", client: "jag", table: T, token: pl.token, manifest: pl.manifest, batchIndex: 0 });
  for (const r of [{ found: false, confirmed: false }, { found: false, confirmed: false, note: "No committed outcome" }]) {
    reply = r; const x = await proof(); const j = await x.json();
    assert.equal(x.status, 200); assert.equal(j.state, "pending"); assert.equal(j.requestId, rq); assert.ok(!String(j.note).includes("No committed outcome\u0000"));
  }
  for (const r of [{}, { found: true }, { found: false, confirmed: false, outcome: {} }, { found: false, confirmed: false, extra: 1 }, { found: true, confirmed: true, outcome: { bad: 1 } }, { found: false, confirmed: false, note: 5 }, [], null]) {
    reply = r; const x = await proof(); const j = await x.json();
    assert.equal(x.status, 502, JSON.stringify(r)); assert.equal(j.state, "unavailable"); assert.equal(j.requestId, rq); assert.ok(!("proof" in j));
  }
  status = 500; reply = { found: false, confirmed: false }; { const x = await proof(); assert.equal(x.status, 502); assert.equal((await x.json()).state, "unavailable"); } status = 200;
  // context: available only for the matching registration; otherwise false + lookupAvailable (allowlisted client)
  const c1 = await (await post({ op: "durableGiftContext", client: "jag", table: T })).json(); assert.equal(c1.available, true); assert.equal(c1.lookupAvailable, true);
  const c2 = await (await post({ op: "durableGiftContext", client: "jag", table: "old_table" })); assert.equal(c2.status, 200); const c2j = await c2.json(); assert.equal(c2j.available, false); assert.equal(c2j.lookupAvailable, true);
  D.__setGiftRegistrationsForTests([]);
  const c3 = await (await post({ op: "durableGiftContext", client: "jag", table: T })).json(); assert.equal(c3.available, false); assert.equal(c3.lookupAvailable, true);
  const c4 = await (await post({ op: "durableGiftContext", client: "zzz", table: T })).json(); assert.notEqual(c4.lookupAvailable, true);
  void calls;
});

test("F1b exact bytes: BOM+CRLF text kept by the panel reader gives fileDigest == sha256(original bytes); invalid UTF-8 refused", async () => {
  const L = await lib();
  const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(CSV, "utf8")]);
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  assert.equal(text.charCodeAt(0), 0xfeff, "BOM kept");
  const p = L.buildDurablePlan({ client: "jag", csv: text, mapping: MAP, decisions: DEC, actor: "Pat Example", fileName: "jag gifts_2026.csv", fileDate: null, secret: SECRET, now: NOW });
  assert.equal((p.recovery.header as unknown as { fileDigest: string }).fileDigest, createHash("sha256").update(bytes).digest("hex"));
  assert.equal(p.summary.total, 4, "parser strips the BOM for ordinals");
  assert.throws(() => new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(Buffer.from([0x41, 0xff, 0x42])));
  const fs = await import("node:fs"); const panel = fs.readFileSync("app/research/source-import/DurableGiftPanel.tsx", "utf8");
  assert.ok(panel.includes("ignoreBOM: true") && !/\bfl\.text\(\)/.test(panel), "panel reads exact bytes, never File.text()");
  assert.ok(!/localStorage|sessionStorage|indexedDB|document\.cookie/.test(panel), "no browser storage");
});

// ---------- F2a review-copy check ----------
const goodOutcome = (rq: string) => ({ requestId: rq, client: "jag", registrationId: REG.id, committed: true, counts: { new: 1, adopt: 1, correct: 1 }, rows: [{ ordinal: 0, action: "new", giftId: "0000bbbb-0000-4000-8000-00000000abcd", locator: 90 }, { ordinal: 2, action: "adopt", giftId: "0000cccc-0000-4000-8000-00000000abcd", locator: 41 }, { ordinal: 3, action: "correct", giftId: UUID1, locator: 12 }] });
async function reviewSetup() {
  const L = await lib(); const p = await plan(); const rq = L.jobRequestId(p.jobId, 0);
  const proof = L.proofFor({ client: "jag", token: p.token, manifest: p.manifest, batchIndex: 0, status: { found: true, confirmed: true, outcome: goodOutcome(rq) }, secret: SECRET, now: NOW })!;
  const ex = L.durableExport({ client: "jag", csv: CSV, token: p.token, manifest: p.manifest, proofs: [proof], secret: SECRET, now: NOW });
  const base = { client: "jag", table: REG.table, original: CSV, reviewCopy: ex.csv, header: p.recovery.header, headerMac: p.recovery.headerMac, jobToken: p.token, proofs: [proof], secret: SECRET, now: NOW };
  return { L, p, proof, ex, base, rq };
}

test("F2a review check: round trip verified; fixed results/counts; no cell echo; export parity", async () => {
  const { L, base, ex } = await reviewSetup();
  const r = L.reviewCheck(base);
  assert.deepEqual(r.rows.map((x) => x.result), ["verified", "held:held-in-plan", "verified", "verified"]);
  assert.equal(r.counts.total, 4); assert.equal(r.counts.verified, 3); assert.equal(r.counts.held.heldInPlan, 1);
  assert.equal(r.counts.verified, ex.proven, "same proven rows as the export");
  assert.ok(!JSON.stringify(r).includes("SUM"), "no input cells echoed");
  // expired job token is fine for the read-only check (authority = MAC + header, expiry ignored)
  assert.equal(L.reviewCheck({ ...base, now: NOW + 30 * 60_000 }).counts.verified, 3);
});

test("F2a review check refusals: original bytes, headers (forward neutralize), cells, rows; adversarial validly-MACed proofs refuse WHOLE request", async () => {
  const { L, p, base, ex, rq } = await reviewSetup();
  assert.throws(() => L.reviewCheck({ ...base, original: base.original.replace("7003", "7004") }), /byte digest/);
  assert.throws(() => L.reviewCheck({ ...base, original: "\uFEFF" + base.original }), /byte digest/);
  const lines = ex.csv.split("\r\n");
  const swapCols = lines.map((l) => l).join("\r\n").replace('"Donor","Amount"', '"Amount","Donor"');
  assert.throws(() => L.reviewCheck({ ...base, reviewCopy: swapCols }), /header differs at column 1/);
  assert.throws(() => L.reviewCheck({ ...base, reviewCopy: ex.csv.replace("\"'=SUM(A1)\"", "\"=SUM(A1)\"") }), /row 2, column 2|Stray|quote/);
  assert.throws(() => L.reviewCheck({ ...base, reviewCopy: ex.csv.replace('"Catapult Gift ID","Gift ID Status"', '"Gift ID Status","Catapult Gift ID"') }), /header differs/);
  assert.throws(() => L.reviewCheck({ ...base, reviewCopy: [lines[0], lines[2], lines[1], ...lines.slice(3)].join("\r\n") }), /differs from the original at row 1/);
  assert.throws(() => L.reviewCheck({ ...base, reviewCopy: lines.slice(0, 3).join("\r\n") + "\r\n" }), /row count/);
  // validly signed but adversarial proofs (test secret), each refuses the whole request
  const sign = (payload: unknown) => { const { createHmac } = require("node:crypto") as typeof import("node:crypto"); const k = createHmac("sha256", SECRET).update("catapult-durable-gift/proof/v1").digest(); const body = Buffer.from(JSON.stringify(payload)).toString("base64url"); return `${body}.${createHmac("sha256", k).update(body).digest("base64url")}`; };
  const good = JSON.parse(Buffer.from(base.proofs[0].split(".")[0], "base64url").toString());
  const variants: [string, unknown][] = [
    ["wrong request id", { ...good, requestId: "0".repeat(32) }],
    ["action altered", { ...good, rows: good.rows.map((r: { o: number }) => (r.o === 2 ? { ...r, a: "new" } : r)) }],
    ["target altered", { ...good, rows: good.rows.map((r: { o: number }) => (r.o === 3 ? { ...r, u: "0000dddd-0000-4000-8000-00000000abcd" } : r)) }],
    ["person altered", { ...good, rows: good.rows.map((r: { o: number; p: number }) => (r.o === 0 ? { ...r, p: r.p + 1 } : r)) }],
    ["locator altered", { ...good, rows: good.rows.map((r: { o: number }) => (r.o === 2 ? { ...r, l: 42 } : r)) }],
    ["missing row", { ...good, rows: good.rows.slice(1) }],
    ["duplicate uuid", { ...good, rows: good.rows.map((r: { o: number }) => (r.o === 0 ? { ...r, u: "0000cccc-0000-4000-8000-00000000abcd" } : r)) }],
    ["cross job", { ...good, jobId: "a".repeat(64) }],
    ["cross client", { ...good, client: "csnf" }],
    ["cross file", { ...good, fileDigest: "b".repeat(64) }],
    ["cross registration", { ...good, registrationDigest: "c".repeat(64) }],
    ["expired", { ...good, exp: NOW - 1 }],
  ];
  for (const [what, v] of variants) assert.throws(() => L.reviewCheck({ ...base, proofs: [sign(v)] }), (e: unknown) => e instanceof L.DurableGiftError, what);
  assert.throws(() => L.reviewCheck({ ...base, proofs: [base.proofs[0], base.proofs[0]] }), /bad proofs|duplicate/);
  assert.throws(() => L.reviewCheck({ ...base, proofs: [`${base.proofs[0].split(".")[0]}.AAAA`] }), /signature/);
  void p; void rq;
});

test("F2a row holds from CSV content only: duplicate (all occurrences, non-empty only), held-in-plan, blank, not-proven; formula-like headers", async () => {
  const { L, base, ex } = await reviewSetup();
  const lines = ex.csv.trim().split("\r\n");
  const { parseCsv: pc } = await import("../lib/portal-v2/csv-parse");
  const setId = (i: number, id: string, st?: string) => { const c = pc(lines[i] + "\r\n")[0]; c[c.length - 2] = id; if (st) c[c.length - 1] = st; lines[i] = c.map((x) => `"${x.replace(/"/g, '""')}"`).join(","); };
  const r0 = () => L.reviewCheck({ ...base, reviewCopy: lines.join("\r\n") + "\r\n" }).rows.map((x) => x.result);
  setId(4, "0000bbbb-0000-4000-8000-00000000abcd"); // duplicate of row 1's verified ID
  assert.deepEqual(r0(), ["held:duplicate", "held:held-in-plan", "verified", "held:duplicate"]);
  setId(4, UUID1.toUpperCase()); assert.equal(r0()[3], "held:not-proven", "uppercase");
  setId(4, "PROV-0123456789abcdef0123456789abcdef"); assert.equal(r0()[3], "held:not-proven");
  setId(4, UUID1, "held - not saved"); assert.equal(r0()[3], "held:not-proven", "wrong status text");
  setId(4, ""); setId(2, ""); assert.deepEqual(r0().slice(1), ["held:held-in-plan", "verified", "held:blank"], "multiple blanks are blank, not duplicate");
  // formula-like / leading-unicode headers compared via forward neutralize
  const L2 = await lib(); void L2;
  const csvF = "=Donor,+Amount,\u00A0Date,Type\r\n7001,1,2026-01-05T00:00:00,Gift\r\n";
  const mapF = { "=Donor": "@person", "+Amount": "Gift_Amount", "\u00A0Date": "Gift_Date", Type: "Record_Type" };
  const p2 = L.buildDurablePlan({ client: "jag", csv: csvF, mapping: mapF, decisions: [{ o: 0, d: "new" }], actor: "Pat", fileName: "f.csv", fileDate: null, secret: SECRET, now: NOW });
  const rq2 = L.jobRequestId(p2.jobId, 0);
  const pf2 = L.proofFor({ client: "jag", token: p2.token, manifest: p2.manifest, batchIndex: 0, status: { found: true, confirmed: true, outcome: { requestId: rq2, client: "jag", registrationId: REG.id, committed: true, counts: { new: 1, adopt: 0, correct: 0 }, rows: [{ ordinal: 0, action: "new", giftId: "0000bbbb-0000-4000-8000-00000000abcd", locator: 90 }] } }, secret: SECRET, now: NOW })!;
  const ex2 = L.durableExport({ client: "jag", csv: csvF, token: p2.token, manifest: p2.manifest, proofs: [pf2], secret: SECRET, now: NOW });
  const b2 = { ...base, original: csvF, reviewCopy: ex2.csv, header: p2.recovery.header, headerMac: p2.recovery.headerMac, jobToken: p2.token, proofs: [pf2] };
  assert.equal(L.reviewCheck(b2).counts.verified, 1);
  assert.throws(() => L.reviewCheck({ ...b2, reviewCopy: ex2.csv.replace("\"'=Donor\"", "\"=Donor\"") }), /header differs at column 1/);
});

test("[ROUTE] F2a durableGiftReviewCheck: auth/type/body/caps/proof vectors; no Engage call", async () => {
  const calls: unknown[] = []; globalThis.fetch = (async (_u: unknown, init: { body: string }) => { calls.push(JSON.parse(init.body)); return Response.json({}); }) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route");
  const { L, base } = await reviewSetup(); L.__setGiftRegistrationsForTests([REG]);
  const post = (body: Record<string, unknown>, h: Record<string, string> = {}, raw?: string) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", cookie: `catapult_research_auth=${COOKIE}`, ...h }, body: raw ?? JSON.stringify(body) }));
  // the route signs with process.env secret == SECRET
  const body = { op: "durableGiftReviewCheck", client: "jag", table: REG.table, original: base.original, reviewCopy: base.reviewCopy, header: base.header, headerMac: base.headerMac, jobToken: base.jobToken, proofs: base.proofs };
  const ok = await post(body); assert.equal(ok.status, 200); assert.equal((await ok.json()).counts.verified, 3);
  assert.equal((await post(body, { cookie: "" })).status, 401);
  assert.equal((await post(body, { origin: "https://evil.example" })).status, 403);
  assert.equal((await post({ ...body, extra: 1 })).status, 400);
  for (const k of ["client", "table", "original", "reviewCopy"]) for (const v of [1, null, ["x"], { a: 1 }]) assert.equal((await post({ ...body, [k]: v })).status, 400, `${k}=${JSON.stringify(v)}`);
  assert.equal((await post({ ...body, original: "é".repeat(1_000_001) })).status, 413, "2 MB per file measured in UTF-8 bytes");
  assert.equal((await post({}, {}, JSON.stringify({ ...body, pad: "x".repeat(4_000_001) }))).status, 413);
  assert.equal((await post({ ...body, proofs: [`${base.proofs[0].split(".")[0]}.AAAA`] })).status, 400);
  assert.equal((await post({ ...body, original: base.original + "x" })).status, 400);
  assert.equal(calls.length, 0, "never calls Engage");
  L.__setGiftRegistrationsForTests([]);
});

// ---------- F2b known-ID mode ----------
test("F2b planner: @giftId mode correct/held only on EVERY row; exact own unique lowercase ID; duplicates over all rows; pseudo-column excluded; reserved names refused with precise wording", async () => {
  const L = await lib();
  const U = (n: number) => `0000${String(n).padStart(4, "0")}-0000-4000-8000-00000000abcd`;
  const rowsN = 606;
  const ids = Array.from({ length: rowsN }, (_, i) => (i % 10 === 0 ? "" : i % 10 === 3 ? U(i).toUpperCase() : i % 10 === 4 ? "PROV-0123456789abcdef0123456789abcdef" : i === 7 || i === 17 ? U(7) : U(i)));
  const csv = "Donor,Amount,Date,Type,Known\r\n" + ids.map((u, i) => `${7000 + i},1,2026-01-05,Gift,${u}`).join("\r\n") + "\r\n";
  const map = { ...MAP, Known: "@giftId" };
  const EXPD = { Gift_Amount: "5", Gift_Date: "2026-01-05T00:00:00", Record_Type: "Gift" };
  const okRows = [1, 2, 5, 6, 8, 9];
  const dec = (over: Record<number, unknown> = {}) => Array.from({ length: rowsN }, (_, o) => over[o] ?? (okRows.includes(o) ? { o, d: "correct", giftId: U(o), expected: EXPD } : { o, d: "held" }));
  const run = (d: unknown[], m: unknown = map, c = csv) => L.buildDurablePlan({ client: "jag", csv: c, mapping: m, decisions: d, actor: "Pat", fileName: "k.csv", fileDate: null, secret: SECRET, now: NOW });
  const p = run(dec());
  assert.equal(p.summary.decided, okRows.length);
  for (const r of p.batches.flat()) { assert.ok(!("Known" in r.values) && !("@giftId" in r.values) && !("Known" in (r.expected ?? {}))); assert.equal(r.giftId, U(r.ordinal)); }
  assert.throws(() => run(dec({ 0: { o: 0, d: "new" } })), /every row must be held or corrected/, "new on blank-ID row");
  assert.throws(() => run(dec({ 1: { o: 1, d: "adopt", locator: 4, expected: EXPD } })), /every row must be held or corrected/);
  assert.throws(() => run(dec({ 7: { o: 7, d: "correct", giftId: U(7), expected: EXPD } })), /own unique/, "duplicate (row 17 holds the same ID, held)");
  assert.throws(() => run(dec({ 3: { o: 3, d: "correct", giftId: U(3), expected: EXPD } })), /own unique/, "uppercase cell, lowercase typed target");
  assert.throws(() => run(dec({ 3: { o: 3, d: "correct", giftId: U(3).toUpperCase(), expected: EXPD } })), /bad Catapult Gift ID/);
  assert.throws(() => run(dec({ 1: { o: 1, d: "correct", giftId: U(2), expected: EXPD } })), /own unique/, "typed target differs from the file");
  assert.throws(() => run(dec(), { ...map, Type: "@giftId" }), /at most one/);
  const p2 = run(dec({ 1: { o: 1, d: "correct", giftId: U(1), expected: { ...EXPD, Gift_Amount: "6" } } }));
  assert.notEqual(p2.jobId, p.jobId, "row/target binding in the manifest");
  // no @giftId: existing flow unchanged (new allowed)
  assert.equal(run([{ o: 0, d: "new" }, { o: 1, d: "held" }, { o: 2, d: "held" }, { o: 3, d: "held" }], MAP, CSV).summary.decided, 1);
  assert.throws(() => run(dec(), map, csv.replace("Known", "Catapult Gift ID")), /give that column another name and map it as "Catapult Gift ID \(verify\)".*Check a returned review copy/);
});

test("[ROUTE] F2b plan vectors through the imported route", async () => {
  globalThis.fetch = (async () => Response.json({})) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route"); const D = await import("../lib/portal-v2/gift-durable"); D.__setGiftRegistrationsForTests([REG]);
  const post = (body: Record<string, unknown>) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", cookie: `catapult_research_auth=${COOKIE}` }, body: JSON.stringify(body) }));
  const U1 = "0000aaaa-0000-4000-8000-00000000abcd";
  const csv = `Donor,Amount,Date,Type,Known\r\n7001,1,2026-01-05,Gift,${U1}\r\n7002,1,2026-01-05,Gift,\r\n`;
  const base = { op: "durableGiftPlan", client: "jag", table: REG.table, csv, mapping: { ...MAP, Known: "@giftId" }, actor: "Pat", fileName: "k.csv", fileDate: null };
  const ok = await post({ ...base, decisions: [{ o: 0, d: "correct", giftId: U1, expected: { Gift_Amount: "5", Gift_Date: "2026-01-05T00:00:00", Record_Type: "Gift" } }, { o: 1, d: "held" }] });
  assert.equal(ok.status, 200);
  assert.equal((await post({ ...base, decisions: [{ o: 0, d: "held" }, { o: 1, d: "new" }] })).status, 400);
  assert.equal((await post({ ...base, csv: csv.replace("Known", "Gift ID Status"), decisions: [{ o: 0, d: "held" }, { o: 1, d: "held" }] })).status, 400);
  D.__setGiftRegistrationsForTests([]);
});
