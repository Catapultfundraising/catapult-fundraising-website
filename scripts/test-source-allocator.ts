// SYNTHETIC tests for the website side of the reserved first load (fictional prepared client; Engage is a stubbed fetch).
// No network, no SQL. NOT real Azure acceptance. Allocator/prepared registries are injected via test hooks only.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

Object.assign(process.env, { RESEARCH_PASSWORD: "localpw", RESEARCH_AUTH_SECRET: "localsec", SOURCE_IMPORT_PREVIEW: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: "w".repeat(32), SOURCE_PREPARED_TEST_HOOK: "1" });
const COOKIE = createHash("sha256").update("localpw:localsec").digest("hex");
const sha = async (x: string) => createHash("sha256").update(x, "utf8").digest("hex");
const PREP = { approvalId: "review-2026-11-03-fictional", approvalVersion: 1, client: "fictional_x", schema: "fictional_x", registryVersion: 3, approvedBy: "Reviewer", approvedAt: "2026-11-03",
  tables: [{ table: "master", key: "CPTID", columns: [{ col: "CPTID", ty: "int" }, { col: "Source_ID", ty: "nvarchar", len: 200, required: true }, { col: "Account_Name", ty: "nvarchar", len: 200, required: true }, { col: "City", ty: "nvarchar", len: 100 }] }] };
const CFG = { approvalId: "alloc-fictional", approvalVersion: 1, client: "fictional_x", masterTable: "master", sourceSystem: "fictional_crm", forbiddenFrom: 900000, externalKeyCol: "Source_ID", identityCols: ["Source_ID", "Account_Name"] };
const MAP = { "Source ID": "Source_ID", Name: "Account_Name", City: "City" };
const HEADERS = ["Source ID", "Name", "City"];
const rowsOf = (n: number) => Array.from({ length: n }, (_, i) => ({ "Source ID": `S-${i + 1}`, Name: `Org ${i + 1}`, City: i % 2 ? "Springfield" : "" }));

async function setup() {
  const { __setPreparedForTests } = await import("../lib/portal-v2/source-reconcile");
  const { __setAllocatorsForTests } = await import("../lib/portal-v2/source-allocator");
  __setPreparedForTests([PREP]); __setAllocatorsForTests([CFG]);
  const calls: Record<string, unknown>[] = []; const stored = new Map<string, unknown>();
  let engageState: Record<string, unknown> = {};
  globalThis.fetch = (async (_u: unknown, init: { body: string }) => {
    const b = JSON.parse(init.body); calls.push(b);
    if (b.op === "reserveStatus") { const r = stored.get(b.requestId) as { result: unknown; payloadHash: string } | undefined; return Response.json(r ? { found: true, result: r.result, payloadHash: r.payloadHash } : { found: false }); }
    if (b.op === "previewState") return Response.json(engageState);
    return Response.json({});
  }) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route");
  const post = (body: Record<string, unknown>) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", cookie: `catapult_research_auth=${COOKIE}` }, body: JSON.stringify(body) }));
  return { calls, stored, post, setState: (s: Record<string, unknown>) => { engageState = s; } };
}

test("manifest: whole-file external-ID checks run BEFORE any reservation; CPTID may not be mapped; identity columns required", async () => {
  const { buildAllocManifest } = await import("../lib/portal-v2/source-allocator");
  const ctx = { allocatorDigest: "a".repeat(64), preparedDigest: "b".repeat(64), identityConfigDigest: "c".repeat(64), keyCol: "CPTID", externalKeyCol: "Source_ID", identityCols: ["Source_ID", "Account_Name"], sourceSystem: "fictional_crm", batchRows: 100, columns: ["Source_ID", "Account_Name", "City"], masterTable: "master" };
  const base = { client: "fictional_x", table: "master", mapping: MAP, headers: HEADERS, fileName: "initial.csv", fileDate: null, actor: "Pat (shared login)", registryRev: "r", ctx };
  const dupRows = [...rowsOf(150), { "Source ID": "S-1", Name: "Dup", City: "" }];
  await assert.rejects(buildAllocManifest(sha, { ...base, rows: dupRows }), /appear more than once/);
  for (const bad of ["", " S-9", "S-9 ", "S\t9", "S\n9", "S\u007f9"]) await assert.rejects(buildAllocManifest(sha, { ...base, rows: [...rowsOf(3), { "Source ID": bad, Name: "x", City: "" }] }), /blank, padded or invalid/);
  await assert.rejects(buildAllocManifest(sha, { ...base, rows: rowsOf(3), mapping: { ...MAP, City: "CPTID" } }), /assigned by the shared allocator/);
  await assert.rejects(buildAllocManifest(sha, { ...base, rows: rowsOf(3), mapping: { "Source ID": "Source_ID" } }), /identity check/);
  const { manifest, jobId } = await buildAllocManifest(sha, { ...base, rows: rowsOf(250) });
  assert.equal(manifest.batchHashes.length, 3); assert.equal(manifest.exts[0], "S-1"); assert.ok(!JSON.stringify(manifest).includes("CPTID\""));
  const again = await buildAllocManifest(sha, { ...base, rows: rowsOf(250) });
  assert.equal(again.jobId, jobId, "same file => same job identity (resume), no CPTIDs inside");
});

test("route: default OFF + server verification of chunks; reserved first-load preview binds ext/extDigest + allocator digest; held reservation rows excluded; apply stays off", async () => {
  const t = await setup();
  assert.equal((await t.post({ op: "allocConfig", client: "fictional_x", table: "other" })).status, 404, "allocator context only for the reviewed master table");
  const cfgRes = await (await t.post({ op: "allocConfig", client: "fictional_x", table: "master" })).json();
  assert.equal(cfgRes.saveAvailable, false, "save gate reported off");
  assert.equal(cfgRes.keyCol, "CPTID"); assert.equal(cfgRes.batchRows, Math.floor(900 / (1 + 2 * 3 + 1)));
  assert.equal((await t.post({ op: "allocConfig", client: "pvas", table: "master" })).status, 404, "existing clients have no allocator");
  const { buildAllocManifest } = await import("../lib/portal-v2/source-allocator");
  const { REGISTRY_META } = await import("../lib/portal-v2/source-registry");
  const rows = rowsOf(150);
  const { manifest, jobId } = await buildAllocManifest(sha, { client: "fictional_x", table: "master", mapping: MAP, headers: HEADERS, rows, fileName: "initial.csv", fileDate: null, actor: "Pat (shared login)", registryRev: REGISTRY_META.rev, ctx: cfgRes });
  const BR = cfgRes.batchRows;
  const chunk = (i: number) => rows.slice(i * BR, (i + 1) * BR);
  // reservation is a WRITE: off by default (transport not approved)
  assert.equal((await t.post({ op: "allocReserve", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: chunk(0), actor: "Pat (shared login)" })).status, 403);
  assert.ok(!t.calls.some((c) => c.op === "reserveIds"));
  // status read works with saving off
  t.stored.set("f".repeat(32), { result: { rows: [] }, payloadHash: "0".repeat(64) });
  assert.equal((await (await t.post({ op: "allocReserveStatus", client: "fictional_x", requestId: "f".repeat(32) })).json()).found, true);
  // preview before any reservation => 409, no previewState call
  const p0 = await t.post({ op: "allocPreview", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: chunk(0), actor: "Pat (shared login)" });
  assert.equal(p0.status, 409);
  // simulate Engage's stored reservation outcome for batch 0 (one row held by identity change)
  const rid0 = (await sha(`${jobId}:reserve:0`)).slice(0, 32);
  const { reservePayloadHash } = await import("../lib/portal-v2/source-allocator");
  const ph0 = await reservePayloadHash(sha, "fictional_x", jobId, 0, manifest.exts.slice(0, BR), manifest.extDigests.slice(0, BR));
  t.stored.set(rid0, { payloadHash: "9".repeat(64), result: { rows: chunk(0).map((r, j) => ({ externalKey: r["Source ID"], cptid: 1000 + j, status: "reserved" })) } });
  const pw = await t.post({ op: "allocPreview", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: chunk(0), actor: "Pat (shared login)" });
  assert.equal(pw.status, 409); assert.match((await pw.json()).error, /different payload/);
  t.stored.set(rid0, { payloadHash: ph0, result: { rows: chunk(0).map((r, j) => j === 2 ? { externalKey: r["Source ID"], cptid: null, status: "held", reason: "identity changed" } : { externalKey: r["Source ID"], cptid: 1000 + j, status: "reserved" }) } });
  t.setState({ registryRev: REGISTRY_META.rev, destinationEmpty: true, preparedDigest: (await import("../lib/portal-v2/source-reconcile")).preparedDigest(PREP, "master"), duplicateKeys: [], current: [], baseline: [], overlayKeys: [], prospectKeys: [] });
  const p1 = await (await t.post({ op: "allocPreview", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: chunk(0), actor: "Pat (shared login)" })).json();
  assert.equal(p1.mode, "first-load"); assert.ok(p1.token); assert.equal(p1.applyAvailable, false);
  assert.equal(p1.requestId, (await sha(`${jobId}:0`)).slice(0, 32), "batch request id = Engage jobRequestId(jobId, index)");
  const { verifySourceToken, applyRequestBody } = await import("../lib/portal-v2/source-import-apply");
  const { payload } = verifySourceToken(p1.token, "w".repeat(32));
  assert.equal(payload.ops.length, BR - 1); assert.equal(payload.job?.jobId, jobId); assert.equal(payload.job?.heldRows, 1);
  assert.deepEqual([payload.ops[0].key, payload.ops[0].ext], [1000, "S-1"]); assert.match(String(payload.ops[0].extDigest), /^[a-f0-9]{64}$/);
  assert.ok(payload.allocatorDigest === cfgRes.allocatorDigest && payload.identityConfigDigest === cfgRes.identityConfigDigest);
  const body = applyRequestBody(p1.token, "Pat (shared login)", "w".repeat(32)) as { request: Record<string, unknown> };
  assert.ok(!("allocatorDigest" in body.request) && !("identityConfigDigest" in body.request), "website-only binding stripped before Engage");
  assert.equal((await t.post({ op: "apply", client: "fictional_x", table: "master", token: p1.token, actor: "Pat" })).status, 403, "saving remains off");
  // tampered chunk (changed identity value) refused before Engage
  const n = t.calls.length;
  const bad = chunk(0).map((r, j) => (j === 0 ? { ...r, Name: "Different Org" } : r));
  assert.equal((await t.post({ op: "allocPreview", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: bad, actor: "Pat (shared login)" })).status, 400);
  const forged = { ...manifest, exts: manifest.exts.map((e, i) => (i === 1 ? "S-1" : e)) };
  assert.equal((await t.post({ op: "allocPreview", client: "fictional_x", table: "master", manifest: forged, jobId, batchIndex: 0, rows: chunk(0), actor: "Pat (shared login)" })).status, 400);
  assert.equal((await t.post({ op: "allocPreview", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: chunk(0), actor: "Someone else" })).status, 400);
  const extra = chunk(0).map((r, j) => (j === 0 ? { ...r, Extra: "x" } : r));
  assert.equal((await t.post({ op: "allocReserve", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: extra, actor: "Pat (shared login)" })).status, 403, "reserve gated");
  assert.equal((await t.post({ op: "allocPreview", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: extra, actor: "Pat (shared login)" })).status, 400, "extra row property refused");
  assert.equal(t.calls.length, n, "no Engage call for refused chunks");
  // stored reservation for different IDs (stale/forged) => 409, no token
  t.stored.set(rid0, { payloadHash: ph0, result: { rows: chunk(0).map((r, j) => ({ externalKey: j === 0 ? "S-999" : r["Source ID"], cptid: 1000 + j, status: "reserved" })) } });
  // all rows held by the reservation => no token, held count preserved
  // (restored after)
  assert.equal((await t.post({ op: "allocPreview", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: chunk(0), actor: "Pat (shared login)" })).status, 409);
  t.stored.set(rid0, { payloadHash: ph0, result: { rows: chunk(0).map((r) => ({ externalKey: r["Source ID"], cptid: null, status: "held" })) } });
  const ph = await (await t.post({ op: "allocPreview", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: chunk(0), actor: "Pat (shared login)" })).json();
  assert.equal(ph.token, null); assert.equal(ph.held, BR);
  // allocator config revision => old manifest refused
  const { __setAllocatorsForTests } = await import("../lib/portal-v2/source-allocator");
  __setAllocatorsForTests([{ ...CFG, approvalVersion: 2 }]);
  assert.equal((await t.post({ op: "allocPreview", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: chunk(0), actor: "Pat (shared login)" })).status, 400);
  // identity config change WITHOUT a version bump => manifest refused, and the old token refused at apply binding
  __setAllocatorsForTests([{ ...CFG, identityCols: ["Source_ID"] }]);
  assert.equal((await t.post({ op: "allocPreview", client: "fictional_x", table: "master", manifest, jobId, batchIndex: 0, rows: chunk(0), actor: "Pat (shared login)" })).status, 400);
  const { verifySourceTokenPayloadForAlloc } = await import("../lib/portal-v2/source-alloc-server");
  const newCfg = await (await t.post({ op: "allocConfig", client: "fictional_x", table: "master" })).json();
  assert.equal(newCfg.allocatorDigest, cfgRes.allocatorDigest, "Engage digest unchanged by identity fields");
  assert.throws(() => verifySourceTokenPayloadForAlloc(p1.token, "fictional_x", () => ({ allocatorDigest: newCfg.allocatorDigest, identityConfigDigest: newCfg.identityConfigDigest })), /changed since this preview/);
  // invalid registries refused
  for (const bad of [[CFG, CFG], [{ ...CFG, identityCols: ["Source_ID", "Source_ID"] }], [{ ...CFG, forbiddenFrom: 2.5 }], [{ ...CFG, approvalVersion: 0 }]]) {
    __setAllocatorsForTests(bad as never);
    assert.equal((await t.post({ op: "allocConfig", client: "fictional_x", table: "master" })).status, 400);
  }
  __setAllocatorsForTests([CFG]);
  // normal preview for the registered client cannot add records outside the reserved path
  const csv = "ID,Source ID,Name,City\n7,S-7,Org,\n";
  const pn = await t.post({ op: "preview", client: "fictional_x", table: "master", csv, mapping: { ID: "CPTID", "Source ID": "Source_ID", Name: "Account_Name", City: "City" }, fileName: "x.csv", fileDate: "" });
  assert.equal(pn.status, 400); assert.match((await pn.json()).error, /reserved first load/);
  __setAllocatorsForTests(null); (await import("../lib/portal-v2/source-reconcile")).__setPreparedForTests(null);
});

test("apply-time binding: reserved-path token must carry the CURRENT allocator digest; insert tokens without it are refused for registered clients", async () => {
  const { signSourceToken } = await import("../lib/portal-v2/source-import-apply");
  const { verifySourceTokenPayloadForAlloc } = await import("../lib/portal-v2/source-alloc-server");
  const { REGISTRY_META } = await import("../lib/portal-v2/source-registry");
  const mk = (extra: Record<string, unknown>, kind: "insert" | "update" = "insert") => signSourceToken({ v: 1, client: "fictional_x", table: "master", mode: "first-load", preparedDigest: null, requestId: "a".repeat(32), fileName: "f.csv", fileDigest: "b".repeat(64), fileDate: null, registryRev: REGISTRY_META.rev, exp: Date.now() + 60_000, ops: [{ kind, key: 1, values: { City: "x" }, expected: kind === "update" ? { City: null } : null }], insertPolicyDigest: null, ...extra }, "w".repeat(32));
  const cur = () => ({ allocatorDigest: "d".repeat(64), identityConfigDigest: "i".repeat(64) });
  verifySourceTokenPayloadForAlloc(mk({ allocatorDigest: "d".repeat(64), identityConfigDigest: "i".repeat(64) }), "fictional_x", cur);
  assert.throws(() => verifySourceTokenPayloadForAlloc(mk({ allocatorDigest: "e".repeat(64), identityConfigDigest: "i".repeat(64) }), "fictional_x", cur), /changed since this preview/);
  assert.throws(() => verifySourceTokenPayloadForAlloc(mk({ allocatorDigest: "d".repeat(64), identityConfigDigest: "j".repeat(64) }), "fictional_x", cur), /changed since this preview/);
  assert.throws(() => verifySourceTokenPayloadForAlloc(mk({}), "fictional_x", cur), /only through the reserved first load/);
  verifySourceTokenPayloadForAlloc(mk({}, "update"), "fictional_x", cur);
  verifySourceTokenPayloadForAlloc(mk({}), "pvas", () => null);
  const { buildAllocManifest } = await import("../lib/portal-v2/source-allocator");
  const ctx = { allocatorDigest: "a".repeat(64), preparedDigest: "b".repeat(64), identityConfigDigest: "c".repeat(64), keyCol: "CPTID", externalKeyCol: "Source_ID", identityCols: ["Source_ID", "Account_Name"], sourceSystem: "fictional_crm", batchRows: 100, columns: ["Source_ID", "Account_Name", "City"], masterTable: "master" };
  const base = { client: "fictional_x", table: "master", headers: HEADERS, rows: rowsOf(3), fileName: "f.csv", fileDate: null, actor: "Pat", registryRev: "r", ctx };
  await assert.rejects(buildAllocManifest(sha, { ...base, mapping: { ...MAP, Ghost: "City" } }), /not in the file/);
  await assert.rejects(buildAllocManifest(sha, { ...base, mapping: { ...MAP, City: "Not_A_Column" } }), /not a column/);
  await assert.rejects(buildAllocManifest(sha, { ...base, mapping: MAP, headers: ["Source ID", "Name", "name"] }), /unique header/);
  await assert.rejects(buildAllocManifest(sha, { ...base, headers: ["City"], rows: [{ City: "x", HiddenID: "S-1", HiddenName: "Org" }], mapping: { HiddenID: "Source_ID", HiddenName: "Account_Name", City: "City" } }), /not in the file/);
});
