// Source CSV reconciliation (pure, PREVIEW) + prepared-client contract + guarded raw-write adapter (NOT READY).
// Raw source writes are OFF and the apply side is NOT a complete importer: there is no request-id idempotency,
// audit ledger, baseline persistence, approved restricted write login/transport or real-SQL lock/rollback
// acceptance. The registry is provisional (lexical builder references, historical metadata; see REGISTRY_META).
// No SQL is built from user text: destination identity (schema/table/key/client) comes only from one resolved
// server registration (registry or approved prepared client); columns only from that registration.
import { REGISTRY_META, SOURCE_FIELDS, type SourceField } from "./source-registry";

export class SourceError extends Error {}
const IDENT = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
export const SOURCE_MAX_ROWS = 5000;
export const SOURCE_MAX_VALUE = 4000;
export const SOURCE_MAX_OPS = 500;
const REGISTRY_CLIENTS = [...new Set(SOURCE_FIELDS.map((f) => f.c))];

// ---------- destinations ----------
export type Dest = { col: string; ty: string; len: number | null; p: number | null; s: number | null; st: SourceField["st"]; why: string };
export interface PreparedTable { table: string; key: string; columns: { col: string; ty: string; len?: number | null; p?: number | null; s?: number | null }[] }
export interface PreparedClient { client: string; schema: string; registryVersion: number; approvedBy: string; approvedAt: string; tables: PreparedTable[] }
/** Approved prepared (already provisioned, reviewed) new-client destinations. Empty until a review lands. Never browser input. */
export const APPROVED_PREPARED: readonly PreparedClient[] = Object.freeze([]);
const TYPES = new Set(["nvarchar", "varchar", "int", "bigint", "float", "decimal", "numeric", "bit", "date", "datetime2"]);

/** Resolved destination: the ONLY input the adapter accepts. Instances are minted solely by resolveDestination. */
export interface ResolvedDest { readonly client: string; readonly schema: string; readonly table: string; readonly key: string; readonly dests: readonly Dest[]; readonly source: "registry" | "prepared" }
const MINTED = new WeakSet<ResolvedDest>();

export function validatePrepared(p: PreparedClient): PreparedClient {
  const errs: string[] = [];
  if (!IDENT.test(p.client) || !IDENT.test(p.schema)) errs.push("client/schema must be simple identifiers");
  const reserved = ["engage", "dbo", "sys", "information_schema", "source_import", "guest", ...REGISTRY_CLIENTS];
  if (reserved.includes(p.schema.toLowerCase()) || REGISTRY_CLIENTS.includes(p.client.toLowerCase())) errs.push("schema/client is reserved or already belongs to an existing client");
  if (p.registryVersion !== REGISTRY_META.version) errs.push("registry version mismatch");
  if (!p.approvedBy?.trim() || !p.approvedAt?.trim()) errs.push("approval record required");
  if (!p.tables?.length) errs.push("no tables");
  const seenT = new Set<string>();
  for (const t of p.tables ?? []) {
    if (!IDENT.test(t.table) || seenT.has(t.table.toLowerCase())) errs.push(`bad/duplicate table ${t.table}`);
    seenT.add(t.table.toLowerCase());
    const seenC = new Set<string>();
    for (const c of t.columns) {
      if (!IDENT.test(c.col) || c.col.toLowerCase() === "row_id" || seenC.has(c.col.toLowerCase())) errs.push(`bad/duplicate column ${t.table}.${c.col}`);
      if (!TYPES.has(c.ty)) errs.push(`unsupported type ${c.ty}`);
      seenC.add(c.col.toLowerCase());
    }
    const k = t.columns.find((c) => c.col === t.key);
    if (!k || !["int", "bigint"].includes(k.ty)) errs.push(`${t.table}: key must be a listed int/bigint column`);
  }
  if (errs.length) throw new SourceError(errs.join("; "));
  return p;
}

export function resolveDestination(client: string, table: string, prepared?: PreparedClient, approved: readonly PreparedClient[] = APPROVED_PREPARED): ResolvedDest {
  let r: ResolvedDest;
  if (prepared) {
    if (!approved.includes(prepared)) throw new SourceError("prepared destination is not approved");
    validatePrepared(prepared);
    if (prepared.client !== client) throw new SourceError("prepared registration belongs to a different client");
    const t = prepared.tables.find((x) => x.table === table);
    if (!t) throw new SourceError("no approved destination for this client/table");
    r = { client, schema: prepared.schema, table, key: t.key, source: "prepared",
      dests: Object.freeze(t.columns.map((c) => ({ col: c.col, ty: c.ty, len: c.len ?? null, p: c.p ?? null, s: c.s ?? null, st: "candidate" as const, why: "prepared destination (first load)" }))) };
  } else {
    const fs = SOURCE_FIELDS.filter((f) => f.c === client && f.t === table);
    if (!fs.length) throw new SourceError("no approved destination for this client/table");
    const key = fs.find((f) => f.k)?.k;
    if (!key) throw new SourceError("destination has no verified stable key; held");
    r = { client, schema: client, table, key, source: "registry", dests: Object.freeze(fs.map((f) => ({ col: f.col, ty: f.ty, len: f.len, p: f.p, s: f.s, st: TYPES.has(f.ty) ? f.st : "held", why: TYPES.has(f.ty) ? f.why : `type ${f.ty} has no verified conversion` }))) };
  }
  for (const id of [r.schema, r.table, r.key]) if (!IDENT.test(id)) throw new SourceError(`unsafe identifier ${id}`);
  Object.freeze(r); MINTED.add(r);
  return r;
}
/** Read-only listing for UI. */
export function registryDests(client: string, table: string) {
  return SOURCE_FIELDS.filter((f) => f.c === client && f.t === table).map((f) => ({ col: f.col, ty: f.ty, st: f.st, why: f.why, key: f.k }));
}

// ---------- normalization (comparison form, exact) ----------
const INT_BOUNDS: Record<string, [bigint, bigint]> = { int: [BigInt("-2147483648"), BigInt("2147483647")], bigint: [BigInt("-9223372036854775808"), BigInt("9223372036854775807")] };
function canonDecimal(t: string) {
  const neg = t.startsWith("-"); const [i, f = ""] = t.replace(/^-/, "").split(".");
  const ii = i.replace(/^0+(?=\d)/, ""); const ff = f.replace(/0+$/, "");
  const z = /^0$/.test(ii) && !ff;
  return { s: (neg && !z ? "-" : "") + ii + (ff ? "." + ff : ""), intDigits: ii === "0" ? 0 : ii.length, frac: ff.length };
}
export function normalize(d: Pick<Dest, "ty" | "len" | "p" | "s">, raw: string | null | undefined): { v: string | null; err?: string } {
  const s = raw == null ? "" : String(raw).trim();
  if (s === "") return { v: null };
  if (CTRL.test(s)) return { v: null, err: "control characters" };
  if (s.length > SOURCE_MAX_VALUE) return { v: null, err: "too long" };
  const num = s.replace(/^\$/, "").replace(/,(?=\d{3}(\D|$))/g, "");
  switch (d.ty) {
    case "int": case "bigint": {
      if (!/^-?\d+(\.0+)?$/.test(num)) return { v: null, err: "not a whole number" };
      const b = BigInt(num.split(".")[0]); const [lo, hi] = INT_BOUNDS[d.ty];
      if (b < lo || b > hi) return { v: null, err: `outside ${d.ty} range` };
      return { v: b.toString() };
    }
    case "decimal": case "numeric": {
      if (d.p == null || d.s == null) return { v: null, err: "destination precision unknown" };
      if (!/^-?\d+(\.\d+)?$/.test(num)) return { v: null, err: "not a number" };
      const c = canonDecimal(num);
      if (c.frac > d.s) return { v: null, err: `more than ${d.s} decimal places` };
      if (c.intDigits > d.p - d.s) return { v: null, err: `exceeds precision ${d.p}` };
      return { v: c.s };
    }
    case "float": {
      if (d.p != null && d.p !== 53) return { v: null, err: "only float(53) is supported" };
      if (!/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(num)) return { v: null, err: "not a number" };
      const n = Number(num);
      if (!Number.isFinite(n)) return { v: null, err: "number out of range" };
      return { v: String(n) }; // float(53) == IEEE double; shortest round-trip form, no rounding
    }
    case "bit": {
      const l = s.toLowerCase();
      if (["1", "true", "yes", "y"].includes(l)) return { v: "1" };
      if (["0", "false", "no", "n"].includes(l)) return { v: "0" };
      return { v: null, err: "not a yes/no value" };
    }
    case "date": case "datetime2": {
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/) || s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (!m) return { v: null, err: "unrecognized date (use YYYY-MM-DD or M/D/YYYY)" };
      const slash = m[0].includes("/");
      const [y, mo, dd] = (slash ? [m[3], m[1], m[2]] : [m[1], m[2], m[3]]).map(Number);
      const dt = new Date(Date.UTC(y, mo - 1, dd));
      if (y < 1753 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== dd) return { v: null, err: "invalid date" };
      const date = `${y}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      if (m[4] === undefined) return { v: d.ty === "datetime2" ? `${date}T00:00:00` : date };
      if (d.ty === "date") return { v: null, err: "time not allowed for a date-only field" };
      const [h, mi, se] = [Number(m[4]), Number(m[5]), Number(m[6] ?? 0)];
      if (h > 23 || mi > 59 || se > 59) return { v: null, err: "invalid time" };
      return { v: `${date}T${String(h).padStart(2, "0")}:${m[5]}:${String(se).padStart(2, "0")}` };
    }
    case "nvarchar": case "varchar": {
      const v = s.normalize("NFC");
      if (d.len == null) return { v: null, err: "destination length unknown" };
      if (d.len !== -1 && v.length > d.len) return { v: null, err: `longer than ${d.len} characters` };
      if (d.ty === "varchar" && /[^\x20-\x7E]/.test(v)) return { v: null, err: "non-ASCII text for varchar" };
      return { v };
    }
    default: return { v: null, err: `type ${d.ty} has no verified conversion` };
  }
}
export const parseKey = (raw: string | null | undefined): number | null => {
  const s = String(raw ?? "").trim();
  if (!/^[1-9]\d{0,9}(\.0+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 && n <= 2147483647 ? n : null;
};

// ---------- three-way reconciliation ----------
export type Provenance = "manual" | "source" | "unknown";
/** Any portal overlay on a record. No overlay is treated as source-owned: there is no verified overlay->raw column mapping. */
export interface OverlayMark { key: number; col: string | null; provenance: Provenance }
export interface ReconInput {
  client: string; table: string;
  mode: "update" | "first-load";
  mapping: Record<string, string>;
  rows: Record<string, string>[];
  baseline: Map<number, Record<string, string | null>> | null; // last loaded source export, or null when unknown
  current: Map<number, Record<string, string | null>>;
  overlays: OverlayMark[];
  prepared?: PreparedClient;
}
export type FieldOutcome = "apply" | "unchanged" | "converged" | "conflict" | "protected" | "held" | "invalid" | "blank";
export interface ReconField { col: string; outcome: FieldOutcome; latest: string | null; baseline: string | null; current: string | null; reason?: string }
export type RowOutcome = "update" | "insert" | "unchanged" | "held" | "invalid";
export interface ReconRow { line: number; key: number | null; outcome: RowOutcome; reason?: string; fields: ReconField[] }
export interface ReconResult {
  client: string; table: string; mode: ReconInput["mode"]; registry: typeof REGISTRY_META; dest: ResolvedDest;
  columns: { header: string; col: string | null; state: string; reason: string }[];
  rows: ReconRow[]; notInSource: number[];
  counts: Record<RowOutcome, number> & { applyValues: number; conflicts: number; protectedValues: number; heldValues: number };
}
const has = (o: object | undefined, k: string) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export function reconcile(inp: ReconInput, approved: readonly PreparedClient[] = APPROVED_PREPARED): ReconResult {
  const { client, table, mode } = inp;
  if (mode === "first-load" && !inp.prepared) throw new SourceError("first load requires an approved prepared destination");
  if (mode === "update" && inp.prepared) throw new SourceError("prepared destinations support first load only");
  const dest = resolveDestination(client, table, inp.prepared, approved);
  if (mode === "first-load" && (inp.current.size > 0 || inp.baseline !== null || inp.overlays.length)) throw new SourceError("first load requires an empty prepared destination; refusing to overwrite");
  if (inp.rows.length > SOURCE_MAX_ROWS) throw new SourceError(`at most ${SOURCE_MAX_ROWS} rows`);
  const keyCol = dest.key;

  const columns: ReconResult["columns"] = [];
  const used = new Set<string>(); let keyHeader: string | null = null;
  const writable: { d: Dest; header: string }[] = [];
  for (const [header, colRaw] of Object.entries(inp.mapping)) {
    if (typeof colRaw !== "string") throw new SourceError(`mapping for ${header} must be text`);
    const col = colRaw;
    if (!col) { columns.push({ header, col: null, state: "ignored", reason: "not mapped" }); continue; }
    if (used.has(col)) throw new SourceError(`${col} is mapped twice`);
    used.add(col);
    const d = dest.dests.find((x) => x.col === col);
    if (!d) { columns.push({ header, col, state: "unsupported", reason: "not a server-approved destination" }); continue; }
    if (col === keyCol) { keyHeader = header; columns.push({ header, col, state: "key", reason: "stable key" }); continue; }
    columns.push({ header, col, state: d.st, reason: d.why });
    if (d.st === "candidate") writable.push({ d, header });
  }
  if (!keyHeader) throw new SourceError(`map a column to the key ${keyCol}`);
  const heldCols = columns.filter((c) => ["held", "nonwritable", "unsupported"].includes(c.state));
  const baselineKnown = inp.baseline !== null;
  const additionsHeld = dest.dests.some((d) => /additions held/.test(d.why));
  const keyCount = new Map<number, number>();
  for (const r of inp.rows) { const k = parseKey(r[keyHeader]); if (k !== null) keyCount.set(k, (keyCount.get(k) ?? 0) + 1); }

  const rows: ReconRow[] = [];
  const counts = { update: 0, insert: 0, unchanged: 0, held: 0, invalid: 0, applyValues: 0, conflicts: 0, protectedValues: 0, heldValues: 0 };
  inp.rows.forEach((r, i) => {
    const line = i + 2; const key = parseKey(r[keyHeader!]); const fields: ReconField[] = [];
    const push = (row: ReconRow) => { rows.push(row); counts[row.outcome] += 1; };
    if (key === null) return push({ line, key, outcome: "invalid", reason: "key must be a positive whole number", fields });
    if ((keyCount.get(key) ?? 0) > 1) return push({ line, key, outcome: "invalid", reason: "key appears more than once in file; every occurrence held", fields });
    for (const h of heldCols) if (h.col) { const v = (r[h.header] ?? "").trim(); if (v) { fields.push({ col: h.col, outcome: "held", latest: v, baseline: null, current: null, reason: h.reason }); counts.heldValues++; } }
    const norm = writable.map(({ d, header }) => ({ d, ...normalize(d, r[header]) }));
    if (norm.some((n) => n.err)) { for (const n of norm) if (n.err) fields.push({ col: n.d.col, outcome: "invalid", latest: null, baseline: null, current: null, reason: n.err }); return push({ line, key, outcome: "invalid", reason: "invalid values", fields }); }
    const marks = inp.overlays.filter((o) => o.key === key);
    const cur = inp.current.get(key); const base = inp.baseline?.get(key);

    if (!cur) {
      if (marks.length) return push({ line, key, outcome: "held", reason: "ID collides with a portal record or edit; not renumbered", fields });
      if (mode === "update") {
        if (additionsHeld) return push({ line, key, outcome: "held", reason: "new IDs for this table are held pending identity review", fields });
        if (!baselineKnown) return push({ line, key, outcome: "held", reason: "no baseline: cannot tell a new source record from an unknown one", fields });
        if (base) return push({ line, key, outcome: "held", reason: "record was in baseline but is gone from destination", fields });
      }
      for (const n of norm) fields.push({ col: n.d.col, outcome: n.v === null ? "blank" : "apply", latest: n.v, baseline: null, current: null });
      const nv = norm.filter((n) => n.v !== null).length;
      if (!nv) return push({ line, key, outcome: "held", reason: "no values to insert", fields });
      counts.applyValues += nv;
      return push({ line, key, outcome: "insert", fields });
    }
    if (marks.some((m) => m.col === null)) return push({ line, key, outcome: "held", reason: "record created/owned in the portal; protected", fields });
    let changes = 0;
    for (const n of norm) {
      const f: ReconField = { col: n.d.col, outcome: "unchanged", latest: n.v, baseline: null, current: null };
      const hold = (why: string) => { f.outcome = "held"; f.reason = why; counts.heldValues++; };
      const curN = has(cur, n.d.col) ? (cur[n.d.col] == null ? { v: null } : normalize(n.d, cur[n.d.col])) : null;
      const baseN = base === undefined ? undefined : has(base, n.d.col) ? (base[n.d.col] == null ? { v: null } : normalize(n.d, base[n.d.col])) : null;
      f.current = curN?.v ?? null; f.baseline = baseN?.v ?? null;
      if (n.v === null) f.outcome = "blank";
      else if (marks.length) { f.outcome = "protected"; f.reason = `portal ${marks.map((m) => m.provenance).join("/")} edit on this record`; counts.protectedValues++; }
      else if (!curN || curN.err) hold("current destination value missing or unreadable");
      else if (baseN === undefined) hold("no baseline for this record: ownership unknown");
      else if (baseN === null || baseN.err) hold("baseline value missing or unreadable: ownership unknown");
      else if (n.v === curN.v) f.outcome = baseN.v !== n.v ? "converged" : "unchanged";
      else if (curN.v === baseN.v) { f.outcome = "apply"; changes++; counts.applyValues++; }
      else { f.outcome = "conflict"; f.reason = "destination changed since baseline"; counts.conflicts++; }
      fields.push(f);
    }
    push({ line, key, outcome: changes ? "update" : fields.some((f) => ["held", "conflict", "protected"].includes(f.outcome)) ? "held" : "unchanged", fields });
  });
  const inFile = new Set(keyCount.keys());
  const notInSource = mode === "update" ? [...inp.current.keys()].filter((k) => !inFile.has(k)) : [];
  return { client, table, mode, registry: REGISTRY_META, dest, columns, rows, notInSource, counts };
}

// ---------- guarded adapter (NOT READY; disabled) ----------
export interface WriteOp { kind: "update" | "insert"; key: number; values: Record<string, string | null>; expected: Record<string, string | null> | null }
export function planWrites(r: ReconResult): WriteOp[] {
  const ops = r.rows.filter((x) => x.outcome === "update" || x.outcome === "insert").map((x) => {
    const fs = x.fields.filter((f) => f.outcome === "apply");
    return { kind: x.outcome as "update" | "insert", key: x.key!, values: Object.fromEntries(fs.map((f) => [f.col, f.latest])), expected: x.outcome === "update" ? Object.fromEntries(fs.map((f) => [f.col, f.current])) : null };
  });
  if (new Set(ops.map((o) => o.key)).size !== ops.length) throw new SourceError("duplicate keys in plan");
  return ops;
}
export interface SqlResult { recordset: Record<string, unknown>[]; rowsAffected: number[] }
export interface SqlTx { query(sql: string, params: Record<string, unknown>): Promise<SqlResult> }
/** Hard stop: apply lacks idempotency (request id), audit ledger, baseline persistence, approved transport and real-SQL acceptance. */
export const SOURCE_TRANSPORT_APPROVED = false as const;
export function sourceApplyEnabled(env: Record<string, string | undefined> = process.env, transportApproved: boolean = SOURCE_TRANSPORT_APPROVED) {
  return transportApproved && env.SOURCE_IMPORT_APPLY === "enabled";
}
const q = (id: string) => { if (!IDENT.test(id)) throw new SourceError(`unsafe identifier ${id}`); return `[${id}]`; };

function checkOps(dest: ResolvedDest, ops: WriteOp[]) {
  if (!MINTED.has(dest)) throw new SourceError("destination must come from resolveDestination");
  if (!ops.length) throw new SourceError("nothing to apply");
  if (ops.length > SOURCE_MAX_OPS) throw new SourceError(`at most ${SOURCE_MAX_OPS} records per batch`);
  const allowed = new Map(dest.dests.filter((d) => d.st === "candidate" && d.col !== dest.key).map((d) => [d.col, d]));
  const keys = new Set<number>();
  for (const op of ops) {
    if (!Number.isSafeInteger(op.key) || op.key <= 0 || op.key > 2147483647 || keys.has(op.key)) throw new SourceError("keys must be unique positive integers");
    keys.add(op.key);
    const cols = Object.keys(op.values);
    if (!cols.length) throw new SourceError(`no values for ${op.key}`);
    for (const c of cols) {
      const d = allowed.get(c); if (!d) throw new SourceError(`${c} is not a writable destination`);
      const n = normalize(d, op.values[c]); if (n.err || n.v !== op.values[c]) throw new SourceError(`${op.key}.${c} is not a normalized value`);
    }
    if (op.kind === "update") {
      const ek = Object.keys(op.expected ?? {});
      if (ek.length !== cols.length || !cols.every((c) => has(op.expected!, c))) throw new SourceError(`${op.key}: expected values must cover exactly the changed fields`);
    } else if (op.kind === "insert") { if (op.expected !== null) throw new SourceError("insert must not carry expected values"); }
    else throw new SourceError("bad op kind");
  }
}

/** Builds statements. Preconditions (locked re-reads) precede any write. Identity comes only from the resolved destination. */
export function buildGuardedStatements(dest: ResolvedDest, ops: WriteOp[]) {
  checkOps(dest, ops);
  const T = `${q(dest.schema)}.${q(dest.table)}`, K = q(dest.key);
  const cols = [...new Set(ops.flatMap((o) => Object.keys(o.values)))];
  const kp = Object.fromEntries(ops.map((o, i) => [`k${i}`, o.key]));
  const inList = ops.map((_, i) => `@k${i}`).join(",");
  const pre = [
    { sql: "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE; BEGIN TRANSACTION;", params: {} },
    { sql: `SELECT ${K} AS k, ${cols.map(q).join(", ")} FROM ${T} WITH (UPDLOCK, HOLDLOCK) WHERE ${K} IN (${inList})`, params: kp },
    { sql: `SELECT id, cptid AS k FROM engage.portal_updates WITH (UPDLOCK, HOLDLOCK) WHERE client = @client AND voided = 0 AND cptid IN (${inList})`, params: { client: dest.client, ...kp } },
    { sql: `SELECT cptid AS k FROM engage.portal_prospects WITH (UPDLOCK, HOLDLOCK) WHERE client = @client AND cptid IN (${inList})`, params: { client: dest.client, ...kp } },
  ];
  const writes = ops.map((o) => {
    const c = Object.keys(o.values);
    const p = Object.fromEntries([["key", o.key], ...c.map((x, j) => [`v${j}`, o.values[x]])]);
    return o.kind === "update"
      ? { sql: `UPDATE ${T} SET ${c.map((x, j) => `${q(x)} = @v${j}`).join(", ")} WHERE ${K} = @key`, params: p, key: o.key }
      : { sql: `INSERT INTO ${T} (${K}, ${c.map(q).join(", ")}) VALUES (@key, ${c.map((_, j) => `@v${j}`).join(", ")})`, params: p, key: o.key };
  });
  return { pre, writes };
}

/** Executes with an injected transaction; any failed precondition or row count rolls back the ENTIRE batch. */
export async function executeGuarded(tx: SqlTx, dest: ResolvedDest, ops: WriteOp[], opts: { enabled?: boolean } = {}) {
  if (!(opts.enabled ?? sourceApplyEnabled())) throw new SourceError("source writes are disabled");
  const { pre, writes } = buildGuardedStatements(dest, ops);
  const typeOf = new Map(dest.dests.map((d) => [d.col, d]));
  try {
    await tx.query(pre[0].sql, pre[0].params);
    const src = (await tx.query(pre[1].sql, pre[1].params)).recordset;
    const ov = (await tx.query(pre[2].sql, pre[2].params)).recordset;
    const pr = (await tx.query(pre[3].sql, pre[3].params)).recordset;
    const byKey = new Map<number, Record<string, unknown>[]>();
    for (const r of src) { const k = Number(r.k); byKey.set(k, [...(byKey.get(k) ?? []), r]); }
    for (const op of ops) {
      const found = byKey.get(op.key) ?? [];
      if (found.length > 1) throw new SourceError(`stale: destination has ${found.length} rows for ${op.key}`);
      if (op.kind === "insert") { if (found.length) throw new SourceError(`stale: ${op.key} now exists`); }
      else {
        const row = found[0];
        if (!row) throw new SourceError(`stale: ${op.key} no longer exists`);
        for (const [c, exp] of Object.entries(op.expected!)) {
          if (!has(row, c)) throw new SourceError(`stale: ${op.key}.${c} unreadable`);
          const now = row[c] == null ? { v: null } : normalize(typeOf.get(c)!, String(row[c]));
          if (now.err || now.v !== exp) throw new SourceError(`stale: ${op.key}.${c} changed since preview`);
        }
      }
      if (ov.some((r) => Number(r.k) === op.key)) throw new SourceError(`stale: portal edit on ${op.key}`);
      if (pr.some((r) => Number(r.k) === op.key)) throw new SourceError(`stale: portal record ${op.key}`);
    }
    for (const w of writes) {
      const res = await tx.query(w.sql, w.params);
      if (res.rowsAffected?.[0] !== 1) throw new SourceError(`write for ${w.key} affected ${res.rowsAffected?.[0] ?? "unknown"} rows`);
    }
    await tx.query("COMMIT TRANSACTION;", {});
    return { ok: true as const, written: writes.length };
  } catch (e) {
    await tx.query("IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;", {}).catch(() => undefined);
    throw e;
  }
}

// ---------- request shape validation (API) ----------
/** Unique headers after trim + case-fold; mapping must be header->string for known headers only. */
export function validateHeadersAndMapping(headers: string[], mapping: unknown): Record<string, string> {
  const norm = headers.map((h) => h.trim().toLowerCase());
  if (norm.some((h) => !h)) throw new SourceError("every column needs a header");
  if (new Set(norm).size !== norm.length) throw new SourceError("duplicate column headers");
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) throw new SourceError("mapping must be an object");
  const out: Record<string, string> = {};
  for (const [h, v] of Object.entries(mapping as Record<string, unknown>)) {
    if (!headers.includes(h)) throw new SourceError(`unknown header ${h}`);
    if (typeof v !== "string" || v.length > 128) throw new SourceError(`mapping for ${h} must be text`);
    out[h] = v;
  }
  return out;
}
export function rowsFromGrid(grid: string[][]) {
  const headers = grid[0] ?? [];
  return { headers, rows: grid.slice(1).map((r) => { const o: Record<string, string> = Object.create(null); headers.forEach((h, i) => { o[h] = r[i] ?? ""; }); return o; }) };
}
