// H2 self-tests for the TEST-ONLY paired harness infrastructure (scripts/harness). Mock SQL only: NOT real SQL/HTTP/hosted
// evidence. Part A (mock unit tests) always runs. Part B (backend child) needs an externally supplied pinned extract:
//   HARNESS_BACKEND_DIR, HARNESS_BACKEND_INVENTORY, HARNESS_BACKEND_LOCK_SHA256, HARNESS_BACKEND_NEXT (test-runner args).
// Without them Part B is SKIPPED and reported NOTRUN; with HARNESS_ACCEPTANCE=1 any skip fails the run.
import test from "node:test";
import assert from "node:assert/strict";
import { createMock, MockSqlError, LostResponseAfterCommit, type StatementDef } from "./harness/mock-sql";
import { startChild, verifyPin, ChildCrashed, type Pin } from "./harness/paired-client";

const T = ["a", "b", "c"];
const DEFS: StatementDef[] = [
  { id: "a.get", sql: "SELECT v FROM a WHERE k=@k", params: ["k"], write: false, tables: ["a"], exec: (t, p) => ({ rows: t.a.filter((r) => r.k === p.k), affected: 0 }) },
  { id: "a.put", sql: "INSERT a", params: ["k", "v"], write: true, tables: ["a"], exec: (t, p) => { t.a.push({ k: p.k, v: p.v }); return { rows: [], affected: 1 }; } },
  { id: "b.put", sql: "INSERT b", params: ["k"], write: true, tables: ["b"], exec: (t, p) => { t.b.push({ k: p.k }); return { rows: [], affected: 1 }; } },
  { id: "c.put", sql: "INSERT c", params: ["k"], write: true, tables: ["c"], exec: (t, p) => { t.c.push({ k: p.k }); return { rows: [], affected: 1 }; } },
  { id: "bad.cross", sql: "SNEAK", params: [], write: false, tables: ["a"], exec: (t) => ({ rows: t.b, affected: 0 }) },
];
const code = (c: string) => (e: unknown) => e instanceof MockSqlError && e.code === c;

test("[MOCK] supported statement + exact params: positive", async () => {
  const m = createMock(DEFS, T); m.seed({ a: [{ k: "x", v: 1 }] });
  assert.deepEqual((await m.reader("SELECT v FROM a WHERE k=@k", { k: "x" })).rows, [{ k: "x", v: 1 }]);
  assert.deepEqual(m.trace.at(-1), { id: "a.get", params: ["k"], tx: false });
});
test("[MOCK] fail closed: unknown SQL (text never traced), missing/extra/non-scalar params, writes outside tx, undeclared table access, bad defs", async () => {
  const m = createMock(DEFS, T);
  await assert.rejects(m.reader("SELECT * FROM a", {}), code("unsupported_sql")); assert.match(m.trace.at(-1)!.id, /^UNSUPPORTED:[0-9a-f]{12}$/);
  await assert.rejects(m.reader("SELECT v FROM a WHERE k=@k  ", { k: "x" }), code("unsupported_sql"), "no whitespace/substring tolerance");
  await assert.rejects(m.reader("SELECT v FROM a WHERE k=@k", {}), code("bad_params"));
  await assert.rejects(m.reader("SELECT v FROM a WHERE k=@k", { k: "x", z: 1 }), code("bad_params"));
  for (const v of [{ o: 1 }, [1], undefined, Number.NaN]) await assert.rejects(m.reader("SELECT v FROM a WHERE k=@k", { k: v as never }), code("bad_params"));
  await assert.rejects(m.reader("INSERT a", { k: "x", v: 1 }), code("write_outside_tx"));
  await assert.rejects(m.reader("SNEAK", {}), code("undeclared_table"));
  assert.throws(() => createMock([DEFS[0], { ...DEFS[0], id: "dup" }], T), code("duplicate_def"));
  assert.throws(() => createMock([{ ...DEFS[0], tables: ["zz"] }], T), code("undeclared_table"));
  assert.throws(() => m.seed({ zz: [] }), code("bad_seed")); assert.throws(() => m.setFailpoint("boom" as never), code("bad_failpoint"));
  assert.equal(m.stats.unsupported, 2);
});
test("[MOCK] rollback restores EVERY table on throw; commit keeps writes; closed tx refuses use", async () => {
  const m = createMock(DEFS, T); m.seed({ a: [{ k: "seed", v: 0 }] });
  await assert.rejects(m.txf(async (run) => { await run("INSERT a", { k: "1", v: 1 }); await run("INSERT b", { k: "1" }); await run("INSERT c", { k: "1" }); throw new Error("app error"); }), /app error/);
  assert.deepEqual(m.counts(), { a: 1, b: 0, c: 0 }); assert.deepEqual(m.dump().a, [{ k: "seed", v: 0 }]);
  await assert.rejects(m.txf(async (run) => { await run("INSERT a", { k: "2", v: 2 }); await run("SELECT nope", {}); }), code("unsupported_sql"));
  assert.deepEqual(m.counts(), { a: 1, b: 0, c: 0 }, "unsupported SQL mid-transaction rolls back prior writes");
  let leaked: ((s: string, p: Record<string, unknown>) => Promise<unknown>) | null = null;
  await m.txf(async (run) => { leaked = run; await run("INSERT b", { k: "ok" }); });
  assert.deepEqual(m.counts(), { a: 1, b: 1, c: 0 }); await assert.rejects(leaked!("INSERT c", { k: "late" }), code("tx_closed"));
  assert.deepEqual([m.stats.commits, m.stats.rollbacks], [1, 2]);
});
test("[MOCK] serialized transactions and failpoints: beforeCommit rolls back; afterCommit commits then loses the response", async () => {
  const m = createMock(DEFS, T); const order: string[] = [];
  const t1 = m.txf(async (run) => { order.push("t1-start"); await run("INSERT a", { k: "1", v: 1 }); await new Promise((r) => setImmediate(r)); order.push("t1-end"); });
  const t2 = m.txf(async (run) => { order.push("t2-start"); assert.equal((await run("SELECT v FROM a WHERE k=@k", { k: "1" })).rows.length, 1, "t2 sees t1 commit"); order.push("t2-end"); });
  await Promise.all([t1, t2]); assert.deepEqual(order, ["t1-start", "t1-end", "t2-start", "t2-end"]);
  m.setFailpoint("beforeCommit"); await assert.rejects(m.txf(async (run) => { await run("INSERT b", { k: "x" }); }), code("failpoint")); assert.equal(m.counts().b, 0);
  m.setFailpoint("afterCommit"); await assert.rejects(m.txf(async (run) => { await run("INSERT c", { k: "y" }); }), (e) => e instanceof LostResponseAfterCommit); assert.equal(m.counts().c, 1, "committed despite lost response");
  m.reset(); assert.deepEqual(m.counts(), { a: 0, b: 0, c: 0 }); assert.equal(m.trace.length, 0);
});

// ---------------- Part B: real backend child (pinned externally) ----------------
const E = process.env;
const pin: Pin | null = E.HARNESS_BACKEND_DIR && E.HARNESS_BACKEND_INVENTORY && E.HARNESS_BACKEND_LOCK_SHA256 && E.HARNESS_BACKEND_NEXT
  ? { dir: E.HARNESS_BACKEND_DIR, inventory: E.HARNESS_BACKEND_INVENTORY, lockSha256: E.HARNESS_BACKEND_LOCK_SHA256, next: E.HARNESS_BACKEND_NEXT } : null;
const ACCEPT = E.HARNESS_ACCEPTANCE === "1";
const skip = pin ? false : "NOTRUN: pinned backend extract not supplied";
if (!pin && ACCEPT) test("acceptance requires the pinned backend child", () => { assert.fail("HARNESS_ACCEPTANCE=1 but Part B inputs are missing (NOTRUN is a failure here)"); });
const CHILD = "scripts/harness/backend-child.ts";
const SECRET = "h".repeat(32);
const req = (body: unknown, auth = true) => new Request("http://engage.test.invalid/api/source-import", { method: "POST", headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${SECRET}` } : {}) }, body: JSON.stringify(body) });
const ENV = { PORTAL_WRITE_SECRET: SECRET, SOURCE_IMPORT_SQL_CONNECTION: "mock" };

test("[CHILD] pin verification refuses a wrong inventory/lock/next before spawning", { skip }, () => {
  assert.throws(() => verifyPin({ ...pin!, inventory: "0".repeat(64) }), /inventory mismatch/);
  assert.throws(() => verifyPin({ ...pin!, lockSha256: "0".repeat(64) }), /lockfile/);
  assert.throws(() => verifyPin({ ...pin!, next: "15.3.6" }), /next version/);
  assert.throws(() => verifyPin({ ...pin!, dir: "/nonexistent" }), /missing/);
});

test("[CHILD] real handler over stdio: 401/400, status via strict mock, unsupported SQL fails closed with rollback, own Next 14, reset/unknown frame/shutdown", { skip }, async () => {
  const c = startChild(pin!, CHILD);
  try {
    assert.equal((await c.send({ kind: "seed", deps: { env: ENV } })).kind, "ok");
    assert.equal((await c.fetchImpl(req({ op: "status" }, false))).status, 401);
    assert.equal((await c.fetchImpl(req({ op: "noSuchOp" }))).status, 400);
    const rid = "a".repeat(32);
    assert.deepEqual(await (await c.fetchImpl(req({ op: "status", client: "wcbhc", requestId: rid }))).json().then((j) => j.found), false);
    await c.send({ kind: "seed", tables: { "source_import.requests": [{ request_id: rid, client: "wcbhc", payload_hash: "p", status: "committed", result_json: JSON.stringify({ applied: 1 }), created_at: "2026-11-04T00:00:00" }] } });
    const st = await (await c.fetchImpl(req({ op: "status", client: "wcbhc", requestId: rid }))).json(); assert.equal(st.found, true); assert.deepEqual(st.result, { applied: 1 });
    // provenance uses a statement H2 does not support => mock throws => handler error response; nothing changed
    const pv = await c.fetchImpl(req({ op: "provenance", client: "wcbhc" })); assert.ok(pv.status >= 500, String(pv.status));
    const ins = await c.send({ kind: "inspect" }) as Record<string, any>;
    assert.equal(ins.nextVersion, "14.2.35"); assert.ok(String(ins.nextServer).startsWith(pin!.dir.replace(/\/$/, "") + "/node_modules/next/"));
    assert.deepEqual(ins.outsideBackend.filter((p: string) => !p.startsWith("harness/")), [], "only harness files load from outside the backend extract");
    assert.ok(ins.trace.some((t: any) => /^UNSUPPORTED:/.test(t.id))); assert.equal(ins.stats.unsupported, 1);
    assert.deepEqual(ins.statements.map((s: any) => s.id), ["source.lockRequest", "source.status", "source.lockGiftOverrides"]);
    assert.deepEqual(ins.counts, { "source_import.requests": 1, "engage.portal_gift_overrides": 0 });
    assert.equal((await c.send({ kind: "nope" })).kind, "error");
    assert.equal((await c.send({ kind: "failpoint", name: "boom" })).kind, "error");
    await c.send({ kind: "reset" }); const r2 = await c.send({ kind: "inspect" }) as Record<string, any>; assert.deepEqual(r2.counts, { "source_import.requests": 0, "engage.portal_gift_overrides": 0 }); assert.equal(r2.trace.length, 0);
    assert.equal((await c.send({ kind: "shutdown" })).kind, "ok"); assert.equal(await c.exited, 0);
  } finally { c.kill(); }
});

test("[CHILD] apply through the real handler: stale rev refused pre-tx; valid request opens tx, supported lockRequest then unsupported SQL rolls back; crash failpoint rejects pending + later frames", { skip }, async () => {
  const c = startChild(pin!, CHILD);
  try {
    await c.send({ kind: "seed", deps: { env: { ...ENV, PORTAL_SOURCE_IMPORT_APPLY: "enabled" } }, tables: { "engage.portal_gift_overrides": [{ id: 1, client: "pvas", superseded: 0 }] } });
    const body = { op: "apply", request: { requestId: "b".repeat(32), client: "pvas", table: "donorsearch_results", mode: "update", actor: "Pat", fileName: "f.csv", fileDigest: "e".repeat(64), fileDate: null, registryRev: "x", preparedDigest: null, previewHash: "c".repeat(64), previewExp: Date.now() + 60_000, ops: [{ kind: "update", key: 101, values: { Quality_Score: "B" }, expected: { Quality_Score: "A" } }] } };
    const r0 = await c.fetchImpl(req(body)); assert.equal(r0.status, 400, "stale registry revision refused (validation) before any transaction");
    assert.equal(((await c.send({ kind: "inspect" })) as Record<string, any>).stats.tx, 0);
    const ok = { ...body, request: { ...body.request, registryRev: (await import("../lib/portal-v2/source-registry")).REGISTRY_META.rev } };
    const r = await c.fetchImpl(req(ok)); assert.ok(r.status >= 500, String(r.status));
    const ins = await c.send({ kind: "inspect" }) as Record<string, any>;
    assert.equal(ins.stats.tx, 1); assert.equal(ins.stats.rollbacks, 1); assert.equal(ins.stats.commits, 0);
    assert.deepEqual(ins.trace[0], { id: "source.lockRequest", params: ["rid"], tx: true }); assert.match(ins.trace.at(-1).id, /^UNSUPPORTED:/);
    assert.deepEqual(ins.counts, { "source_import.requests": 0, "engage.portal_gift_overrides": 1 }, "nothing written");
    await c.send({ kind: "failpoint", name: "crashOnNextTx" });
    await assert.rejects(c.fetchImpl(req(ok)), (e) => e instanceof ChildCrashed);
    assert.equal(await c.exited, 70); await assert.rejects(c.send({ kind: "inspect" }), (e) => e instanceof ChildCrashed);
  } finally { c.kill(); }
});
