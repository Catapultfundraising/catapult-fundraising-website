// Mapping profiles: FICTIONAL metadata only. Route tests stub fetch; no network, no SQL.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
Object.assign(process.env, { RESEARCH_PASSWORD: "localpw", RESEARCH_AUTH_SECRET: "localsec", SOURCE_PREPARED_TEST_HOOK: "1" });
const COOKIE = createHash("sha256").update("localpw:localsec").digest("hex");

const ctx0 = () => ({ client: "fx", table: "board_info", registryRev: "a".repeat(64), keyCol: "CPTID", keyKind: "int",
  dests: [{ col: "CPTID", ty: "int", st: "candidate", key: "CPTID" }, { col: "City", ty: "nvarchar", len: 100, st: "candidate", key: "" }, { col: "SEC", ty: "nvarchar", st: "held", key: "" }, { col: "Age", ty: "nvarchar", st: "unsupported", key: "" }, { col: "loaded_at", ty: "datetime2", st: "nonwritable", key: "" }],
  preparedDigest: null, allocatorDigest: null, insertPolicyDigest: null });
const H = ["Internal constituent number", "Town", "Sec"];
const M = { "Internal constituent number": "CPTID", Town: "City", Sec: "SEC" };

test("build -> check round trip; metadata only; held stays held; extra file headers unmapped", async () => {
  const { buildProfile, checkProfile } = await import("../lib/portal-v2/source-mapping-profile");
  const p = buildProfile(ctx0(), H, M);
  const text = JSON.stringify(p);
  assert.ok(!/Springfield|900001|token|actor|requestId/i.test(text));
  assert.deepEqual(Object.keys(p).sort(), ["client", "ctx", "destsDigest", "headers", "keyCol", "keyKind", "kind", "mapping", "profileHash", "registryRev", "table", "v"]);
  const r = checkProfile(text, ctx0(), [...H, "Notes extra"]);
  assert.deepEqual(r.mapping, { ...M, "Notes extra": "" });
  assert.deepEqual(r.unmapped, ["Notes extra"]); assert.deepEqual(r.held, ["SEC"]);
  assert.equal(buildProfile(ctx0(), H, M).profileHash, p.profileHash, "byte-stable");
});

test("build refuses unsupported/nonwritable/unknown/duplicate destination/missing key/duplicate headers/bad shapes", async () => {
  const { buildProfile } = await import("../lib/portal-v2/source-mapping-profile");
  const bad: [unknown, unknown, RegExp][] = [
    [H, { ...M, Sec: "Age" }, /unsupported/], [H, { ...M, Sec: "loaded_at" }, /nonwritable/], [H, { ...M, Sec: "DropTable" }, /Unknown destination/],
    [H, { ...M, Sec: "City" }, /Destination mapped twice/], [H, { Town: "City" }, /key CPTID/], [["A", " a "], { A: "CPTID" }, /Duplicate column headers/],
    [H, { ...M, Nope: "City" }, /not in the header list/], [H, ["CPTID"], /object/], [H, { ...M, Town: 5 }, /text/], [["A\u0000"], { "A\u0000": "CPTID" }, /plain text/],
  ];
  for (const [h, m, re] of bad) assert.throws(() => buildProfile(ctx0(), h, m), re);
  // prototype keys are plain data, never inherited
  assert.throws(() => buildProfile(ctx0(), H, JSON.parse('{"__proto__":{"x":"CPTID"},"Town":"City"}')), /not in the header list|key CPTID|must be text/);
});

test("check refuses edited body with old hash, wrong client/table, stale registry/types/config, missing headers, oversize, extra keys", async () => {
  const { buildProfile, checkProfile } = await import("../lib/portal-v2/source-mapping-profile");
  const p = buildProfile(ctx0(), H, M);
  const edited = { ...p, mapping: p.mapping.map(([h, d]) => [h, d === "SEC" ? "City" : d]) };
  assert.throws(() => checkProfile(JSON.stringify(edited), ctx0(), H), /integrity/);
  const reordered = { ...p, headers: [...p.headers].reverse() };
  assert.throws(() => checkProfile(JSON.stringify(reordered), ctx0(), H), /integrity/);
  assert.throws(() => checkProfile(JSON.stringify({ ...p, extra: 1 }), ctx0(), H), /unexpected or missing/);
  assert.throws(() => checkProfile(JSON.stringify(p), { ...ctx0(), client: "other" }, H), /This profile is for fx\/board_info/);
  assert.throws(() => checkProfile(JSON.stringify(p), { ...ctx0(), table: "gifts" }, H), /not fx\/gifts/);
  assert.throws(() => checkProfile(JSON.stringify(p), { ...ctx0(), registryRev: "b".repeat(64) }, H), /registry revision/);
  const typeChanged = ctx0(); typeChanged.dests[1] = { ...typeChanged.dests[1], len: 50 };
  assert.throws(() => checkProfile(JSON.stringify(p), typeChanged, H), /destination fields or types/);
  const stateChanged = ctx0(); stateChanged.dests[2] = { ...stateChanged.dests[2], st: "unsupported" };
  assert.throws(() => checkProfile(JSON.stringify(p), stateChanged, H), /destination fields or types/);
  assert.throws(() => checkProfile(JSON.stringify(p), { ...ctx0(), preparedDigest: "c".repeat(64) }, H), /prepared registration/);
  assert.throws(() => checkProfile(JSON.stringify(p), { ...ctx0(), allocatorDigest: "c".repeat(64) }, H), /allocator/);
  assert.throws(() => checkProfile(JSON.stringify(p), { ...ctx0(), insertPolicyDigest: "c".repeat(64) }, H), /insert policy/);
  assert.throws(() => checkProfile(JSON.stringify(p), ctx0(), ["Internal constituent number", "Sec"]), /missing columns the profile expects: Town/);
  assert.throws(() => checkProfile(JSON.stringify(p), ctx0(), [...H, "town"]), /Duplicate column headers/);
  assert.throws(() => checkProfile(JSON.stringify(p) + " ".repeat(65536), ctx0(), H), /64 KB/);
  assert.throws(() => checkProfile("[]", ctx0(), H), /Not a mapping profile/);
  assert.throws(() => checkProfile("{", ctx0(), H), /valid JSON/);
});

test("route op mappingProfile: auth, same-origin, current server context only, typed 400s", async () => {
  globalThis.fetch = (async () => { throw new Error("no network in this test"); }) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route");
  const post = (body: Record<string, unknown>, h: Record<string, string> = {}) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", cookie: `catapult_research_auth=${COOKIE}`, ...h }, body: JSON.stringify(body) }));
  const hs = ["Constituent", "Town"]; const m = { Constituent: "CPTID", Town: "City" };
  assert.equal((await post({ op: "mappingProfile", action: "build", client: "pvas", table: "board_info", headers: hs, mapping: m }, { cookie: "" })).status, 401);
  assert.equal((await post({ op: "mappingProfile", action: "build", client: "pvas", table: "board_info", headers: hs, mapping: m }, { origin: "http://evil.example" })).status, 403);
  const fields = (await (await post({ op: "fields", client: "pvas", table: "board_info" })).json()).fields as { col: string; st: string; key: string }[];
  const keyCol = fields.find((f) => f.key === f.col)!.col;
  const city = fields.find((f) => f.st === "candidate" && f.col !== keyCol)!.col;
  const mm = { Constituent: keyCol, Town: city };
  const r = await post({ op: "mappingProfile", action: "build", client: "pvas", table: "board_info", headers: hs, mapping: mm });
  assert.equal(r.status, 200); const { profile } = await r.json();
  assert.equal(profile.client, "pvas"); assert.equal(profile.ctx.prepared, null);
  const c = await (await post({ op: "mappingProfile", action: "check", client: "pvas", table: "board_info", headers: [...hs, "Extra"], profile: JSON.stringify(profile) })).json();
  assert.deepEqual(c.mapping, { ...mm, Extra: "" }); assert.deepEqual(c.unmapped, ["Extra"]);
  const wrong = await post({ op: "mappingProfile", action: "check", client: "baq", table: "board_info", headers: hs, profile: JSON.stringify(profile) });
  assert.equal(wrong.status, 400); assert.match((await wrong.json()).error, /This profile is for pvas\/board_info/);
  const unsup = fields.find((f) => f.st === "unsupported");
  if (unsup) assert.equal((await post({ op: "mappingProfile", action: "build", client: "pvas", table: "board_info", headers: hs, mapping: { Constituent: keyCol, Town: unsup.col } })).status, 400);
  assert.equal((await post({ op: "mappingProfile", action: "nope", client: "pvas", table: "board_info" })).status, 400);
});
