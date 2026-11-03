// SYNTHETIC tests for the durable gift-ID website gateway (lib/portal-v2/gift-durable.ts + route ops). Fictional data;
// Engage is a stubbed fetch; no network, no SQL. The registration exists ONLY through the test hook (production copy EMPTY).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

Object.assign(process.env, { RESEARCH_PASSWORD: "localpw", RESEARCH_AUTH_SECRET: "localsec", SOURCE_IMPORT_PREVIEW: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: "w".repeat(32), SOURCE_PREPARED_TEST_HOOK: "1", SOURCE_IMPORT_APPLY: "enabled" });
const COOKIE = createHash("sha256").update("localpw:localsec").digest("hex");
const SECRET = "localsec", NOW = 1_800_000_000_000;
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
  // returned-ID / provisional columns are refused (reimport unfinished); never read as identities
  for (const h of ["Catapult Gift ID", " catapult  gift id ", "Gift ID Status", "Provisional Preview ID"]) {
    const csv = CSV.replace("Donor,Amount,Date,Type", `Donor,Amount,Date,Type,${h}`).split("\r\n").map((l, i) => (i && l ? l + ",00000001-0000-4000-8000-00000000abcd" : l)).join("\r\n");
    await assert.rejects(plan({ csv }), /Returned-ID files are not supported/, h);
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
  assert.equal((await post({ op: "durableGiftPlan", client: "jag", table: "x", csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null })).status, 404);
  D.__setGiftRegistrationsForTests([REG]);
  const c2 = await (await post({ op: "durableGiftContext", client: "jag", table: "raw_master_giving_history" })).json(); assert.equal(c2.available, true); assert.equal(c2.saveAvailable, false, "hard false even with SOURCE_IMPORT_APPLY=enabled");
  const pl = await (await post({ op: "durableGiftPlan", client: "jag", table: "x", csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null })).json();
  assert.ok(pl.token);
  const r = await post({ op: "durableGiftCommit", client: "jag", table: "x", token: pl.token, manifest: pl.manifest, batchIndex: 0, rows: pl.batches[0] });
  assert.equal(r.status, 503); assert.equal((await r.json()).code, "disabled"); assert.equal(calls.length, 0, "no upstream call");
  assert.equal((await post({ op: "durableGiftPlan", client: "jag", table: "x", csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null, extra: 1 })).status, 400);
  const big = "x".repeat(4_000_001);
  assert.equal((await post({ op: "durableGiftPlan", client: "jag", table: "x", csv: big, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null })).status, 413);
  D.__setGiftRegistrationsForTests([]);
});
