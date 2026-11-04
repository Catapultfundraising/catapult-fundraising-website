// H3b PAIRED scenarios 2/4/6/7 (PLAN-H3B + PLAN-H3B-A1). REAL website handler (this repo) <-> REAL backend
// handleSourceImport (pinned extract, own Next 14) over stdio frames; backend SQL = strict hand-modelled MOCK.
// Fictional data only. NOT real SQL / HTTP / Vercel / hosted / browser evidence. Every outcome, gift UUID, status,
// proof, export and review result below is produced by the real functions; nothing is synthesized. Manifests/jobs are
// only ever built by the real buildDurablePlan/planGiftJob (no forged manifests; job-changed is NOT claimed).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { handleResearchSourceImport, type ResearchDeps } from "../lib/portal-v2/research-source-import-handler";
import { commitBody } from "../lib/portal-v2/gift-durable";
import { startChild, type Pin } from "./harness/paired-client";
import { H3_REG, H3_ACT, H3B_SEED, T } from "./harness/fixtures-h3";

const E = process.env;
const pin: Pin | null = E.HARNESS_BACKEND_DIR && E.HARNESS_BACKEND_INVENTORY && E.HARNESS_BACKEND_LOCK_SHA256 && E.HARNESS_BACKEND_NEXT
  ? { dir: E.HARNESS_BACKEND_DIR, inventory: E.HARNESS_BACKEND_INVENTORY, lockSha256: E.HARNESS_BACKEND_LOCK_SHA256, next: E.HARNESS_BACKEND_NEXT } : null;
if (!pin && E.HARNESS_ACCEPTANCE === "1") test("acceptance requires the pinned backend child (H3b)", () => { assert.fail("HARNESS_ACCEPTANCE=1 but pinned backend inputs are missing"); });
const skip = pin ? false : "NOTRUN: pinned backend extract not supplied";

const PW = "fictional-pw", AS = "fictional-auth-secret-0123456789", WS = "w".repeat(32), NOW = 1_800_000_000_000;
const COOKIE = createHash("sha256").update(`${PW}:${AS}`).digest("hex");
const WENV = { RESEARCH_PASSWORD: PW, RESEARCH_AUTH_SECRET: AS, SOURCE_IMPORT_PREVIEW: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: WS, SOURCE_IMPORT_APPLY: "enabled" };
const BENV = { PORTAL_WRITE_SECRET: WS, SOURCE_IMPORT_SQL_CONNECTION: "mock", PORTAL_SOURCE_IMPORT_APPLY: "enabled" };
const MAP = { Donor: "@person", Amount: "Gift_Amount", Date: "Gift_Date", Type: "Record_Type" };
const HDR = "Donor,Amount,Date,Type\r\n";
const TBL = H3_REG.table;
globalThis.fetch = (async () => { throw new Error("GUARD: global fetch must never be used"); }) as typeof fetch;

const c = pin ? startChild(pin, "scripts/harness/backend-child.ts", ["h3"]) : null;
after(async () => { if (c && !c.dead()) { await c.send({ kind: "shutdown" }).catch(() => undefined); } c?.kill(); });
const send = (f: Record<string, unknown>) => c!.send(f);
const inspect = async (dump = true) => send({ kind: "inspect", dump }) as Promise<Record<string, any>>;
const hit = new Set<string>(); let statementIds: string[] = [];
let frames = 0; let lastBackend: { status: number; body: any } | null = null; let dropNextReply = false;
// Transport wrapper: forwards the frame to the real backend child. With dropNextReply the child has ALREADY run (and
// committed) when the reply is discarded and a transport error thrown: an after-COMMIT lost reply at the transport.
const wfetch = (async (u: string | URL, i?: RequestInit) => { frames++; const r = await c!.fetchImpl(u, i); lastBackend = { status: r.status, body: await r.clone().json().catch(() => null) };
  if (dropNextReply) { dropNextReply = false; throw new TypeError("fetch failed (test: reply dropped after the backend returned)"); } return r; }) as typeof fetch;
const deps = (o: Partial<ResearchDeps> = {}): ResearchDeps => ({ fetchImpl: wfetch, env: WENV, transportApproved: true, giftRegistrations: [H3_REG] as never, prepared: [], now: () => NOW, ...o });
const H = async (body: Record<string, unknown>, d: ResearchDeps = deps()) => { const r = await handleResearchSourceImport(new NextRequest("http://localhost/api/research-source-import", { method: "POST",
  headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost", cookie: `catapult_research_auth=${COOKIE}` }, body: JSON.stringify(body) }), d); return { s: r.status, j: await r.json() as any }; };
const breq = (body: unknown) => ({ kind: "request", url: "https://engage.invalid/api/source-import", method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${WS}` }, body: JSON.stringify(body) });

async function setup() {
  await send({ kind: "reset" });
  await send({ kind: "seed", tables: H3B_SEED, deps: { env: BENV, activation: H3_ACT, giftRegistrations: [H3_REG] } });
  frames = 0; lastBackend = null; dropNextReply = false;
}
const seedMore = (tables: Record<string, unknown[]>) => send({ kind: "seed", tables });
/** Run an action; statement ids it executed + COMPLETE durable state before (after all setup/manual edits) and after. */
async function act<R>(fn: () => Promise<R>) {
  const b = await inspect(); const n0 = b.trace.length; const tx0 = b.stats.tx; const rb0 = b.stats.rollbacks; const f0 = frames;
  const r = await fn(); const a = await inspect(); const ids = a.trace.slice(n0).map((t: any) => t.id as string); ids.forEach((i: string) => hit.add(i)); statementIds = a.statements.map((s: any) => s.id);
  return { r, ids, before: b.tables as Record<string, any[]>, after: a.tables as Record<string, any[]>, tx: a.stats.tx - tx0, rollbacks: a.stats.rollbacks - rb0, unsupported: a.stats.unsupported, frames: frames - f0 };
}
const refusedNoChange = (x: { before: unknown; after: unknown; rollbacks: number }, rollbacks = 1) => { assert.deepEqual(x.after, x.before, "EVERY durable table equals the pre-action snapshot"); assert.equal(x.rollbacks, rollbacks); };
const plan = async (csv: string, decisions: unknown[], actor = "Pat Fictional", fileName = "h3b-fict.csv") => {
  const r = await H({ op: "durableGiftPlan", client: "wcbhc", table: TBL, csv, mapping: MAP, decisions, actor, fileName, fileDate: null }); assert.equal(r.s, 200, JSON.stringify(r.j)); return r.j; };
const commit = (pl: any, batchIndex = 0, d = deps(), token = pl.token) => H({ op: "durableGiftCommit", client: "wcbhc", table: TBL, token, manifest: pl.manifest, batchIndex, rows: pl.batches[batchIndex] }, d);
const preview = (query: Record<string, unknown>) => H({ op: "durableGiftPreview", client: "wcbhc", table: TBL, query });
const proof = (pl: any, batchIndex = 0, token = pl.token) => H({ op: "durableGiftProof", client: "wcbhc", table: TBL, token, manifest: pl.manifest, batchIndex });
const jobStatus = (jobId: string) => H({ op: "durableGiftJobStatus", client: "wcbhc", table: TBL, jobId });
const cellsOf = (row: any) => Object.fromEntries(Object.entries(row.values).map(([k, v]: [string, any]) => { assert.equal(v.readable, true); return [k, v.v]; }));
const W = ["gift.insertBaseline", "gift.insertAudit"];
const NEW_ROW = ["gift.rawInsert", "gift.insertIdentity", "gift.insertDecision", "gift.insertAssoc", ...W, ...W, ...W];
const LOCKS1 = ["gift.lockMaster(1)", "source.lockGiftOverrides", "gift.lockOverlays(1)", "gift.lockProspects(1)"];
const ONE_NEW_FIRST = ["gift.lockRequest", "gift.lockJob", "gift.lockManifest", "gift.lockAssoc(1)", ...LOCKS1, "gift.lockMax", "gift.insertRequest", "gift.insertJob", "gift.insertManifest", ...NEW_ROW, "gift.countLoc(1)", "gift.insertBatch", "gift.insertLog", "gift.insertLedger"];
const S2_CSV = `${HDR}7001,100,2026-01-05T00:00:00,Gift\r\n7001,5,2025-03-01T00:00:00,Gift\r\n`;

/** Durable relationships for one committed gift id, asserted against the stored tables. */
function rel(D: Record<string, any[]>, gid: string, want: { action: string; loc: number; person: number; source: boolean }) {
  const id = D[T.ID].filter((x) => x.gift_id === gid); assert.equal(id.length, 1, "exactly one identity");
  assert.equal(id[0].raw_locator, want.loc); assert.equal(id[0].donor_cptid, want.person); assert.equal(id[0].registration_id, H3_REG.id);
  const raw = D[T.RAW].filter((x) => x.row_id === want.loc); assert.equal(raw.length, 1, "identity points at exactly one raw row"); assert.equal(raw[0].CPTID, want.person, "raw donor == identity donor");
  const dec = D[T.DC].filter((x) => x.gift_id === gid && x.action === want.action); assert.ok(dec.length >= 1, "decision row");
  const as = D[T.AS].filter((x) => x.gift_id === gid); assert.ok(as.length >= 1); for (const a of as) assert.ok(D[T.DC].some((x) => x.decision_id === a.decision_id && x.request_id === a.request_id && x.row_ordinal === a.row_ordinal), "association <-> decision");
  const bl = D[T.BL].filter((x) => x.record_key === `gift:${gid}`), au = D[T.AU].filter((x) => x.record_key === `gift:${gid}`);
  if (want.source) { assert.equal(bl.length, 3, "source baseline for every registered column"); assert.ok(bl.every((x) => x.provenance === "source")); for (const b of bl) assert.equal(b.value, raw[0][b.column_name], "baseline == raw cell"); assert.ok(au.length >= 3); }
  else { assert.equal(bl.length, 0, "adoption creates NO baseline (no ownership)"); assert.equal(au.length, 0, "adoption creates NO audit row"); }
}

/** Scenario 2 core (real preview -> plan -> commit). Returns plan, commit result, and the act record. */
async function scenario2Commit() {
  const pp = await act(() => preview({ kind: "persons", persons: [7001, 7002] }));
  assert.equal(pp.r.s, 200, JSON.stringify(pp.r.j)); assert.deepEqual(pp.ids, ["preview.overrides", "preview.master(2)", "preview.overlays(2)", "preview.prospects(2)"]);
  assert.deepEqual(pp.r.j.persons, [{ person: 7001, masterMatches: 1, portalOverlay: false, portalProspect: false }, { person: 7002, masterMatches: 1, portalOverlay: false, portalProspect: false }]);
  const ph = await act(() => preview({ kind: "history", person: 7001 }));
  assert.equal(ph.r.s, 200); assert.deepEqual(ph.ids, ["preview.overrides", "preview.history", "preview.values(1)", "preview.idsByLoc(1)"], "baseline skipped (no identity yet)");
  assert.equal(ph.r.j.rows.length, 1); assert.equal(ph.r.j.rows[0].locator, 41); assert.equal(ph.r.j.hasMore, false);
  const pl41 = await act(() => preview({ kind: "locators", locators: [41] }));
  assert.equal(pl41.r.s, 200); assert.deepEqual(pl41.ids, ["preview.overrides", "preview.countLoc(1)", "preview.values(1)", "preview.idsByLoc(1)"]);
  const r41 = pl41.r.j.rows[0]; assert.equal(r41.person, 7001); assert.equal(r41.giftId, null); assert.equal(r41.baseline, null);
  for (const x of [pp, ph, pl41]) { assert.deepEqual(x.after, x.before, "preview reads change nothing"); assert.equal(x.tx, 0); }
  const expected = cellsOf(r41); // decisions driven by the REAL preview projection
  const pl = await plan(S2_CSV, [{ o: 0, d: "new" }, { o: 1, d: "adopt", locator: 41, expected }]);
  assert.equal(pl.manifest.batchCount, 1);
  const cm = await act(() => commit(pl));
  return { pl, cm, expected };
}

test("[PAIRED][MOCK SQL] scenario 2: real preview -> plan -> commit (new + adopt) -> proof -> job complete -> export -> review check -> renew", { skip }, async () => {
  await setup();
  const { pl, cm } = await scenario2Commit();
  assert.equal(cm.r.s, 200, JSON.stringify(cm.r.j)); assert.equal(cm.unsupported, 0);
  assert.deepEqual(cm.ids, ["gift.lockRequest", "gift.lockJob", "gift.lockManifest", "gift.lockAssoc(2)", "gift.lockIdsByLoc(1)", "gift.lockRaw(1)", ...LOCKS1, "gift.lockMax",
    "gift.insertRequest", "gift.insertJob", "gift.insertManifest", ...NEW_ROW, "gift.insertIdentity", "gift.insertDecision", "gift.insertAssoc", "gift.countLoc(1)", "gift.insertBatch", "gift.insertLog", "gift.insertLedger"]);
  const D = cm.after; const out = cm.r.j.outcome;
  assert.deepEqual(JSON.parse(D[T.LG][0].outcome_json), out, "website outcome == stored ledger outcome");
  const nw = out.rows.find((x: any) => x.action === "new"), ad = out.rows.find((x: any) => x.action === "adopt");
  assert.equal(nw.locator, 43, "allocator: MAX(41,42)+1"); assert.equal(ad.locator, 41);
  rel(D, nw.giftId, { action: "new", loc: 43, person: 7001, source: true });
  rel(D, ad.giftId, { action: "adopt", loc: 41, person: 7001, source: false });
  assert.deepEqual(D[T.RAW].find((x) => x.row_id === 41), cm.before[T.RAW].find((x: any) => x.row_id === 41), "adopt leaves the raw row untouched");
  assert.equal(D[T.LOG].length, 1); assert.equal(D[T.LOG][0].records, 1, "adopt-only work is not a raw source update");
  // proof from real status
  const pf = await act(() => proof(pl)); assert.equal(pf.r.s, 200); assert.equal(pf.r.j.confirmed, true); assert.deepEqual(pf.ids, ["gift.status"]); assert.deepEqual(pf.after, D);
  const js = await act(() => jobStatus(pl.jobId)); assert.equal(js.r.j.state, "complete"); assert.deepEqual(js.r.j.committedBatches, [0]); assert.deepEqual(js.ids, ["gift.jobStatus", "gift.jobBatches"]);
  // export / review / renew from the real proof (no backend statements)
  const ex = await act(() => H({ op: "durableGiftExport", client: "wcbhc", table: TBL, csv: S2_CSV, token: pl.token, manifest: pl.manifest, proofs: [pf.r.j.proof] }));
  assert.equal(ex.r.s, 200); assert.equal(ex.r.j.proven, 2); assert.deepEqual(ex.ids, []); assert.equal(ex.frames, 0);
  const lines = ex.r.j.csv.trim().split("\r\n"); assert.equal(lines.length, 3);
  assert.ok(lines[1].includes(`"${nw.giftId}"`) && lines[2].includes(`"${ad.giftId}"`), "export carries the backend-generated UUIDs");
  const rc = await H({ op: "durableGiftReviewCheck", client: "wcbhc", table: TBL, original: S2_CSV, reviewCopy: ex.r.j.csv, header: pl.recovery.header, headerMac: pl.recovery.headerMac, jobToken: pl.token, proofs: [pf.r.j.proof] });
  assert.equal(rc.s, 200, JSON.stringify(rc.j)); assert.equal(rc.j.counts.verified, 2); assert.deepEqual(rc.j.rows.map((x: any) => x.giftId), [nw.giftId, ad.giftId]);
  const rn = await H({ op: "durableGiftRenew", client: "wcbhc", table: TBL, header: pl.recovery.header, headerMac: pl.recovery.headerMac, jobToken: pl.token }, deps({ now: () => NOW + 2 * 3600_000 }));
  assert.equal(rn.s, 200); assert.equal(rn.j.jobId, pl.jobId, "renewal keeps jobId (and every derived request id)");
  const pf2 = await H({ op: "durableGiftProof", client: "wcbhc", table: TBL, token: rn.j.token, manifest: pl.manifest, batchIndex: 0 }, deps({ now: () => NOW + 2 * 3600_000 }));
  assert.equal(pf2.j.confirmed, true, "renewed token re-proves from real status");
  const fin = await inspect(); assert.deepEqual(fin.tables, D, "proof/status/export/review/renew wrote nothing");
});

test("[PAIRED][MOCK SQL] scenario 4: (a) in-tx failure -> unconfirmed, real status pending, same request resent commits; (b) reply dropped AFTER COMMIT -> unconfirmed, real proof, replay no second write", { skip }, async () => {
  await setup();
  const pl = await plan(`${HDR}7002,20,2026-02-01T00:00:00,Gift\r\n`, [{ o: 0, d: "new" }]);
  await send({ kind: "failpoint", name: "throwAt:gift.insertLedger" });
  const fa = await act(() => commit(pl));
  assert.equal(fa.r.s, 502); assert.equal(fa.r.j.code, "unconfirmed"); assert.deepEqual(fa.ids, ONE_NEW_FIRST); refusedNoChange(fa);
  const rq = fa.r.j.requestId;
  const pa = await act(() => proof(pl)); assert.equal(pa.r.s, 200); assert.equal(pa.r.j.confirmed, false); assert.equal(pa.r.j.state, "pending"); assert.equal(pa.r.j.requestId, rq);
  assert.equal(pa.r.j.proof, undefined, "no proof synthesized"); assert.deepEqual(pa.ids, ["gift.status"]); assert.deepEqual(lastBackend!.body.found, false);
  const ra = await act(() => commit(pl)); assert.equal(ra.r.s, 200); assert.equal(ra.r.j.requestId, rq, "same request id resent"); assert.deepEqual(ra.ids, ONE_NEW_FIRST);
  assert.equal((await proof(pl)).j.confirmed, true);
  // (b) after-COMMIT drop at the transport
  await setup();
  const pl2 = await plan(`${HDR}7002,21,2026-02-02T00:00:00,Gift\r\n`, [{ o: 0, d: "new" }]);
  dropNextReply = true;
  const fb = await act(() => commit(pl2));
  assert.equal(fb.r.s, 502); assert.equal(fb.r.j.code, "unconfirmed"); assert.match(fb.r.j.requestId, /^[0-9a-f]{32}$/);
  assert.equal(lastBackend!.status, 200, "backend had committed before the reply was dropped"); assert.deepEqual(fb.ids, ONE_NEW_FIRST); assert.equal(fb.rollbacks, 0);
  const D1 = fb.after; assert.equal(D1[T.LG].length, 1); assert.equal(D1[T.LG][0].request_id, fb.r.j.requestId);
  const pb = await act(() => proof(pl2)); assert.equal(pb.r.j.confirmed, true, "confirmed only from the real stored outcome"); assert.deepEqual(pb.after, D1);
  const rp = await act(() => commit(pl2)); assert.equal(rp.r.s, 200); assert.equal(rp.r.j.outcome.replayed, true); assert.deepEqual(rp.ids, ["gift.lockRequest"]);
  assert.deepEqual(rp.after, D1, "replay: no second write, every table unchanged");
  const gid = JSON.parse(D1[T.LG][0].outcome_json).rows[0].giftId; assert.equal(rp.r.j.outcome.rows[0].giftId, gid);
  const ex = await H({ op: "durableGiftExport", client: "wcbhc", table: TBL, csv: `${HDR}7002,21,2026-02-02T00:00:00,Gift\r\n`, token: pl2.token, manifest: pl2.manifest, proofs: [pb.r.j.proof] });
  assert.equal(ex.j.proven, 1); assert.ok(ex.j.csv.includes(gid));
  const rn = await H({ op: "durableGiftRenew", client: "wcbhc", table: TBL, header: pl2.recovery.header, headerMac: pl2.recovery.headerMac, jobToken: pl2.token }); assert.equal(rn.j.jobId, pl2.jobId);
});

test("[PAIRED][MOCK SQL] scenario 6: real 88-row plan splits 87+1; partial (manual edit) -> resume same request -> complete; job/file distinctions", { skip }, async () => {
  await setup();
  const rows = Array.from({ length: 88 }, (_, i) => `${i === 87 ? 7003 : i % 2 ? 7002 : 7001},${i + 1},2026-03-01T00:00:00,Gift`);
  const CSV = HDR + rows.join("\r\n") + "\r\n"; const DEC = rows.map((_, o) => ({ o, d: "new" }));
  const pl = await plan(CSV, DEC);
  assert.equal(pl.manifest.batchRows, 87, "real giftMaxRows(3)"); assert.equal(pl.manifest.batchCount, 2);
  assert.deepEqual(pl.manifest.batches.map((b: any) => [b.first, b.last]), [[0, 86], [87, 87]]); assert.equal(pl.batches[0].length, 87); assert.equal(pl.batches[1].length, 1);
  const b0 = await act(() => commit(pl, 0));
  assert.equal(b0.r.s, 200, JSON.stringify(b0.r.j));
  assert.deepEqual(b0.ids, ["gift.lockRequest", "gift.lockJob", "gift.lockManifest", "gift.lockAssoc(87)", "gift.lockMaster(2)", "source.lockGiftOverrides", "gift.lockOverlays(2)", "gift.lockProspects(2)", "gift.lockMax",
    "gift.insertRequest", "gift.insertJob", "gift.insertManifest", ...Array.from({ length: 87 }, () => NEW_ROW).flat(), "gift.countLoc(87)", "gift.insertBatch", "gift.insertLog", "gift.insertLedger"]);
  assert.equal(b0.after[T.RAW].length, 2 + 87);
  // manual portal edit for batch 1's donor AFTER batch 0 committed (snapshot taken after the edit)
  await seedMore({ [T.PU]: [{ id: 1, client: "wcbhc", cptid: 7003, voided: 0 }] });
  const b1 = await act(() => commit(pl, 1));
  assert.equal(b1.r.s, 400); assert.equal(b1.r.j.code, "refused"); assert.equal(lastBackend!.status, 409); assert.equal(lastBackend!.body.code, "portal-protected");
  assert.deepEqual(b1.ids, ["gift.lockRequest", "gift.lockJob", "gift.lockManifest", "gift.lockAssoc(1)", ...LOCKS1]); assert.equal(b1.before[T.PU].length, 1); refusedNoChange(b1);
  const rq1 = b1.r.j.requestId;
  const sp = await jobStatus(pl.jobId); assert.equal(sp.j.state, "partial"); assert.deepEqual(sp.j.committedBatches, [0]); assert.deepEqual(sp.j.missingBatches, [1]);
  await seedMore({ [T.PU]: [{ id: 1, client: "wcbhc", cptid: 7003, voided: 1 }] });
  const r1 = await act(() => commit(pl, 1));
  assert.equal(r1.r.s, 200); assert.equal(r1.r.j.requestId, rq1, "resume = same request id");
  assert.deepEqual(r1.ids, ["gift.lockRequest", "gift.lockJob", "gift.lockManifest", "gift.lockAssoc(1)", ...LOCKS1, "gift.lockMax", "gift.insertRequest", ...NEW_ROW, "gift.countLoc(1)", "gift.insertBatch", "gift.insertLog", "gift.insertLedger"], "existing job: no second insertJob/insertManifest");
  assert.equal(r1.after[T.JB].length, 1); assert.equal(r1.after[T.MF].length, 1); assert.equal(r1.after[T.BT].length, 2);
  const sc = await jobStatus(pl.jobId); assert.equal(sc.j.state, "complete"); assert.deepEqual(sc.j.committedBatches, [0, 1]);
  // jobBatches has no ORDER BY: reverse mock storage order; real giftJobStatus result is unchanged
  const Dfull = (await inspect()).tables; await seedMore({ [T.BT]: [...Dfull[T.BT]].reverse() });
  const sr = await act(() => jobStatus(pl.jobId)); assert.deepEqual(sr.r.j, sc.j); assert.deepEqual(sr.ids, ["gift.jobStatus", "gift.jobBatches"]);
  // (a) same file re-planned with another actor => legitimately a NEW job (new jobId, same file digest): refused already-associated
  const plA = await plan(CSV, DEC, "Quinn Fictional"); assert.notEqual(plA.jobId, pl.jobId); assert.equal(plA.manifest.fileDigest, pl.manifest.fileDigest);
  const a = await act(() => commit(plA, 0));
  assert.equal(a.r.s, 400); assert.equal(lastBackend!.status, 409); assert.equal(lastBackend!.body.code, "already-associated");
  assert.deepEqual(a.ids, ["gift.lockRequest", "gift.lockJob", "gift.lockManifest", "gift.lockAssoc(87)"]); refusedNoChange(a);
  // (b) a different file is a valid new job: commits with its own status
  const plB = await plan(`${HDR}7001,999,2026-03-02T00:00:00,Gift\r\n`, [{ o: 0, d: "new" }], "Pat Fictional", "h3b-other.csv");
  const bb = await act(() => commit(plB, 0)); assert.equal(bb.r.s, 200); assert.deepEqual(bb.ids, ONE_NEW_FIRST);
  assert.equal((await jobStatus(plB.jobId)).j.state, "complete"); assert.equal((await jobStatus(pl.jobId)).j.state, "complete");
  // (c) token of job B with manifest of job A => website refuses locally, zero frames, zero statements
  const cc = await act(() => H({ op: "durableGiftCommit", client: "wcbhc", table: TBL, token: plB.token, manifest: pl.manifest, batchIndex: 1, rows: pl.batches[1] }));
  assert.equal(cc.r.s, 400); assert.match(cc.r.j.error, /does not match the signed job/); assert.equal(cc.frames, 0); assert.deepEqual(cc.ids, []); assert.deepEqual(cc.after, cc.before);
  // (d) job-changed (conflicting stored manifest for the SAME jobId) is unreachable with real artifacts: NOT tested/claimed.
});

test("[PAIRED][MOCK SQL] scenario 7: known-ID correction using a UUID stored by an earlier real commit; adoption never confers ownership; negatives fully roll back", { skip }, async () => {
  await setup();
  const s2 = await scenario2Commit(); assert.equal(s2.cm.r.s, 200);
  const nw = s2.cm.r.j.outcome.rows.find((x: any) => x.action === "new").giftId as string, ad = s2.cm.r.j.outcome.rows.find((x: any) => x.action === "adopt").giftId as string;
  const pv = await act(() => preview({ kind: "gifts", giftIds: [nw] }));
  assert.equal(pv.r.s, 200, JSON.stringify(pv.r.j)); assert.deepEqual(pv.ids, ["preview.overrides", "preview.idsByGift(1)", "preview.countLoc(1)", "preview.values(1)", "preview.idsByLoc(1)", "preview.baseline(1)"], "unlocked preview.idsByGift (lockIdsByGift only inside the commit)");
  const row = pv.r.j.rows[0]; assert.equal(row.giftId, nw); assert.equal(row.locator, 43);
  for (const v of Object.values(row.baseline) as any[]) assert.deepEqual(v, { present: true, provenance: "source", equalsCurrent: true });
  const exp = cellsOf(row);
  const CSVC = `${HDR}7001,150,2026-01-05T00:00:00,Gift\r\n`;
  const CORR = ["gift.lockRequest", "gift.lockJob", "gift.lockManifest", "gift.lockAssoc(1)", "gift.lockIdsByGift(1)", "gift.lockRaw(1)"];
  // negatives first (each a real plan; each refused with exact trace end and full rollback)
  const neg = async (csv: string, d: Record<string, unknown>, code: string, ids: string[]) => {
    const p = await plan(csv, [{ o: 0, d: "correct", ...d }]); const x = await act(() => commit(p));
    assert.equal(x.r.s, 400, JSON.stringify(x.r.j)); assert.equal(lastBackend!.status, 409); assert.equal(lastBackend!.body.code, code); assert.deepEqual(x.ids, ids); refusedNoChange(x); };
  await neg(`${HDR}7001,6,2025-03-01T00:00:00,Gift\r\n`, { giftId: ad, expected: s2.expected }, "not-source-owned", [...CORR, "gift.lockBaseline(1)"]);
  await neg(CSVC, { giftId: nw, expected: { ...exp, Gift_Amount: "99" } }, "stale", CORR);
  await neg(`${HDR}7002,150,2026-01-05T00:00:00,Gift\r\n`, { giftId: nw, expected: exp }, "donor-mismatch", CORR.slice(0, 5));
  await neg(CSVC, { giftId: "0f0e0d0c-0b0a-4908-8706-050403020100", expected: exp }, "unknown-gift", CORR.slice(0, 5));
  // happy correction
  const pc = await plan(CSVC, [{ o: 0, d: "correct", giftId: nw, expected: exp }]);
  assert.deepEqual(Object.keys(pc.batches[0][0].values), ["Gift_Amount"], "only the changed column is sent");
  const cm = await act(() => commit(pc));
  assert.equal(cm.r.s, 200, JSON.stringify(cm.r.j));
  assert.deepEqual(cm.ids, [...CORR, "gift.lockBaseline(1)", ...LOCKS1, "gift.insertRequest", "gift.insertJob", "gift.insertManifest", "gift.rawUpdate.Gift_Amount", "gift.insertDecision", "gift.insertAssoc", "gift.updateBaseline", "gift.insertAudit", "gift.insertBatch", "gift.insertLog", "gift.insertLedger"]);
  const B = cm.before, A = cm.after, newAmt = pc.batches[0][0].values.Gift_Amount;
  assert.equal(A[T.RAW].find((x) => x.row_id === 43).Gift_Amount, newAmt); assert.deepEqual(A[T.RAW].filter((x) => x.row_id !== 43), B[T.RAW].filter((x: any) => x.row_id !== 43), "only the target raw row changed");
  const bl = A[T.BL].filter((x) => x.record_key === `gift:${nw}`); assert.equal(bl.find((x) => x.column_name === "Gift_Amount").value, newAmt);
  assert.equal(bl.find((x) => x.column_name === "Gift_Amount").request_id, cm.r.j.requestId); assert.deepEqual(bl.filter((x) => x.column_name !== "Gift_Amount"), B[T.BL].filter((x: any) => x.record_key === `gift:${nw}` && x.column_name !== "Gift_Amount"));
  const au = A[T.AU].slice(B[T.AU].length); assert.equal(au.length, 1); assert.deepEqual({ op: au[0].op, old: au[0].old_value, nv: au[0].new_value, k: au[0].record_key }, { op: "update", old: exp.Gift_Amount, nv: newAmt, k: `gift:${nw}` });
  assert.equal(A[T.ID].length, B[T.ID].length, "no new identity for a correction"); rel(A, nw, { action: "correct", loc: 43, person: 7001, source: true });
  assert.equal(A[T.BL].filter((x) => x.record_key === `gift:${ad}`).length, 0, "adopted gift still has no baseline");
});

test("[PAIRED][MOCK SQL] H3b coverage inventory (hit vs registered-but-unhit)", { skip }, async () => {
  const unhit = statementIds.filter((i) => !hit.has(i));
  console.log(`H3B_COVERAGE hit=${JSON.stringify([...hit].sort())} unhit=${JSON.stringify(unhit)}`);
  assert.ok(![...hit].some((i) => i.startsWith("UNSUPPORTED:")), "no unsupported SQL in H3b scenarios");
  for (const id of ["gift.lockAssoc(87)", "gift.countLoc(87)", "gift.lockIdsByGift(1)", "gift.lockBaseline(1)", "gift.rawUpdate.Gift_Amount", "gift.updateBaseline", "gift.status", "gift.jobStatus", "gift.jobBatches", "preview.history", "preview.idsByGift(1)", "preview.baseline(1)"]) assert.ok(hit.has(id), id);
  const out = await inspect(false); assert.equal(out.stats.unsupported, 0); assert.equal(out.nextVersion, "14.2.35");
});
