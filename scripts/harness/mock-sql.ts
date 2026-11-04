// TEST-ONLY strict in-memory SQL mock for the paired harness (H2). NOT real SQL: no locking/isolation/collation/driver
// semantics. Exact-match statement registry; anything else THROWS. Never imported by production code.
import { createHash } from "node:crypto";

export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;
export type Scalar = string | number | boolean | null;
export interface StatementDef {
  id: string; sql: string; params: readonly string[]; write: boolean; tables: readonly string[];
  exec: (t: Tables, p: Record<string, Scalar>) => { rows: Row[]; affected: number };
}
export type Failpoint = "none" | "beforeCommit" | "afterCommit";
export class MockSqlError extends Error { constructor(public code: string, message: string) { super(message); } }
export class LostResponseAfterCommit extends Error { constructor() { super("mock: response lost after COMMIT"); } }
export interface TraceEntry { id: string; params: string[]; tx: boolean }
const isScalar = (v: unknown): v is Scalar => v === null || typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v));
const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const clone = <T>(t: T): T => JSON.parse(JSON.stringify(t));
const deepFreeze = <T>(o: T): T => { if (o && typeof o === "object") { for (const v of Object.values(o as object)) deepFreeze(v); Object.freeze(o); } return o; };
const NAME = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)?$/i, PARAM = /^[a-z][a-z0-9_]*$/i, ID = /^[a-z][a-z0-9_.-]*$/i;
const fail = (c: string, m: string): never => { throw new MockSqlError(c, m); };
const validRows = (rows: unknown) => Array.isArray(rows) && rows.every((r) => isPlain(r) && Object.values(r).every(isScalar));

function validateDefs(defs: readonly StatementDef[], tableNames: readonly string[]) {
  if (!Array.isArray(tableNames) || !tableNames.length || new Set(tableNames).size !== tableNames.length || !tableNames.every((n) => typeof n === "string" && NAME.test(n))) fail("bad_tables", "mock: table names must be unique identifiers");
  if (!Array.isArray(defs)) fail("bad_def", "mock: defs must be an array");
  const bySql = new Map<string, StatementDef>(), ids = new Set<string>();
  for (const d of defs) {
    if (!isPlain(d) && !(d && typeof d === "object")) fail("bad_def", "mock: def must be an object");
    if (typeof d.id !== "string" || !ID.test(d.id)) fail("bad_def", "mock: def id must be a non-empty identifier");
    if (typeof d.sql !== "string" || !d.sql.trim()) fail("bad_def", `mock: ${d.id} sql must be non-empty`);
    if (!Array.isArray(d.params) || !d.params.every((p) => typeof p === "string" && PARAM.test(p)) || new Set(d.params).size !== d.params.length) fail("bad_def", `mock: ${d.id} params must be unique identifiers`);
    if (typeof d.write !== "boolean" || typeof d.exec !== "function") fail("bad_def", `mock: ${d.id} write/exec invalid`);
    if (!Array.isArray(d.tables) || !d.tables.length || new Set(d.tables).size !== d.tables.length) fail("bad_def", `mock: ${d.id} tables must be a non-empty unique list`);
    for (const t of d.tables) if (!tableNames.includes(t)) fail("undeclared_table", `mock: ${d.id} uses undeclared table`);
    if (bySql.has(d.sql) || ids.has(d.id)) fail("duplicate_def", `mock: duplicate statement ${d.id}`);
    bySql.set(d.sql, Object.freeze({ ...d, params: Object.freeze([...d.params]), tables: Object.freeze([...d.tables]) })); ids.add(d.id);
  }
  return bySql;
}

/** View handed to exec: only the statement's declared tables; container is non-extensible (set/define/delete throw).
 *  Read-only statements get deep-frozen copies (any mutation throws); write statements get working copies that are
 *  copied back ONLY if exec returns normally and the result validates. */
function view(d: StatementDef, tables: Tables) {
  const work: Tables = Object.fromEntries(d.tables.map((n) => [n, clone(tables[n])]));
  if (!d.write) deepFreeze(work);
  const deny = (what: string) => () => fail("table_access", `mock: ${d.id} may not ${what} on the table container`);
  const proxy = new Proxy(work, {
    get: (o, k) => { if (typeof k === "string" && !d.tables.includes(k)) fail("undeclared_table", `mock: ${d.id} touched an undeclared table`); return Reflect.get(o, k); },
    set: deny("assign"), defineProperty: deny("define"), deleteProperty: deny("delete"), setPrototypeOf: deny("set prototype"),
    has: (o, k) => typeof k === "string" && d.tables.includes(k), ownKeys: () => [...d.tables], getOwnPropertyDescriptor: (o, k) => Reflect.getOwnPropertyDescriptor(o, k),
  });
  return { proxy, work };
}

export function createMock(defs: readonly StatementDef[], tableNames: readonly string[]) {
  const bySql = validateDefs(defs, tableNames);
  let tables: Tables = Object.fromEntries(tableNames.map((n) => [n, []]));
  const trace: TraceEntry[] = []; const stats = { tx: 0, commits: 0, rollbacks: 0, unsupported: 0 };
  let failpoint: Failpoint = "none"; let chain: Promise<unknown> = Promise.resolve();
  const exec = (sql: string, p: unknown, inTx: boolean) => {
    const d = bySql.get(sql);
    if (!d) { stats.unsupported++; trace.push({ id: `UNSUPPORTED:${createHash("sha256").update(String(sql)).digest("hex").slice(0, 12)}`, params: isPlain(p) ? Object.keys(p).sort() : [], tx: inTx }); return fail("unsupported_sql", "mock: unsupported SQL statement"); }
    if (!isPlain(p)) fail("bad_params", `mock: ${d.id} params must be a plain object`);
    const keys = Object.keys(p as object).sort(), want = [...d.params].sort();
    trace.push({ id: d.id, params: keys, tx: inTx });
    if (JSON.stringify(keys) !== JSON.stringify(want)) fail("bad_params", `mock: ${d.id} expects params [${want}] got [${keys}]`);
    for (const k of keys) if (!isScalar((p as Record<string, unknown>)[k])) fail("bad_params", `mock: ${d.id} param ${k} not a scalar`);
    if (d.write && !inTx) fail("write_outside_tx", `mock: ${d.id} writes outside a transaction`);
    const { proxy, work } = view(d, tables);
    let out: { rows: Row[]; affected: number };
    try { out = d.exec(proxy, Object.freeze({ ...(p as Record<string, Scalar>) })); }
    catch (e) { if (e instanceof MockSqlError) throw e; return fail(d.write ? "exec_error" : "readonly_mutation", `mock: ${d.id} exec failed${d.write ? "" : " (read-only statement attempted a mutation or errored)"}`); }
    if (!out || !validRows(out.rows) || !Number.isInteger(out.affected) || out.affected < 0) fail("bad_exec", `mock: ${d.id} returned a bad shape`);
    if (d.write) { for (const n of d.tables) if (!validRows(work[n])) fail("bad_exec", `mock: ${d.id} left invalid rows`); for (const n of d.tables) tables[n] = work[n]; }
    return { rows: clone(out.rows), affected: out.affected };
  };
  const reader = async (sql: string, p: Record<string, unknown>) => exec(sql, p, false);
  /** Serialized transactions; full snapshot of EVERY table restored on any throw. */
  const txf = <T>(fn: (run: typeof reader) => Promise<T>): Promise<T> => {
    const go = chain.then(async () => {
      stats.tx++; const snap = clone(tables); let open = true;
      const run = async (sql: string, p: Record<string, unknown>) => { if (!open) fail("tx_closed", "mock: transaction already closed"); return exec(sql, p, true); };
      try {
        const out = await fn(run);
        if (failpoint === "beforeCommit") { failpoint = "none"; fail("failpoint", "mock: failpoint beforeCommit"); }
        open = false; stats.commits++;
        if (failpoint === "afterCommit") { failpoint = "none"; throw new LostResponseAfterCommit(); }
        return out;
      } catch (e) {
        if (e instanceof LostResponseAfterCommit) throw e;
        open = false; tables = snap; stats.rollbacks++; throw e;
      }
    });
    chain = go.catch(() => undefined); return go;
  };
  return {
    reader, txf, trace, stats,
    /** Validates the COMPLETE seed first (declared tables, arrays of plain scalar rows), then applies atomically. */
    seed(t: unknown) {
      if (!isPlain(t)) fail("bad_seed", "mock: seed must be a plain object");
      for (const [k, rows] of Object.entries(t as object)) if (!tableNames.includes(k) || !validRows(rows)) fail("bad_seed", "mock: seed of undeclared table or invalid rows");
      const next = { ...tables }; for (const [k, rows] of Object.entries(t as Tables)) next[k] = clone(rows); tables = next;
    },
    counts: () => Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
    dump: () => clone(tables),
    setFailpoint(f: Failpoint) { if (!["none", "beforeCommit", "afterCommit"].includes(f)) fail("bad_failpoint", "mock: unknown failpoint"); failpoint = f; },
    reset() { tables = Object.fromEntries(tableNames.map((n) => [n, []])); trace.length = 0; failpoint = "none"; Object.assign(stats, { tx: 0, commits: 0, rollbacks: 0, unsupported: 0 }); },
  };
}
