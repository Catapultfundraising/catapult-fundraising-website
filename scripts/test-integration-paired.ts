// H3a PAIRED scenarios 1/3/5/8 (PLAN-H3-A1). REAL website handler (this repo, Next 15) <-> REAL backend handleSourceImport
// (pinned extract, its own Next 14) over stdio frames, backend SQL = strict hand-modelled MOCK. Fictional data only.
// NOT real SQL / HTTP / Vercel / hosted evidence. Every plan here is a DIRECT durableGiftPlan with explicit decisions
// ("direct plan, no preview read"); giftStage (JAG-only) is not used. Pins are supplied externally (see test-harness-h2.ts).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { handleResearchSourceImport, prodDeps, type ResearchDeps } from "../lib/portal-v2/research-source-import-handler";
import { commitBody } from "../lib/portal-v2/gift-durable";
import { startChild, type Pin } from "./harness/paired-client";
import { H3_REG, H3_ACT, H3_ACT_NONE, H3_SEED, T } from "./harness/fixtures-h3";

const E = process.env;
const pin: Pin | null = E.HARNESS_BACKEND_DIR && E.HARNESS_BACKEND_INVENTORY && E.HARNESS_BACKEND_LOCK_SHA256 && E.HARNESS_BACKEND_NEXT
  ? { dir: E.HARNESS_BACKEND_DIR, inventory: E.HARNESS_BACKEND_INVENTORY, lockSha256: E.HARNESS_BACKEND_LOCK_SHA256, next: E.HARNESS_BACKEND_NEXT } : null;
if (!pin && E.HARNESS_ACCEPTANCE === "1") test("acceptance requires the pinned backend child (H3a)", () => { assert.fail("HARNESS_ACCEPTANCE=1 but pinned backend inputs are missing"); });
const skip = pin ? false : "NOTRUN: pinned backend extract not supplied";

const PW = "fictional-pw", AS = "fictional-auth-secret-0123456789", WS = "w".repeat(32), NOW = 1_800_000_000_000;
const COOKIE = createHash("sha256").update(`${PW}:${AS}`).digest("hex");
const WENV = { RESEARCH_PASSWORD: PW, RESEARCH_AUTH_SECRET: AS, SOURCE_IMPORT_PREVIEW: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: WS, SOURCE_IMPORT_APPLY: "enabled" };
const BENV = { PORTAL_WRITE_SECRET: WS, SOURCE_IMPORT_SQL_CONNECTION: "mock", PORTAL_SOURCE_IMPORT_APPLY: "enabled" };
const BENV_OFF = { PORTAL_WRITE_SECRET: WS, SOURCE_IMPORT_SQL_CONNECTION: "mock" };
const CSV = "Donor,Amount,Date,Type\r\n7001,100,2026-01-05T00:00:00,Gift\r\n";
const MAP = { Donor: "@person", Amount: "Gift_Amount", Date: "Gift_Date", Type: "Record_Type" };
const DEC = [{ o: 0, d: "new" }];
const TBL = H3_REG.table;
globalThis.fetch = (async () => { throw new Error("GUARD: global fetch must never be used"); }) as typeof fetch;

const c = pin ? startChild(pin, "scripts/harness/backend-child.ts", ["h3"]) : null;
after(async () => { if (c && !c.dead()) { await c.send({ kind: "shutdown" }).catch(() => undefined); } c?.kill(); });
const send = (f: Record<string, unknown>) => c!.send(f);
const inspect = async (dump = true) => send({ kind: "inspect", dump }) as Promise<Record<string, any>>;
const hit = new Set<string>(); let statementIds: string[] = [];
let frames = 0; let lastBackend: { status: number; body: any } | null = null;
const wfetch = (async (u: string | URL, i?: RequestInit) => { frames++; const r = await c!.fetchImpl(u, i); lastBackend = { status: r.status, body: await r.clone().json().catch(() => null) }; return r; }) as typeof fetch;
const deps = (o: Partial<ResearchDeps> = {}): ResearchDeps => ({ fetchImpl: wfetch, env: WENV, transportApproved: true, giftRegistrations: [H3_REG] as never, prepared: [], now: () => NOW, ...o });
const H = (body: Record<string, unknown>, d: ResearchDeps = deps(), cookie = true) => handleResearchSourceImport(new NextRequest("http://localhost/api/research-source-import", { method: "POST",
  headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost", ...(cookie ? { cookie: `catapult_research_auth=${COOKIE}` } : {}) }, body: JSON.stringify(body) }), d);
const breq = (body: unknown) => ({ kind: "request", url: "https://engage.invalid/api/source-import", method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${WS}` }, body: JSON.stringify(body) });

async function setup(o: { tables?: Record<string, unknown[]>; activation?: unknown; regs?: unknown[]; env?: Record<string, string> } = {}) {
  await send({ kind: "reset" });
  await send({ kind: "seed", tables: { ...H3_SEED, ...(o.tables ?? {}) }, deps: { env: o.env ?? BENV, activation: o.activation ?? H3_ACT, giftRegistrations: o.regs ?? [H3_REG] } });
  frames = 0; lastBackend = null;
}
const seedMore = (tables: Record<string, unknown[]>) => send({ kind: "seed", tables });
/** Run an action; returns the statement ids it executed and the full durable state before (AFTER all setup) and after. */
async function act<R>(fn: () => Promise<R>) {
  const b = await inspect(); const n0 = b.trace.length; const tx0 = b.stats.tx; const rb0 = b.stats.rollbacks;
  const r = await fn(); const a = await inspect(); const ids = a.trace.slice(n0).map((t: any) => t.id as string); ids.forEach((i: string) => hit.add(i)); statementIds = a.statements.map((s: any) => s.id);
  return { r, ids, before: b.tables, after: a.tables, tx: a.stats.tx - tx0, rollbacks: a.stats.rollbacks - rb0, unsupported: a.stats.unsupported };
}
async function plan(d = deps()) {
  const r = await H({ op: "durableGiftPlan", client: "wcbhc", table: TBL, csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat Fictional", fileName: "h3-fict.csv", fileDate: null }, d);
  assert.equal(r.status, 200, "direct plan (no preview read)"); return r.json();
}
const commit = (pl: any, d = deps(), rows = pl.batches[0], batchIndex = 0) => H({ op: "durableGiftCommit", client: "wcbhc", table: TBL, token: pl.token, manifest: pl.manifest, batchIndex, rows }, d);
const HAPPY = ["gift.lockRequest", "gift.lockJob", "gift.lockManifest", "gift.lockAssoc(1)", "gift.lockMaster(1)", "source.lockGiftOverrides", "gift.lockOverlays(1)", "gift.lockProspects(1)", "gift.lockMax",
  "gift.insertRequest", "gift.insertJob", "gift.insertManifest", "gift.rawInsert", "gift.insertIdentity", "gift.insertDecision", "gift.insertAssoc",
  "gift.insertBaseline", "gift.insertAudit", "gift.insertBaseline", "gift.insertAudit", "gift.insertBaseline", "gift.insertAudit", "gift.countLoc(1)", "gift.insertBatch", "gift.insertLog", "gift.insertLedger"];

test("[PAIRED][MOCK SQL] scenario 1 default-off: 1a prodDeps no cookie 401; 1b empty registry 404; 1c transport=false 503 no fetch; 1d backend apply OFF 503 zero SQL/tx", { skip }, async () => {
  await setup(); const pl = await plan();
  const a = await act(async () => (await H({ op: "durableGiftCommit", client: "wcbhc", table: TBL, token: pl.token, manifest: pl.manifest, batchIndex: 0, rows: pl.batches[0] }, prodDeps(), false)).status);
  assert.equal(a.r, 401, "1a literal prodDeps without auth"); assert.deepEqual(a.ids, []); assert.equal(frames, 0);
  const b = await act(async () => (await commit(pl, deps({ giftRegistrations: [] }))).status); assert.equal(b.r, 404, "1b no reviewed registration"); assert.equal(frames, 0); assert.deepEqual(b.ids, []);
  const c1 = await act(async () => { const r = await commit(pl, deps({ transportApproved: false })); return { s: r.status, j: await r.json() }; });
  assert.equal(c1.r.s, 503); assert.equal(c1.r.j.code, "disabled"); assert.equal(frames, 0, "1c fetch never called"); assert.deepEqual(c1.ids, []);
  await setup({ env: BENV_OFF });
  const body = commitBody({ client: "wcbhc", token: pl.token, manifest: pl.manifest, batchIndex: 0, rows: pl.batches[0], secret: AS, now: NOW, regs: [H3_REG] as never });
  const d = await act(async () => send(breq(body)) as Promise<any>);
  assert.equal(d.r.status, 503); assert.equal(JSON.parse(d.r.body).code, "disabled"); assert.deepEqual(d.ids, [], "1d zero statements"); assert.equal(d.tx, 0, "1d zero transactions"); assert.deepEqual(d.after, d.before);
});

test("[PAIRED][MOCK SQL] scenario 3 commit, exact statement order, unchanged replay (no durable change), website-local tamper refusal, direct backend same-request reuse 409", { skip }, async () => {
  await setup(); const pl = await plan();
  const a = await act(async () => { const r = await commit(pl); return { s: r.status, j: await r.json() }; });
  assert.equal(a.r.s, 200, JSON.stringify(a.r.j)); assert.equal(a.r.j.committed, true); assert.deepEqual(a.ids, HAPPY, "exact real statement sequence"); assert.equal(a.unsupported, 0);
  const D1 = a.after; const led = D1[T.LG]; assert.equal(led.length, 1);
  assert.deepEqual(JSON.parse(led[0].outcome_json), a.r.j.outcome, "website outcome == the outcome the real backend stored");
  assert.equal(D1[T.RAW].length, 1); assert.equal(D1[T.RAW][0].CPTID, 7001); assert.equal(D1[T.RAW][0].Transaction, null); assert.equal(D1[T.BL].length, 3); assert.equal(D1[T.AU].length, 3);
  assert.equal(D1[T.ID][0].gift_id, a.r.j.outcome.rows[0].giftId, "identity generated+stored by the real backend");
  const rp = await act(async () => { const r = await commit(pl); return { s: r.status, j: await r.json() }; });
  assert.equal(rp.r.s, 200); assert.equal(rp.r.j.outcome.replayed, true); assert.deepEqual(rp.ids, ["gift.lockRequest"]); assert.deepEqual(rp.after, D1, "replay changes no durable table");
  // website-local tamper (valid token/manifest, altered rows / batchIndex): must refuse locally with NO frame
  const f0 = frames;
  const alt = JSON.parse(JSON.stringify(pl.batches[0])); alt[0].values.Gift_Amount = "999";
  const t1 = await act(async () => (await commit(pl, deps(), alt)).status); assert.notEqual(t1.r, 200); assert.equal(frames, f0, "FINDING if forwarded: altered rows reached backend");
  const t2 = await act(async () => (await commit(pl, deps(), pl.batches[0], 1)).status); assert.notEqual(t2.r, 200); assert.equal(frames, f0, "FINDING if forwarded: altered batchIndex reached backend");
  assert.deepEqual(t2.after, D1);
  // direct backend: same requestId, different payload (job ref removed) => 409 request-reused, only lockRequest
  const body = commitBody({ client: "wcbhc", token: pl.token, manifest: pl.manifest, batchIndex: 0, rows: pl.batches[0], secret: AS, now: NOW, regs: [H3_REG] as never });
  const { job: _j, ...nojob } = body.request as unknown as Record<string, unknown>;
  const dz = await act(async () => send(breq({ op: "giftCommit", request: nojob })) as Promise<any>);
  assert.equal(dz.r.status, 409); assert.equal(JSON.parse(dz.r.body).code, "request-reused"); assert.deepEqual(dz.ids, ["gift.lockRequest"]); assert.deepEqual(dz.after, D1);
});

test("[PAIRED][MOCK SQL] scenario 5 refusals with no writes: expiry, registry change (website+backend), active override, manual edit after plan, W0 not activated", { skip }, async () => {
  // expiry: real clock-derived token, now past expiry => local refusal, no frame
  await setup(); let pl = await plan();
  const ex = await act(async () => (await commit(pl, deps({ now: () => NOW + 400 * 86400_000 }))).status); assert.notEqual(ex.r, 200); assert.equal(frames, 0); assert.deepEqual(ex.ids, []);
  // registry change: website (version 2) refuses old token locally; backend with v2 registration refuses v1 request after lockRequest only
  const V2 = { ...H3_REG, version: 2 };
  const rw = await act(async () => (await commit(pl, deps({ giftRegistrations: [V2] as never }))).status); assert.equal(rw.r, 409); assert.equal(frames, 0); assert.deepEqual(rw.after, rw.before);
  await setup({ regs: [V2] });
  const body = commitBody({ client: "wcbhc", token: pl.token, manifest: pl.manifest, batchIndex: 0, rows: pl.batches[0], secret: AS, now: NOW, regs: [H3_REG] as never });
  const rb = await act(async () => send(breq(body)) as Promise<any>); assert.ok([400, 409].includes(rb.r.status), String(rb.r.status)); assert.deepEqual(rb.ids, ["gift.lockRequest"]); assert.deepEqual(rb.after, rb.before);
  // active portal gift override (seeded) => 409 portal-gift-override; locks only, no writes
  await setup({ tables: { [T.GO]: [{ id: 1, client: "wcbhc", superseded: 0 }] } }); pl = await plan();
  const ov = await act(async () => { const r = await commit(pl); return { s: r.status, j: await r.json() }; });
  assert.equal(ov.r.s, 400); assert.equal(ov.r.j.code, "refused"); assert.equal(lastBackend!.status, 409); assert.equal(lastBackend!.body.code, "portal-gift-override");
  assert.equal(ov.ids.at(-1), "source.lockGiftOverrides"); assert.ok(!ov.ids.some((i: string) => /insert/.test(i))); assert.deepEqual(ov.after, ov.before);
  // manual portal edit AFTER plan (snapshot taken after that edit) => 409 portal-protected
  await setup(); pl = await plan(); await seedMore({ [T.PU]: [{ id: 1, client: "wcbhc", cptid: 7001, voided: 0 }] });
  const me = await act(async () => (await commit(pl)).status); assert.equal(me.r, 400); assert.equal(lastBackend!.body.code, "portal-protected");
  assert.equal(me.ids.at(-1), "gift.lockProspects(1)"); assert.equal(me.before[T.PU].length, 1, "snapshot is after the manual edit"); assert.deepEqual(me.after, me.before);
  // W0 not activated (empty valid policy) => 409 gift_source_not_activated, lockRequest only
  await setup({ activation: H3_ACT_NONE }); pl = await plan();
  const na = await act(async () => (await commit(pl)).status); assert.equal(na.r, 400); assert.equal(lastBackend!.status, 409); assert.equal(lastBackend!.body.code, "gift_source_not_activated");
  assert.deepEqual(na.ids, ["gift.lockRequest"]); assert.deepEqual(na.after, na.before);
});

test("[PAIRED][MOCK SQL] scenario 8: backend disabled 503 (refused, zero SQL) vs throw inside tx at insertLedger => 502 unconfirmed + full rollback", { skip }, async () => {
  await setup({ env: BENV_OFF }); let pl = await plan();
  const off = await act(async () => { const r = await commit(pl); return { s: r.status, j: await r.json() }; });
  assert.equal(off.r.s, 503); assert.equal(off.r.j.code, "refused"); assert.equal(lastBackend!.body.code, "disabled"); assert.deepEqual(off.ids, []); assert.equal(off.tx, 0);
  await setup(); pl = await plan(); await send({ kind: "failpoint", name: "throwAt:gift.insertLedger" });
  const fp = await act(async () => { const r = await commit(pl); return { s: r.status, j: await r.json() }; });
  assert.equal(fp.r.s, 502); assert.equal(fp.r.j.code, "unconfirmed"); assert.match(fp.r.j.requestId, /^[0-9a-f]{32}$/); assert.equal(lastBackend!.status, 500);
  assert.deepEqual(fp.ids, HAPPY, "failed at the last statement after every prior write"); assert.equal(fp.rollbacks, 1); assert.deepEqual(fp.after, fp.before, "EVERY table restored");
});

test("[PAIRED][MOCK SQL] real-generator negative: 4-row batch => backend's own lockAssoc(4) is unregistered => fails closed (unsupported), website 502 unconfirmed, full rollback", { skip }, async () => {
  await setup();
  const csv4 = "Donor,Amount,Date,Type\r\n7001,1,2026-01-05T00:00:00,Gift\r\n7002,2,2026-01-06T00:00:00,Gift\r\n7001,3,2026-01-07T00:00:00,Gift\r\n7002,4,2026-01-08T00:00:00,Gift\r\n";
  const pr = await H({ op: "durableGiftPlan", client: "wcbhc", table: TBL, csv: csv4, mapping: MAP, decisions: [0, 1, 2, 3].map((o) => ({ o, d: "new" })), actor: "Pat Fictional", fileName: "h3-fict4.csv", fileDate: null });
  assert.equal(pr.status, 200); const pl = await pr.json(); assert.equal(pl.batches[0].length, 4);
  const u0 = (await inspect(false)).stats.unsupported;
  const r = await act(async () => { const x = await commit(pl); return { s: x.status, j: await x.json() }; });
  assert.equal(r.r.s, 502); assert.equal(r.r.j.code, "unconfirmed"); assert.equal(r.unsupported - u0, 1);
  assert.match(r.ids.at(-1)!, /^UNSUPPORTED:[0-9a-f]{12}$/); assert.deepEqual(r.ids.slice(0, 3), ["gift.lockRequest", "gift.lockJob", "gift.lockManifest"]); assert.equal(r.rollbacks, 1); assert.deepEqual(r.after, r.before);
});

test("[PAIRED][MOCK SQL] coverage inventory of registered statements (hit vs not hit by H3a)", { skip }, async () => {
  const unhit = statementIds.filter((i) => !hit.has(i));
  console.log(`H3A_COVERAGE hit=${JSON.stringify([...hit].sort())} unhit=${JSON.stringify(unhit)}`);
  for (const id of HAPPY) assert.ok(hit.has(id)); hit.forEach((i) => { if (i.startsWith("UNSUPPORTED:")) hit.delete(i); });
  const out = await inspect(false); assert.deepEqual(out.outsideBackend.sort(), ["harness/backend-child.ts", "harness/fixtures-h3.ts", "harness/gift-defs-h3.ts", "harness/mock-sql.ts"]); assert.equal(out.nextVersion, "14.2.35");
});
