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
const clone = (t: Tables): Tables => JSON.parse(JSON.stringify(t));

export function createMock(defs: readonly StatementDef[], tableNames: readonly string[]) {
  const bySql = new Map<string, StatementDef>(); const ids = new Set<string>();
  for (const d of defs) {
    if (bySql.has(d.sql) || ids.has(d.id)) throw new MockSqlError("duplicate_def", `mock: duplicate statement ${d.id}`);
    for (const t of d.tables) if (!tableNames.includes(t)) throw new MockSqlError("undeclared_table", `mock: ${d.id} uses undeclared table`);
    bySql.set(d.sql, d); ids.add(d.id);
  }
  let tables: Tables = Object.fromEntries(tableNames.map((n) => [n, []]));
  const trace: TraceEntry[] = []; const stats = { tx: 0, commits: 0, rollbacks: 0, unsupported: 0 };
  let failpoint: Failpoint = "none"; let chain: Promise<unknown> = Promise.resolve();
  const exec = (sql: string, p: unknown, inTx: boolean) => {
    const d = bySql.get(sql);
    if (!d) { stats.unsupported++; trace.push({ id: `UNSUPPORTED:${createHash("sha256").update(sql).digest("hex").slice(0, 12)}`, params: p && typeof p === "object" ? Object.keys(p).sort() : [], tx: inTx }); throw new MockSqlError("unsupported_sql", "mock: unsupported SQL statement"); }
    if (!p || typeof p !== "object" || Array.isArray(p)) throw new MockSqlError("bad_params", `mock: ${d.id} params must be an object`);
    const keys = Object.keys(p).sort(), want = [...d.params].sort();
    trace.push({ id: d.id, params: keys, tx: inTx });
    if (JSON.stringify(keys) !== JSON.stringify(want)) throw new MockSqlError("bad_params", `mock: ${d.id} expects params [${want}] got [${keys}]`);
    for (const k of keys) if (!isScalar((p as Record<string, unknown>)[k])) throw new MockSqlError("bad_params", `mock: ${d.id} param ${k} not a scalar`);
    if (d.write && !inTx) throw new MockSqlError("write_outside_tx", `mock: ${d.id} writes outside a transaction`);
    const scoped: Tables = new Proxy(tables, { get: (o, k) => { if (typeof k === "string" && !d.tables.includes(k)) throw new MockSqlError("undeclared_table", `mock: ${d.id} touched ${k}`); return (o as Tables)[k as string]; } });
    const out = d.exec(scoped, p as Record<string, Scalar>);
    if (!out || !Array.isArray(out.rows) || !Number.isInteger(out.affected)) throw new MockSqlError("bad_exec", `mock: ${d.id} returned a bad shape`);
    return { rows: JSON.parse(JSON.stringify(out.rows)) as Row[], affected: out.affected };
  };
  const reader = async (sql: string, p: Record<string, unknown>) => exec(sql, p, false);
  /** Serialized transactions; full snapshot of EVERY table restored on any throw. */
  const txf = <T>(fn: (run: typeof reader) => Promise<T>): Promise<T> => {
    const go = chain.then(async () => {
      stats.tx++; const snap = clone(tables); let open = true;
      const run = async (sql: string, p: Record<string, unknown>) => { if (!open) throw new MockSqlError("tx_closed", "mock: transaction already closed"); return exec(sql, p, true); };
      try {
        const out = await fn(run);
        if (failpoint === "beforeCommit") { failpoint = "none"; throw new MockSqlError("failpoint", "mock: failpoint beforeCommit"); }
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
    seed(t: Tables) { for (const [k, rows] of Object.entries(t)) { if (!tableNames.includes(k) || !Array.isArray(rows)) throw new MockSqlError("bad_seed", "mock: seed of undeclared table"); tables[k] = clone({ x: rows }).x; } },
    counts: () => Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
    dump: () => clone(tables),
    setFailpoint(f: Failpoint) { if (!["none", "beforeCommit", "afterCommit"].includes(f)) throw new MockSqlError("bad_failpoint", "mock: unknown failpoint"); failpoint = f; },
    reset() { tables = Object.fromEntries(tableNames.map((n) => [n, []])); trace.length = 0; failpoint = "none"; Object.assign(stats, { tx: 0, commits: 0, rollbacks: 0, unsupported: 0 }); },
  };
}
