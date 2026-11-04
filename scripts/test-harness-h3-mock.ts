// H3a narrow hardening self-tests (TEST-ONLY; mock SQL only, no backend child). NOT real SQL evidence.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createMock, MockSqlError, type StatementDef } from "./harness/mock-sql";
import { attach, ProtocolError } from "./harness/paired-client";
import { giftDefs, SIZES } from "./harness/gift-defs-h3";
import { H3_REG, H3_TABLES, T } from "./harness/fixtures-h3";
const code = (c: string) => (e: unknown) => e instanceof MockSqlError && e.code === c;
const D: StatementDef = { id: "a.get", sql: "SELECT v FROM a WHERE k=@k", params: ["k"], write: false, tables: ["a"], exec: (t, p) => ({ rows: t.a.filter((r) => r.k === p.k), affected: 0 }) };

test("[MOCK] definitions must be plain objects/arrays; placeholders must be declared params", () => {
  class Def { id = "x"; sql = "S"; params = []; write = false; tables = ["a"]; exec = D.exec; }
  class Arr<X> extends Array<X> {}
  assert.throws(() => createMock([new Def() as never], ["a"]), code("bad_def"));
  assert.throws(() => createMock([[D] as never], ["a"]), code("bad_def"));
  assert.throws(() => createMock([{ ...D, params: Arr.from(["k"]) as never }], ["a"]), code("bad_def"));
  assert.throws(() => createMock([{ ...D, tables: Arr.from(["a"]) as never }], ["a"]), code("bad_def"));
  assert.throws(() => createMock(Arr.from([D]) as never, ["a"]), code("bad_def"));
  assert.throws(() => createMock([D], Arr.from(["a"]) as never), code("bad_tables"));
  assert.throws(() => createMock([{ ...D, sql: "SELECT v FROM a WHERE k=@k AND z=@z" }], ["a"]), code("bad_def"), "undeclared placeholder");
  assert.doesNotThrow(() => createMock([{ ...D, params: ["k", "extra"] }], ["a"]), "declared call-site extras allowed");
});

const STUB = { lockAssoc: (n: number) => `ASSOC ${Array.from({ length: n }, (_, i) => `@o${i}`).join(",")} @client @scope @fd` };
// Stubs: unique placeholder-free text per generator/size (the real texts come from the pinned backend in the paired tests).
const STATIC = new Set(["lockRequest", "lockGiftOverrides", "lockJob", "lockManifest", "insertJob", "insertManifest", "insertBatch", "insertLog", "jobStatus", "jobBatches", "insertRequest", "insertIdentity", "insertDecision", "insertAssoc", "insertBaseline", "updateBaseline", "insertAudit", "insertLedger", "status", "overrides"]);
const stub = (pre: string, special?: Record<string, unknown>) => new Proxy({}, { get: (_, k) => (special && k in special ? special[k as string] : pre !== "R" && STATIC.has(String(k)) ? `${pre}:${String(k)} STATIC` : (a?: unknown, b?: unknown) => `${pre}:${String(k)}#${typeof a === "number" ? a : Array.isArray(b) ? b.join(".") : typeof b === "number" ? b : ""}`) });
const stubDefs = () => giftDefs(stub("G", { lockAssoc: STUB.lockAssoc }) as never, stub("R") as never, H3_REG as never, stub("P") as never).defs;
test("[MOCK] generated families: only the explicit size sets (A1 §3), exact contiguous params incl. call-site extras, anything else throws", async () => {
  const defs = stubDefs(); assert.ok(defs.length > 0);
  const m = createMock(defs, H3_TABLES);
  const ok = { client: "wcbhc", scope: "s", fd: "f", o0: 0 };
  assert.deepEqual((await m.reader(STUB.lockAssoc(1), ok)).rows, []);
  assert.deepEqual(SIZES["gift.lockAssoc"], [1, 2, 87]);
  for (const n of [3, 4, 86, 88]) await assert.rejects(m.reader(STUB.lockAssoc(n), { ...ok, ...Object.fromEntries(Array.from({ length: n }, (_, i) => [`o${i}`, i])) }), code("unsupported_sql"), `unregistered n=${n}`);
  assert.deepEqual((await m.reader(STUB.lockAssoc(87), { ...ok, ...Object.fromEntries(Array.from({ length: 87 }, (_, i) => [`o${i}`, i])) })).rows, []);
  const ids = defs.map((x) => x.id); assert.ok(ids.includes("gift.rawUpdate.Gift_Amount") && !ids.some((i) => /^gift\.rawUpdate\.Gift_Amount\./.test(i)), "rawUpdate only for [Gift_Amount]");
  assert.ok(!ids.includes("gift.lockAssoc(3)") && !ids.includes("gift.lockMaster(3)") && !ids.includes("preview.master(1)"));
  await assert.rejects(m.reader(STUB.lockAssoc(2), { client: "wcbhc", scope: "s", fd: "f", o0: 0, o2: 2 }), code("bad_params"), "non-contiguous");
  await assert.rejects(m.reader(STUB.lockAssoc(1), { client: "wcbhc", scope: "s", o0: 0 }), code("bad_params"), "missing param");
  await assert.rejects(m.reader(STUB.lockAssoc(1), { ...ok, extra: 1 }), code("bad_params"), "unknown param");
  assert.deepEqual(m.counts()[T.AS], 0);
});
test("[MOCK] statement-scoped failpoint: unknown id refused; throwAt rolls back EVERY table", async () => {
  const W: StatementDef[] = [{ id: "a.put", sql: "INSERT a", params: ["k"], write: true, tables: ["a"], exec: (t, p) => { t.a.push({ k: p.k }); return { rows: [], affected: 1 }; } },
    { id: "b.put", sql: "INSERT b", params: ["k"], write: true, tables: ["b"], exec: (t, p) => { t.b.push({ k: p.k }); return { rows: [], affected: 1 }; } }];
  const m = createMock(W, ["a", "b"]); m.seed({ a: [{ k: "seed" }] }); const before = m.dump();
  assert.throws(() => m.setFailpoint("throwAt:nope" as never), code("bad_failpoint"));
  m.setFailpoint("throwAt:b.put");
  await assert.rejects(m.txf(async (run) => { await run("INSERT a", { k: "1" }); await run("INSERT b", { k: "1" }); }), code("failpoint"));
  assert.deepEqual(m.dump(), before);
});
test("[PROTOCOL] child that announces fatal but stays alive: pending rejects (bounded) and child is killed", async () => {
  const cp = spawn(process.execPath, ["-e", "process.stdin.once('data',()=>{console.log(JSON.stringify({kind:'fatal',error:'x'}))});setInterval(()=>{},1000)"], { stdio: ["pipe", "pipe", "pipe"] });
  const a = attach(cp); const t0 = Date.now();
  await assert.rejects(a.send({ kind: "inspect" }), (e) => e instanceof ProtocolError && /stayed alive/.test(e.message));
  assert.ok(Date.now() - t0 < 10_000); await a.exited; assert.ok(cp.killed || cp.signalCode === "SIGKILL");
  await assert.rejects(a.send({ kind: "inspect" }), ProtocolError);
});
