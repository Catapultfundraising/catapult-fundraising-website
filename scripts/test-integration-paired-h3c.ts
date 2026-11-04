// H3c PAIRED scenario 9 (PLAN-H3C-A1 + A2 + parent corrections): NON-GIFT source update of pvas.donorsearch_results.
// REAL website handler (this repo) <-> REAL backend handleSourceImport (pinned extract, own Next 14) over stdio frames;
// backend SQL = strict hand-modelled MOCK seeded with FICTIONAL rows and a MOCK-SEEDED "source" baseline (no provenance or
// production proof). NOT real SQL / locking / HTTP / Vercel / hosted evidence. Cases labelled [DIRECT BACKEND] bypass the
// website on purpose (the website MAC/route makes them unreachable through the paired path).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { handleResearchSourceImport, type ResearchDeps } from "../lib/portal-v2/research-source-import-handler";
import { applyRequestBody, SOURCE_TOKEN_TTL_MS } from "../lib/portal-v2/source-import-apply";
import { startChild, type Pin } from "./harness/paired-client";
import { C, TBL, MAP, HDR, seedH3c } from "./harness/fixtures-h3c";

const E = process.env;
const pin: Pin | null = E.HARNESS_BACKEND_DIR && E.HARNESS_BACKEND_INVENTORY && E.HARNESS_BACKEND_LOCK_SHA256 && E.HARNESS_BACKEND_NEXT
  ? { dir: E.HARNESS_BACKEND_DIR, inventory: E.HARNESS_BACKEND_INVENTORY, lockSha256: E.HARNESS_BACKEND_LOCK_SHA256, next: E.HARNESS_BACKEND_NEXT } : null;
if (!pin && E.HARNESS_ACCEPTANCE === "1") test("acceptance requires the pinned backend child (H3c)", () => { assert.fail("HARNESS_ACCEPTANCE=1 but pinned backend inputs are missing"); });
const skip = pin ? false : "NOTRUN: pinned backend extract not supplied";

const PW = "fictional-pw", AS = "fictional-auth-secret-0123456789", WS = "w".repeat(32);
const COOKIE = createHash("sha256").update(`${PW}:${AS}`).digest("hex");
const WENV = { RESEARCH_PASSWORD: PW, RESEARCH_AUTH_SECRET: AS, SOURCE_IMPORT_PREVIEW: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: WS, SOURCE_IMPORT_APPLY: "enabled" };
const BENV = { PORTAL_WRITE_SECRET: WS, SOURCE_IMPORT_SQL_CONNECTION: "mock", PORTAL_SOURCE_IMPORT_APPLY: "enabled" };
const ACTOR = "Pat Fictional";
globalThis.fetch = (async () => { throw new Error("GUARD: global fetch must never be used"); }) as typeof fetch;

const c = pin ? startChild(pin, "scripts/harness/backend-child.ts", ["h3c"]) : null;
after(async () => { if (c && !c.dead()) { await c.send({ kind: "shutdown" }).catch(() => undefined); } c?.kill(); });
const send = (f: Record<string, unknown>) => c!.send(f) as Promise<Record<string, any>>;
const inspect = async (dump = true) => send({ kind: "inspect", dump });
const hit = new Set<string>(); let statementIds: string[] = [];
let frames = 0;
const wfetch = (async (u: string | URL, i?: RequestInit) => { frames++; return c!.fetchImpl(u, i); }) as typeof fetch;
// website clock: REAL wall time (the backend route uses Date.now and cannot be injected); tests shift only the website clock
const deps = (o: Partial<ResearchDeps> = {}): ResearchDeps => ({ fetchImpl: wfetch, env: WENV, transportApproved: true, giftRegistrations: [], prepared: [], now: () => Date.now(), ...o });
const H = async (body: Record<string, unknown>, d: ResearchDeps = deps()) => { const r = await handleResearchSourceImport(new NextRequest("http://localhost/api/research-source-import", { method: "POST",
  headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost", cookie: `catapult_research_auth=${COOKIE}` }, body: JSON.stringify(body) }), d); return { s: r.status, j: await r.json() as any }; };
const breq = (body: unknown) => ({ kind: "request", url: "https://engage.invalid/api/source-import", method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${WS}` }, body: JSON.stringify(body) });

async function setup(o: Parameters<typeof seedH3c>[0] = {}) { await send({ kind: "reset" }); await send({ kind: "seed", tables: seedH3c(o), deps: { env: BENV } }); frames = 0; }
async function mutate(tbl: string, fn: (rows: any[]) => any[]) { const t = (await inspect()).tables[tbl]; await send({ kind: "seed", tables: { [tbl]: fn(t) } }); }
async function act<R>(fn: () => Promise<R>) {
  const b = await inspect(); const n0 = b.trace.length; const tx0 = b.stats.tx; const rb0 = b.stats.rollbacks; const f0 = frames;
  const r = await fn(); const a = await inspect(); const ids = a.trace.slice(n0).map((t: any) => t.id as string); ids.forEach((i: string) => hit.add(i)); statementIds = a.statements.map((s: any) => s.id);
  return { r, ids, before: b.tables as Record<string, any[]>, after: a.tables as Record<string, any[]>, tx: a.stats.tx - tx0, rollbacks: a.stats.rollbacks - rb0, unsupported: a.stats.unsupported, frames: frames - f0 };
}
const same = (x: { before: unknown; after: unknown }) => assert.deepEqual(x.after, x.before, "EVERY durable table equals the pre-action snapshot (byte snapshot)");
const preview = (csv: string, mapping: Record<string, string> = MAP, d = deps()) => H({ op: "preview", client: "pvas", table: TBL, csv, mapping, fileName: "h3c-fict.csv", fileDate: null }, d);
const apply = (token: string, d = deps(), client = "pvas") => H({ op: "apply", client, table: TBL, token, actor: ACTOR }, d);
const status = (requestId: string, d = deps()) => H({ op: "status", client: "pvas", requestId }, d);
const tokenOps = (t: string) => JSON.parse(Buffer.from(t.split(".")[0], "base64url").toString("utf8"));
const PREV = (n: number, cols = "DS_Rating.Major_Gift_Score") => [`source.previewRaw.${cols}(${n})`, `source.previewBaseline(${n})`, `source.previewOverlays(${n})`, `source.previewProspects(${n})`];
const LOCKS = (n: number, cols = "DS_Rating.Major_Gift_Score") => ["source.lockRequest", `source.lockRaw.${cols}(${n})`, `source.lockBaseline(${n})`, `source.lockOverlays(${n})`, `source.lockProspects(${n})`];
const W1 = ["source.updateBaseline", "source.insertAudit"];
const S91 = `${HDR}9101,R1-new,10\r\n9102,R2,25\r\n`;            // U1 (Rating) + U2 (MGS)
const S92 = `${HDR}9105,R5-new,55\r\n`;                         // U3 (both)
const S91_WRITES = ["source.insertRequest", "source.update.DS_Rating", ...W1, "source.update.Major_Gift_Score", ...W1, "source.insertLog"];
const S92_WRITES = ["source.insertRequest", "source.update.DS_Rating.Major_Gift_Score", ...W1, ...W1, "source.insertLog"];
const raw = (D: Record<string, any[]>, k: number) => D[C.RAW].find((x) => x.CPTID === k);
const blv = (D: Record<string, any[]>, k: number, col: string) => D[C.BL].filter((x) => x.record_key === String(k) && x.column_name === col);

async function previewOk(csv: string, n: number, cols?: string) {
  const p = await act(() => preview(csv)); assert.equal(p.r.s, 200, JSON.stringify(p.r.j)); assert.deepEqual(p.ids, PREV(n, cols)); same(p); assert.equal(p.tx, 0); assert.equal(p.frames, 1);
  return p.r.j;
}
/** the committed S9.1 durable state, asserted exactly against the pre-apply snapshot */
function assertS91(B: Record<string, any[]>, A: Record<string, any[]>, rid: string) {
  assert.deepEqual(raw(A, 9101), { CPTID: 9101, DS_Rating: "R1-new", Major_Gift_Score: 10 }); assert.deepEqual(raw(A, 9102), { CPTID: 9102, DS_Rating: "R2", Major_Gift_Score: 25 });
  assert.deepEqual(raw(A, 9105), raw(B, 9105)); assert.deepEqual(A[C.XRAW], B[C.XRAW], "cross-client row untouched");
  assert.deepEqual(blv(A, 9101, "DS_Rating").map((x) => [x.value, x.provenance, x.request_id]), [["R1-new", "source", rid]]);
  assert.deepEqual(blv(A, 9102, "Major_Gift_Score").map((x) => [x.value, x.provenance, x.request_id]), [["25", "source", rid]]);
  assert.equal(A[C.BL].length, B[C.BL].length, "baseline rows replaced in place, never duplicated");
  for (const [k, col] of [[9101, "Major_Gift_Score"], [9102, "DS_Rating"], [9105, "DS_Rating"], [9105, "Major_Gift_Score"]] as const) assert.deepEqual(blv(A, k, col), blv(B, k, col), "unchanged baseline rows");
  assert.deepEqual(A[C.AU].slice(B[C.AU].length).map((x) => [x.request_id, x.record_key, x.column_name, x.op, x.old_value, x.new_value]), [[rid, "9101", "DS_Rating", "update", "R1", "R1-new"], [rid, "9102", "Major_Gift_Score", "update", "20", "25"]]);
  const rq = A[C.RQ].slice(B[C.RQ].length); assert.equal(rq.length, 1); assert.equal(rq[0].request_id, rid); assert.equal(rq[0].status, "committed"); assert.equal(rq[0].client, "pvas"); assert.equal(rq[0].table_name, TBL); assert.equal(rq[0].mode, "update"); assert.equal(rq[0].actor, ACTOR); assert.equal(rq[0].file_date, null);
  assert.deepEqual(JSON.parse(rq[0].result_json).records, 2);
  assert.deepEqual(A[C.LOG].slice(B[C.LOG].length).map((x) => [x.request_id, x.records, x.file_date]), [[rid, 2, null]]);
  assert.deepEqual(A[C.PU], B[C.PU]); assert.deepEqual(A[C.PP], B[C.PP]);
}

test("[PAIRED][MOCK SQL] S9.1 U1+U2 two-row update, exact SQL order + durable invariants; S9.4 status found; S9.3 same-token replay", { skip }, async () => {
  await setup();
  const pv = await previewOk(S91, 2);
  assert.equal(pv.mode, "update"); assert.equal(pv.applyAvailable, true); assert.match(pv.requestId, /^[0-9a-f]{32}$/);
  assert.deepEqual(tokenOps(pv.token).ops, [{ kind: "update", key: 9101, values: { DS_Rating: "R1-new" }, expected: { DS_Rating: "R1" } }, { kind: "update", key: 9102, values: { Major_Gift_Score: "25" }, expected: { Major_Gift_Score: "20" } }]);
  const a = await act(() => apply(pv.token));
  assert.equal(a.r.s, 200, JSON.stringify(a.r.j)); assert.equal(a.r.j.replayed, false); assert.equal(a.r.j.records, 2); assert.equal(a.r.j.values, 2);
  assert.deepEqual(a.ids, [...LOCKS(2), ...S91_WRITES]); assert.equal(a.rollbacks, 0); assert.equal(a.unsupported, 0);
  assertS91(a.before, a.after, pv.requestId);
  const st = await act(() => status(pv.requestId)); assert.equal(st.r.s, 200); assert.equal(st.r.j.found, true); assert.equal(st.r.j.status, "committed"); assert.equal(st.r.j.result.records, 2); assert.deepEqual(st.ids, ["source.status"]); same(st);
  const rp = await act(() => apply(pv.token)); assert.equal(rp.r.s, 200); assert.equal(rp.r.j.replayed, true); assert.equal(rp.r.j.payloadHash, a.r.j.payloadHash); assert.deepEqual(rp.ids, ["source.lockRequest"]); same(rp);
});

test("[PAIRED][MOCK SQL] S9.2 U3 one row, both fields", { skip }, async () => {
  await setup();
  const pv = await previewOk(S92, 1);
  assert.deepEqual(tokenOps(pv.token).ops, [{ kind: "update", key: 9105, values: { DS_Rating: "R5-new", Major_Gift_Score: "55" }, expected: { DS_Rating: "R5", Major_Gift_Score: "50" } }]);
  const a = await act(() => apply(pv.token)); assert.equal(a.r.s, 200, JSON.stringify(a.r.j));
  assert.deepEqual(a.ids, [...LOCKS(1), ...S92_WRITES]);
  assert.deepEqual(raw(a.after, 9105), { CPTID: 9105, DS_Rating: "R5-new", Major_Gift_Score: 55 }); assert.deepEqual(raw(a.after, 9101), raw(a.before, 9101)); assert.deepEqual(a.after[C.XRAW], a.before[C.XRAW]);
  assert.deepEqual(a.after[C.AU].map((x) => [x.column_name, x.old_value, x.new_value]), [["DS_Rating", "R5", "R5-new"], ["Major_Gift_Score", "50", "55"]]);
});

test("[PAIRED][MOCK SQL] preview holds PH1-PH4: no token, exactly the 4 preview reads, no apply frame/write", { skip }, async () => {
  const one = `${HDR}9101,R1-new,10\r\n`;
  // PH1 manual portal overlay (portal_updates) on 9101 seeded BEFORE preview: every mapped value protected
  await setup(); await mutate(C.PU, () => [{ id: 1, client: "pvas", cptid: 9101, voided: 0 }]);
  let p = await previewOk(one, 1); assert.equal(p.token, null); assert.equal(p.applyAvailable, false); assert.equal(p.result.rows[0].outcome, "held");
  assert.deepEqual(p.result.rows[0].fields.map((f: any) => [f.col, f.outcome]), [["DS_Rating", "protected"], ["Major_Gift_Score", "protected"]]);
  // PH2 portal-created prospect 9101
  await setup(); await mutate(C.PP, () => [{ client: "pvas", cptid: 9101 }]);
  p = await previewOk(one, 1); assert.equal(p.token, null); assert.equal(p.result.rows[0].outcome, "held"); assert.equal(p.result.rows[0].reason, "record created/owned in the portal; protected");
  // PH3 sole 9102: only MGS changed, Rating unchanged; the MGS baseline row is REPLACED by provenance 'unknown' (not duplicated)
  await setup({ unknownMgs9102: true });
  const d = (await inspect()).tables; assert.equal(blv(d, 9102, "Major_Gift_Score").length, 1); assert.equal(blv(d, 9102, "Major_Gift_Score")[0].provenance, "unknown");
  p = await previewOk(`${HDR}9102,R2,25\r\n`, 1); assert.equal(p.token, null); assert.equal(p.result.rows[0].outcome, "held");
  assert.deepEqual(p.result.rows[0].fields.map((f: any) => [f.col, f.outcome, f.reason ?? null]), [["DS_Rating", "unchanged", null], ["Major_Gift_Score", "held", "baseline value missing or unreadable: ownership unknown"]]);
  // PH4 new key 9999 (additions held for this table): preview reads still run, no token, no write
  await setup();
  p = await previewOk(`${HDR}9999,RX,1\r\n`, 1); assert.equal(p.token, null); assert.equal(p.result.rows[0].outcome, "held"); assert.equal(p.result.rows[0].reason, "new IDs for this table are held pending identity review");
});

test("[PAIRED][MOCK SQL] PH3b mixed: Rating eligible, unknown-baseline MGS held; token carries ONLY Rating; apply uses the 1-column locked raw read", { skip }, async () => {
  await setup({ unknownMgs9102: true });
  const p = await previewOk(`${HDR}9102,R2-new,25\r\n`, 1);
  assert.equal(p.result.rows[0].outcome, "update"); assert.deepEqual(p.result.rows[0].fields.map((f: any) => [f.col, f.outcome]), [["DS_Rating", "apply"], ["Major_Gift_Score", "held"]]);
  assert.deepEqual(tokenOps(p.token).ops, [{ kind: "update", key: 9102, values: { DS_Rating: "R2-new" }, expected: { DS_Rating: "R2" } }]);
  const a = await act(() => apply(p.token)); assert.equal(a.r.s, 200, JSON.stringify(a.r.j));
  assert.deepEqual(a.ids, [...LOCKS(1, "DS_Rating"), "source.insertRequest", "source.update.DS_Rating", ...W1, "source.insertLog"]);
  assert.deepEqual(raw(a.after, 9102), { CPTID: 9102, DS_Rating: "R2-new", Major_Gift_Score: 20 }, "held MGS value untouched");
  assert.deepEqual(blv(a.after, 9102, "Major_Gift_Score"), blv(a.before, 9102, "Major_Gift_Score"), "unknown-provenance baseline untouched (not claimed)");
});

test("[PAIRED][MOCK SQL] validation stages V1-V3 (website): missing key / unknown-only pre-SQL 400; unknown + valid = partial (unsupported held, valid tokenized)", { skip }, async () => {
  await setup();
  let x = await act(() => preview(`${HDR}9101,R1-new,10\r\n`, { "DS Rating": "DS_Rating", "Major Gift Score": "Major_Gift_Score" }));
  assert.equal(x.r.s, 400); assert.equal(x.r.j.error, "Map a column to the key CPTID"); assert.equal(x.frames, 0); assert.deepEqual(x.ids, []);
  x = await act(() => preview(`${HDR}9101,R1-new,10\r\n`, { CPTID: "CPTID", "DS Rating": "Not_A_Column" }));
  assert.equal(x.r.s, 400); assert.equal(x.r.j.error, "Map the key and at least one reviewable field"); assert.equal(x.frames, 0); assert.deepEqual(x.ids, []);
  x = await act(() => preview(`${HDR}9101,R1-new,77\r\n`, { CPTID: "CPTID", "DS Rating": "DS_Rating", "Major Gift Score": "Not_A_Column" }));
  assert.equal(x.r.s, 200, JSON.stringify(x.r.j)); assert.deepEqual(x.ids, PREV(1, "DS_Rating")); same(x);
  assert.deepEqual(x.r.j.result.columns.find((c: any) => c.header === "Major Gift Score"), { header: "Major Gift Score", col: "Not_A_Column", state: "unsupported", reason: "not a server-approved destination" });
  const row = x.r.j.result.rows[0]; assert.equal(row.outcome, "update");
  assert.deepEqual(row.fields.map((f: any) => [f.col, f.outcome, f.latest]), [["Not_A_Column", "held", "77"], ["DS_Rating", "apply", "R1-new"]]);
  assert.deepEqual(tokenOps(x.r.j.token).ops, [{ kind: "update", key: 9101, values: { DS_Rating: "R1-new" }, expected: { DS_Rating: "R1" } }]);
});

test("[PAIRED][MOCK SQL] apply refusals AR1-AR7: valid preview, then mutation, then snapshot -> 409 held, full rollback, trace ends at prospects lock", { skip }, async () => {
  const cases: [string, () => Promise<void>, string][] = [
    ["AR1 manual overlay", () => mutate(C.PU, () => [{ id: 7, client: "pvas", cptid: 9105, voided: 0 }]), "portal edit exists for this person (protected)"],
    ["AR2 portal prospect", () => mutate(C.PP, () => [{ client: "pvas", cptid: 9105 }]), "portal-created person (protected)"],
    ["AR3 baseline provenance unknown", () => mutate(C.BL, (r) => r.map((x) => x.record_key === "9105" && x.column_name === "DS_Rating" ? { ...x, provenance: "unknown" } : x)), "no source-owned baseline (ownership unknown)"],
    ["AR4 raw changed", () => mutate(C.RAW, (r) => r.map((x) => x.CPTID === 9105 ? { ...x, DS_Rating: "R5-manual" } : x)), "stale: current or baseline changed since preview"],
    ["AR5 baseline value changed", () => mutate(C.BL, (r) => r.map((x) => x.record_key === "9105" && x.column_name === "Major_Gift_Score" ? { ...x, value: "51" } : x)), "stale: current or baseline changed since preview"],
    ["AR6 raw row gone", () => mutate(C.RAW, (r) => r.filter((x) => x.CPTID !== 9105)), "record no longer exists"],
    ["AR7 duplicate raw row", () => mutate(C.RAW, (r) => [...r, { CPTID: 9105, DS_Rating: "R5", Major_Gift_Score: 50 }]), "duplicate destination rows"],
  ];
  for (const [name, m, reason] of cases) {
    await setup(); const pv = await previewOk(S92, 1); assert.ok(pv.token, name);
    await m();
    const a = await act(() => apply(pv.token));
    assert.equal(a.r.s, 409, name); assert.equal(a.r.j.code, "held", name); assert.equal(a.r.j.error, "Nothing was saved: protected, unowned or stale values. Preview again.", name);
    assert.ok(a.r.j.detail.held.some((h: any) => h.reason === reason), `${name}: ${JSON.stringify(a.r.j.detail)}`);
    assert.deepEqual(a.ids, LOCKS(1), name); same(a); assert.equal(a.rollbacks, 1, name);
    const st = await status(pv.requestId); assert.equal(st.j.found, false, name);
  }
});

test("[PAIRED][MOCK SQL] failures inside the transaction => website 202 unconfirmed, byte-identical rollback; status not found (not proof); same-token resend commits ONCE", { skip }, async () => {
  for (const fp of ["source.update.Major_Gift_Score", "source.updateBaseline", "source.insertAudit", "source.insertLog"]) {
    await setup(); const pv = await previewOk(S91, 2);
    await send({ kind: "failpoint", name: `throwAt:${fp}` });
    const a = await act(() => apply(pv.token));
    assert.equal(a.r.s, 202, fp); assert.deepEqual(a.r.j, { unconfirmed: true, requestId: pv.requestId, error: "Save not confirmed. Check status before doing anything else." }, fp);
    assert.equal(a.ids[a.ids.length - 1], fp); same(a); assert.equal(a.rollbacks, 1);
    const st = await status(pv.requestId); assert.equal(st.s, 200); assert.equal(st.j.found, false, "status only says not confirmed; rollback evidence is the snapshot");
    const r2 = await act(() => apply(pv.token)); assert.equal(r2.r.s, 200, fp); assert.equal(r2.r.j.replayed, false); assert.deepEqual(r2.ids, [...LOCKS(2), ...S91_WRITES]);
    assertS91(a.before, r2.after, pv.requestId);
    const r3 = await act(() => apply(pv.token)); assert.equal(r3.r.j.replayed, true); same(r3);
  }
  // reply lost AFTER commit: unconfirmed, state committed, status found, resend replays without a second write
  await setup(); const pv = await previewOk(S91, 2);
  await send({ kind: "failpoint", name: "afterCommit" });
  const a = await act(() => apply(pv.token)); assert.equal(a.r.s, 202); assert.equal(a.r.j.unconfirmed, true); assert.equal(a.r.j.requestId, pv.requestId);
  assertS91(a.before, a.after, pv.requestId);
  const st = await status(pv.requestId); assert.equal(st.j.found, true); assert.equal(st.j.status, "committed");
  const r2 = await act(() => apply(pv.token)); assert.equal(r2.r.j.replayed, true); assert.deepEqual(r2.ids, ["source.lockRequest"]); same(r2);
});

test("[PAIRED][MOCK SQL] expiry: E1 genuinely old token -> backend 409 expired after lockRequest; E2 website-clock-only expiry forwards + replays; E3 [DIRECT BACKEND] replay past expiry", { skip }, async () => {
  // E1: issued with website clock older than TTL, so exp < real wall time; website forwards (allowExpired), backend refuses
  await setup(); const old = deps({ now: () => Date.now() - SOURCE_TOKEN_TTL_MS - 60_000 });
  const p1 = await act(() => preview(S92, MAP, old)); assert.equal(p1.r.s, 200); assert.ok(tokenOps(p1.r.j.token).exp < Date.now());
  const e1 = await act(() => apply(p1.r.j.token, old)); assert.equal(e1.r.s, 409); assert.equal(e1.r.j.code, "expired"); assert.equal(e1.frames, 1);
  assert.deepEqual(e1.ids, ["source.lockRequest"], "expiry is checked after lockRequest, before any raw lock"); same(e1); assert.equal(e1.rollbacks, 1);
  // E2: commit at wall time, then advance ONLY the website clock past exp: forwarded, backend (not expired) replays.
  await setup(); const pv = await previewOk(S92, 1); const c1 = await apply(pv.token); assert.equal(c1.s, 200);
  const late = deps({ now: () => Date.now() + SOURCE_TOKEN_TTL_MS + 60_000 });
  const e2 = await act(() => apply(pv.token, late)); assert.equal(e2.r.s, 200); assert.equal(e2.r.j.replayed, true); assert.deepEqual(e2.ids, ["source.lockRequest"]); same(e2);
  // E3 [DIRECT BACKEND]: the real applySourceImport with an injected clock beyond exp (route never injects now)
  const body = applyRequestBody(pv.token, ACTOR, WS, Date.now());
  const e3 = await act(() => send({ kind: "directApply", request: body.request, now: body.request.previewExp + 1 }));
  assert.equal(e3.r.ok, true); assert.equal(e3.r.body.replayed, true); assert.deepEqual(e3.ids, ["source.lockRequest"]); same(e3);
  // ... and an UNcommitted request past expiry is refused (409 expired) by the same direct call
  const pv2 = await previewOk(`${HDR}9101,R1-z,10\r\n`, 1); const b2 = applyRequestBody(pv2.token, ACTOR, WS, Date.now());
  const e4 = await act(() => send({ kind: "directApply", request: b2.request, now: b2.request.previewExp + 1 }));
  assert.equal(e4.r.ok, false); assert.equal(e4.r.status, 409); assert.equal(e4.r.code, "expired"); same(e4);
});

test("[PAIRED][MOCK SQL] gate off 403 zero frames + status still works; cross-client token refused; [DIRECT BACKEND] request reuse 409 and CPTID/unregistered value 400 zero SQL", { skip }, async () => {
  await setup(); const pv = await previewOk(S92, 1);
  const off = deps({ env: { ...WENV, SOURCE_IMPORT_APPLY: undefined } as never });
  const g = await act(() => apply(pv.token, off)); assert.equal(g.r.s, 403); assert.equal(g.r.j.error, "Saving source data is turned off"); assert.equal(g.frames, 0); assert.deepEqual(g.ids, []); same(g);
  const s0 = await act(() => status(pv.requestId, off)); assert.equal(s0.r.s, 200); assert.equal(s0.r.j.found, false); assert.equal(s0.frames, 1);
  const x = await act(() => apply(pv.token, deps(), "wcbhc")); assert.equal(x.r.s, 400); assert.equal(x.r.j.error, "Preview token is for another client"); assert.equal(x.frames, 0); same(x);
  const ok = await apply(pv.token); assert.equal(ok.s, 200);
  const body = applyRequestBody(pv.token, ACTOR, WS, Date.now());
  const changed = { ...body.request, ops: [{ ...body.request.ops[0], values: { ...body.request.ops[0].values, DS_Rating: "R5-other" } }] };
  const ru = await act(() => send(breq({ op: "apply", request: changed })));
  assert.equal(ru.r.status, 409); assert.equal(JSON.parse(ru.r.body).code, "request_reused"); assert.deepEqual(ru.ids, ["source.lockRequest"]); same(ru);
  for (const [col, v] of [["CPTID", "9105"], ["Not_A_Column", "x"]]) {
    const bad = { ...body.request, requestId: "ab".repeat(16), ops: [{ kind: "update", key: 9105, values: { [col]: v }, expected: { [col]: "1" } }] };
    const r = await act(() => send(breq({ op: "apply", request: bad })));
    assert.equal(r.r.status, 400, col); assert.equal(JSON.parse(r.r.body).code, "invalid"); assert.equal(JSON.parse(r.r.body).error, `${col} is not a writable destination`); assert.deepEqual(r.ids, [], "rejected before any SQL"); same(r); assert.equal(r.tx, 0);
  }
});

test("[PAIRED][MOCK SQL] H3c coverage: every registered statement hit, none unsupported", { skip }, async () => {
  const unhit = statementIds.filter((i) => !hit.has(i));
  console.log(`H3C_COVERAGE hit=${JSON.stringify([...hit].sort())} unhit=${JSON.stringify(unhit)}`);
  assert.deepEqual(unhit, []); assert.ok(![...hit].some((i) => i.startsWith("UNSUPPORTED:")));
  const out = await inspect(false); assert.equal(out.stats.unsupported, 0); assert.equal(out.nextVersion, "14.2.35");
});
