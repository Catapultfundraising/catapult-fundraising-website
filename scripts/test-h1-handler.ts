// H1 SYNTHETIC tests: research-source-import handler extraction. Fictional data; injected fetchImpl only; no network/SQL.
// This test NEVER mutates process.env and NEVER uses the env-gated __set...ForTests hooks.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { handleResearchSourceImport, prodDeps, type ResearchDeps } from "../lib/portal-v2/research-source-import-handler";
import { SOURCE_TRANSPORT_APPROVED, approvedPrepared } from "../lib/portal-v2/source-reconcile";
import { giftRegistrations } from "../lib/portal-v2/gift-durable";

const PW = "fictional-pw", AS = "fictional-auth-secret-0123456789", WS = "w".repeat(32);
const COOKIE = createHash("sha256").update(`${PW}:${AS}`).digest("hex");
const ENV = { RESEARCH_PASSWORD: PW, RESEARCH_AUTH_SECRET: AS, SOURCE_IMPORT_PREVIEW: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: WS, SOURCE_IMPORT_APPLY: "enabled" };
const REG = { id: "fict_gifts", version: 1, client: "jag", scope: "fict-gift-export", schema: "jag", table: "raw_master_giving_history", locator: "row_id", person: "CPTID", native: "Transaction",
  columns: [{ col: "Gift_Amount", ty: "decimal", len: null, p: 19, s: 4 }, { col: "Gift_Date", ty: "datetime2", len: null, p: null, s: null }, { col: "Record_Type", ty: "nvarchar", len: -1, p: null, s: null }],
  required: ["Gift_Amount", "Gift_Date"], master: { schema: "jag", table: "constituents", col: "CPTID" }, locatorVerifiedUnique: true, rowAllocator: { kind: "locked-max" as const, min: 1, max: 2147483647 } };
const calls: { url: string; auth: string | null; body: Record<string, unknown> }[] = [];
const fetchImpl = (async (url: string, init: RequestInit) => { calls.push({ url: String(url), auth: new Headers(init.headers).get("authorization"), body: JSON.parse(String(init.body)) }); return new Response(JSON.stringify({ found: false }), { status: 200 }); }) as typeof fetch;
globalThis.fetch = (async () => { throw new Error("GUARD: global fetch must not be used by injected deps"); }) as typeof fetch;
const deps = (o: Partial<ResearchDeps> = {}): ResearchDeps => ({ fetchImpl, env: ENV, transportApproved: false, giftRegistrations: [], prepared: [], now: () => 1_800_000_000_000, ...o });
const rq = (body: unknown, h: Record<string, string> = {}) => new NextRequest("http://localhost/api/research-source-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost", cookie: `catapult_research_auth=${COOKIE}`, ...h }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("route file: only POST -> handleResearchSourceImport(req, prodDeps()); runtime/dynamic/maxDuration preserved", () => {
  const r = readFileSync("app/api/research-source-import/route.ts", "utf8");
  assert.match(r, /export const runtime = "nodejs";/); assert.match(r, /export const dynamic = "force-dynamic";/); assert.match(r, /export const maxDuration = 150;/);
  assert.match(r, /return handleResearchSourceImport\(req, prodDeps\(\)\);/);
  assert.ok(!/__set|fixture|test/i.test(r.replace(/maxDuration|Staff-only[^\n]*/g, "")));
});

test("prodDeps: frozen, per request, references the REAL constants (transport false, registries EMPTY, process.env, current global fetch)", () => {
  const a = prodDeps(); assert.ok(Object.isFrozen(a));
  assert.equal(a.transportApproved, SOURCE_TRANSPORT_APPROVED); assert.equal(a.transportApproved, false);
  assert.equal(a.env, process.env); assert.equal(a.fetchImpl, globalThis.fetch); assert.deepEqual([...a.giftRegistrations], [...giftRegistrations()]); assert.equal(a.giftRegistrations.length, 0);
  assert.deepEqual([...a.prepared], [...approvedPrepared()]); assert.equal(a.prepared.length, 0);
  const f2 = (async () => new Response("{}")) as typeof fetch; const saved = globalThis.fetch; globalThis.fetch = f2; try { assert.equal(prodDeps().fetchImpl, f2, "not a module-load snapshot"); } finally { globalThis.fetch = saved; }
});

test("exact per-op secrets unchanged: every env key read in the handler matches the original 7491f53 route counts", () => {
  // Reviewed fixed contract: counts taken once from the 7491f53 route (archive-portable; no git needed).
  const orig: Record<string, number> = {"RESEARCH_AUTH_SECRET": 4, "PORTAL_WRITE_SECRET": 2 + 1 /* H1-A1: same owning secret now passed explicitly to the allocator guard */, "RESEARCH_PASSWORD": 1};
  const h = readFileSync("lib/portal-v2/research-source-import-handler.ts", "utf8");
  const count = (s: string, k: string) => s.split(`process.env.${k}`).length - 1;
  for (const k of ["RESEARCH_AUTH_SECRET", "PORTAL_WRITE_SECRET", "RESEARCH_PASSWORD"]) assert.equal(count(h.slice(h.indexOf("function scoped(")), k), orig[k], k);
  assert.ok(!/globalThis/.test(h.slice(h.indexOf("function scoped("))), "scoped handler never touches globalThis");
});

test("[INJECTED] auth: real cookie algorithm and existing X-Research-Key over deps.env; production default (process.env lacks secrets) => 401", async () => {
  assert.equal((await handleResearchSourceImport(rq({ op: "clients" }), deps())).status, 200);
  assert.equal((await handleResearchSourceImport(rq({ op: "clients" }, { cookie: "catapult_research_auth=wrong" }), deps())).status, 401);
  assert.equal((await handleResearchSourceImport(rq({ op: "clients" }, { cookie: "", "x-research-key": PW }), deps())).status, 200);
  assert.equal((await handleResearchSourceImport(rq({ op: "clients" }), prodDeps())).status, 401, "process.env has no research secrets in this test");
});

test("[INJECTED] origin 403 and body 413 unchanged", async () => {
  assert.equal((await handleResearchSourceImport(rq({ op: "clients" }, { origin: "http://evil.example" }), deps())).status, 403);
  assert.equal((await handleResearchSourceImport(rq({ op: "clients" }, { "content-type": "text/plain" }), deps())).status, 403);
  assert.equal((await handleResearchSourceImport(rq("x".repeat(5_000_000)), deps())).status, 413);
});

test("[INJECTED] fetchImpl + deps.env reach postToEngage with the deps PORTAL_WRITE_SECRET bearer; global fetch never used", async () => {
  calls.length = 0;
  const r = await handleResearchSourceImport(rq({ op: "status", client: "wcbhc", requestId: "a".repeat(32) }), deps());
  assert.equal(r.status, 200); assert.equal(calls.length, 1); assert.equal(calls[0].auth, `Bearer ${WS}`); assert.equal(calls[0].body.op, "status");
  calls.length = 0; const off = await handleResearchSourceImport(rq({ op: "status", client: "wcbhc", requestId: "a".repeat(32) }), deps({ env: { ...ENV, SOURCE_IMPORT_PREVIEW: "" } }));
  assert.equal(off.status, 501); assert.equal(calls.length, 0);
});

test("[INJECTED] giftRegistrations + transportApproved: context availability and save gate follow deps; defaults keep it unavailable/off", async () => {
  const ctx = { op: "durableGiftContext", client: "jag", table: "raw_master_giving_history" };
  const d0 = await (await handleResearchSourceImport(rq(ctx), deps())).json(); assert.equal(d0.available, false);
  const d1 = await (await handleResearchSourceImport(rq(ctx), deps({ giftRegistrations: [REG] as never }))).json(); assert.equal(d1.available, true); assert.equal(d1.saveAvailable, false, "transport false");
  const d2 = await (await handleResearchSourceImport(rq(ctx), deps({ giftRegistrations: [REG] as never, transportApproved: true }))).json(); assert.equal(d2.saveAvailable, true);
  const d3 = await (await handleResearchSourceImport(rq(ctx), deps({ giftRegistrations: [REG] as never, transportApproved: true, env: { ...ENV, SOURCE_IMPORT_APPLY: "" } }))).json(); assert.equal(d3.saveAvailable, false, "deps.env apply-OFF wins even with transport approved");
});

// ---------------- H1-A1: registrations / secret / clock through the owning helpers (no hooks, no process.env) ----------------
import { signSourceToken, verifySourceToken, livePreview, SOURCE_TOKEN_TTL_MS, type EngageState } from "../lib/portal-v2/source-import-apply";
import { verifySourceTokenPayloadForAlloc } from "../lib/portal-v2/source-alloc-server";
import { REGISTRY_META } from "../lib/portal-v2/source-registry";
import { jobRequestId } from "../lib/portal-v2/gift-identity-plan";

const NOW = 1_800_000_000_000;
const CSV = "Donor,Amount,Date,Type\r\n7001,100,2026-01-05T00:00:00,Gift\r\n7002,=SUM(A1),2026-01-06T00:00:00,\r\n7003,5,2026-01-07T00:00:00,Pledge\r\n7001,7,2026-01-08T00:00:00,Gift\r\n";
const MAP = { Donor: "@person", Amount: "Gift_Amount", Date: "Gift_Date", Type: "Record_Type" };
const EXP = { Gift_Amount: "5", Gift_Date: "2025-03-01T00:00:00", Record_Type: "Gift" };
const UUID1 = "0000aaaa-0000-4000-8000-00000000abcd";
const DEC = [{ o: 0, d: "new" }, { o: 1, d: "held" }, { o: 2, d: "adopt", locator: 41, expected: EXP }, { o: 3, d: "correct", giftId: UUID1, expected: { Gift_Amount: "7", Gift_Date: "2026-01-08T00:00:00", Record_Type: "Pledge" } }];
const T = REG.table;

test("[INJECTED] full durable chain via the handler with an injected registration: plan -> commit -> proof -> export -> reviewCheck -> renew", async () => {
  const sent: Record<string, any>[] = [];
  let outcome: unknown = null;
  const engage = (async (_u: string, init: RequestInit) => {
    const b = JSON.parse(String(init.body)); sent.push(b);
    if (b.op === "giftCommit") { const rq = b.request.requestId ?? jobRequestId(pl.jobId, 0); outcome = { requestId: rq, client: "jag", registrationId: REG.id, committed: true, counts: { new: 1, adopt: 1, correct: 1 }, rows: [{ ordinal: 0, action: "new", giftId: "0000bbbb-0000-4000-8000-00000000abcd", locator: 90 }, { ordinal: 2, action: "adopt", giftId: "0000cccc-0000-4000-8000-00000000abcd", locator: 41 }, { ordinal: 3, action: "correct", giftId: UUID1, locator: 12 }] }; return Response.json(outcome); }
    if (b.op === "giftStatus") return Response.json({ found: true, confirmed: true, outcome });
    return Response.json({});
  }) as unknown as typeof fetch;
  const D = deps({ fetchImpl: engage, giftRegistrations: [REG] as never, transportApproved: true, now: () => NOW });
  const H = (body: Record<string, unknown>, d = D) => handleResearchSourceImport(rq(body), d);
  // default (real EMPTY registry, nothing injected) => 404
  assert.equal((await H({ op: "durableGiftPlan", client: "jag", table: T, csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null }, deps({ now: () => NOW }))).status, 404);
  const plr = await H({ op: "durableGiftPlan", client: "jag", table: T, csv: CSV, mapping: MAP, decisions: DEC, actor: "Pat", fileName: "a.csv", fileDate: null }); assert.equal(plr.status, 200);
  const pl = await plr.json();
  const cr = await H({ op: "durableGiftCommit", client: "jag", table: T, token: pl.token, manifest: pl.manifest, batchIndex: 0, rows: pl.batches[0] });
  assert.equal(cr.status, 200, JSON.stringify(await cr.clone().json())); assert.equal(sent.filter((s) => s.op === "giftCommit").length, 1);
  const pr = await (await H({ op: "durableGiftProof", client: "jag", table: T, token: pl.token, manifest: pl.manifest, batchIndex: 0 })).json(); assert.equal(typeof pr.proof, "string", JSON.stringify(pr));
  const ex = await H({ op: "durableGiftExport", client: "jag", table: T, csv: CSV, token: pl.token, manifest: pl.manifest, proofs: [pr.proof] }); assert.equal(ex.status, 200); const exj = await ex.json();
  const rv = await (await H({ op: "durableGiftReviewCheck", client: "jag", table: T, original: CSV, reviewCopy: exj.csv, header: pl.recovery.header, headerMac: pl.recovery.headerMac, jobToken: pl.token, proofs: [pr.proof] })).json();
  assert.equal(rv.counts.verified, 3, JSON.stringify(rv).slice(0, 300));
  const rn = await (await H({ op: "durableGiftRenew", client: "jag", table: T, header: pl.recovery.header, headerMac: pl.recovery.headerMac, jobToken: pl.token })).json(); assert.equal(rn.jobId, pl.jobId);
  // registry drift (same id, version 2) => refused for commit/proof/export/renew; nothing more sent upstream
  const D2 = deps({ fetchImpl: engage, giftRegistrations: [{ ...REG, version: 2 }] as never, transportApproved: true, now: () => NOW }); const n = sent.length;
  assert.equal((await H({ op: "durableGiftCommit", client: "jag", table: T, token: pl.token, manifest: pl.manifest, batchIndex: 0, rows: pl.batches[0] }, D2)).status, 409);
  assert.ok([400, 404, 409].includes((await H({ op: "durableGiftRenew", client: "jag", table: T, header: pl.recovery.header, headerMac: pl.recovery.headerMac, jobToken: pl.token }, D2)).status));
  assert.notEqual((await H({ op: "durableGiftExport", client: "jag", table: T, csv: CSV, token: pl.token, manifest: pl.manifest, proofs: [pr.proof] }, D2)).status, 200);
  assert.equal(sent.length, n);
});

const srcTok = (exp: number, secret = WS, ops: unknown[] = []) => signSourceToken({ v: 1, client: "wcbhc", table: "giving_history", mode: "update", preparedDigest: null, requestId: "d".repeat(32), fileName: "f.csv", fileDigest: "e".repeat(64), fileDate: null, registryRev: REGISTRY_META.rev, exp, ops } as never, secret);

test("[INJECTED] source apply (non-allocator wcbhc): deps secret/clock used; expired same-request token still FORWARDED unchanged; wrong secret refused; no process.env secret", async () => {
  assert.equal(process.env.PORTAL_WRITE_SECRET, undefined);
  const sent: Record<string, any>[] = []; const f = (async (_u: string, init: RequestInit) => { sent.push(JSON.parse(String(init.body))); return Response.json({ replayed: true }); }) as unknown as typeof fetch;
  const D = deps({ fetchImpl: f, transportApproved: true, now: () => NOW });
  const ok = await handleResearchSourceImport(rq({ op: "apply", client: "wcbhc", table: "giving_history", token: srcTok(NOW + 60_000), actor: "Pat" }), D);
  assert.equal(ok.status, 200); assert.equal(sent[0].request.previewExp, NOW + 60_000); assert.equal(sent[0].request.requestId, "d".repeat(32));
  const old = await handleResearchSourceImport(rq({ op: "apply", client: "wcbhc", table: "giving_history", token: srcTok(NOW - 3_600_000), actor: "Pat" }), D);
  assert.equal(old.status, 200, "expired issued request forwarded for backend replay/expiry decision"); assert.equal(sent[1].request.previewExp, NOW - 3_600_000);
  const bad = await handleResearchSourceImport(rq({ op: "apply", client: "wcbhc", table: "giving_history", token: srcTok(NOW + 60_000, "z".repeat(32)), actor: "Pat" }), D);
  assert.equal(bad.status, 400); assert.equal(sent.length, 2);
  assert.equal((await handleResearchSourceImport(rq({ op: "apply", client: "wcbhc", table: "giving_history", token: srcTok(NOW + 60_000), actor: "Pat" }), deps({ fetchImpl: f, now: () => NOW }))).status, 403, "transport false (default) refuses");
});

test("clock/default regressions: strict verify rejects expired, forwarding paths allow it; allocator guard identical with injected secret/clock; defaults unchanged", () => {
  assert.throws(() => verifySourceToken(srcTok(NOW - 1), WS, NOW), /expired/);
  assert.doesNotThrow(() => verifySourceToken(srcTok(NOW - 1), WS, NOW, true));
  const cur = () => ({ allocatorDigest: "a".repeat(64), identityConfigDigest: "b".repeat(64) });
  assert.throws(() => verifySourceTokenPayloadForAlloc(srcTok(NOW + 1, WS, [{ kind: "insert", key: 1, values: {}, expected: null }]), "wcbhc", cur, WS, NOW), /reserved first load/, "guard still refuses unbound inserts");
  assert.doesNotThrow(() => verifySourceTokenPayloadForAlloc(srcTok(NOW - 99_999_999), "wcbhc", () => null, WS, NOW), "expired allowed (backend decides)");
  assert.throws(() => verifySourceTokenPayloadForAlloc(srcTok(NOW + 1), "wcbhc", () => null), /not configured|not valid/, "default secret = process.env (absent here) => refuses");
  const st: EngageState = { registryRev: REGISTRY_META.rev, duplicateKeys: [], current: [{ key: 101, values: { Quality_Score: "A" }, unreadable: [] }], baseline: [{ key: 101, col: "Quality_Score", value: "A" }], overlayKeys: [], prospectKeys: [] } as EngageState;
  const lp = livePreview({ client: "pvas", table: "donorsearch_results", mode: "update", mapping: { ID: "CPTID", Q: "Quality_Score" }, rows: [{ ID: "101", Q: "B" }] } as never, st, { fileName: "f.csv", csv: "ID,Q\n101,B\n", fileDate: null, secret: WS, now: NOW });
  assert.ok(lp.token); assert.equal(verifySourceToken(lp.token, WS, NOW).payload.exp, NOW + SOURCE_TOKEN_TTL_MS, "expiry derived from the injected clock");
  const h = readFileSync("lib/portal-v2/research-source-import-handler.ts", "utf8").split("function scoped(")[1];
  assert.ok(!/Date\.now\(\)/.test(h)); assert.equal((h.match(/regs: deps\.giftRegistrations/g) ?? []).length, 6);
  assert.match(h, /verifyJob\(b\.token, b\.manifest, secret, now, client, deps\.giftRegistrations\)/);
  assert.match(h, /process\.env\.PORTAL_WRITE_SECRET, deps\.now\(\)\);\n\s*const body = applyRequestBody\(b\.token, b\.actor, process\.env\.PORTAL_WRITE_SECRET, deps\.now\(\)\);/);
});
