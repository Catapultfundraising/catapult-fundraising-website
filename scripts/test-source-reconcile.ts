// Synthetic tests (fictional data). Mock SQL transaction tests are NOT real Azure acceptance.
import test from "node:test";
import assert from "node:assert/strict";
import { SOURCE_FIELDS, REGISTRY_META } from "../lib/portal-v2/source-registry";
import {
  reconcile, planWrites, buildGuardedStatements, executeGuarded, registryDests, validatePrepared, normalize, parseKey,
  sourceApplyEnabled, SourceError, type PreparedClient, type SqlTx, type ReconInput,
} from "../lib/portal-v2/source-reconcile";

const cand = SOURCE_FIELDS.filter((f) => f.c === "pvas" && f.t === "donorsearch_results" && f.st === "candidate" && f.col !== "CPTID" && f.ty === "nvarchar");
const C1 = cand[0].col, C2 = cand[1].col;
const base = (over: Partial<ReconInput> = {}): ReconInput => ({
  client: "pvas", table: "donorsearch_results", mode: "update",
  mapping: { "Constituent": "CPTID", A: C1, B: C2 },
  rows: [{ Constituent: "101", A: "new-a", B: "" }],
  baseline: new Map([[101, { [C1]: "old-a", [C2]: "b" }]]),
  current: new Map([[101, { [C1]: "old-a", [C2]: "b" }]]),
  overlays: [], ...over,
});

test("registry is fail-closed and bound to provenance", () => {
  assert.equal(REGISTRY_META.version, 2);
  assert.match(REGISTRY_META.builder_commit, /^[0-9a-f]{40}$/);
  assert.ok(!SOURCE_FIELDS.some((f) => f.col === "row_id"));
  assert.ok(SOURCE_FIELDS.filter((f) => f.t === "Duplciate_Records").every((f) => f.st === "nonwritable"));
  for (const t of ["raw_master_giving_history", "notes", "Daily_Results", "gc2p_prospects"]) assert.ok(SOURCE_FIELDS.filter((f) => f.t === t).every((f) => f.st !== "candidate"), t);
  assert.ok(SOURCE_FIELDS.filter((f) => f.st === "candidate").every((f) => f.k === "CPTID"));
  for (const c of ["jag", "csnf", "pvas", "wcbhc", "baq"]) assert.ok(SOURCE_FIELDS.some((f) => f.c === c), c);
});

test("three-way: baseline==current applies latest; blank ignored", () => {
  const r = reconcile(base());
  assert.equal(r.rows[0].outcome, "update");
  assert.deepEqual(r.rows[0].fields.map((f) => f.outcome), ["apply", "blank"]);
  assert.equal(r.counts.applyValues, 1);
});
test("three-way: destination changed since baseline -> conflict, not applied", () => {
  const r = reconcile(base({ current: new Map([[101, { [C1]: "portal-edit", [C2]: "b" }]]) }));
  assert.equal(r.rows[0].fields[0].outcome, "conflict"); assert.equal(r.rows[0].outcome, "held"); assert.equal(planWrites(r).length, 0);
});
test("manual and unknown overlays protected; record-level portal record held", () => {
  for (const p of ["manual", "unknown"] as const) assert.equal(reconcile(base({ overlays: [{ key: 101, col: C1, provenance: p }] })).rows[0].fields[0].outcome, "protected");
  assert.equal(reconcile(base({ overlays: [{ key: 101, col: null, provenance: "manual" }] })).rows[0].outcome, "held");
});
test("missing baseline is never assumed source-owned", () => {
  const r = reconcile(base({ baseline: null }));
  assert.equal(r.rows[0].fields[0].outcome, "held"); assert.equal(planWrites(r).length, 0);
  const add = reconcile(base({ baseline: null, current: new Map() }));
  assert.equal(add.rows[0].outcome, "held");
});
test("additions collide with portal record -> held, not renumbered", () => {
  const r = reconcile(base({ current: new Map(), baseline: new Map(), overlays: [{ key: 101, col: null, provenance: "manual" }] }));
  assert.equal(r.rows[0].outcome, "held"); assert.match(r.rows[0].reason!, /not renumbered/);
});
test("BAQ master additions held; held/unsupported columns reported not dropped", () => {
  const m = SOURCE_FIELDS.find((f) => f.c === "baq" && f.t === "master" && f.st === "held")!;
  const ok = SOURCE_FIELDS.find((f) => f.c === "baq" && f.t === "master" && f.st === "candidate" && f.col !== "CPTID")!;
  const r = reconcile({ client: "baq", table: "master", mode: "update", mapping: { ID: "CPTID", H: m.col, X: "Made_Up", O: ok.col }, rows: [{ ID: "5", H: "v", X: "x", O: "o" }], baseline: new Map(), current: new Map(), overlays: [] });
  assert.equal(r.rows[0].outcome, "held");
  assert.equal(r.columns.find((c) => c.header === "X")!.state, "unsupported");
  assert.equal(r.columns.find((c) => c.header === "H")!.state, "held");
  assert.ok(r.rows[0].fields.some((f) => f.col === m.col && f.outcome === "held"));
});
test("keys/types/duplicates strict", () => {
  assert.equal(parseKey("0"), null); assert.equal(parseKey("1e3"), null); assert.equal(parseKey("12.0"), 12); assert.equal(parseKey("-4"), null);
  const r = reconcile(base({ rows: [{ Constituent: "101", A: "x" }, { Constituent: "101", A: "y" }, { Constituent: "abc", A: "z" }] }));
  assert.deepEqual(r.rows.map((x) => x.outcome), ["update", "invalid", "invalid"]);
  assert.throws(() => reconcile(base({ mapping: { a: "CPTID", b: C1, c: C1 } })), /mapped twice/);
  assert.throws(() => reconcile(base({ mapping: { A: C1 } })), /key/);
  assert.equal(normalize("float", "1,234.50").v, "1234.5"); assert.equal(normalize("bit", "maybe").err, "not a yes/no value");
  assert.equal(normalize("date", "2/30/2026").err, "invalid date"); assert.equal(normalize("datetime2", "3/4/2026 9:05").v, "2026-03-04T09:05:00");
  assert.ok(normalize("nvarchar", "a\u0000b").err);
});
test("JAG gift history and unknown tables refuse", () => {
  assert.throws(() => reconcile({ client: "jag", table: "raw_master_giving_history", mode: "update", mapping: { c: "CPTID" }, rows: [], baseline: new Map(), current: new Map(), overlays: [] }), /no verified stable key/);
  assert.throws(() => reconcile({ client: "pvas", table: "made_up", mode: "update", mapping: {}, rows: [], baseline: new Map(), current: new Map(), overlays: [] }), /no approved destination/);
});
test("cross-client isolation: other client's table not a destination", () => {
  assert.throws(() => reconcile(base({ client: "baq", table: "givebutter_transactions" })), /no approved destination/);
  assert.ok(registryDests("baq", "donorsearch_results").every((d) => d.client === "baq"));
});

const prepared: PreparedClient = { client: "fictional_x", schema: "fictional_x", registryVersion: 2, approvedBy: "Reviewer", approvedAt: "2026-11-03", tables: [{ table: "master", key: "CPTID", columns: [{ col: "CPTID", ty: "int" }, { col: "Account_Name", ty: "nvarchar" }] }] };
test("prepared client first load: approval required, inserts only, identifiers validated", () => {
  const inp: ReconInput = { client: "fictional_x", table: "master", mode: "first-load", mapping: { id: "CPTID", n: "Account_Name" }, rows: [{ id: "7", n: "Fictional Org" }], baseline: null, current: new Map(), overlays: [], prepared };
  assert.throws(() => reconcile(inp), /not approved/);
  const r = reconcile(inp, [prepared]);
  assert.equal(r.rows[0].outcome, "insert");
  assert.throws(() => validatePrepared({ ...prepared, schema: "engage" }), /reserved/);
  assert.throws(() => validatePrepared({ ...prepared, tables: [{ table: "x;drop", key: "CPTID", columns: [] }] }), /bad/);
  assert.throws(() => validatePrepared({ ...prepared, client: "baq" }), /already has a registry/);
});

function mockTx(srcRows: Record<string, unknown>[], ov: Record<string, unknown>[] = [], pr: Record<string, unknown>[] = []): SqlTx & { log: string[] } {
  const log: string[] = [];
  return { log, async query(sql) {
    log.push(sql.split(" ")[0] + (sql.includes("portal_updates") ? ":ov" : sql.includes("portal_prospects") ? ":pr" : ""));
    if (sql.startsWith("SELECT") && sql.includes("portal_updates")) return ov;
    if (sql.startsWith("SELECT") && sql.includes("portal_prospects")) return pr;
    if (sql.startsWith("SELECT")) return srcRows;
    return [];
  } };
}
const dests = registryDests("pvas", "donorsearch_results");
const ops = () => planWrites(reconcile(base()));

test("default OFF: env alone cannot enable without approved transport", async () => {
  assert.equal(sourceApplyEnabled({ SOURCE_IMPORT_APPLY: "enabled" }), false);
  await assert.rejects(executeGuarded(mockTx([]), "pvas", "donorsearch_results", "CPTID", dests, ops(), "pvas"), /disabled/);
});
test("[MOCK SQL, not Azure acceptance] lock reads precede writes; commit on match", async () => {
  const tx = mockTx([{ k: 101, [C1]: "old-a" }]);
  const r = await executeGuarded(tx, "pvas", "donorsearch_results", "CPTID", dests, ops(), "pvas", { enabled: true });
  assert.equal(r.written, 1);
  assert.deepEqual(tx.log, ["SET", "SELECT", "SELECT:ov", "SELECT:pr", "UPDATE", "COMMIT"]);
  const st = buildGuardedStatements("pvas", "donorsearch_results", "CPTID", dests, ops(), "pvas");
  assert.ok(st.pre.slice(1).every((p) => p.sql.includes("WITH (UPDLOCK, HOLDLOCK)")));
  assert.ok(!st.writes[0].sql.includes("new-a"), "values parameterized");
});
test("[MOCK SQL] stale value / new portal edit / new prospect -> rollback, no writes", async () => {
  for (const tx of [mockTx([{ k: 101, [C1]: "changed" }]), mockTx([{ k: 101, [C1]: "old-a" }], [{ id: 9, k: 101 }]), mockTx([{ k: 101, [C1]: "old-a" }], [], [{ k: 101 }]), mockTx([])]) {
    await assert.rejects(executeGuarded(tx, "pvas", "donorsearch_results", "CPTID", dests, ops(), "pvas", { enabled: true }), /stale/);
    assert.ok(!tx.log.includes("UPDATE") && tx.log.at(-1) === "IF");
  }
});
test("adapter rejects non-candidate column and unsafe identifiers", () => {
  const held = SOURCE_FIELDS.find((f) => f.c === "pvas" && f.t === "donorsearch_results" && f.st !== "candidate")?.col ?? "Nope";
  assert.throws(() => buildGuardedStatements("pvas", "donorsearch_results", "CPTID", dests, [{ kind: "update", key: 1, values: { [held]: "x" }, expected: {} }], "pvas"), SourceError);
  assert.throws(() => buildGuardedStatements("pvas]; DROP", "t", "CPTID", dests, ops(), "pvas"), /unsafe/);
});
