// TEST-ONLY H3a/H3b statement families (PLAN-H3-A1 §2, PLAN-H3B §1 + PLAN-H3B-A1 §2-3). SQL text is NEVER written here: every statement is produced by the
// pinned backend's own exported constants/generators (GIFT_SQL, giftRawSql) and matched byte-for-byte by the strict mock.
// Param sets are the EXACT key sets the real applyGiftCommit call site passes (including `base` extras), not placeholders.
// Generated n-families are registered ONLY for the explicit size sets in SIZES (PLAN-H3B-A1 §3); any other n (e.g.
// lockAssoc(3)/(4)) is unsupported and THROWS. rawUpdate is registered only for the column list ["Gift_Amount"]. Mock semantics are
// hand-modelled (NOT real SQL): no isolation/locking/collation/DATALENGTH engine behaviour.
import type { StatementDef, Row, Tables } from "./mock-sql";
import { T } from "./fixtures-h3";
/** Explicit bounded size sets (PLAN-H3B-A1 §3). Nothing else is registered. */
export const SIZES = Object.freeze({
  "gift.lockAssoc": [1, 2, 87], "gift.lockMaster": [1, 2], "gift.lockOverlays": [1, 2], "gift.lockProspects": [1, 2], "gift.countLoc": [1, 87],
  "gift.lockIdsByLoc": [1], "gift.lockIdsByGift": [1], "gift.lockRaw": [1], "gift.lockBaseline": [1],
  "preview.master": [2], "preview.overlays": [2], "preview.prospects": [2],
  "preview.idsByGift": [1], "preview.countLoc": [1], "preview.values": [1], "preview.idsByLoc": [1], "preview.baseline": [1],
} as Record<string, readonly number[]>);
export const RAW_UPDATE_COLS: readonly (readonly string[])[] = Object.freeze([Object.freeze(["Gift_Amount"])]);
const BASE = ["rq", "client", "scope", "tbl", "actor", "fd"];
const seq = (pre: string, n: number) => Array.from({ length: n }, (_, i) => `${pre}${i}`);
const vals = (p: Record<string, unknown>, pre: string) => Object.keys(p).filter((k) => new RegExp(`^${pre}\\d+$`).test(k)).map((k) => p[k]);
const pk = (rows: Row[], match: (r: Row) => boolean, what: string) => { if (rows.some(match)) throw new Error(`mock PK violation: ${what}`); };
type G = Record<string, any>;
export function giftDefs(GIFT_SQL: G, giftRawSql: G, reg: G, PREVIEW_SQL: G): { defs: StatementDef[]; aliases: Record<string, string> } {
  const d: StatementDef[] = [];
  const fam = (id: string, gen: (n: number) => string, params: (n: number) => string[], tables: string[], exec: StatementDef["exec"]) => { const ns = SIZES[id]; if (!ns) throw new Error(`no size set for ${id}`); for (const n of ns) d.push({ id: `${id}(${n})`, sql: gen(n), params: params(n), write: false, tables, exec }); };
  const proj = (x: Row): Row => { const o: Row = { __loc: x[reg.locator], __person: x[reg.person] }; for (const c of reg.columns as G[]) o[c.col] = Object.prototype.hasOwnProperty.call(x, c.col) ? x[c.col] : null; return o; };
  const inV = (p: Record<string, unknown>, pre: string) => vals(p, pre);
  const r = (id: string, sql: string, params: string[], tables: string[], exec: StatementDef["exec"]) => d.push({ id, sql, params, write: false, tables, exec });
  const w = (id: string, sql: string, params: string[], tables: string[], exec: (t: Tables, p: Record<string, any>) => void) => d.push({ id, sql, params, write: true, tables, exec: (t, p) => { exec(t, p); return { rows: [], affected: 1 }; } });
  r("gift.lockRequest", GIFT_SQL.lockRequest, ["rq"], [T.RQ, T.LG], (t, p) => ({ rows: t[T.RQ].filter((x) => x.request_id === p.rq).map((x) => { const l = t[T.LG].find((y) => y.request_id === x.request_id);
    return { client: x.client, mode: x.mode, payload_hash: x.payload_hash, registration_id: l ? l.registration_id : null, outcome_json: l ? l.outcome_json : null }; }), affected: 0 }));
  r("gift.lockJob", GIFT_SQL.lockJob, ["job"], [T.JB], (t, p) => ({ rows: t[T.JB].filter((x) => x.job_id === p.job).map((x) => ({ job_id: x.job_id, client: x.client, mode: x.mode })), affected: 0 }));
  r("gift.lockManifest", GIFT_SQL.lockManifest, ["job"], [T.MF], (t, p) => ({ rows: t[T.MF].filter((x) => x.job_id === p.job).map((x) => ({ job_id: x.job_id, client: x.client, manifest_json: x.manifest_json })), affected: 0 }));
  fam("gift.lockAssoc", (n) => GIFT_SQL.lockAssoc(n), (n) => ["client", "scope", "fd", ...seq("o", n)], [T.AS], (t, p) => { const o = vals(p, "o"); return { rows: t[T.AS].filter((x) => x.client === p.client && x.scope === p.scope && x.file_sha256 === p.fd && o.includes(x.row_ordinal)).map((x) => ({ o: x.row_ordinal, g: x.gift_id })), affected: 0 }; });
  fam("gift.lockMaster", (n) => giftRawSql.lockMaster(reg, n), (n) => seq("p", n), [T.MS], (t, p) => { const ps = vals(p, "p"); return { rows: t[T.MS].filter((x) => ps.includes(x.CPTID)).map((x) => ({ p: x.CPTID })), affected: 0 }; });
  fam("gift.lockOverlays", (n) => GIFT_SQL.lockOverlays(n), (n) => ["client", ...seq("p", n)], [T.PU], (t, p) => { const ps = vals(p, "p"); return { rows: t[T.PU].filter((x) => x.client === p.client && x.voided === 0 && ps.includes(x.cptid)).map((x) => ({ k: x.cptid })), affected: 0 }; });
  fam("gift.lockProspects", (n) => GIFT_SQL.lockProspects(n), (n) => ["client", ...seq("p", n)], [T.PP], (t, p) => { const ps = vals(p, "p"); return { rows: t[T.PP].filter((x) => x.client === p.client && ps.includes(x.cptid)).map((x) => ({ k: x.cptid })), affected: 0 }; });
  r("gift.lockMax", giftRawSql.lockMax(reg), [], [T.RAW], (t) => { const ls = t[T.RAW].map((x) => Number(x.row_id)); return { rows: [{ m: ls.length ? Math.max(...ls) : null, n: ls.length }], affected: 0 }; });
  fam("gift.countLoc", (n) => giftRawSql.countLoc(reg, n), (n) => seq("l", n), [T.RAW], (t, p) => { const ls = vals(p, "l"); const c = new Map<unknown, number>(); for (const x of t[T.RAW]) if (ls.includes(x.row_id)) c.set(x.row_id, (c.get(x.row_id) ?? 0) + 1); return { rows: [...c].map(([l, n]) => ({ l: l as number, n })), affected: 0 }; });
  w("gift.insertRequest", GIFT_SQL.insertRequest, [...BASE, "ph", "fn", "fdate", "rev", "summary"], [T.RQ], (t, p) => { pk(t[T.RQ], (x) => x.request_id === p.rq, "requests");
    t[T.RQ].push({ request_id: p.rq, client: p.client, table_name: p.tbl, mode: "gift-identity", payload_hash: p.ph, preview_hash: p.ph, actor: p.actor, file_name: p.fn, file_digest: p.fd, file_date: p.fdate, registry_rev: p.rev, status: "committed", result_json: p.summary }); });
  w("gift.insertJob", GIFT_SQL.insertJob, ["job", "client", "tbl", "fd", "fdate", "rev", "actor", "bc", "tr"], [T.JB], (t, p) => { pk(t[T.JB], (x) => x.job_id === p.job, "import_job");
    t[T.JB].push({ job_id: p.job, client: p.client, table_name: p.tbl, mode: "gift-identity", file_digest: p.fd, file_date: p.fdate, registry_rev: p.rev, actor: p.actor, batch_count: p.bc, total_rows: p.tr }); });
  w("gift.insertManifest", GIFT_SQL.insertManifest, ["job", "client", "reg", "mj", "dc", "hc", "bc", "rq"], [T.MF], (t, p) => { pk(t[T.MF], (x) => x.job_id === p.job, "gift_job_manifest");
    t[T.MF].push({ job_id: p.job, client: p.client, registration_id: p.reg, manifest_json: p.mj, decided_count: p.dc, held_count: p.hc, batch_count: p.bc, created_request_id: p.rq, mode: "gift-identity" }); });
  w("gift.rawInsert", giftRawSql.insert(reg), ["loc", "person", ...reg.columns.map((_: unknown, i: number) => `v${i}`)], [T.RAW], (t, p) => {
    const row: Row = { [reg.locator]: p.loc, [reg.person]: p.person, ...(reg.native ? { [reg.native]: null } : {}) }; reg.columns.forEach((c: G, i: number) => { row[c.col] = p[`v${i}`]; }); t[T.RAW].push(row); });
  w("gift.insertIdentity", GIFT_SQL.insertIdentity, [...BASE, "g", "reg", "person", "loc"], [T.ID], (t, p) => { pk(t[T.ID], (x) => x.gift_id === p.g, "gift_identity");
    t[T.ID].push({ gift_id: p.g, client: p.client, scope: p.scope, registration_id: p.reg, donor_cptid: p.person, raw_locator: p.loc, created_request_id: p.rq, mode: "gift-identity" }); });
  w("gift.insertDecision", GIFT_SQL.insertDecision, [...BASE, "d", "g", "action", "o"], [T.DC], (t, p) => { pk(t[T.DC], (x) => x.decision_id === p.d, "gift_decision");
    t[T.DC].push({ decision_id: p.d, request_id: p.rq, mode: "gift-identity", client: p.client, scope: p.scope, gift_id: p.g, action: p.action, actor_as_stated: p.actor, row_ordinal: p.o }); });
  w("gift.insertAssoc", GIFT_SQL.insertAssoc, [...BASE, "d", "g", "o"], [T.AS], (t, p) => { pk(t[T.AS], (x) => x.client === p.client && x.scope === p.scope && x.file_sha256 === p.fd && x.row_ordinal === p.o, "gift_source_association");
    t[T.AS].push({ gift_id: p.g, client: p.client, scope: p.scope, file_sha256: p.fd, row_ordinal: p.o, decision_id: p.d, request_id: p.rq, mode: "gift-identity" }); });
  w("gift.insertBaseline", GIFT_SQL.insertBaseline, [...BASE, "k", "col", "v"], [T.BL], (t, p) => { pk(t[T.BL], (x) => x.client === p.client && x.table_name === p.tbl && x.record_key === p.k && x.column_name === p.col, "baseline");
    t[T.BL].push({ client: p.client, table_name: p.tbl, record_key: p.k, column_name: p.col, value: p.v, provenance: "source", request_id: p.rq }); });
  w("gift.insertAudit", GIFT_SQL.insertAudit, [...BASE, "k", "col", "op", "old", "v"], [T.AU], (t, p) => { t[T.AU].push({ request_id: p.rq, client: p.client, table_name: p.tbl, record_key: p.k, column_name: p.col, op: p.op, old_value: p.old, new_value: p.v }); });
  w("gift.insertBatch", GIFT_SQL.insertBatch, ["job", "bi", "rq", "n"], [T.BT], (t, p) => { pk(t[T.BT], (x) => x.job_id === p.job && x.batch_index === p.bi, "import_job_batch");
    t[T.BT].push({ job_id: p.job, batch_index: p.bi, request_id: p.rq, status: "saved", records: p.n, held_rows: 0 }); });
  w("gift.insertLog", GIFT_SQL.insertLog, ["rq", "client", "tbl", "fd", "fdate", "actor", "n"], [T.LOG], (t, p) => { t[T.LOG].push({ request_id: p.rq, client: p.client, table_name: p.tbl, file_digest: p.fd, file_date: p.fdate, actor: p.actor, records: p.n }); });
  w("gift.insertLedger", GIFT_SQL.insertLedger, [...BASE, "reg", "ph", "out"], [T.LG], (t, p) => { pk(t[T.LG], (x) => x.request_id === p.rq, "gift_ledger");
    t[T.LG].push({ request_id: p.rq, mode: "gift-identity", client: p.client, scope: p.scope, registration_id: p.reg, payload_hash: p.ph, outcome_json: p.out }); });
  // ---- H3b commit-path additions (locked) ----
  fam("gift.lockIdsByGift", (n) => GIFT_SQL.lockIdsByGift(n), (n) => seq("g", n), [T.ID], (t, p) => { const g = inV(p, "g"); return { rows: t[T.ID].filter((x) => g.includes(x.gift_id)).map((x) => ({ g: x.gift_id, client: x.client, scope: x.scope, reg: x.registration_id, person: x.donor_cptid, loc: x.raw_locator })), affected: 0 }; });
  fam("gift.lockIdsByLoc", (n) => GIFT_SQL.lockIdsByLoc(n), (n) => ["client", "scope", ...seq("l", n)], [T.ID], (t, p) => { const l = inV(p, "l"); return { rows: t[T.ID].filter((x) => x.client === p.client && x.scope === p.scope && l.includes(x.raw_locator)).map((x) => ({ g: x.gift_id, loc: x.raw_locator })), affected: 0 }; });
  fam("gift.lockRaw", (n) => giftRawSql.lockRaw(reg, n), (n) => seq("l", n), [T.RAW], (t, p) => { const l = inV(p, "l"); return { rows: t[T.RAW].filter((x) => l.includes(x[reg.locator])).map(proj), affected: 0 }; });
  fam("gift.lockBaseline", (n) => GIFT_SQL.lockBaseline(n), (n) => ["client", "tbl", ...seq("b", n)], [T.BL], (t, p) => { const b = inV(p, "b"); return { rows: t[T.BL].filter((x) => x.client === p.client && x.table_name === p.tbl && b.includes(x.record_key)).map((x) => ({ k: x.record_key, col: x.column_name, value: x.value, provenance: x.provenance })), affected: 0 }; });
  for (const cols of RAW_UPDATE_COLS) d.push({ id: `gift.rawUpdate.${cols.join(".")}`, sql: giftRawSql.update(reg, [...cols]), params: ["loc", "person", ...cols.map((_, i) => `v${i}`)], write: true, tables: [T.RAW], exec: (t, p) => {
    let n = 0; for (const x of t[T.RAW]) if (x[reg.locator] === p.loc && x[reg.person] === p.person) { cols.forEach((c, i) => { x[c] = p[`v${i}`]; }); n++; } return { rows: [], affected: n }; } });
  d.push({ id: "gift.updateBaseline", sql: GIFT_SQL.updateBaseline, params: [...BASE, "k", "col", "v"], write: true, tables: [T.BL], exec: (t, p) => {
    // updated_at=SYSUTCDATETIME() is NOT modelled (no clock column in the mock)
    let n = 0; for (const x of t[T.BL]) if (x.client === p.client && x.table_name === p.tbl && x.record_key === p.k && x.column_name === p.col && x.provenance === "source") { x.value = p.v; x.request_id = p.rq; n++; } return { rows: [], affected: n }; } });
  // ---- status (unlocked, gate-independent) ----
  r("gift.status", GIFT_SQL.status, ["rq", "client"], [T.LG], (t, p) => ({ rows: t[T.LG].filter((x) => x.request_id === p.rq && x.client === p.client && x.mode === "gift-identity").map((x) => ({ outcome_json: x.outcome_json, registration_id: x.registration_id })), affected: 0 }));
  r("gift.jobStatus", GIFT_SQL.jobStatus, ["client", "job"], [T.MF, T.JB], (t, p) => ({ rows: t[T.MF].filter((m) => m.job_id === p.job && m.client === p.client && m.mode === "gift-identity").flatMap((m) => t[T.JB].filter((j) => j.job_id === m.job_id).map((j) => ({ manifest_json: m.manifest_json, held_count: m.held_count, batch_count: m.batch_count, mode: j.mode }))), affected: 0 }));
  // NO ORDER BY in the real SQL: rows come back in mock storage order (a test reorders storage to show order-independence)
  r("gift.jobBatches", GIFT_SQL.jobBatches, ["client", "job"], [T.BT, T.LG], (t, p) => ({ rows: t[T.BT].filter((b) => b.job_id === p.job).flatMap((b) => t[T.LG].filter((l) => l.request_id === b.request_id && l.client === p.client && l.mode === "gift-identity").map((l) => ({ batch_index: b.batch_index, request_id: b.request_id, outcome_json: l.outcome_json }))), affected: 0 }));
  // ---- preview (PREVIEW_SQL, unlocked, read-only) ----
  r("preview.overrides", PREVIEW_SQL.overrides, ["client"], [T.GO], (t, p) => ({ rows: t[T.GO].filter((x) => x.client === p.client && x.superseded === 0).slice(0, 1).map((x) => ({ id: x.id })), affected: 0 }));
  const grp = (rows: Row[], key: string) => { const m = new Map<unknown, number>(); for (const x of rows) m.set(x[key], (m.get(x[key]) ?? 0) + 1); return m; };
  fam("preview.master", (n) => PREVIEW_SQL.master(reg, n), (n) => seq("p", n), [T.MS], (t, p) => { const ps = inV(p, "p"); return { rows: [...grp(t[T.MS].filter((x) => ps.includes(x[reg.master.col])), reg.master.col)].map(([k, n]) => ({ p: k as number, n })), affected: 0 }; });
  const distinctK = (rows: Row[]) => [...new Set(rows.map((x) => x.cptid))].map((k) => ({ k: k as number }));
  fam("preview.overlays", (n) => PREVIEW_SQL.overlays(n), (n) => ["client", ...seq("p", n)], [T.PU], (t, p) => { const ps = inV(p, "p"); return { rows: distinctK(t[T.PU].filter((x) => x.client === p.client && x.voided === 0 && ps.includes(x.cptid))), affected: 0 }; });
  fam("preview.prospects", (n) => PREVIEW_SQL.prospects(n), (n) => ["client", ...seq("p", n)], [T.PP], (t, p) => { const ps = inV(p, "p"); return { rows: distinctK(t[T.PP].filter((x) => x.client === p.client && ps.includes(x.cptid))), affected: 0 }; });
  const idRow = (x: Row) => ({ g: x.gift_id, loc: x.raw_locator, person: x.donor_cptid });
  fam("preview.idsByGift", (n) => PREVIEW_SQL.idsByGift(n), (n) => ["client", "scope", "reg", ...seq("g", n)], [T.ID], (t, p) => { const g = inV(p, "g"); return { rows: t[T.ID].filter((x) => x.client === p.client && x.scope === p.scope && x.registration_id === p.reg && g.includes(x.gift_id)).map(idRow), affected: 0 }; });
  fam("preview.idsByLoc", (n) => PREVIEW_SQL.idsByLoc(n), (n) => ["client", "scope", "reg", ...seq("l", n)], [T.ID], (t, p) => { const l = inV(p, "l"); return { rows: t[T.ID].filter((x) => x.client === p.client && x.scope === p.scope && x.registration_id === p.reg && l.includes(x.raw_locator)).map(idRow), affected: 0 }; });
  fam("preview.countLoc", (n) => PREVIEW_SQL.countLoc(reg, n), (n) => seq("l", n), [T.RAW], (t, p) => { const l = inV(p, "l"); return { rows: [...grp(t[T.RAW].filter((x) => l.includes(x[reg.locator])), reg.locator)].map(([k, n]) => ({ l: k as number, n })), affected: 0 }; });
  fam("preview.values", (n) => PREVIEW_SQL.values(reg, n), (n) => seq("l", n), [T.RAW], (t, p) => { const l = inV(p, "l"); return { rows: t[T.RAW].filter((x) => l.includes(x[reg.locator])).map(proj), affected: 0 }; });
  fam("preview.baseline", (n) => PREVIEW_SQL.baseline(n), (n) => ["client", "tbl", ...seq("b", n)], [T.BL], (t, p) => { const b = inV(p, "b"); return { rows: t[T.BL].filter((x) => x.client === p.client && x.table_name === p.tbl && b.includes(x.record_key)).map((x) => ({ k: x.record_key, col: x.column_name, value: x.value, provenance: x.provenance })), affected: 0 }; });
  // history: GROUP BY locator (global count n, donor matches m), WHERE m>0 AND l>@after ORDER BY l, TOP(@lim) — modelled exactly
  r("preview.history", PREVIEW_SQL.history(reg), ["p", "after", "lim"], [T.RAW], (t, p) => { const m = new Map<number, { n: number; m: number }>();
    for (const x of t[T.RAW]) { const l = Number(x[reg.locator]); const e = m.get(l) ?? { n: 0, m: 0 }; e.n++; if (x[reg.person] === p.p) e.m++; m.set(l, e); }
    return { rows: [...m].filter(([l, e]) => e.m > 0 && l > Number(p.after)).sort((a, b) => a[0] - b[0]).slice(0, Number(p.lim)).map(([l, e]) => ({ l, n: e.n })), affected: 0 }; });
  // GIFT_SQL.lockGiftOverrides is byte-identical to SOURCE_SQL.lockGiftOverrides (H2 def source.lockGiftOverrides).
  return { defs: d, aliases: { "gift.lockGiftOverrides": "source.lockGiftOverrides" } };
}
