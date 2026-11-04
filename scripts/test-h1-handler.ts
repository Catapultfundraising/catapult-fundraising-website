// H1 SYNTHETIC tests: research-source-import handler extraction. Fictional data; injected fetchImpl only; no network/SQL.
// This test NEVER mutates process.env and NEVER uses the env-gated __set...ForTests hooks.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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
  const orig = execFileSync("git", ["show", "7491f532ac7ace10bba74cfba465a1ab9f9eff56:app/api/research-source-import/route.ts"], { encoding: "utf8" });
  const h = readFileSync("lib/portal-v2/research-source-import-handler.ts", "utf8");
  const count = (s: string, k: string) => s.split(`process.env.${k}`).length - 1;
  for (const k of ["RESEARCH_AUTH_SECRET", "PORTAL_WRITE_SECRET", "RESEARCH_PASSWORD"]) assert.equal(count(h.slice(h.indexOf("function scoped(")), k), count(orig, k), k);
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
