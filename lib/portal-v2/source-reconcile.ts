// Source CSV reconciliation (pure) + prepared-client contract + guarded raw-write adapter.
// REVIEW-ONLY. Raw source writes are OFF: there is no approved restricted write login / transport,
// no real-SQL lock/rollback acceptance, and registry evidence is historical (see REGISTRY_META).
// Nothing here builds SQL from user text: identifiers come only from the server registry or an
// approved prepared-client registration, are re-checked against a strict pattern, then bracket-quoted.
import { REGISTRY_META, SOURCE_FIELDS, type SourceField } from "./source-registry";

export class SourceError extends Error {}
const IDENT = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
export const SOURCE_MAX_ROWS = 5000;
export const SOURCE_MAX_VALUE = 4000;

// ---------- registry lookups ----------
export type Dest = { client: string; table: string; col: string; ty: string; key: string; st: SourceField["st"]; why: string; kind: string };
export function registryDests(client: string, table: string): Dest[] {
  return SOURCE_FIELDS.filter((f) => f.c === client && f.t === table).map((f) => ({ client, table, col: f.col, ty: f.ty, key: f.k, st: f.st, why: f.why, kind: f.kind }));
}

// ---------- prepared new-client registration contract ----------
// A prepared destination is created by separate reviewed setup (DDL is never run from here).
// Registration only lists tables/columns that ALREADY exist and were approved; it is server config,
// never browser input. APPROVED_PREPARED is empty until such a review lands.
export interface PreparedTable { table: string; key: string; columns: { col: string; ty: string }[] }
export interface PreparedClient { client: string; schema: string; registryVersion: number; approvedBy: string; approvedAt: string; tables: PreparedTable[] }
export const APPROVED_PREPARED: readonly PreparedClient[] = Object.freeze([]);
const TYPES = new Set(["nvarchar", "varchar", "int", "bigint", "float", "decimal", "bit", "date", "datetime2"]);

export function validatePrepared(p: PreparedClient): PreparedClient {
  const errs: string[] = [];
  if (!IDENT.test(p.client) || !IDENT.test(p.schema)) errs.push("client/schema must be simple identifiers");
  if (["engage", "dbo", "sys", "information_schema", "source_import"].includes(p.schema.toLowerCase())) errs.push("schema is reserved");
  if (SOURCE_FIELDS.some((f) => f.c === p.client)) errs.push("client already has a registry; use updates, not a new registration");
  if (p.registryVersion !== REGISTRY_META.version) errs.push("registry version mismatch");
  if (!p.approvedBy?.trim() || !p.approvedAt?.trim()) errs.push("approval record required");
  if (!p.tables.length) errs.push("no tables");
  const seenT = new Set<string>();
  for (const t of p.tables) {
    if (!IDENT.test(t.table) || seenT.has(t.table.toLowerCase())) errs.push(`bad/duplicate table ${t.table}`);
    seenT.add(t.table.toLowerCase());
    const seenC = new Set<string>();
    for (const c of t.columns) {
      if (!IDENT.test(c.col) || c.col.toLowerCase() === "row_id" || seenC.has(c.col.toLowerCase())) errs.push(`bad/duplicate column ${t.table}.${c.col}`);
      if (!TYPES.has(c.ty)) errs.push(`unsupported type ${c.ty}`);
      seenC.add(c.col.toLowerCase());
    }
    const k = t.columns.find((c) => c.col === t.key);
    if (!k || !["int", "bigint", "float"].includes(k.ty)) errs.push(`${t.table}: key must be a listed integer column`);
  }
  if (errs.length) throw new SourceError(errs.join("; "));
  return p;
}
export function preparedDests(p: PreparedClient, table: string): Dest[] {
  const t = p.tables.find((x) => x.table === table);
  return (t?.columns ?? []).map((c) => ({ client: p.client, table, col: c.col, ty: c.ty, key: t!.key, st: "candidate" as const, why: "prepared destination (first load)", kind: "record" }));
}

// ---------- normalization (comparison form) ----------
export function normalize(ty: string, raw: string | null | undefined): { v: string | null; err?: string } {
  const s = raw == null ? "" : String(raw).trim();
  if (s === "") return { v: null };
  if (CTRL.test(s)) return { v: null, err: "control characters" };
  if (s.length > SOURCE_MAX_VALUE) return { v: null, err: "too long" };
  switch (ty) {
    case "int": case "bigint": case "float": case "decimal": {
      const t = s.replace(/^\$/, "").replace(/,(?=\d{3}(\D|$))/g, "");
      if (!/^-?\d+(\.\d+)?$/.test(t)) return { v: null, err: "not a number" };
      const n = Number(t);
      if (!Number.isFinite(n) || Math.abs(n) > Number.MAX_SAFE_INTEGER) return { v: null, err: "number out of range" };
      if ((ty === "int" || ty === "bigint") && !Number.isInteger(n)) return { v: null, err: "not an integer" };
      return { v: String(Math.round(n * 10000) / 10000) };
    }
    case "bit": {
      const l = s.toLowerCase();
      if (["1", "true", "yes", "y", "-1"].includes(l)) return { v: "1" };
      if (["0", "false", "no", "n"].includes(l)) return { v: "0" };
      return { v: null, err: "not a yes/no value" };
    }
    case "date": case "datetime2": {
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/) || s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (!m) return { v: null, err: "unrecognized date (use YYYY-MM-DD or M/D/YYYY)" };
      const iso = m[0].includes("/") ? [m[3], m[1].padStart(2, "0"), m[2].padStart(2, "0")] : [m[1], m[2], m[3]];
      const [y, mo, d] = iso.map(Number);
      const dt = new Date(Date.UTC(y, mo - 1, d));
      if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return { v: null, err: "invalid date" };
      const time = m[4] ? `T${m[4].padStart(2, "0")}:${m[5]}:${m[6] ?? "00"}` : "";
      return { v: iso.join("-") + (ty === "datetime2" ? time : "") };
    }
    default: return { v: s.normalize("NFC") };
  }
}
export const parseKey = (raw: string | null | undefined): number | null => {
  const s = String(raw ?? "").trim();
  if (!/^[1-9]\d{0,14}(\.0+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

// ---------- three-way reconciliation ----------
export type Provenance = "manual" | "source" | "unknown";
export interface OverlayMark { key: number; col: string | null; provenance: Provenance } // col null => whole record (e.g. portal-added prospect)
export interface ReconInput {
  client: string; table: string;
  mode: "update" | "first-load";
  mapping: Record<string, string>; // CSV header -> destination column (keyed column included)
  rows: Record<string, string>[]; // parsed CSV rows by header
  baseline: Map<number, Record<string, string | null>> | null; // last source export we loaded, or null when unknown
  current: Map<number, Record<string, string | null>>; // current destination values (locked/re-read by adapter at apply)
  overlays: OverlayMark[];
  prepared?: PreparedClient;
}
export type FieldOutcome = "apply" | "unchanged" | "converged" | "conflict" | "protected" | "held" | "invalid" | "blank";
export interface ReconField { col: string; outcome: FieldOutcome; latest: string | null; baseline: string | null; current: string | null; reason?: string }
export type RowOutcome = "update" | "insert" | "unchanged" | "held" | "invalid";
export interface ReconRow { line: number; key: number | null; outcome: RowOutcome; reason?: string; fields: ReconField[] }
export interface ReconResult {
  client: string; table: string; mode: ReconInput["mode"]; registry: typeof REGISTRY_META;
  columns: { header: string; col: string | null; state: string; reason: string }[];
  rows: ReconRow[]; notInSource: number[];
  counts: Record<RowOutcome, number> & { applyValues: number; conflicts: number; protectedValues: number; heldValues: number };
}

export function reconcile(inp: ReconInput, approved: readonly PreparedClient[] = APPROVED_PREPARED): ReconResult {
  const { client, table, mode } = inp;
  if (mode === "first-load" && !inp.prepared) throw new SourceError("first load requires an approved prepared destination");
  if (inp.prepared && !approved.includes(inp.prepared)) throw new SourceError("prepared destination is not approved");
  const dests = inp.prepared ? preparedDests(validatePrepared(inp.prepared), table) : registryDests(client, table);
  if (!dests.length) throw new SourceError("no approved destination for this client/table");
  const keyCol = dests.find((d) => d.key)?.key;
  if (!keyCol) throw new SourceError("destination has no verified stable key; held");
  if (inp.rows.length > SOURCE_MAX_ROWS) throw new SourceError(`at most ${SOURCE_MAX_ROWS} rows`);

  // Mapping: every header reported; duplicates / unknown / non-candidate destinations explicit.
  const columns: ReconResult["columns"] = [];
  const used = new Set<string>();
  let keyHeader: string | null = null;
  const writable: Dest[] = [];
  for (const [header, colRaw] of Object.entries(inp.mapping)) {
    const col = String(colRaw || "");
    if (!col) { columns.push({ header, col: null, state: "ignored", reason: "not mapped" }); continue; }
    if (used.has(col)) throw new SourceError(`${col} is mapped twice`);
    used.add(col);
    const d = dests.find((x) => x.col === col);
    if (!d) { columns.push({ header, col, state: "unsupported", reason: "not a server-approved destination" }); continue; }
    if (col === keyCol) { keyHeader = header; columns.push({ header, col, state: "key", reason: "stable key" }); continue; }
    columns.push({ header, col, state: d.st, reason: d.why });
    if (d.st === "candidate") writable.push(d);
  }
  if (!keyHeader) throw new SourceError(`map a column to the key ${keyCol}`);
  const heldCols = columns.filter((c) => c.state === "held" || c.state === "nonwritable" || c.state === "unsupported");
  const baselineKnown = inp.baseline !== null;
  const additionsHeld = dests.some((d) => /additions held/.test(d.why));

  const rows: ReconRow[] = []; const seen = new Set<number>();
  const counts = { update: 0, insert: 0, unchanged: 0, held: 0, invalid: 0, applyValues: 0, conflicts: 0, protectedValues: 0, heldValues: 0 };
  inp.rows.forEach((r, i) => {
    const line = i + 2;
    const key = parseKey(r[keyHeader!]);
    const fields: ReconField[] = [];
    const push = (row: ReconRow) => { rows.push(row); counts[row.outcome] += 1; };
    if (key === null) return push({ line, key, outcome: "invalid", reason: "key must be a positive whole number", fields });
    if (seen.has(key)) return push({ line, key, outcome: "invalid", reason: "duplicate key in file", fields });
    seen.add(key);
    const recMark = inp.overlays.find((o) => o.key === key && o.col === null);
    const cur = inp.current.get(key);
    const base = inp.baseline?.get(key);
    // reported held columns still show values so nothing is silently dropped
    for (const h of heldCols) if (h.col) { const v = r[h.header] ?? ""; if (v.trim()) { fields.push({ col: h.col, outcome: "held", latest: v.trim(), baseline: null, current: null, reason: h.reason }); counts.heldValues++; } }
    let bad = false;
    const norm = writable.map((d) => { const n = normalize(d.ty, r[columns.find((c) => c.col === d.col)!.header]); if (n.err) bad = true; return { d, ...n }; });
    if (bad) { for (const n of norm) if (n.err) fields.push({ col: n.d.col, outcome: "invalid", latest: null, baseline: null, current: null, reason: n.err }); return push({ line, key, outcome: "invalid", reason: "invalid values", fields }); }

    if (!cur) {
      if (recMark) return push({ line, key, outcome: "held", reason: "ID collides with a portal-created record; not renumbered", fields });
      if (mode === "update" && additionsHeld) return push({ line, key, outcome: "held", reason: "new IDs for this table are held pending identity review", fields });
      if (mode === "update" && !baselineKnown) return push({ line, key, outcome: "held", reason: "no baseline: cannot tell a new source record from an unknown one", fields });
      if (base) return push({ line, key, outcome: "held", reason: "record was in baseline but is gone from destination", fields });
      for (const n of norm) fields.push({ col: n.d.col, outcome: n.v === null ? "blank" : "apply", latest: n.v, baseline: null, current: null });
      counts.applyValues += norm.filter((n) => n.v !== null).length;
      return push({ line, key, outcome: "insert", fields });
    }
    if (recMark) return push({ line, key, outcome: "held", reason: `record provenance is ${recMark.provenance}; protected`, fields });
    let changes = 0;
    for (const n of norm) {
      const curV = cur[n.d.col] == null ? null : normalize(n.d.ty, cur[n.d.col]).v;
      const baseV = base ? (base[n.d.col] == null ? null : normalize(n.d.ty, base[n.d.col]).v) : undefined;
      const mark = inp.overlays.find((o) => o.key === key && o.col === n.d.col);
      const f: ReconField = { col: n.d.col, outcome: "unchanged", latest: n.v, baseline: baseV ?? null, current: curV };
      if (n.v === null) f.outcome = "blank";
      else if (mark && mark.provenance !== "source") { f.outcome = "protected"; f.reason = `${mark.provenance} edit in portal`; counts.protectedValues++; }
      else if (n.v === curV) f.outcome = baseV !== undefined && baseV !== n.v ? "converged" : "unchanged";
      else if (baseV === undefined) { f.outcome = "held"; f.reason = "no baseline for this record: ownership unknown"; counts.heldValues++; }
      else if (curV === baseV) { f.outcome = "apply"; changes++; counts.applyValues++; }
      else { f.outcome = "conflict"; f.reason = "destination changed since baseline"; counts.conflicts++; }
      fields.push(f);
    }
    push({ line, key, outcome: changes ? "update" : fields.some((f) => ["held", "conflict", "protected"].includes(f.outcome)) ? "held" : "unchanged", fields });
  });
  const notInSource = mode === "update" ? [...inp.current.keys()].filter((k) => !seen.has(k)) : [];
  return { client, table, mode, registry: REGISTRY_META, columns, rows, notInSource, counts };
}

// ---------- guarded adapter (disabled) ----------
// seenOverlayIds: active portal_updates ids for this key seen at preview. Any other id under lock => stale (fail closed;
// overlay field names like contact:<key> are not raw column names, so we never guess which overlay covers which column).
export interface WriteOp { kind: "update" | "insert"; key: number; values: Record<string, string | null>; expected: Record<string, string | null> | null; seenOverlayIds?: number[] }
export function planWrites(r: ReconResult, seenOverlayIds: Map<number, number[]> = new Map()): WriteOp[] {
  return r.rows.filter((x) => x.outcome === "update" || x.outcome === "insert").map((x) => {
    const fs = x.fields.filter((f) => f.outcome === "apply");
    return { kind: x.outcome as "update" | "insert", key: x.key!, values: Object.fromEntries(fs.map((f) => [f.col, f.latest])), expected: x.outcome === "update" ? Object.fromEntries(fs.map((f) => [f.col, f.current])) : null, seenOverlayIds: seenOverlayIds.get(x.key!) ?? [] };
  });
}
export interface SqlTx { query(sql: string, params: Record<string, unknown>): Promise<Record<string, unknown>[]> }
export const SOURCE_TRANSPORT_APPROVED = false as const;
export function sourceApplyEnabled(env: Record<string, string | undefined> = process.env, transportApproved: boolean = SOURCE_TRANSPORT_APPROVED) {
  return transportApproved && env.SOURCE_IMPORT_APPLY === "enabled";
}
const q = (id: string) => { if (!IDENT.test(id)) throw new SourceError(`unsafe identifier ${id}`); return `[${id}]`; };

/** Builds the guarded statement list. All preconditions (locked re-reads) precede any write. */
export function buildGuardedStatements(schema: string, table: string, keyCol: string, dests: Dest[], ops: WriteOp[], overlayClient: string) {
  const allowed = new Map(dests.filter((d) => d.st === "candidate").map((d) => [d.col, d]));
  for (const op of ops) for (const c of Object.keys(op.values)) if (!allowed.has(c)) throw new SourceError(`${c} is not a writable destination`);
  if (!ops.length) throw new SourceError("nothing to apply");
  const T = `${q(schema)}.${q(table)}`, K = q(keyCol);
  const cols = [...new Set(ops.flatMap((o) => Object.keys(o.values)))];
  const keys = ops.map((o) => o.key);
  const kp = Object.fromEntries(keys.map((k, i) => [`k${i}`, k]));
  const inList = keys.map((_, i) => `@k${i}`).join(",");
  const pre = [
    { sql: "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE; BEGIN TRANSACTION;", params: {} },
    { sql: `SELECT ${K} AS k, ${cols.map(q).join(", ")} FROM ${T} WITH (UPDLOCK, HOLDLOCK) WHERE ${K} IN (${inList})`, params: kp, check: "source" as const },
    { sql: `SELECT id, cptid AS k FROM engage.portal_updates WITH (UPDLOCK, HOLDLOCK) WHERE client = @client AND voided = 0 AND cptid IN (${inList})`, params: { client: overlayClient, ...kp }, check: "overlay" as const },
    { sql: `SELECT cptid AS k FROM engage.portal_prospects WITH (UPDLOCK, HOLDLOCK) WHERE client = @client AND cptid IN (${inList})`, params: { client: overlayClient, ...kp }, check: "prospect" as const },
  ];
  const writes = ops.map((o, i) => {
    const c = Object.keys(o.values);
    const p = Object.fromEntries([["key", o.key], ...c.map((x, j) => [`v${j}`, o.values[x]])]);
    return o.kind === "update"
      ? { sql: `UPDATE ${T} SET ${c.map((x, j) => `${q(x)} = @v${j}`).join(", ")} WHERE ${K} = @key`, params: p, op: i }
      : { sql: `INSERT INTO ${T} (${K}, ${c.map(q).join(", ")}) VALUES (@key, ${c.map((_, j) => `@v${j}`).join(", ")})`, params: p, op: i };
  });
  return { pre, writes, cols };
}

/** Executes with an injected transaction. Fails the ENTIRE batch if any locked precondition differs. */
export async function executeGuarded(tx: SqlTx, schema: string, table: string, keyCol: string, dests: Dest[], ops: WriteOp[], overlayClient: string, opts: { enabled?: boolean } = {}) {
  if (!(opts.enabled ?? sourceApplyEnabled())) throw new SourceError("source writes are disabled");
  const { pre, writes } = buildGuardedStatements(schema, table, keyCol, dests, ops, overlayClient);
  const typeOf = new Map(dests.map((d) => [d.col, d.ty]));
  try {
    await tx.query(pre[0].sql, pre[0].params);
    const src = await tx.query(pre[1].sql, pre[1].params);
    const ov = await tx.query(pre[2].sql, pre[2].params);
    const pr = await tx.query(pre[3].sql, pre[3].params);
    const byKey = new Map(src.map((r) => [Number(r.k), r]));
    for (const op of ops) {
      const row = byKey.get(op.key);
      if (op.kind === "insert") { if (row) throw new SourceError(`stale: ${op.key} now exists`); }
      else {
        if (!row) throw new SourceError(`stale: ${op.key} no longer exists`);
        for (const [c, exp] of Object.entries(op.expected ?? {})) {
          const now = row[c] == null ? null : normalize(typeOf.get(c) ?? "nvarchar", String(row[c])).v;
          if (now !== exp) throw new SourceError(`stale: ${op.key}.${c} changed since preview`);
        }
      }
      if (ov.some((r) => Number(r.k) === op.key && !(op.seenOverlayIds ?? []).includes(Number(r.id)))) throw new SourceError(`stale: portal edit on ${op.key}`);
      if (pr.some((r) => Number(r.k) === op.key)) throw new SourceError(`stale: portal record ${op.key}`);
    }
    for (const w of writes) await tx.query(w.sql, w.params);
    await tx.query("COMMIT TRANSACTION;", {});
    return { ok: true as const, written: writes.length };
  } catch (e) {
    await tx.query("IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;", {}).catch(() => undefined);
    throw e;
  }
}
