// SYNTHETIC tests for the READ-ONLY gift attestation gateway (lib/portal-v2/gift-attest.ts + route ops). Fictional data;
// Engage is a stubbed fetch (no network, no SQL). The registration exists ONLY through the test hook (production copy EMPTY).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";

Object.assign(process.env, { RESEARCH_PASSWORD: "localpw", RESEARCH_AUTH_SECRET: "fictional-local-test-secret-0123456789", SOURCE_IMPORT_PREVIEW: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: "w".repeat(32), SOURCE_PREPARED_TEST_HOOK: "1" });
const COOKIE = createHash("sha256").update("localpw:fictional-local-test-secret-0123456789").digest("hex");
const COLS3 = [{ col: "Gift_Amount", ty: "decimal", len: null, p: 19, s: 4 }, { col: "Gift_Date", ty: "datetime2", len: null, p: null, s: null }, { col: "Record_Type", ty: "nvarchar", len: -1, p: null, s: null }];
const REG = { id: "fict_gifts", version: 1, client: "jag", scope: "fict-gift-export", schema: "jag", table: "raw_master_giving_history", locator: "row_id", person: "CPTID", native: null,
  columns: COLS3, required: [], master: { schema: "jag", table: "constituents", col: "CPTID" }, locatorVerifiedUnique: false, rowAllocator: null };
const U = (n: number) => `0000${String(n).padStart(4, "0")}-0000-4000-8000-00000000abcd`;
const CSV = "Donor,Amount,Date,Type\r\n7001,5,2026-01-05T00:00:00,Gift\r\n7002,6,2026-01-06T00:00:00,\r\n7003,7,2026-01-07T00:00:00,Gift\r\n7004,8,2026-01-08T00:00:00,Gift\r\n";
const GRID = CSV.trim().split("\r\n").map((l) => l.split(","));
const MAP = { Donor: "@person", Amount: "Gift_Amount", Date: "Gift_Date", Type: "Record_Type" };
const MAPPED = ["Gift_Amount", "Gift_Date", "Record_Type"];
const CELL = (o: number, c: string) => GRID[o + 1][{ Gift_Amount: 1, Gift_Date: 2, Record_Type: 3 }[c as "Gift_Amount"]];
/** builds a backend-shaped plan for ordinals 0..3: o0 eligible all, o1 Gift_Amount manual-edit hold, o2 row hold (portal edit), o3 no association */
function plan(over: (p: Record<string, unknown>) => void = () => {}) {
  const rows: Record<string, unknown>[] = [], held: Record<string, unknown>[] = [];
  const cands = [0, 1, 2].map((o) => ({ o, giftId: U(o + 1), locator: 501 + o, person: 7001 + o }));
  for (const c of MAPPED) rows.push({ o: 0, key: `gift:${U(1)}`, col: c, value: CELL(0, c) === "" ? null : CELL(0, c) });
  held.push({ o: 1, col: "Gift_Amount", reason: "current differs from attested prior export (possible manual edit)" });
  for (const c of ["Gift_Date", "Record_Type"]) rows.push({ o: 1, key: `gift:${U(2)}`, col: c, value: CELL(1, c) === "" ? null : CELL(1, c) });
  held.push({ o: 2, reason: "portal edit exists for this donor (protected)" });
  held.push({ o: 3, reason: "no committed association for the attested file" });
  const counts: Record<string, number> = { candidates: 3, eligible: rows.length, held: held.length, outOfScopeAssociated: 2, "current differs from attested prior export (possible manual edit)": 1, "portal edit exists for this donor (protected)": 1, "no committed association for the attested file": 1 };
  const p: Record<string, unknown> = { planDigest: "d".repeat(64), candidates: cands, rows, held, counts };
  over(p); return p;
}
const ctx = { from: 0, to: 3, mapped: MAPPED, cell: CELL, donor: (o: number) => GRID[o + 1][0] };

test("[GOLDEN] shared fixture byte-identical to Catapult-Calling (sha pinned) and caps equal the owning preview sizing", async () => {
  const raw = readFileSync("lib/portal-v2/gift-attest-golden.json");
  assert.equal(createHash("sha256").update(raw).digest("hex"), "734b8caa88a846594922eb558db67bfe68e0831c5bde38237a41157fd1bc187a");
  const { previewRowCap } = await import("../lib/portal-v2/gift-identity-plan");
  const fx = JSON.parse(raw.toString());
  assert.deepEqual(fx.capsByMappedCount, Array.from({ length: 64 }, (_, i) => Math.max(0, Math.min(500, Math.floor(889 / (2 * (i + 1))), previewRowCap(i + 1)))));
  assert.equal(fx.overflowReasons.length, 15); assert.equal(fx.rowReasons.length, 13); assert.equal(fx.columnReasons.length, 5);
});

test("validator: a covered plan passes; every coverage/grammar/count/key/value violation is refused with the fixed message", async () => {
  const { validateAttestPlan, AttestShapeError } = await import("../lib/portal-v2/gift-attest");
  const v = validateAttestPlan(plan(), ctx);
  assert.deepEqual(v.byOrdinal.map((x) => x.kind), ["covered", "covered", "held", "held"]);
  const R = (name: string, mut: (p: Record<string, unknown>) => void, c = ctx) => assert.throws(() => validateAttestPlan(plan(mut), c), (e: unknown) => e instanceof AttestShapeError && /failed validation/.test((e as Error).message), name);
  const rows = (p: Record<string, unknown>) => p.rows as Record<string, unknown>[], held = (p: Record<string, unknown>) => p.held as Record<string, unknown>[], cnt = (p: Record<string, unknown>) => p.counts as Record<string, number>;
  R("omitted ordinal", (p) => { p.held = held(p).filter((h) => h.o !== 3); cnt(p).held--; delete cnt(p)["no committed association for the attested file"]; });
  R("omitted column", (p) => { p.rows = rows(p).filter((r) => !(r.o === 0 && r.col === "Gift_Date")); cnt(p).eligible--; });
  R("row hold plus column entry", (p) => { held(p).push({ o: 2, col: "Gift_Date", reason: "baseline already exists (never overwritten)" }); cnt(p).held++; cnt(p)["baseline already exists (never overwritten)"] = 1; });
  R("eligible without candidate", (p) => { rows(p).push({ o: 3, key: `gift:${U(9)}`, col: "Gift_Amount", value: "8" }); cnt(p).eligible++; });
  R("whole hold mixed with eligible", (p) => { held(p)[1] = { o: 2, reason: "client has active portal gift edits/voids (protected)" }; delete cnt(p)["portal edit exists for this donor (protected)"]; cnt(p)["client has active portal gift edits/voids (protected)"] = 1; });
  R("unknown reason", (p) => { held(p)[2] = { o: 3, reason: "something else" }; });
  R("prefix-like overflow reason", (p) => { held(p)[2] = { o: 3, reason: "bounded read overflow (zzz): duplicate rows" }; });
  R("row reason as column reason", (p) => { held(p)[0] = { o: 1, col: "Gift_Amount", reason: "raw row missing" }; });
  R("foreign column", (p) => { rows(p)[0].col = "Other"; });
  R("out of range", (p) => { held(p)[2].o = 9; });
  R("duplicate (o,col)", (p) => { rows(p).push({ ...rows(p)[0] }); cnt(p).eligible++; });
  R("key mismatch", (p) => { rows(p)[0].key = `gift:${U(2)}`; });
  R("value differs from file cell", (p) => { rows(p)[0].value = "999"; });
  R("blank cell must be null", (p) => { const r = rows(p).find((x) => x.o === 1 && x.col === "Record_Type")!; r.value = ""; });
  R("count mismatch", (p) => { cnt(p).eligible++; });
  R("extra count key", (p) => { cnt(p).extra = 0; });
  R("zero reason count key", (p) => { cnt(p)["raw row missing"] = 0; });
  R("outOfScope > 5000", (p) => { cnt(p).outOfScopeAssociated = 5001; });
  R("extra nested key", (p) => { (p.candidates as Record<string, unknown>[])[0].extra = 1; });
  R("extra top key", (p) => { p.extra = 1; });
  R("bad uuid", (p) => { (p.candidates as Record<string, unknown>[])[0].giftId = "NOT-A-UUID"; });
  R("duplicate uuid", (p) => { (p.candidates as Record<string, unknown>[])[1].giftId = U(1); });
  R("candidates not ascending", (p) => { (p.candidates as unknown[]).reverse(); });
  R("bad digest", (p) => { p.planDigest = "x"; });
  R("covered candidate with null locator", (p) => { (p.candidates as Record<string, unknown>[])[0].locator = null; });
  R("covered candidate with null person", (p) => { (p.candidates as Record<string, unknown>[])[1].person = null; });
  R("covered candidate donor differs from the file donor cell", (p) => { (p.candidates as Record<string, unknown>[])[0].person = 7999; });
  // a row-held candidate may legitimately carry nulls (e.g. identity missing)
  assert.equal(validateAttestPlan(plan((p) => { (p.candidates as Record<string, unknown>[])[2].locator = null; (p.candidates as Record<string, unknown>[])[2].person = null; }), ctx).byOrdinal[2].kind, "held");
  // a whole-plan hold done right: every candidate held with the same reason, nothing eligible
  const whole = (p: Record<string, unknown>) => { p.rows = []; p.held = [0, 1, 2].map((o) => ({ o, reason: "client has active portal gift edits/voids (protected)" })).concat([{ o: 3, reason: "no committed association for the attested file" }]); p.counts = { candidates: 3, eligible: 0, held: 4, outOfScopeAssociated: 0, "client has active portal gift edits/voids (protected)": 3, "no committed association for the attested file": 1 }; };
  assert.equal(validateAttestPlan(plan(whole), ctx).byOrdinal.filter((x) => x.kind === "held").length, 4);
});

test("context/date/export boundaries: owning column schema, version>=1, no duplicate cols; total date check never throws; exact export schema bound to file/draft/plan", async () => {
  const { validateAttestContext, realDate, validateAttestExport, validateAttestPlan, CAPS_BY_MAPPED_COUNT, EXPORT_NOTE } = await import("../lib/portal-v2/gift-attest");
  const good = { available: true, lookupAvailable: true, configured: true, registrationId: "fict_gifts", registrationVersion: 1, columns: COLS3, capsByMappedCount: [...CAPS_BY_MAPPED_COUNT], maxFileBytes: 2800000 };
  assert.equal(validateAttestContext(good).available, true);
  for (const bad of [{ ...good, registrationVersion: 0 }, { ...good, columns: [COLS3[0], COLS3[0]] }, { ...good, columns: [{ ...COLS3[0], len: "bad" }] }, { ...good, columns: [{ ...COLS3[0], p: {} }] }, { ...good, columns: [{ ...COLS3[0], s: -99 }] }, { ...good, columns: [{ ...COLS3[0], ty: "madeup" }] }, { ...good, columns: [{ ...COLS3[0], s: 20, p: 10 }] }])
    assert.equal(validateAttestContext(bad).available, false, JSON.stringify(bad.columns ?? bad.registrationVersion));
  for (const d of ["2025-99-99", "2025-02-30", "2024-02-30", "0000-01-01", "2025-13-01", "x"]) assert.equal(realDate(d), false, d);
  assert.equal(realDate("2024-02-29"), true);
  const plan0 = validateAttestPlan(plan(), ctx);
  const E = { client: "jag", table: REG.table, registrationId: "fict_gifts", registrationVersion: 1, mapping: MAP, fileSha256: createHash("sha256").update(CSV).digest("hex"), sourceDate: DRAFT.sourceDate, statement: DRAFT.statement, approvedBy: DRAFT.approvedBy, approvedAt: DRAFT.approvedAt, approvalRef: DRAFT.approvalRef, ordinalFrom: 0, ordinalTo: 3, plan: plan0 };
  const exp = (o: Record<string, unknown> = {}, pk: Record<string, unknown> = {}) => JSON.stringify({ kind: "gift-attest-proposal/v1", note: EXPORT_NOTE, packet: { client: "jag", table: REG.table, registrationId: "fict_gifts", registrationVersion: 1, registrationDigest: "a".repeat(64), mapping: MAP, priorFile: { name: "prior-source-export.csv", sha256: E.fileSha256, sourceDate: E.sourceDate }, provenanceStatement: E.statement, approvedBy: E.approvedBy, approvedAt: E.approvedAt, approvalRef: E.approvalRef, ...pk }, ordinalFrom: 0, ordinalTo: 3, planDigest: plan0.planDigest, counts: plan0.counts, ...o });
  assert.equal(validateAttestExport(exp(), E), true);
  for (const [n, t] of [["extra key (cells)", exp({ rows: [["7001"]] })], ["wrong sha", exp({}, { priorFile: { name: "prior-source-export.csv", sha256: "0".repeat(64), sourceDate: E.sourceDate } })], ["wrong digest", exp({ planDigest: "e".repeat(64) })], ["wrong range", exp({ ordinalTo: 2 })], ["wrong client", exp({}, { client: "pvas" })], ["wrong mapping", exp({}, { mapping: { Donor: "@person" } })], ["wrong counts", exp({ counts: { ...plan0.counts, eligible: 0 } })], ["wrong ref", exp({}, { approvalRef: "X" })], ["not json", "{}"], ["oversize", exp({ note: "x".repeat(70000) })]] as [string, string][])
    assert.equal(validateAttestExport(t, E), false, n);
});

test("status: full upstream projection first, then redacted output; browser validator binds the requested id", async () => {
  const { projectAttestStatus, validateAttestStatusOut } = await import("../lib/portal-v2/gift-attest");
  const q = { requestId: "a".repeat(32), client: "jag", table: "raw_master_giving_history" };
  const result = { kind: "gift-attest", client: "jag", table: q.table, registrationId: "fict_gifts", registrationVersion: 1, requestId: q.requestId, payloadHash: "b".repeat(64), planDigest: "c".repeat(64), approvalRef: "FICT-1", approvedBy: "Pat Example", priorFileSha256: "e".repeat(64), priorSourceDate: "2025-06-30", counts: { records: 3, values: 9 } };
  const ok = projectAttestStatus({ found: true, confirmed: true, state: "committed", result }, q);
  assert.equal(ok.state, "committed"); assert.ok(!("payloadHash" in (ok as { result: object }).result) && !("approvedBy" in (ok as { result: object }).result), "redacted");
  assert.deepEqual(projectAttestStatus({ found: false, confirmed: false, state: "unconfirmed", note: "x" }, q), { requestId: q.requestId, found: false, state: "unconfirmed" });
  for (const bad of [{ ...result, requestId: "f".repeat(32) }, { ...result, client: "pvas" }, { ...result, extra: 1 }, { ...result, counts: { records: 10, values: 9 } }, { ...result, priorSourceDate: "2025-02-30" }, { ...result, kind: "x" }])
    assert.equal(projectAttestStatus({ found: true, confirmed: true, state: "committed", result: bad }, q).state, "unreadable");
  assert.equal(projectAttestStatus({ found: true, confirmed: true, state: "committed", result, extra: 1 }, q).state, "unreadable");
  assert.equal(projectAttestStatus(null, q).state, "unreadable");
  assert.ok(validateAttestStatusOut(ok, q.requestId, q.client, q.table));
  assert.equal(validateAttestStatusOut(ok, "f".repeat(32), q.client, q.table), null, "other request id");
  assert.equal(validateAttestStatusOut({ ...ok, extra: 1 }, q.requestId, q.client, q.table), null);
  assert.equal(validateAttestStatusOut(ok, q.requestId, "pvas", q.table), null);
  const okr = ok as { result: Record<string, unknown> };
  for (const [n, r] of [["version -1", { ...okr.result, registrationVersion: -1 }], ["version 0", { ...okr.result, registrationVersion: 0 }], ["values 32001", { ...okr.result, counts: { records: 1, values: 32001 } }], ["date 2025-99-99", { ...okr.result, priorSourceDate: "2025-99-99" }]] as [string, unknown][])
    assert.equal(validateAttestStatusOut({ ...ok, result: r }, q.requestId, q.client, q.table), null, n);
  assert.equal(projectAttestStatus({ found: true, confirmed: true, state: "committed", result: { ...result, priorSourceDate: "2025-99-99" } }, q).state, "unreadable", "malformed date never throws");
});

// ---------------- actual imported route ----------------
const calls: Record<string, unknown>[] = []; let reply: (b: Record<string, unknown>) => Response = () => Response.json({});
async function route() {
  globalThis.fetch = (async (_u: unknown, init: { body: string }) => { const b = JSON.parse(init.body); calls.push(b); return reply(b); }) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route");
  const D = await import("../lib/portal-v2/gift-durable");
  return { POST, D };
}
const post = (POST: (r: NextRequest) => Promise<Response>, body: unknown, h: Record<string, string> = {}) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", cookie: `catapult_research_auth=${COOKIE}`, ...h }, body: typeof body === "string" ? body : JSON.stringify(body) }));
const DRAFT = { mapping: MAP, ordinalFrom: 0, ordinalTo: 3, sourceDate: "2025-06-30", statement: "This prior source export is the file originally loaded into the raw gift table (fictional).", approvedBy: "Pat Example", approvedAt: "2026-11-03T12:00:00Z", approvalRef: "FICT-1", confirmed: true };
const B64 = Buffer.from(CSV).toString("base64");
const PREV = { op: "durableGiftAttestPreview", client: "jag", table: REG.table, fileB64: B64, draft: DRAFT };

test("[ROUTE] auth, same-origin, actual-byte cap; empty registry: preview hidden (404, no upstream) while lookup stays available", async () => {
  const { POST, D } = await route(); D.__setGiftRegistrationsForTests([]); calls.length = 0;
  assert.equal((await post(POST, PREV, { cookie: "" })).status, 401);
  assert.equal((await post(POST, PREV, { origin: "https://evil.example" })).status, 403);
  assert.equal((await post(POST, JSON.stringify({ ...PREV, pad: "x".repeat(4_500_000) }))).status, 413);
  const c = await (await post(POST, { op: "durableGiftAttestContext", client: "jag", table: REG.table })).json();
  assert.deepEqual(c, { available: false, lookupAvailable: true });
  assert.equal((await post(POST, PREV)).status, 404);
  assert.equal(calls.length, 0);
  const save = process.env.SOURCE_IMPORT_PREVIEW; delete process.env.SOURCE_IMPORT_PREVIEW;
  assert.deepEqual(await (await post(POST, { op: "durableGiftAttestContext", client: "jag", table: REG.table })).json(), { available: false, lookupAvailable: false }, "transport unconfigured: both flags false");
  process.env.SOURCE_IMPORT_PREVIEW = save;
  assert.equal((await post(POST, { op: "durableGiftAttestApply", client: "jag", table: REG.table })).status, 400, "no apply op");
});

test("[ROUTE] preview: server builds packet/ordinals/sha; strict body/draft/mapping/range checks before any upstream call; fixed refusal texts; projection 502", async () => {
  const { POST, D } = await route(); D.__setGiftRegistrationsForTests([REG as never]); calls.length = 0;
  reply = () => Response.json(plan());
  const ok = await post(POST, PREV); const okj = await ok.json();
  assert.equal(ok.status, 200, JSON.stringify(okj)); assert.equal(okj.fileSha256, createHash("sha256").update(CSV).digest("hex"));
  const sent = calls[0] as { op: string; input: { packet: Record<string, unknown>; ordinals: number[]; priorFileB64: string } };
  assert.equal(sent.op, "giftAttestPreview"); assert.deepEqual(Object.keys(sent).sort(), ["input", "op"]); assert.deepEqual(Object.keys(sent.input).sort(), ["ordinals", "packet", "priorFileB64"]);
  assert.deepEqual(sent.input.ordinals, [0, 1, 2, 3]); assert.equal(sent.input.priorFileB64, B64);
  assert.equal((sent.input.packet.priorFile as { sha256: string }).sha256, okj.fileSha256);
  assert.ok(Buffer.byteLength(okj.export) <= 65536 && !okj.export.includes("7001"), "metadata-only export (no cells)");
  const GA = await import("../lib/portal-v2/gift-attest");
  const vp = GA.validateAttestPlan(okj.plan, ctx);
  assert.equal(GA.validateAttestExport(okj.export, { client: "jag", table: REG.table, registrationId: REG.id, registrationVersion: 1, mapping: MAP, fileSha256: okj.fileSha256, sourceDate: DRAFT.sourceDate, statement: DRAFT.statement, approvedBy: DRAFT.approvedBy, approvedAt: DRAFT.approvedAt, approvalRef: DRAFT.approvalRef, ordinalFrom: 0, ordinalTo: 3, plan: vp }), true, "route export passes the shared exact schema");
  calls.length = 0;
  const BADS: [string, unknown][] = [
    ["extra key", { ...PREV, extra: 1 }], ["draft extra", { ...PREV, draft: { ...DRAFT, x: 1 } }], ["unconfirmed", { ...PREV, draft: { ...DRAFT, confirmed: false } }],
    ["junk base64", { ...PREV, fileB64: B64 + "\n" }], ["non-canonical base64", { ...PREV, fileB64: "QR==" }], ["bad date", { ...PREV, draft: { ...DRAFT, sourceDate: "2025-02-30" } }],
    ["statement", { ...PREV, draft: { ...DRAFT, statement: "a file" } }], ["time", { ...PREV, draft: { ...DRAFT, approvedAt: "2026-11-03" } }], ["ctrl in name", { ...PREV, draft: { ...DRAFT, approvedBy: "Pat\u0007" } }],
    ["@giftId", { ...PREV, draft: { ...DRAFT, mapping: { ...MAP, Type: "@giftId" } } }], ["unregistered col", { ...PREV, draft: { ...DRAFT, mapping: { ...MAP, Type: "Other" } } }], ["two donors", { ...PREV, draft: { ...DRAFT, mapping: { ...MAP, Amount: "@person" } } }],
    ["reversed range", { ...PREV, draft: { ...DRAFT, ordinalFrom: 2, ordinalTo: 1 } }], ["beyond file", { ...PREV, draft: { ...DRAFT, ordinalTo: 4 } }], ["string range", { ...PREV, draft: { ...DRAFT, ordinalFrom: "0" } }],
    ["reserved header", { ...PREV, fileB64: Buffer.from(CSV.replace("Type", "Catapult Gift ID")).toString("base64"), draft: { ...DRAFT, mapping: { Donor: "@person", Amount: "Gift_Amount" } } }],
    ["invalid utf8", { ...PREV, fileB64: Buffer.from([0x44, 0x0d, 0x0a, 0xff, 0x0d, 0x0a]).toString("base64") }],
    ["non-string client", { ...PREV, client: ["jag"] }], ["invalid month date", { ...PREV, draft: { ...DRAFT, sourceDate: "2025-99-99" } }],
  ];
  for (const [n, b] of BADS) { const r = await post(POST, b); assert.ok(r.status === 400 || r.status === 413, `${n}: ${r.status}`); }
  assert.equal(calls.length, 0, "no upstream call for any invalid request");
  for (const code of ["unregistered", "registry-changed", "prepared", "over-budget", "invalid", "weird"]) {
    reply = () => Response.json({ error: "UPSTREAM TEXT MUST NOT ECHO", code }, { status: code === "unregistered" ? 403 : 409 });
    const r = await post(POST, PREV); const j = await r.json(); assert.equal(r.status, 400); assert.ok(!JSON.stringify(j).includes("UPSTREAM TEXT"), code);
  }
  reply = () => Response.json({ error: "boom" }, { status: 503 }); assert.equal((await post(POST, PREV)).status, 502);
  for (const mut of [(p: Record<string, unknown>) => { (p.rows as Record<string, unknown>[])[0].value = "999"; }, (p: Record<string, unknown>) => { (p.held as unknown[]).pop(); }, (p: Record<string, unknown>) => { (p.counts as Record<string, number>).eligible = 0; }]) {
    reply = () => Response.json(plan(mut)); const r = await post(POST, PREV); assert.equal(r.status, 502); assert.match((await r.json()).error, /failed validation/);
  }
  D.__setGiftRegistrationsForTests([]);
});

test("[ROUTE] status: works with EMPTY registry when transport configured; requestId/client/table bound; unavailable upstream 502; malformed => unreadable", async () => {
  const { POST, D } = await route(); D.__setGiftRegistrationsForTests([]); calls.length = 0;
  const rid = "a".repeat(32);
  const result = { kind: "gift-attest", client: "jag", table: REG.table, registrationId: "fict_gifts", registrationVersion: 1, requestId: rid, payloadHash: "b".repeat(64), planDigest: "c".repeat(64), approvalRef: "FICT-1", approvedBy: "Pat Example", priorFileSha256: "e".repeat(64), priorSourceDate: "2025-06-30", counts: { records: 3, values: 9 } };
  reply = () => Response.json({ found: true, confirmed: true, state: "committed", result });
  const S = (b: Record<string, unknown> = {}) => post(POST, { op: "durableGiftAttestStatus", client: "jag", table: REG.table, requestId: rid, ...b });
  const ok = await (await S()).json(); assert.equal(ok.state, "committed"); assert.equal(ok.requestId, rid); assert.equal(ok.result.payloadHash, undefined);
  assert.deepEqual(calls[0], { op: "giftAttestStatus", client: "jag", table: REG.table, requestId: rid });
  reply = () => Response.json({ found: true, confirmed: true, state: "committed", result: { ...result, requestId: "f".repeat(32) } }); assert.equal((await (await S()).json()).state, "unreadable");
  reply = () => Response.json({ found: true, confirmed: true, state: "committed", result: { ...result, priorSourceDate: "2025-99-99" } }); const md = await S(); assert.equal(md.status, 200); assert.equal((await md.json()).state, "unreadable");
  reply = () => Response.json({ error: "x" }, { status: 500 }); assert.equal((await S()).status, 502);
  assert.equal((await S({ requestId: "x" })).status, 400); assert.equal((await S({ table: "bad-table" })).status, 400); assert.equal((await post(POST, { op: "durableGiftAttestStatus", client: "zzz", table: REG.table, requestId: rid })).status, 400);
});

test("[SIZE] maximum Unicode responses: 5 mapped cols x cap 48 CJK values (2.8 MB file cap) accepted under 4 MB; oversized upstream refused 502", async () => {
  const { POST, D } = await route();
  const cols = Array.from({ length: 5 }, (_, i) => ({ col: `C${i}`, ty: "nvarchar", len: -1, p: null, s: null }));
  D.__setGiftRegistrationsForTests([{ ...REG, columns: cols } as never]);
  const { capForMapped } = await import("../lib/portal-v2/gift-attest");
  const cap = capForMapped(5); assert.equal(cap, 48);
  const v = "\u4e2d".repeat(3880); // largest CJK value that keeps the 48x5 file under the 2.8 MB upload cap
  const csv = ["Donor," + cols.map((c) => c.col).join(","), ...Array.from({ length: cap }, (_, o) => `${7001 + o},${cols.map(() => v).join(",")}`)].join("\r\n") + "\r\n";
  const mapping = Object.fromEntries([["Donor", "@person"], ...cols.map((c) => [c.col, c.col])]);
  const p = { planDigest: "d".repeat(64), candidates: Array.from({ length: cap }, (_, o) => ({ o, giftId: U(o + 1), locator: 501 + o, person: 7001 + o })), rows: Array.from({ length: cap }, (_, o) => cols.map((c) => ({ o, key: `gift:${U(o + 1)}`, col: c.col, value: v }))).flat(), held: [], counts: { candidates: cap, eligible: cap * 5, held: 0, outOfScopeAssociated: 0 } };
  const bytes = Buffer.byteLength(JSON.stringify(p)); assert.ok(bytes > 2_700_000 && bytes < 3_500_000, String(bytes));
  reply = () => Response.json(p);
  const body = { op: "durableGiftAttestPreview", client: "jag", table: REG.table, fileB64: Buffer.from(csv).toString("base64"), draft: { ...DRAFT, mapping, ordinalFrom: 0, ordinalTo: cap - 1 } };
  const r = await post(POST, body); assert.equal(r.status, 200, JSON.stringify(await r.clone().json()).slice(0, 200));
  reply = () => Response.json({ ...p, pad: "x".repeat(1_200_000) }); assert.equal((await post(POST, body)).status, 502);
  D.__setGiftRegistrationsForTests([]);
});
