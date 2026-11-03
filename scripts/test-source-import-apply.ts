// Synthetic tests for the hidden website<->Engage source-import wiring. Fake fetch only; no network, no SQL.
import test from "node:test";
import assert from "node:assert/strict";
import { REGISTRY_META, SOURCE_FIELDS } from "../lib/portal-v2/source-registry";
import { applyRequestBody, livePreview, postToEngage, sourceApplyConfigured, sourcePreviewConfigured, stateToInputs, verifySourceToken, type EngageState } from "../lib/portal-v2/source-import-apply";

const SECRET = "x".repeat(32);
const COL = "Quality_Score";
const ENV = { SOURCE_IMPORT_PREVIEW: "enabled", SOURCE_IMPORT_APPLY: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: SECRET };
const state = (over: Partial<EngageState> = {}): EngageState => ({ registryRev: REGISTRY_META.rev, duplicateKeys: [], current: [{ key: 101, values: { [COL]: "A" }, unreadable: [] }], baseline: [{ key: 101, col: COL, value: "A" }], overlayKeys: [], prospectKeys: [], ...over });
const base = { client: "pvas", table: "donorsearch_results", mode: "update" as const, mapping: { ID: "CPTID", Q: COL }, rows: [{ ID: "101", Q: "B" }] };
const meta = { fileName: "f.csv", csv: "ID,Q\n101,B\n", fileDate: "2026-11-01", secret: SECRET, now: 1000 };

test("gates default off; apply hard-gated even with every env set", () => {
  assert.equal(sourcePreviewConfigured({}), false);
  assert.equal(sourceApplyConfigured(ENV), false);
  assert.equal(sourceApplyConfigured(ENV, true), true);
  assert.equal(sourcePreviewConfigured({ ...ENV, PORTAL_WRITE_SECRET: "short" }), false);
});
test("no persisted baseline (existing clients today) -> everything held, no token", () => {
  const lp = livePreview(base, state({ baseline: [] }), meta);
  assert.equal(lp.token, null); assert.equal(lp.result.rows[0].outcome, "held");
});
test("unreadable current, overlay, prospect, registry mismatch all hold or refuse", () => {
  assert.equal(livePreview(base, state({ current: [{ key: 101, values: { [COL]: null }, unreadable: [COL] }] }), meta).token, null);
  assert.equal(livePreview(base, state({ overlayKeys: [101] }), meta).token, null);
  assert.equal(livePreview(base, state({ prospectKeys: [101] }), meta).result.rows[0].outcome, "held");
  assert.throws(() => stateToInputs(state({ registryRev: "0" })), /revision/);
});
test("source-owned baseline -> token binds ops/file/registry; tamper and expiry rejected", () => {
  const lp = livePreview(base, state(), meta);
  assert.ok(lp.token);
  const v = verifySourceToken(lp.token, SECRET, 2000);
  assert.deepEqual(v.payload.ops, [{ kind: "update", key: 101, values: { [COL]: "B" }, expected: { [COL]: "A" } }]);
  assert.equal(v.payload.fileDigest.length, 64); assert.equal(v.payload.registryRev, REGISTRY_META.rev);
  const [b, s] = lp.token!.split(".");
  const forged = Buffer.from(Buffer.from(b, "base64url").toString().replace('"B"', '"C"')).toString("base64url");
  assert.throws(() => verifySourceToken(`${forged}.${s}`, SECRET, 2000), /not valid/);
  assert.throws(() => verifySourceToken(lp.token, SECRET, 1000 + 15 * 60_000 + 1), /expired/);
  assert.throws(() => verifySourceToken(lp.token, "y".repeat(32), 2000), /not valid/);
  const body = applyRequestBody(lp.token, "Pat Example", SECRET, 2000);
  assert.equal(body.request.requestId, lp.requestId); assert.equal(body.request.previewHash, v.previewHash);
  assert.throws(() => applyRequestBody(lp.token, "", SECRET, 2000), /name/);
});
test("lost response handling: network error / 5xx / unreadable -> unconfirmed with same requestId; 503 disabled is definite", async () => {
  const rid = "a".repeat(32);
  const f = (impl: () => Promise<Response>) => impl as unknown as typeof fetch;
  assert.deepEqual(await postToEngage(f(() => Promise.reject(new Error("net"))), ENV, {}, rid), { ok: false, unconfirmed: true, requestId: rid });
  assert.deepEqual(await postToEngage(f(async () => new Response("oops", { status: 500 })), ENV, {}, rid), { ok: false, unconfirmed: true, requestId: rid });
  assert.deepEqual(await postToEngage(f(async () => new Response("not json", { status: 200 })), ENV, {}, rid), { ok: false, unconfirmed: true, requestId: rid });
  const d = await postToEngage(f(async () => Response.json({ code: "disabled" }, { status: 503 })), ENV, {}, rid);
  assert.equal(d.ok, false); assert.equal((d as { unconfirmed: boolean }).unconfirmed, false);
  let calls = 0; await postToEngage(f(async () => { calls++; throw new Error("x"); }), ENV, {}, rid); assert.equal(calls, 1, "no automatic retry");
});

test("duplicate/twice-reported destination keys are held, never collapsed", () => {
  const lp = livePreview(base, state({ duplicateKeys: [101], current: [] }), meta);
  assert.equal(lp.result.rows[0].outcome, "held"); assert.match(lp.result.rows[0].reason!, /more than one row/);
  const lp2 = livePreview(base, state({ current: [{ key: 101, values: { [COL]: "A" }, unreadable: [] }, { key: 101, values: { [COL]: "Z" }, unreadable: [] }] }), meta);
  assert.equal(lp2.result.rows[0].outcome, "held"); assert.equal(lp2.token, null);
  assert.throws(() => stateToInputs({ ...state(), duplicateKeys: undefined } as unknown as EngageState), /malformed/);
});
test("token binds file name/date and prepared approval; expired token still forwards for idempotent replay", () => {
  const lp = livePreview(base, state(), { ...meta, fileName: "export Oct.csv", fileDate: null });
  const v = verifySourceToken(lp.token, SECRET, 2000);
  assert.equal(v.payload.fileName, "export Oct.csv"); assert.equal(v.payload.fileDate, null); assert.equal(v.payload.preparedDigest, null);
  const late = applyRequestBody(lp.token, "Pat", SECRET, 1000 + 16 * 60_000);
  assert.equal(late.request.requestId, lp.requestId);
  assert.deepEqual(Object.keys(late.request).sort(), ["actor", "client", "fileDate", "fileDigest", "fileName", "mode", "ops", "preparedDigest", "previewExp", "previewHash", "registryRev", "requestId", "table"]);
});
test("source additions: PVAS DonorSearch additions held (preflight); no token", () => {
  const add = livePreview({ ...base, rows: [{ ID: "202", Q: "N" }] }, state({ current: [], baseline: [] }), meta);
  assert.equal(add.result.rows[0].outcome, "held"); assert.equal(add.token, null);
});

test("a one-row CSV import never marks a table or dashboard refreshed", async () => {
  const { describeFreshness, csvUpdatesNote } = await import("../lib/portal-v2/source-import-apply");
  assert.equal(describeFreshness(["a", "b"], null).summary, "No accepted CSV updates recorded");
  const one = [{ table: "a", fileDate: "2026-10-01", loadedAt: "2026-11-03T10:00:00", requestId: "x", records: 1 }];
  const f = describeFreshness(["a"], one);
  assert.match(f.summary, /partial/); assert.doesNotMatch(f.summary, /All tables|fully refreshed$/);
  assert.match(f.rows[0].label, /1 record on 2026-11-03 \(source export dated 2026-10-01\); other rows and fields not covered/);
  assert.match(describeFreshness(["a"], [{ ...one[0], fileDate: null }]).rows[0].label, /source export date unknown/);
  assert.deepEqual(await csvUpdatesNote("pvas", {}), { configured: false });
  const fake = (async () => Response.json({ tables: [{ table: "donorsearch_results", fileDate: null, loadedAt: "2026-11-03T10:00:00", requestId: "x", records: 1 }] })) as unknown as typeof fetch;
  const note = await csvUpdatesNote("pvas", ENV, fake) as { rows: { table: string }[]; summary: string };
  assert.deepEqual(note.rows.map((r) => r.table), ["donorsearch_results"]); assert.match(note.summary, /^Accepted CSV updates recorded for 1 of \d+ tables \(partial/);
});
