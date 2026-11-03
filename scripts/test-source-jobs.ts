// Synthetic tests for large-file job batching (fictional data; stubbed Engage fetch; no network, no SQL).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { buildJobManifest, verifyJobChunk, batchRequestId, summarizeJob, JobError, JOB_BATCH_ROWS, JOB_CHUNK_MAX_BYTES, JOB_MANIFEST_MAX_BYTES } from "../lib/portal-v2/source-jobs";
import { REGISTRY_META } from "../lib/portal-v2/source-registry";

const sha = async (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const COL = "Quality_Score";
const mkRows = (n: number, from = 1) => Array.from({ length: n }, (_, i) => ({ ID: String(from + i), Q: `Q${(from + i) % 7}` }));
const P = (rows: Record<string, string>[]) => ({ client: "pvas", table: "donorsearch_results", keyCol: "CPTID", mapping: { ID: "CPTID", Q: COL }, headers: ["ID", "Q"], rows, fileName: "weekly-export.csv", fileDate: "2026-11-01", actor: "Pat Example", registryRev: REGISTRY_META.rev });
const EXP = { client: "pvas", table: "donorsearch_results", registryRev: REGISTRY_META.rev, actor: "Pat Example" };

test("50,000-row file: 100 batches, manifest + one batch request stay under the deployed body limit", async () => {
  const rows = mkRows(50_000);
  const { manifest, jobId } = await buildJobManifest(sha, P(rows));
  assert.equal(manifest.batchHashes.length, 100);
  const body = JSON.stringify({ op: "jobPreview", client: "pvas", table: "donorsearch_results", actor: "Pat Example", manifest, jobId, batchIndex: 99, rows: rows.slice(99 * JOB_BATCH_ROWS) });
  assert.ok(JSON.stringify(manifest).length < JOB_MANIFEST_MAX_BYTES && Buffer.byteLength(body) < JOB_CHUNK_MAX_BYTES + JOB_MANIFEST_MAX_BYTES - 200_000 && Buffer.byteLength(body) < 4_500_000);
  const v = await verifyJobChunk(sha, manifest, jobId, 99, rows.slice(99 * 500), EXP);
  assert.equal(v.rows.length, 500); assert.equal(v.requestId, (await sha(`${jobId}:99`)).slice(0, 32)); assert.match(v.requestId, /^[a-f0-9]{32}$/);
  await assert.rejects(buildJobManifest(sha, P(mkRows(50_001))), /At most/);
});
test("duplicate IDs ACROSS batches refuse the whole file before any upload; tampered manifest refused server-side", async () => {
  const rows = mkRows(1200); rows[1100] = { ID: "3", Q: "x" }; // ID 3 also in batch 0
  await assert.rejects(buildJobManifest(sha, P(rows)), (e: JobError) => /more than once/.test(e.message) && JSON.stringify(e.detail).includes("3"));
  const ok = mkRows(1200); const { manifest, jobId } = await buildJobManifest(sha, P(ok));
  const forged = { ...manifest, keys: manifest.keys.map((k, i) => (i === 1100 ? 3 : k)) };
  await assert.rejects(verifyJobChunk(sha, forged, jobId, 0, ok.slice(0, 500), EXP), /unique across the whole file/);
});
test("resume with a changed file / mapping / date / actor / registry is refused; wrong batch content refused", async () => {
  const rows = mkRows(1200); const { manifest, jobId } = await buildJobManifest(sha, P(rows));
  const changed = rows.slice(500, 1000).map((r, i) => (i === 7 ? { ...r, Q: "edited" } : r));
  await assert.rejects(verifyJobChunk(sha, manifest, jobId, 1, changed, EXP), /content differs/);
  await assert.rejects(verifyJobChunk(sha, { ...manifest, fileDate: null }, jobId, 1, rows.slice(500, 1000), EXP), /identity does not match/);
  await assert.rejects(verifyJobChunk(sha, { ...manifest, mapping: [["ID", "CPTID"]] }, jobId, 1, rows.slice(500, 1000), EXP), /identity does not match/);
  await assert.rejects(verifyJobChunk(sha, manifest, jobId, 1, rows.slice(500, 1000), { ...EXP, actor: "Other" }), /another author/);
  await assert.rejects(verifyJobChunk(sha, manifest, jobId, 1, rows.slice(500, 1000), { ...EXP, registryRev: "0".repeat(64) }), /registry changed/);
  await assert.rejects(verifyJobChunk(sha, manifest, jobId, 2, rows.slice(1000, 1199), EXP), /must have 200 rows/);
  const r2 = await buildJobManifest(sha, P(changed.length ? [...rows.slice(0, 500), ...changed, ...rows.slice(1000)] : rows));
  assert.notEqual(r2.jobId, jobId, "different content => different job (no resume)");
  assert.equal(await batchRequestId(sha, jobId, 1), (await sha(`${jobId}:1`)).slice(0, 32));
});
test("job summary: complete only when all batches saved with zero held rows; partial/unconfirmed never complete", () => {
  assert.equal(summarizeJob(3, [{ index: 0, state: "saved" }, { index: 1, state: "saved" }, { index: 2, state: "saved" }]).state, "complete");
  const p = summarizeJob(3, [{ index: 0, state: "saved", savedRecords: 500 }, { index: 1, state: "saved_with_holds", savedRecords: 480, heldRows: 20 }]);
  assert.equal(p.state, "partial"); assert.match(p.label, /2 of 3 batches saved \(980 records\); 20 rows held; 1 not yet saved\. This file is NOT fully applied/);
  assert.equal(summarizeJob(2, [{ index: 0, state: "saved" }, { index: 1, state: "held_only", heldRows: 500 }]).state, "done_with_holds");
  assert.equal(summarizeJob(2, [{ index: 0, state: "saved" }, { index: 1, state: "unconfirmed" }]).state, "unconfirmed");
});

Object.assign(process.env, { RESEARCH_PASSWORD: "localpw", RESEARCH_AUTH_SECRET: "localsec", SOURCE_IMPORT_PREVIEW: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: "w".repeat(32) });
const COOKIE = createHash("sha256").update("localpw:localsec").digest("hex");
test("route jobPreview: batch token carries derived requestId + job ref + content digest; jobStatus forwarded; tampered batch 400", async () => {
  const rows = mkRows(1200, 101); const { manifest, jobId } = await buildJobManifest(sha, P(rows));
  const calls: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_u: unknown, init: { body: string }) => {
    const b = JSON.parse(init.body); calls.push(b);
    if (b.op === "jobStatus") return Response.json({ found: true, batches: [{ index: 0, state: "saved" }] });
    const keys = b.keys as number[];
    return Response.json({ registryRev: REGISTRY_META.rev, duplicateKeys: [], current: keys.map((k) => ({ key: k, values: { [COL]: "old" }, unreadable: [] })), baseline: keys.map((k) => ({ key: k, col: COL, value: "old" })), overlayKeys: [keys[0]], prospectKeys: [] });
  }) as unknown as typeof fetch;
  const { POST } = await import("../app/api/research-source-import/route");
  const { verifySourceToken } = await import("../lib/portal-v2/source-import-apply");
  const post = (body: Record<string, unknown>) => POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", cookie: `catapult_research_auth=${COOKIE}` }, body: JSON.stringify(body) }));
  const res = await post({ op: "jobPreview", client: "pvas", table: "donorsearch_results", actor: "Pat Example", manifest, jobId, batchIndex: 1, rows: rows.slice(500, 1000) });
  const j = await res.json(); assert.equal(res.status, 200, JSON.stringify(j));
  assert.equal((calls.at(-1) as { keys: number[] }).keys.length, 500);
  const tok = verifySourceToken(j.token, "w".repeat(32)).payload;
  assert.equal(tok.requestId, (await sha(`${jobId}:1`)).slice(0, 32));
  assert.deepEqual(tok.job, { jobId, batchIndex: 1, batchCount: 3, totalRows: 1200, heldRows: 1 });
  assert.equal(tok.fileDigest, await sha(manifest.batchHashes.join(","))); assert.equal(tok.fileDate, "2026-11-01"); assert.equal(tok.fileName, "weekly-export.csv");
  assert.equal(tok.ops.length, 499, "manual-edited record held, not written");
  const bad = await post({ op: "jobPreview", client: "pvas", table: "donorsearch_results", actor: "Pat Example", manifest, jobId, batchIndex: 1, rows: rows.slice(0, 500) });
  assert.equal(bad.status, 400);
  const st = await (await post({ op: "jobStatus", client: "pvas", jobId })).json();
  assert.equal(st.found, true); assert.equal(calls.at(-1)!.op, "jobStatus");
});
