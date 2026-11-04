// TEST-ONLY H3c statement registry (PLAN-H3C-A1/A2 + parent corrections). SQL text is NEVER written here: every statement is
// composed from the pinned backend's own exports (SOURCE_SQL constants/generators and SOURCE_INTERNALS keyProj/keyPred/
// selectExpr/linkProj/qi/resolve) exactly as sourcePreviewState/applySourceImport compose them, and matched byte-for-byte
// by the strict mock. ONLY the variants that the H3c scenarios actually reach are registered (all must be hit):
//   preview raw (unlocked): cols [DS_Rating,Major_Gift_Score] n=1,2 ; cols [DS_Rating] n=1 (V3)
//   apply raw (locked):     cols [DS_Rating,Major_Gift_Score] n=1,2 ; cols [DS_Rating] n=1 (PH3b)
//   baseline/overlays/prospects unlocked n=1,2 and locked n=1,2 ; UPDATE U1 [DS_Rating], U2 [Major_Gift_Score], U3 both.
// Mock semantics are hand-modelled (NOT real SQL): no isolation/locking/collation/float conversion engine behaviour;
// FLOAT writes are modelled as Number(@v) (the driver/engine conversion is NOT proven here).
import type { StatementDef, Row, Tables } from "./mock-sql";
import { C } from "./fixtures-h3c";
type G = Record<string, any>;
const seq = (pre: string, n: number) => Array.from({ length: n }, (_, i) => `${pre}${i}`);
const vals = (p: Record<string, unknown>, pre: string) => Object.keys(p).filter((k) => new RegExp(`^${pre}\\d+$`).test(k)).map((k) => p[k]);
export const RAW_COLS: readonly (readonly string[])[] = [["DS_Rating", "Major_Gift_Score"], ["DS_Rating"]];
export const SIZES = { previewRaw: { "DS_Rating.Major_Gift_Score": [1, 2], DS_Rating: [1] }, lockRaw: { "DS_Rating.Major_Gift_Score": [1, 2], DS_Rating: [1] }, side: [1, 2] } as const;
export const UPDATE_COLS: readonly (readonly string[])[] = [["DS_Rating"], ["Major_Gift_Score"], ["DS_Rating", "Major_Gift_Score"]];
export function sourceDefsH3c(Q: G, I: G): StatementDef[] {
  const d: StatementDef[] = [];
  const R = I.resolve("pvas", "donorsearch_results", []);
  const T = `${I.qi(R.schema)}.${I.qi(R.table)}`, K = I.qi(R.key);
  const FLOAT = new Set(Array.from(R.cols as Map<string, G>).filter(([, c]) => c.ty === "float").map(([c]) => c));
  const unlock = (s: string) => s.replace(" WITH (UPDLOCK, HOLDLOCK)", "");
  const rawSql = (cols: readonly string[], n: number, lock: boolean) => `SELECT ${I.keyProj(R)} AS k, ${I.linkProj(R)}${cols.map((c) => I.selectExpr(c, R.cols.get(c))).join(", ")} FROM ${T}${lock ? " WITH (UPDLOCK, HOLDLOCK)" : ""} WHERE ${I.keyPred(R, n)}`;
  const rawExec = (cols: readonly string[]) => (t: Tables, p: Record<string, unknown>) => { const ks = vals(p, "k"); return { rows: t[C.RAW].filter((x) => ks.includes(String(x.CPTID))).map((x) => { const o: Row = { k: String(x.CPTID) }; for (const c of cols) o[c] = x[c] ?? null; return o; }), affected: 0 }; };
  for (const [kind, lock] of [["previewRaw", false], ["lockRaw", true]] as const) for (const cols of RAW_COLS) for (const n of (SIZES[kind] as G)[cols.join(".")])
    d.push({ id: `source.${kind}.${cols.join(".")}(${n})`, sql: rawSql(cols, n, lock), params: seq("k", n), write: false, tables: [C.RAW], exec: rawExec(cols) });
  const blExec = (t: Tables, p: Record<string, unknown>) => { const ks = vals(p, "k"); return { rows: t[C.BL].filter((x) => x.client === p.client && x.table_name === p.tbl && ks.includes(x.record_key)).map((x) => ({ k: x.record_key, col: x.column_name, value: x.value, provenance: x.provenance })), affected: 0 }; };
  const ovExec = (t: Tables, p: Record<string, unknown>) => { const ks = vals(p, "k"); return { rows: t[C.PU].filter((x) => x.client === p.client && x.voided === 0 && ks.includes(x.cptid)).map((x) => ({ id: x.id, k: x.cptid })), affected: 0 }; };
  const prExec = (t: Tables, p: Record<string, unknown>) => { const ks = vals(p, "k"); return { rows: t[C.PP].filter((x) => x.client === p.client && ks.includes(x.cptid)).map((x) => ({ k: x.cptid })), affected: 0 }; };
  for (const n of SIZES.side) for (const lock of [false, true]) {
    const tag = lock ? "lock" : "preview", f = (s: string) => (lock ? s : unlock(s));
    d.push({ id: `source.${tag}Baseline(${n})`, sql: f(Q.lockBaseline(n)), params: ["client", "tbl", ...seq("k", n)], write: false, tables: [C.BL], exec: blExec });
    d.push({ id: `source.${tag}Overlays(${n})`, sql: f(Q.lockOverlays(n)), params: ["client", ...seq("k", n)], write: false, tables: [C.PU], exec: ovExec });
    d.push({ id: `source.${tag}Prospects(${n})`, sql: f(Q.lockProspects(n)), params: ["client", ...seq("k", n)], write: false, tables: [C.PP], exec: prExec });
  }
  const pkFail = (rows: Row[], m: (r: Row) => boolean, what: string) => { if (rows.some(m)) throw new Error(`mock PK violation: ${what}`); };
  // insertRequest: 13 columns, 12 bound params + literal status 'committed'
  d.push({ id: "source.insertRequest", sql: Q.insertRequest, params: ["rid", "client", "tbl", "mode", "ph", "pv", "actor", "fn", "fd", "fdate", "rev", "res"], write: true, tables: [C.RQ], exec: (t, p) => {
    pkFail(t[C.RQ], (x) => x.request_id === p.rid, "requests");
    t[C.RQ].push({ request_id: p.rid, client: p.client, table_name: p.tbl, mode: p.mode, payload_hash: p.ph, preview_hash: p.pv, actor: p.actor, file_name: p.fn, file_digest: p.fd, file_date: p.fdate, registry_rev: p.rev, status: "committed", result_json: p.res, created_at: "mock" }); return { rows: [], affected: 1 }; } });
  for (const cols of UPDATE_COLS) d.push({ id: `source.update.${cols.join(".")}`, sql: `UPDATE ${T} SET ${cols.map((x, j) => `${I.qi(x)}=@v${j}`).join(", ")} WHERE ${K}=CONVERT(BIGINT, @key)`, params: ["key", ...seq("v", cols.length)], write: true, tables: [C.RAW], exec: (t, p) => {
    let n = 0; for (const x of t[C.RAW]) if (String(x.CPTID) === p.key) { cols.forEach((c, j) => { const v = p[`v${j}`]; x[c] = v === null ? null : FLOAT.has(c) ? Number(v) : v; }); n++; } return { rows: [], affected: n }; } });
  // updateBaseline: real WHERE has NO provenance predicate (sets provenance='source'); updated_at not modelled
  d.push({ id: "source.updateBaseline", sql: Q.updateBaseline, params: ["client", "tbl", "k", "col", "v", "rid"], write: true, tables: [C.BL], exec: (t, p) => {
    let n = 0; for (const x of t[C.BL]) if (x.client === p.client && x.table_name === p.tbl && x.record_key === p.k && x.column_name === p.col) { x.value = p.v; x.provenance = "source"; x.request_id = p.rid; n++; } return { rows: [], affected: n }; } });
  d.push({ id: "source.insertAudit", sql: Q.insertAudit, params: ["rid", "client", "tbl", "k", "col", "op", "o", "n"], write: true, tables: [C.AU], exec: (t, p) => { t[C.AU].push({ request_id: p.rid, client: p.client, table_name: p.tbl, record_key: p.k, column_name: p.col, op: p.op, old_value: p.o, new_value: p.n }); return { rows: [], affected: 1 }; } });
  d.push({ id: "source.insertLog", sql: Q.insertLog, params: ["rid", "client", "tbl", "fd", "fdate", "actor", "n"], write: true, tables: [C.LOG], exec: (t, p) => { t[C.LOG].push({ request_id: p.rid, client: p.client, table_name: p.tbl, file_digest: p.fd, file_date: p.fdate, actor: p.actor, records: p.n }); return { rows: [], affected: 1 }; } });
  return d;
}
