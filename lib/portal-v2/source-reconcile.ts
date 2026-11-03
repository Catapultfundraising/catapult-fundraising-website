// Source CSV reconciliation (pure, PREVIEW) + prepared-client contract + guarded raw-write adapter (NOT READY).
// Raw source writes are OFF and the apply side is NOT a complete importer: there is no request-id idempotency,
// audit ledger, baseline persistence, approved restricted write login/transport or real-SQL lock/rollback
// acceptance. The registry is provisional (lexical builder references, historical metadata; see REGISTRY_META).
// No SQL is built from user text: destination identity (schema/table/key/client) comes only from one resolved
// server registration (registry or approved prepared client); columns only from that registration.
import { createHash } from "node:crypto";
import { ADDITIONS_OK, REGISTRY_META, SOURCE_FIELDS, type SourceField } from "./source-registry";

export class SourceError extends Error {}
const IDENT = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
import { CTRL, normalize } from "./source-normalize";
export { normalize };
export const SOURCE_MAX_ROWS = 5000;
export { SOURCE_MAX_VALUE } from "./source-normalize";
export const SOURCE_MAX_OPS = 500;
const REGISTRY_CLIENTS = [...new Set(SOURCE_FIELDS.map((f) => f.c))];

// ---------- destinations ----------
export type Dest = { col: string; ty: string; len: number | null; p: number | null; s: number | null; st: SourceField["st"]; why: string };
export interface PreparedTable { table: string; key: string; columns: { col: string; ty: string; len?: number | null; p?: number | null; s?: number | null; required?: boolean }[] }
/** approvalId must equal the Engage copy of the same reviewed registration (PreparedDest.approvalId). */
/** Optional columns missing from a first-load row are written as explicit NULL (never DB defaults). */
export interface PreparedClient { approvalId: string; approvalVersion: number; client: string; schema: string; registryVersion: number; approvedBy: string; approvedAt: string; tables: PreparedTable[] }
/** Approved prepared (already provisioned, reviewed) new-client destinations. Empty until a review lands. Never browser input. */
export const APPROVED_PREPARED: readonly PreparedClient[] = Object.freeze([]);
let preparedOverride: readonly PreparedClient[] | null = null;
/** Server-side approved registrations (never request input). Tests may inject fictional ones only behind an explicit hook. */
export const approvedPrepared = (): readonly PreparedClient[] => preparedOverride ?? APPROVED_PREPARED;
export function __setPreparedForTests(p: readonly PreparedClient[] | null) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV || process.env.SOURCE_PREPARED_TEST_HOOK !== "1") throw new SourceError("test hook unavailable");
  preparedOverride = p;
}
/** Digest of the FULL reviewed per-table registration; must equal Engage's preparedDigest for the same registration. */
export function preparedDigest(p: PreparedClient, table: string) {
  const t = p.tables.find((x) => x.table === table); if (!t) throw new SourceError("no such prepared table");
  const cols = [...t.columns].sort((a, b) => (a.col < b.col ? -1 : 1)).map((c) => [c.col, c.ty, c.len ?? null, c.p ?? null, c.s ?? null, !!c.required]);
  return createHash("sha256").update(JSON.stringify(["prepared/v2", p.approvalId, p.approvalVersion, p.client, p.schema, t.table, t.key, cols])).digest("hex");
}
const TYPES = new Set(["nvarchar", "varchar", "int", "bigint", "float", "decimal", "numeric", "bit", "date", "datetime2"]);

/** Resolved destination: the ONLY input the adapter accepts. Instances are minted solely by resolveDestination. */
import { parseKey, parseKeyOf, canonLink, type Key, type KeyKind } from "./source-keys";
export { parseKey, parseKeyOf, canonLink, type Key, type KeyKind };
/** person link resolved through a crosswalk table (link value -> exactly one CPTID). fromKind: how link values are canonicalized. */
export interface Crosswalk { table: string; from: string; to: string; fromKind: "text" | "int" }
export interface ResolvedDest { readonly client: string; readonly schema: string; readonly table: string; readonly key: string; readonly personLink: string | null; readonly keyKind: KeyKind; readonly xw: Crosswalk | null; readonly dests: readonly Dest[]; readonly source: "registry" | "prepared" }
const MINTED = new WeakSet<ResolvedDest>();

export function validatePrepared(p: PreparedClient): PreparedClient {
  const errs: string[] = [];
  if (!IDENT.test(p.client) || !IDENT.test(p.schema)) errs.push("client/schema must be simple identifiers");
  const reserved = ["engage", "dbo", "sys", "information_schema", "source_import", "guest", ...REGISTRY_CLIENTS];
  if (reserved.includes(p.schema.toLowerCase()) || REGISTRY_CLIENTS.includes(p.client.toLowerCase())) errs.push("schema/client is reserved or already belongs to an existing client");
  if (p.registryVersion !== REGISTRY_META.version) errs.push("registry version mismatch");
  if (!/^[A-Za-z0-9._-]{8,80}$/.test(p.approvalId || "")) errs.push("approval id required");
  if (!Number.isSafeInteger(p.approvalVersion) || p.approvalVersion < 1) errs.push("approval version required");
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

export function resolveDestination(client: string, table: string, prepared?: PreparedClient, approved: readonly PreparedClient[] = approvedPrepared()): ResolvedDest {
  let r: ResolvedDest;
  if (prepared) {
    if (!approved.includes(prepared)) throw new SourceError("prepared destination is not approved");
    validatePrepared(prepared);
    if (prepared.client !== client) throw new SourceError("prepared registration belongs to a different client");
    const t = prepared.tables.find((x) => x.table === table);
    if (!t) throw new SourceError("no approved destination for this client/table");
    r = { client, schema: prepared.schema, table, key: t.key, personLink: null, keyKind: "int", xw: null, source: "prepared",
      dests: Object.freeze(t.columns.map((c) => ({ col: c.col, ty: c.ty, len: c.len ?? null, p: c.p ?? null, s: c.s ?? null, st: "candidate" as const, why: "prepared destination (first load)" }))) };
  } else {
    const fs = SOURCE_FIELDS.filter((f) => f.c === client && f.t === table);
    if (!fs.length) throw new SourceError("no approved destination for this client/table");
    const key = fs.find((f) => f.k)?.k;
    if (!key) throw new SourceError("destination has no verified stable key; held");
    const xp = (fs[0].xw || "").split("|");
    const xw: Crosswalk | null = fs[0].xw ? { table: xp[0], from: xp[1], to: xp[2], fromKind: xp[3] === "text" ? "text" : "int" } : null;
    if (xw && (!fs[0].pl || ![xw.table, xw.from, xw.to].every((x) => IDENT.test(x)))) throw new SourceError("crosswalk definition invalid");
    r = { client, schema: client, table, key, personLink: fs[0].pl || null, keyKind: (fs[0].kk ?? "int") as KeyKind, xw, source: "registry", dests: Object.freeze(fs.map((f) => ({ col: f.col, ty: f.ty, len: f.len, p: f.p, s: f.s, st: TYPES.has(f.ty) ? f.st : "held", why: TYPES.has(f.ty) ? f.why : `type ${f.ty} has no verified conversion` }))) };
  }
  for (const id of [r.schema, r.table, r.key]) if (!IDENT.test(id)) throw new SourceError(`unsafe identifier ${id}`);
  Object.freeze(r); MINTED.add(r);
  return r;
}
/** Read-only listing for UI: registry fields, or the approved prepared registration's columns. */
export function registryDests(client: string, table: string) {
  const p = approvedPrepared().find((x) => x.client === client);
  if (p) { const t = p.tables.find((x) => x.table === table); return (t?.columns ?? []).map((c) => ({ col: c.col, ty: c.ty, st: "candidate" as const, why: c.required ? "prepared destination (required)" : "prepared destination", key: c.col === t!.key ? t!.key : "" })); }
  return SOURCE_FIELDS.filter((f) => f.c === client && f.t === table).map((f) => ({ col: f.col, ty: f.ty, st: f.st, why: f.why, key: f.k, kk: f.kk, pl: f.pl }));
}
export function clientKeyKind(client: string, table: string): KeyKind { return (SOURCE_FIELDS.find((f) => f.c === client && f.t === table)?.kk ?? "int") as KeyKind; }
export function clientTables(client: string) {
  const p = approvedPrepared().find((x) => x.client === client);
  if (p) return p.tables.map((t) => ({ table: t.table, candidate: t.columns.length - 1, prepared: true }));
  const ts = [...new Set(SOURCE_FIELDS.filter((f) => f.c === client).map((f) => f.t))];
  return ts.map((t) => ({ table: t, candidate: SOURCE_FIELDS.filter((f) => f.c === client && f.t === t && f.st === "candidate").length, prepared: false }));
}

// ---------- normalization (comparison form, exact) ----------



// ---------- three-way reconciliation ----------
export type Provenance = "manual" | "source" | "unknown";
/** Any portal overlay on a record. No overlay is treated as source-owned: there is no verified overlay->raw column mapping. */
export interface OverlayMark { key: number; col: string | null; provenance: Provenance }
export interface ReconInput {
  client: string; table: string;
  mode: "update" | "first-load";
  mapping: Record<string, string>;
  headers?: string[]; // every CSV header; unmapped ones are reported as ignored
  heldKeys?: Map<Key, string>; // keys the destination could not report unambiguously (duplicates, unreadable rows)
  rows: Record<string, string>[];
  baseline: Map<Key, Record<string, string | null>> | null; // last loaded source export, or null when unknown
  current: Map<Key, Record<string, string | null>>;
  personOf?: Map<Key, number | null>; // person-linked tables: record key -> person CPTID (crosswalk: resolved to exactly one, else null)
  linkOf?: Map<Key, string | null>; // crosswalk tables: record key -> canonical current link value
  overlays: OverlayMark[];
  prepared?: PreparedClient;
  /** approved gift insert policy for this person-linked table (server registry only), else new IDs stay held */
  insertPolicy?: { digest: string; required: string[] } | null;
  /** Engage resolution of each row's SOURCE person link (new linked records): exact link, resolved person, in master */
  sourceLink?: Map<Key, { link: string; person: number | null; inMaster: boolean }>;
}
export type FieldOutcome = "apply" | "unchanged" | "converged" | "conflict" | "protected" | "held" | "invalid" | "blank";
export interface ReconField { col: string; outcome: FieldOutcome; latest: string | null; baseline: string | null; current: string | null; reason?: string }
export type RowOutcome = "update" | "insert" | "unchanged" | "held" | "invalid";
export interface ReconRow { line: number; key: Key | null; person?: number; link?: string; outcome: RowOutcome; reason?: string; fields: ReconField[] }
export interface ReconResult {
  client: string; table: string; mode: ReconInput["mode"]; registry: typeof REGISTRY_META; dest: ResolvedDest;
  columns: { header: string; col: string | null; state: string; reason: string }[];
  rows: ReconRow[]; notInSource: Key[];
  counts: Record<RowOutcome, number> & { applyValues: number; conflicts: number; protectedValues: number; heldValues: number };
}
const has = (o: object | undefined, k: string) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export function reconcile(inp: ReconInput, approved: readonly PreparedClient[] = approvedPrepared()): ReconResult {
  const { client, table, mode } = inp;
  if (mode === "first-load" && !inp.prepared) throw new SourceError("first load requires an approved prepared destination");
  const dest = resolveDestination(client, table, inp.prepared, approved);
  if (mode === "first-load" && (inp.current.size > 0 || inp.baseline !== null || inp.overlays.length)) throw new SourceError("first load requires an empty prepared destination; refusing to overwrite");
  if (inp.rows.length > SOURCE_MAX_ROWS) throw new SourceError(`at most ${SOURCE_MAX_ROWS} rows`);
  const keyCol = dest.key;

  const columns: ReconResult["columns"] = [];
  const used = new Set<string>(); let keyHeader: string | null = null; let personHeader: string | null = null;
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
    if (dest.personLink && col === dest.personLink) { personHeader = header; columns.push({ header, col, state: "person-link", reason: "immutable person link: verified against the current record, never written" }); continue; }
    columns.push({ header, col, state: d.st, reason: d.why });
    if (d.st === "candidate") writable.push({ d, header });
  }
  for (const h of inp.headers ?? []) if (!Object.prototype.hasOwnProperty.call(inp.mapping, h)) columns.push({ header: h, col: null, state: "ignored", reason: "not mapped" });
  if (!keyHeader) throw new SourceError(`map a column to the key ${keyCol}`);
  const heldCols = columns.filter((c) => ["held", "nonwritable", "unsupported"].includes(c.state));
  const baselineKnown = inp.baseline !== null;
  const additionsHeld = dest.source === "registry" && !ADDITIONS_OK.includes(`${client}.${table}`);
  const requiredMissing = dest.source === "prepared" ? (inp.prepared!.tables.find((t) => t.table === table)!.columns.filter((c) => c.required && c.col !== keyCol && !writable.some((w) => w.d.col === c.col)).map((c) => c.col)) : [];
  if (mode === "first-load" && requiredMissing.length) throw new SourceError(`map required columns: ${requiredMissing.join(", ")}`);
  const keyCount = new Map<Key, number>();
  for (const r of inp.rows) { const k = parseKeyOf(dest.keyKind, r[keyHeader]); if (k !== null) keyCount.set(k, (keyCount.get(k) ?? 0) + 1); }

  const rows: ReconRow[] = [];
  const counts = { update: 0, insert: 0, unchanged: 0, held: 0, invalid: 0, applyValues: 0, conflicts: 0, protectedValues: 0, heldValues: 0 };
  inp.rows.forEach((r, i) => {
    const line = i + 2; const key = parseKeyOf(dest.keyKind, r[keyHeader!]); const fields: ReconField[] = [];
    const push = (row: ReconRow) => { rows.push(row); counts[row.outcome] += 1; };
    if (key === null) return push({ line, key, outcome: "invalid", reason: dest.keyKind === "text" ? "key must be non-empty exact text (no leading/trailing spaces or control characters)" : "key must be a positive whole number", fields });
    if ((keyCount.get(key) ?? 0) > 1) return push({ line, key, outcome: "invalid", reason: "key appears more than once in file; every occurrence held", fields });
    for (const h of heldCols) if (h.col) { const v = (r[h.header] ?? "").trim(); if (v) { fields.push({ col: h.col, outcome: "held", latest: v, baseline: null, current: null, reason: h.reason }); counts.heldValues++; } }
    const norm = writable.map(({ d, header }) => ({ d, ...normalize(d, r[header]) }));
    if (norm.some((n) => n.err)) { for (const n of norm) if (n.err) fields.push({ col: n.d.col, outcome: "invalid", latest: null, baseline: null, current: null, reason: n.err }); return push({ line, key, outcome: "invalid", reason: "invalid values", fields }); }
    const person = dest.personLink ? inp.personOf?.get(key) ?? null : undefined;
    // portal protection is per person for record-keyed tables (e.g. notes): overlays are keyed by person CPTID
    const marks = inp.overlays.filter((o) => o.key === (dest.personLink ? person : key));
    const hk = inp.heldKeys?.get(key); if (hk) return push({ line, key, outcome: "held", reason: hk, fields });
    const cur = inp.current.get(key); const base = inp.baseline?.get(key);

    if (dest.personLink && !cur) {
      // NEW record on a person-linked table: only under an approved policy, with the source link resolved to exactly
      // one existing master person, no portal protection for that person, no baseline/collision, all required values.
      const pol = inp.insertPolicy;
      if (!pol || mode !== "update") return push({ line, key, outcome: "held", reason: "new records for this table are held (no approved insert policy for this group)", fields });
      if (!personHeader) return push({ line, key, outcome: "held", reason: `map the source ${dest.personLink} column; new records need a verified person link`, fields });
      const sl = dest.xw ? canonLink(dest.xw.fromKind, r[personHeader]) : (() => { const n = parseKey(r[personHeader]); return n === null ? null : String(n); })();
      const res = inp.sourceLink?.get(key);
      if (sl === null) return push({ line, key, outcome: "held", reason: `source ${dest.personLink} missing or invalid`, fields });
      if (!res || res.link !== sl) return push({ line, key, outcome: "held", reason: "source person link was not checked by Engage; preview again", fields });
      if (res.person === null) return push({ line, key, outcome: "held", reason: dest.xw ? `source ${dest.personLink} is unmapped or ambiguous in ${dest.xw.table} (must resolve to exactly one CPTID)` : "source person invalid", fields });
      if (!res.inMaster) return push({ line, key, outcome: "held", reason: "person not found exactly once in the client master", fields });
      if (inp.overlays.some((o) => o.key === res.person)) return push({ line, key, outcome: "held", reason: "person has portal edits or was created in the portal (protected)", fields });
      if (!baselineKnown) return push({ line, key, outcome: "held", reason: "no baseline: cannot tell a new source record from an unknown one", fields });
      if (base) return push({ line, key, outcome: "held", reason: "record was in baseline but is gone from destination", fields });
      for (const n of norm) fields.push({ col: n.d.col, outcome: n.v === null ? "blank" : "apply", latest: n.v, baseline: null, current: null });
      const blankReq = pol.required.filter((c) => !norm.some((n) => n.d.col === c && n.v !== null));
      if (blankReq.length) return push({ line, key, outcome: "held", reason: `required source value missing: ${blankReq.join(", ")} (never guessed)`, fields });
      counts.applyValues += norm.filter((n) => n.v !== null).length;
      return push({ line, key, person: res.person, ...(dest.xw ? { link: sl } : {}), outcome: "insert", fields });
    }
    if (dest.personLink && person == null) return push({ line, key, outcome: "held", reason: dest.xw ? `person link missing, unmapped or ambiguous in ${dest.xw.table} (must resolve to exactly one CPTID)` : "person link missing or unreadable", fields });
    if (dest.personLink) {
      if (!personHeader) return push({ line, key, outcome: "held", reason: `map the source ${dest.personLink} column; person link must be verified`, fields });
      if (dest.xw) {
        const sl = canonLink(dest.xw.fromKind, r[personHeader]); const cl = inp.linkOf?.get(key) ?? null;
        if (sl === null) return push({ line, key, outcome: "held", reason: `source ${dest.personLink} missing or invalid`, fields });
        if (cl === null || sl !== cl) return push({ line, key, outcome: "held", reason: `source ${dest.personLink} does not match the current record's link; not re-linked`, fields });
      } else {
        const sp = parseKey(r[personHeader]);
        if (sp === null) return push({ line, key, outcome: "held", reason: `source ${dest.personLink} missing or invalid`, fields });
        if (sp !== person) return push({ line, key, outcome: "held", reason: `source ${dest.personLink} does not match the current record's person; not re-linked`, fields });
      }
    }
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
      const reqCols = dest.source === "prepared" ? inp.prepared!.tables.find((t) => t.table === table)!.columns.filter((c) => c.required && c.col !== keyCol).map((c) => c.col) : [];
      const blankReq = reqCols.filter((c) => !norm.some((n) => n.d.col === c && n.v !== null));
      if (blankReq.length) { return push({ line, key, outcome: "invalid", reason: `required value missing: ${blankReq.join(", ")}`, fields }); }
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
    push({ line, key, ...(dest.personLink ? { person: person! } : {}), ...(dest.xw ? { link: inp.linkOf!.get(key)! } : {}), outcome: changes ? "update" : fields.some((f) => ["held", "conflict", "protected"].includes(f.outcome)) ? "held" : "unchanged", fields });
  });
  const inFile = new Set(keyCount.keys());
  const notInSource = mode === "update" ? [...inp.current.keys()].filter((k) => !inFile.has(k)) : [];
  return { client, table, mode, registry: REGISTRY_META, dest, columns, rows, notInSource, counts };
}

// ---------- guarded adapter (NOT READY; disabled) ----------
export interface WriteOp { kind: "update" | "insert"; key: Key; person?: number; link?: string; values: Record<string, string | null>; expected: Record<string, string | null> | null }
export function planWrites(r: ReconResult): WriteOp[] {
  const ops = r.rows.filter((x) => x.outcome === "update" || x.outcome === "insert").map((x) => {
    const fs = x.fields.filter((f) => f.outcome === "apply");
    return { kind: x.outcome as "update" | "insert", key: x.key!, ...(x.person !== undefined ? { person: x.person } : {}), ...(x.link !== undefined ? { link: x.link } : {}), values: Object.fromEntries(fs.map((f) => [f.col, f.latest])), expected: x.outcome === "update" ? Object.fromEntries(fs.map((f) => [f.col, f.current])) : null };
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
  if (dest.keyKind !== "int" || dest.xw) throw new SourceError("this legacy in-process adapter supports int keys without crosswalk only; use the Engage transport");
  if (!ops.length) throw new SourceError("nothing to apply");
  if (ops.length > SOURCE_MAX_OPS) throw new SourceError(`at most ${SOURCE_MAX_OPS} records per batch`);
  const allowed = new Map(dest.dests.filter((d) => d.st === "candidate" && d.col !== dest.key).map((d) => [d.col, d]));
  const keys = new Set<number>();
  for (const op of ops) {
    if (typeof op.key !== "number" || !Number.isSafeInteger(op.key) || op.key <= 0 || op.key > 2147483647 || keys.has(op.key)) throw new SourceError("keys must be unique positive integers");
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
      const found = byKey.get(op.key as number) ?? [];
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
