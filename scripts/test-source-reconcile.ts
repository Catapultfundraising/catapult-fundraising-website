// Synthetic tests (fictional data). Tests labelled [MOCK SQL] are NOT real Azure acceptance.
import test from "node:test";
import assert from "node:assert/strict";
import { SOURCE_FIELDS, REGISTRY_META } from "../lib/portal-v2/source-registry";
import {
  reconcile, planWrites, buildGuardedStatements, executeGuarded, resolveDestination, validatePrepared, normalize, parseKey,
  sourceApplyEnabled, validateHeadersAndMapping, rowsFromGrid, SourceError, type PreparedClient, type SqlTx, type ReconInput, type ResolvedDest,
} from "../lib/portal-v2/source-reconcile";

const cand = SOURCE_FIELDS.filter((f) => f.c === "pvas" && f.t === "donorsearch_results" && f.st === "candidate" && ["Quality_Score", "RFM_Total"].includes(f.col));
assert.equal(cand.length, 2);
const C1 = cand[0].col, C2 = cand[1].col;
const base = (over: Partial<ReconInput> = {}): ReconInput => ({
  client: "pvas", table: "donorsearch_results", mode: "update",
  mapping: { Constituent: "CPTID", A: C1, B: C2 },
  rows: [{ Constituent: "101", A: "new-a", B: "" }],
  baseline: new Map([[101, { [C1]: "old-a", [C2]: "b" }]]),
  current: new Map([[101, { [C1]: "old-a", [C2]: "b" }]]),
  overlays: [], ...over,
});
const txt = { ty: "nvarchar", len: -1, p: null, s: null };

test("registry is fail-closed and bound to provenance", () => {
  assert.equal(REGISTRY_META.version, 3);
  assert.match(REGISTRY_META.builder_commit, /^[0-9a-f]{40}$/);
  assert.ok(!SOURCE_FIELDS.some((f) => f.col === "row_id"));
  assert.ok(SOURCE_FIELDS.filter((f) => f.t === "Duplciate_Records").every((f) => f.st === "nonwritable"));
  for (const t of ["raw_master_giving_history", "notes", "Daily_Results", "gc2p_prospects"]) assert.ok(SOURCE_FIELDS.filter((f) => f.t === t && !(f.c === "pvas" && t === "notes")).every((f) => f.st !== "candidate"), t);
  assert.deepEqual(SOURCE_FIELDS.filter((f) => f.c === "pvas" && f.t === "notes" && f.st === "candidate").map((f) => f.col).sort(), ["ID", "Note", "Note_Order_Newest_to_Oldest"]);
  assert.ok(SOURCE_FIELDS.filter((f) => f.c === "pvas" && f.t === "notes").every((f) => f.k === "ID" && f.pl === "CPTID"));
  const LINKED = new Set(["pvas.notes", "wcbhc.giving_history", "wcbhc.non_campaign_giving_history", "csnf.Raw_Data_Gift_File", "pvas.givebutter_transactions", "pvas.givebutter_pledges"]);
  assert.ok(SOURCE_FIELDS.filter((f) => f.st === "candidate" && !LINKED.has(`${f.c}.${f.t}`)).every((f) => f.k.toLowerCase() === "cptid"));
  // linked gift groups: record key + immutable CPTID person link (never writable); other gift tables stay held
  assert.ok(SOURCE_FIELDS.filter((f) => f.c === "wcbhc" && f.t === "giving_history").every((f) => f.k === "Transaction_ID" && f.pl === "CPTID"));
  assert.ok(SOURCE_FIELDS.filter((f) => f.c === "wcbhc" && f.t === "non_campaign_giving_history").every((f) => f.k === "ID" && f.pl === "CPTID"));
  
  assert.ok(SOURCE_FIELDS.filter((f) => f.c === "csnf" && f.t === "Raw_Data_Gift_File").every((f) => f.k === "ID" && f.pl === "Account_ID" && f.kk === "int" && f.xw === "Client_ID|Account_ID|CPTID|text"));
  assert.ok(SOURCE_FIELDS.filter((f) => f.c === "pvas" && f.t === "givebutter_transactions").every((f) => f.kk === "bigint" && f.pl === "Contact_ID"));
  assert.ok(SOURCE_FIELDS.filter((f) => f.c === "pvas" && f.t === "givebutter_pledges").every((f) => f.kk === "text" && f.k === "Id"));
  assert.ok(SOURCE_FIELDS.filter((f) => f.pl && f.col === f.pl).every((f) => f.st === "held"), "link columns never writable");
  for (const [c, t] of [["pvas", "givebutter_id_numbers"], ["csnf", "Client_ID"], ["wcbhc", "committee_giving"], ["jag", "raw_master_giving_history"]]) assert.ok(SOURCE_FIELDS.filter((f) => f.c === c && f.t === t).every((f) => f.st !== "candidate"), `${c}.${t}`);
  for (const t of ["gc2p_prospects", "portfolio", "raw_master_giving_history", "Daily_Results"]) assert.ok(SOURCE_FIELDS.filter((f) => f.t === t).every((f) => f.st !== "candidate"), t);
  for (const t of ["pir_links", "_load_log"]) assert.ok(SOURCE_FIELDS.filter((f) => f.t === t).every((f) => f.st === "nonwritable"), t);
  for (const c of ["jag", "csnf", "pvas", "wcbhc", "baq"]) assert.ok(SOURCE_FIELDS.some((f) => f.c === c && f.st === "candidate"), "candidates for " + c);
  for (const c of ["jag", "csnf", "pvas", "wcbhc", "baq"]) assert.ok(SOURCE_FIELDS.some((f) => f.c === c), c);
});

test("three-way: baseline==current applies latest; blank ignored", () => {
  const r = reconcile(base());
  assert.equal(r.rows[0].outcome, "update");
  assert.deepEqual(r.rows[0].fields.map((f) => f.outcome), ["apply", "blank"]);
});
test("three-way: destination changed since baseline -> conflict, not applied", () => {
  const r = reconcile(base({ current: new Map([[101, { [C1]: "portal-edit", [C2]: "b" }]]) }));
  assert.equal(r.rows[0].fields[0].outcome, "conflict"); assert.equal(planWrites(r).length, 0);
});
test("any portal overlay protects (even provenance 'source': no verified overlay mapping)", () => {
  for (const p of ["manual", "unknown", "source"] as const) assert.equal(reconcile(base({ overlays: [{ key: 101, col: "contact:email", provenance: p }] })).rows[0].fields[0].outcome, "protected");
  assert.equal(reconcile(base({ overlays: [{ key: 101, col: null, provenance: "manual" }] })).rows[0].outcome, "held");
});
test("missing baseline record/property or unreadable values are held, never applied (regression: absent property -> apply)", () => {
  for (const over of [
    { baseline: null }, { baseline: new Map([[101, { [C2]: "b" }]]) },
    { current: new Map([[101, { [C2]: "b" }]]) },
    { baseline: new Map([[101, { [C1]: "bad\u0007", [C2]: "b" }]]) },
  ] as Partial<ReconInput>[]) {
    const r = reconcile(base(over));
    assert.equal(r.rows[0].fields[0].outcome, "held"); assert.equal(planWrites(r).length, 0);
  }
  assert.equal(reconcile(base({ baseline: null, current: new Map() })).rows[0].outcome, "held");
});
test("additions colliding with portal record -> held, not renumbered", () => {
  const r = reconcile(base({ current: new Map(), baseline: new Map(), overlays: [{ key: 101, col: null, provenance: "manual" }] }));
  assert.equal(r.rows[0].outcome, "held"); assert.match(r.rows[0].reason!, /not renumbered/);
});
test("BAQ master additions held; held/unsupported columns reported not dropped", () => {
  const m = SOURCE_FIELDS.find((f) => f.c === "baq" && f.t === "master" && f.st !== "candidate")!;
  const ok = SOURCE_FIELDS.find((f) => f.c === "baq" && f.t === "master" && f.st === "candidate" && f.col !== "CPTID")!;
  const r = reconcile({ client: "baq", table: "master", mode: "update", mapping: { ID: "CPTID", H: m.col, X: "Made_Up", O: ok.col }, rows: [{ ID: "5", H: "v", X: "x", O: "o" }], baseline: new Map(), current: new Map(), overlays: [] });
  assert.equal(r.rows[0].outcome, "held");
  assert.equal(r.columns.find((c) => c.header === "X")!.state, "unsupported");
  assert.ok(r.rows[0].fields.some((f) => f.col === m.col && f.outcome === "held"));
  assert.equal(r.columns.find((c) => c.header === "H")!.state, m.st);
});
test("duplicate keys: every occurrence invalid, zero writes (regression: duplicate file -> 1 write)", () => {
  const r = reconcile(base({ rows: [{ Constituent: "101", A: "x" }, { Constituent: "101", A: "y" }, { Constituent: "abc", A: "z" }] }));
  assert.deepEqual(r.rows.map((x) => x.outcome), ["invalid", "invalid", "invalid"]);
  assert.equal(planWrites(r).length, 0);
});
test("mapping strict", () => {
  assert.throws(() => reconcile(base({ mapping: { a: "CPTID", b: C1, c: C1 } })), /mapped twice/);
  assert.throws(() => reconcile(base({ mapping: { A: C1 } })), /key/);
  assert.throws(() => reconcile(base({ mapping: { a: "CPTID", b: ["x"] as unknown as string } })), /must be text/);
  assert.throws(() => validateHeadersAndMapping(["Email", " email "], {}), /duplicate/);
  assert.throws(() => validateHeadersAndMapping(["A"], { B: "x" }), /unknown header/);
  assert.throws(() => validateHeadersAndMapping(["A"], { A: 3 }), /text/);
  assert.throws(() => validateHeadersAndMapping(["A"], ["x"]), /object/);
  assert.equal(Object.getPrototypeOf(rowsFromGrid([["__proto__"], ["v"]]).rows[0]), null);
});
test("types exact (regressions: 99:99:99, decimal rounding, int overflow)", () => {
  assert.equal(parseKey("0"), null); assert.equal(parseKey("1e3"), null); assert.equal(parseKey("12.0"), 12); assert.equal(parseKey("2147483648"), null);
  assert.equal(normalize({ ty: "int", len: null, p: 10, s: 0 }, "2147483648").err, "outside int range");
  assert.equal(normalize({ ty: "int", len: null, p: 10, s: 0 }, "-2147483648").v, "-2147483648");
  assert.equal(normalize({ ty: "bigint", len: null, p: 19, s: 0 }, "9007199254740993").v, "9007199254740993");
  assert.equal(normalize({ ty: "decimal", len: null, p: 19, s: 4 }, "9007199254740.1234").v, "9007199254740.1234");
  assert.match(normalize({ ty: "decimal", len: null, p: 19, s: 4 }, "1.23456").err!, /decimal places/);
  assert.match(normalize({ ty: "decimal", len: null, p: 5, s: 2 }, "1234.5").err!, /precision/);
  assert.equal(normalize({ ty: "decimal", len: null, p: null, s: null }, "1").err, "destination precision unknown");
  assert.equal(normalize({ ty: "float", len: null, p: 53, s: null }, "1,234.50").v, "1234.5");
  assert.equal(normalize({ ty: "float", len: null, p: 53, s: null }, "0.1").v, "0.1");
  assert.equal(normalize({ ty: "datetime2", len: null, p: null, s: null }, "2026-01-01 99:99:99").err, "invalid time");
  assert.equal(normalize({ ty: "date", len: null, p: null, s: null }, "2026-01-01 10:00").err, "time not allowed for a date-only field");
  assert.equal(normalize({ ty: "date", len: null, p: null, s: null }, "2/30/2026").err, "invalid date");
  assert.equal(normalize({ ty: "datetime2", len: null, p: null, s: null }, "3/4/2026 9:05").v, "2026-03-04T09:05:00");
  assert.match(normalize({ ty: "nvarchar", len: 3, p: null, s: null }, "abcd").err!, /longer/);
  assert.equal(normalize({ ty: "nvarchar", len: null, p: null, s: null }, "a").err, "destination length unknown");
  assert.ok(normalize(txt, "a\u0000b").err); assert.ok(normalize(txt, "a\u0007b").err);
  assert.equal(normalize({ ty: "money", len: null, p: null, s: null }, "1").err, "type money has no verified conversion");
  assert.equal(normalize({ ty: "bit", len: null, p: null, s: null }, "maybe").err, "not a yes/no value");
});
test("unknown tables and keyless tables refuse; cross-client isolation", () => {
  assert.throws(() => resolveDestination("jag", "raw_master_giving_history"), /no verified stable key/);
  assert.throws(() => resolveDestination("pvas", "made_up"), /no approved destination/);
  assert.throws(() => reconcile(base({ client: "baq", table: "givebutter_transactions" })), /no approved destination/);
  const d = resolveDestination("pvas", "donorsearch_results");
  assert.equal(d.schema, "pvas"); assert.equal(d.client, "pvas");
});

const prepared: PreparedClient = { approvalId: "review-2026-11-03-fictional", approvalVersion: 1, client: "fictional_x", schema: "fictional_x", registryVersion: 3, approvedBy: "Reviewer", approvedAt: "2026-11-03", tables: [{ table: "master", key: "CPTID", columns: [{ col: "CPTID", ty: "int" }, { col: "Account_Name", ty: "nvarchar", len: 200 }] }] };
const first = (over: Partial<ReconInput> = {}): ReconInput => ({ client: "fictional_x", table: "master", mode: "first-load", mapping: { id: "CPTID", n: "Account_Name" }, rows: [{ id: "7", n: "Fictional Org" }], baseline: null, current: new Map(), overlays: [], prepared, ...over });
test("prepared first load: approval, empty destination, identity match (regression: first-load -> update)", () => {
  assert.throws(() => reconcile(first()), /not approved/);
  assert.equal(reconcile(first(), [prepared]).rows[0].outcome, "insert");
  assert.throws(() => reconcile(first({ current: new Map([[7, { Account_Name: "x" }]]) }), [prepared]), /empty prepared destination/);
  assert.throws(() => reconcile(first({ client: "other_x" }), [prepared]), /different client/);
  assert.throws(() => reconcile({ ...base(), mode: "first-load" }), /prepared destination/);
  for (const bad of [{ schema: "engage" }, { schema: "baq" }, { client: "pvas" }, { tables: [{ table: "x;drop", key: "CPTID", columns: [] }] }, { approvedBy: "" }, { registryVersion: 1 }, { approvalId: "" }, { approvalVersion: 0 }])
    assert.throws(() => validatePrepared({ ...prepared, ...bad } as PreparedClient), SourceError);
});

function mockTx(srcRows: Record<string, unknown>[], ov: Record<string, unknown>[] = [], pr: Record<string, unknown>[] = [], affected = 1): SqlTx & { log: string[] } {
  const log: string[] = [];
  return { log, async query(sql) {
    log.push(sql.split(" ")[0] + (sql.includes("portal_updates") ? ":ov" : sql.includes("portal_prospects") ? ":pr" : ""));
    const rs = (recordset: Record<string, unknown>[]) => ({ recordset, rowsAffected: [recordset.length] });
    if (sql.startsWith("SELECT") && sql.includes("portal_updates")) return rs(ov);
    if (sql.startsWith("SELECT") && sql.includes("portal_prospects")) return rs(pr);
    if (sql.startsWith("SELECT")) return rs(srcRows);
    if (sql.startsWith("UPDATE") || sql.startsWith("INSERT")) return { recordset: [], rowsAffected: [affected] };
    return rs([]);
  } };
}
const dest = () => resolveDestination("pvas", "donorsearch_results");
const ops = () => planWrites(reconcile(base()));

test("default OFF: env alone cannot enable without approved transport", async () => {
  assert.equal(sourceApplyEnabled({ SOURCE_IMPORT_APPLY: "enabled" }), false);
  await assert.rejects(executeGuarded(mockTx([]), dest(), ops()), /disabled/);
});
test("adapter accepts only minted destinations (regression: [baq].[master] with PVAS columns)", () => {
  const forged = { ...dest(), schema: "baq", table: "master" } as ResolvedDest;
  assert.throws(() => buildGuardedStatements(forged, ops()), /resolveDestination/);
  assert.throws(() => buildGuardedStatements(resolveDestination("baq", "master"), ops()), /not a writable destination/);
});
test("[MOCK SQL, not Azure acceptance] lock reads precede writes; commit on match", async () => {
  const tx = mockTx([{ k: 101, [C1]: "old-a" }]);
  assert.equal((await executeGuarded(tx, dest(), ops(), { enabled: true })).written, 1);
  assert.deepEqual(tx.log, ["SET", "SELECT", "SELECT:ov", "SELECT:pr", "UPDATE", "COMMIT"]);
  const st = buildGuardedStatements(dest(), ops());
  assert.ok(st.pre.slice(1).every((p) => p.sql.includes("WITH (UPDLOCK, HOLDLOCK)")));
  assert.ok(!st.writes[0].sql.includes("new-a"), "values parameterized");
});
test("[MOCK SQL] stale / overlay / prospect / duplicate destination rows / affected!=1 -> rollback", async () => {
  const good = { k: 101, [C1]: "old-a" };
  for (const [tx, re] of [
    [mockTx([{ k: 101, [C1]: "changed" }]), /stale/], [mockTx([good], [{ id: 9, k: 101 }]), /portal edit/], [mockTx([good], [], [{ k: 101 }]), /portal record/],
    [mockTx([]), /no longer exists/], [mockTx([good, good]), /2 rows/], [mockTx([good], [], [], 0), /affected 0/], [mockTx([{ k: 101 }]), /unreadable/],
  ] as const) {
    await assert.rejects(executeGuarded(tx, dest(), ops(), { enabled: true }), re);
    assert.equal(tx.log.at(-1), "IF"); assert.ok(!tx.log.includes("COMMIT"));
  }
});
test("adapter op shape enforced", () => {
  const d = dest(); const o = ops()[0];
  const bad = [
    [], [o, o], [{ ...o, values: {} }], [{ ...o, expected: {} }], [{ ...o, expected: { ...o.expected, [C2]: "b" } }],
    [{ ...o, values: { CPTID: "5" }, expected: { CPTID: "4" } }], [{ ...o, key: 0 }], [{ ...o, kind: "insert" as const }], [{ ...o, values: { [C1]: " padded " } }],
  ];
  for (const b of bad) assert.throws(() => buildGuardedStatements(d, b), SourceError);
});

test("every CSV header reported even when omitted from mapping", () => {
  const r = reconcile(base({ headers: ["Constituent", "A", "B", "Extra"] }));
  assert.equal(r.columns.find((c) => c.header === "Extra")!.state, "ignored");
});
test("[fictional configured] prepared client: first load then later update keeps a manual edit protected", () => {
  const p2: PreparedClient = { ...prepared, tables: [{ table: "master", key: "CPTID", columns: [{ col: "CPTID", ty: "int" }, { col: "Account_Name", ty: "nvarchar", len: 200, required: true }, { col: "City", ty: "nvarchar", len: 100 }] }] };
  const fl = reconcile({ client: "fictional_x", table: "master", mode: "first-load", mapping: { id: "CPTID", n: "Account_Name", c: "City" }, rows: [{ id: "7", n: "Org A", c: "" }, { id: "8", n: "Org B", c: "Springfield" }, { id: "9", n: "", c: "X" }], baseline: null, current: new Map(), overlays: [], prepared: p2 }, [p2]);
  assert.deepEqual(fl.rows.map((r) => r.outcome), ["insert", "insert", "invalid"]);
  // after load: baseline == current; staff edited 8 in the portal
  const cur = new Map([[7, { Account_Name: "Org A", City: null }], [8, { Account_Name: "Org B", City: "Springfield" }]]);
  const up = reconcile({ client: "fictional_x", table: "master", mode: "update", mapping: { id: "CPTID", c: "City" }, rows: [{ id: "7", c: "Shelbyville" }, { id: "8", c: "Ogdenville" }], baseline: cur, current: cur, overlays: [{ key: 8, col: "contact:city", provenance: "manual" }], prepared: p2 }, [p2]);
  assert.deepEqual(up.rows.map((r) => r.outcome), ["update", "held"]);
  assert.deepEqual(planWrites(up), [{ kind: "update", key: 7, values: { City: "Shelbyville" }, expected: { City: null } }]);
  assert.throws(() => reconcile({ client: "fictional_x", table: "master", mode: "first-load", mapping: { id: "CPTID", c: "City" }, rows: [], baseline: null, current: new Map(), overlays: [], prepared: p2 }, [p2]), /required/);
});
