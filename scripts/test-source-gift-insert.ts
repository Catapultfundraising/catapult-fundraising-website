// SYNTHETIC TESTS (fictional data, no network/SQL): policy-gated new gift records and work-bounded job batches.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { reconcile, planWrites, type ReconInput } from "../lib/portal-v2/source-reconcile";
import { livePreview, verifySourceToken, type EngageState } from "../lib/portal-v2/source-import-apply";
import { insertPolicyDigest, GIFT_INSERT_POLICIES, type GiftInsertPolicy } from "../lib/portal-v2/source-insert-policy";
import { buildJobManifest, verifyJobChunk, jobBatchRows, jobWriteCols, statementsPerRecord, SOURCE_MAX_WRITE_STATEMENTS, JOB_MAX_BATCHES } from "../lib/portal-v2/source-jobs";
import { REGISTRY_META } from "../lib/portal-v2/source-registry";

const WC: GiftInsertPolicy = { approvalId: "review-wcbhc-gifts", approvalVersion: 1, client: "wcbhc", table: "giving_history", key: "Transaction_ID", personLink: "CPTID", crosswalk: "", master: { table: "master", key: "CPTID" }, required: ["Date", "Gift_Amount"] };
const POL = { digest: insertPolicyDigest(WC), required: WC.required };
const mapping = { "Gift ID": "Transaction_ID", "Donor CPTID": "CPTID", "Gift date": "Date", Amount: "Gift_Amount", "Gift type": "Type" };
const row = (id: string, cpt: string, amt = "250", type = "Cash as given") => ({ "Gift ID": id, "Donor CPTID": cpt, "Gift date": "2026-10-01T00:00:00", Amount: amt, "Gift type": type });
const base = (rows: Record<string, string>[], over: Partial<ReconInput> = {}): ReconInput => ({ client: "wcbhc", table: "giving_history", mode: "update", mapping, rows, baseline: new Map(), current: new Map(), overlays: [], personOf: new Map(), linkOf: new Map(), ...over });
const ok = (k: number, person: number) => [k, { link: String(person), person, inMaster: true }] as const;

test("default OFF: no policies; new gift IDs held with an explicit reason", () => {
  assert.equal(GIFT_INSERT_POLICIES.length, 0);
  const r = reconcile(base([row("9001", "7001")]));
  assert.equal(r.rows[0].outcome, "held"); assert.match(r.rows[0].reason!, /no approved insert policy/);
  assert.equal(planWrites(r).length, 0);
});

test("approved policy: verified new gift becomes an insert carrying person; Type copied as given; holds are explicit", () => {
  const sl = new Map<number, { link: string; person: number | null; inMaster: boolean }>([ok(9001, 7001), ok(9003, 7003), [9004, { link: "7004", person: null, inMaster: false }], ok(9005, 7005), [9006, { link: "7006", person: 7006, inMaster: false }], ok(9008, 7008)]);
  const r = reconcile(base([row("9001", "7001"), row("9002", ""), row("9003", "7099"), row("9004", "7004"), row("9005", "7005", ""), row("9006", "7006"), row("9007", "7007"), row("9008", "7008")], { insertPolicy: POL, sourceLink: sl, overlays: [{ key: 7008, col: null, provenance: "unknown" }] }));
  const by = Object.fromEntries(r.rows.map((x) => [String(x.key), x]));
  assert.equal(by["9001"].outcome, "insert"); assert.equal(by["9001"].person, 7001);
  assert.match(by["9002"].reason!, /missing or invalid/);
  assert.match(by["9003"].reason!, /not checked by Engage/, "source link differs from what Engage resolved");
  assert.match(by["9004"].reason!, /source person invalid|unmapped/);
  assert.match(by["9005"].reason!, /required source value missing: Gift_Amount/);
  assert.match(by["9006"].reason!, /exactly once in the client master/);
  assert.match(by["9007"].reason!, /not checked by Engage/);
  assert.match(by["9008"].reason!, /protected/);
  const ops = planWrites(r);
  assert.deepEqual(ops, [{ kind: "insert", key: 9001, person: 7001, values: { Date: "2026-10-01T00:00:00", Gift_Amount: "250", Type: "Cash as given" }, expected: null }]);
  // unknown baseline (null) or a key already in baseline -> held, never assumed new
  assert.match(reconcile(base([row("9001", "7001")], { insertPolicy: POL, sourceLink: new Map([ok(9001, 7001)]), baseline: null })).rows[0].reason!, /no baseline/);
  assert.match(reconcile(base([row("9001", "7001")], { insertPolicy: POL, sourceLink: new Map([ok(9001, 7001)]), baseline: new Map([[9001, { Gift_Amount: "1" }]]) })).rows[0].reason!, /in baseline but is gone/);
  // person column not mapped -> held
  const { "Donor CPTID": _x, ...noPerson } = mapping;
  assert.match(reconcile(base([row("9001", "7001")], { mapping: noPerson, insertPolicy: POL, sourceLink: new Map([ok(9001, 7001)]) })).rows[0].reason!, /map the source CPTID/);
});

test("livePreview: Engage policy digest must match; token binds insertPolicyDigest; no policy => no insert token", () => {
  const st: EngageState = { registryRev: REGISTRY_META.rev, overrideHold: false, personLink: "CPTID", duplicateKeys: [], current: [], baseline: [], overlayKeys: [], prospectKeys: [], insertPolicyDigest: insertPolicyDigest(WC), sourceLinks: [{ key: 9001, link: "7001", person: 7001, inMaster: true }], baselineKeys: [] };
  const meta = { fileName: "fictional.csv", csv: "x", fileDate: null, secret: "s".repeat(32), now: 1_800_000_000_000 };
  const b = { client: "wcbhc", table: "giving_history", mode: "update" as const, mapping, rows: [row("9001", "7001")], headers: Object.keys(mapping) };
  const lp = livePreview(b, st, { ...meta, policies: [WC] });
  const { payload } = verifySourceToken(lp.token, meta.secret, meta.now);
  assert.equal(payload.insertPolicyDigest, insertPolicyDigest(WC)); assert.equal(payload.ops[0].kind, "insert");
  assert.throws(() => livePreview(b, st, { ...meta, policies: [{ ...WC, approvalVersion: 2 }] }), /different gift insert policy/);
  assert.throws(() => livePreview(b, st, meta), /different gift insert policy/);
  const off = livePreview(b, { ...st, insertPolicyDigest: null, sourceLinks: [] }, meta);
  assert.equal(off.token, null); assert.equal(off.result.rows[0].outcome, "held");
});

test("work-bounded batches: rows per batch from columns written; budget math; 50k rows; batch size mismatch refused", async () => {
  assert.equal(statementsPerRecord(3, true), 8); assert.equal(jobBatchRows(3), Math.floor(SOURCE_MAX_WRITE_STATEMENTS / 8));
  assert.equal(jobBatchRows(0), jobBatchRows(1)); assert.ok(jobBatchRows(1) <= 500);
  for (let c = 1; c <= 60; c++) assert.ok(jobBatchRows(c) * statementsPerRecord(c, true) <= SOURCE_MAX_WRITE_STATEMENTS, `cols ${c}`);
  const dests = [{ col: "ID", st: "candidate", key: "ID" }, { col: "A", st: "candidate", key: "ID" }, { col: "B", st: "candidate", key: "ID" }, { col: "C", st: "held", key: "ID" }];
  assert.equal(jobWriteCols(dests, { x: "ID", y: "A", z: "C" }, false), 1); assert.equal(jobWriteCols(dests, {}, true), 3);
  const sha = async (s: string) => createHash("sha256").update(s).digest("hex");
  const rows = Array.from({ length: 50_000 }, (_, i) => ({ ID: String(i + 1), A: "x", B: "y" }));
  const BR = jobBatchRows(2);
  const { manifest, jobId } = await buildJobManifest(sha, { client: "pvas", table: "t", keyCol: "ID", mapping: { ID: "ID", A: "A", B: "B" }, headers: ["ID", "A", "B"], rows, fileName: "f.csv", fileDate: null, actor: "Pat", registryRev: "r", batchRows: BR });
  assert.equal(manifest.batchRows, BR); assert.equal(manifest.batchHashes.length, Math.ceil(50_000 / BR)); assert.ok(manifest.batchHashes.length <= JOB_MAX_BATCHES);
  const exp = { client: "pvas", table: "t", registryRev: "r", actor: "Pat", keyCol: "ID", batchRows: BR };
  const last = manifest.batchHashes.length - 1;
  const v = await verifyJobChunk(sha, manifest, jobId, last, rows.slice(last * BR), exp);
  assert.equal(v.rows.length, 50_000 - last * BR);
  await assert.rejects(verifyJobChunk(sha, manifest, jobId, 0, rows.slice(0, BR), { ...exp, batchRows: 500 }), /sizes are inconsistent/);
  await assert.rejects(buildJobManifest(sha, { client: "pvas", table: "t", keyCol: "ID", mapping: { ID: "ID" }, headers: ["ID"], rows, fileName: "f.csv", fileDate: null, actor: "Pat", registryRev: "r", batchRows: 20 }), /more than 2000 batches/);
});

test("baseline existence of ANY provenance (no destination row) holds the new key; missing baselineKeys fails closed", () => {
  const st: EngageState = { registryRev: REGISTRY_META.rev, overrideHold: false, personLink: "CPTID", duplicateKeys: [], current: [], baseline: [], overlayKeys: [], prospectKeys: [], insertPolicyDigest: insertPolicyDigest(WC), sourceLinks: [{ key: 9001, link: "7001", person: 7001, inMaster: true }], baselineKeys: [9001] };
  const meta = { fileName: "fictional.csv", csv: "x", fileDate: null, secret: "s".repeat(32), now: 1_800_000_000_000, policies: [WC] };
  const b = { client: "wcbhc", table: "giving_history", mode: "update" as const, mapping, rows: [row("9001", "7001")], headers: Object.keys(mapping) };
  const lp = livePreview(b, st, meta);
  assert.equal(lp.token, null); assert.equal(lp.result.rows[0].outcome, "held"); assert.match(lp.result.rows[0].reason ?? "", /baseline row/);
  const { baselineKeys: _omit, ...noBk } = st; void _omit;
  assert.throws(() => livePreview(b, noBk as EngageState, meta), /baseline existence/);
});
