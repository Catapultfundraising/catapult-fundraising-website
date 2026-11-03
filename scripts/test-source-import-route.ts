// Configured-route integration test with a FICTIONAL prepared client. Engage is a stubbed fetch; no network, no SQL.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

Object.assign(process.env, { RESEARCH_PASSWORD: "localpw", RESEARCH_AUTH_SECRET: "localsec", SOURCE_IMPORT_PREVIEW: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: "w".repeat(32), SOURCE_PREPARED_TEST_HOOK: "1" });
const COOKIE = createHash("sha256").update("localpw:localsec").digest("hex");

test("prepared new client: tables/fields, initial-load preview, then later update preview with a protected manual edit", async () => {
  const { __setPreparedForTests, preparedDigest } = await import("../lib/portal-v2/source-reconcile");
  const { REGISTRY_META } = await import("../lib/portal-v2/source-registry");
  const prepared = { approvalId: "review-2026-11-03-fictional", client: "fictional_x", schema: "fictional_x", registryVersion: 3, approvedBy: "Reviewer", approvedAt: "2026-11-03",
    tables: [{ table: "master", key: "CPTID", columns: [{ col: "CPTID", ty: "int" }, { col: "Account_Name", ty: "nvarchar", len: 200, required: true }, { col: "City", ty: "nvarchar", len: 100 }] }] };
  __setPreparedForTests([prepared]);
  const digest = preparedDigest(prepared, "master");
  let engageState: Record<string, unknown> = {};
  const calls: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_u: unknown, init: { body: string; headers: Record<string, string> }) => {
    const b = JSON.parse(init.body); calls.push(b);
    assert.equal(init.headers.authorization, `Bearer ${"w".repeat(32)}`);
    return Response.json(b.op === "previewState" ? engageState : { tables: [] });
  }) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route");
  const post = (body: Record<string, unknown>, cookie = true) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", ...(cookie ? { cookie: `catapult_research_auth=${COOKIE}` } : {}) }, body: JSON.stringify(body) }));

  assert.equal((await post({ op: "clients" }, false)).status, 401);
  assert.ok((await (await post({ op: "clients" })).json()).clients.includes("fictional_x"));
  assert.deepEqual((await (await post({ op: "tables", client: "fictional_x" })).json()).tables.map((t: { table: string }) => t.table), ["master"]);
  assert.equal((await (await post({ op: "fields", client: "fictional_x", table: "master" })).json()).fields.length, 3);

  const csv1 = "ID,Name,City\n7,Org A,\n8,Org B,Springfield\n";
  const mapping = { ID: "CPTID", Name: "Account_Name", City: "City" };
  engageState = { registryRev: REGISTRY_META.rev, destinationEmpty: true, preparedDigest: digest, duplicateKeys: [], current: [], baseline: [], overlayKeys: [], prospectKeys: [] };
  const p1 = await (await post({ op: "preview", client: "fictional_x", table: "master", csv: csv1, mapping, fileName: "initial.csv", fileDate: "" })).json();
  assert.equal(p1.mode, "first-load"); assert.deepEqual(p1.result.rows.map((r: { outcome: string }) => r.outcome), ["insert", "insert"]);
  assert.ok(p1.token); assert.equal(p1.applyAvailable, false, "transport not approved");
  assert.deepEqual((calls.at(-1) as { cols: string[] }).cols, ["Account_Name", "City"]);

  const csv2 = "ID,City\n7,Shelbyville\n8,Ogdenville\n";
  engageState = { registryRev: REGISTRY_META.rev, destinationEmpty: false, preparedDigest: digest, duplicateKeys: [],
    current: [{ key: 7, values: { City: null }, unreadable: [] }, { key: 8, values: { City: "Springfield" }, unreadable: [] }],
    baseline: [{ key: 7, col: "City", value: null }, { key: 8, col: "City", value: "Springfield" }], overlayKeys: [8], prospectKeys: [] };
  const p2 = await (await post({ op: "preview", client: "fictional_x", table: "master", csv: csv2, mapping: { ID: "CPTID", City: "City" }, fileName: "later.csv", fileDate: "2026-11-01" })).json();
  assert.equal(p2.mode, "update"); assert.deepEqual(p2.result.rows.map((r: { outcome: string }) => r.outcome), ["update", "held"]);

  // Engage holding a different registration (same approval id, changed schema) => refused
  engageState = { ...engageState, preparedDigest: "0".repeat(64) };
  const p3 = await post({ op: "preview", client: "fictional_x", table: "master", csv: csv2, mapping: { ID: "CPTID", City: "City" }, fileName: "later.csv" });
  assert.equal(p3.status, 400); assert.match((await p3.json()).error, /different reviewed registration/);
  __setPreparedForTests(null);
});
