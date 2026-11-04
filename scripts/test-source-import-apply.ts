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
  assert.deepEqual(Object.keys(late.request).sort(), ["actor", "client", "fileDate", "fileDigest", "fileName", "insertPolicyDigest", "mode", "ops", "preparedDigest", "previewExp", "previewHash", "registryRev", "requestId", "table"]);
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

test("PVAS notes (update-only, person-linked): two notes one person, person-level protection, link checks, no inserts", () => {
  const nb = { client: "pvas", table: "notes", mode: "update" as const, mapping: { NoteID: "ID", Person: "CPTID", Order: "Note_Order_Newest_to_Oldest" } };
  const ns = (over: Partial<EngageState> = {}): EngageState => ({ registryRev: REGISTRY_META.rev, personLink: "CPTID", duplicateKeys: [],
    current: [{ key: 501, person: 9001, values: { Note_Order_Newest_to_Oldest: "1" }, unreadable: [] }, { key: 502, person: 9001, values: { Note_Order_Newest_to_Oldest: "2" }, unreadable: [] }],
    baseline: [{ key: 501, col: "Note_Order_Newest_to_Oldest", value: "1" }, { key: 502, col: "Note_Order_Newest_to_Oldest", value: "2" }], overlayKeys: [], prospectKeys: [], ...over });
  const rows = [{ NoteID: "501", Person: "9001", Order: "2" }, { NoteID: "502", Person: "9001", Order: "1" }];
  const ok = livePreview({ ...nb, rows }, ns(), meta);
  assert.deepEqual(ok.result.rows.map((r) => r.outcome), ["update", "update"]);
  const ops = verifySourceToken(ok.token, SECRET, 2000).payload.ops;
  assert.deepEqual(ops.map((o) => [o.key, o.person]), [[501, 9001], [502, 9001]]);
  // a portal edit on PERSON 9001 protects both notes; an overlay on CPTID 501 (equal to a note ID) does not
  assert.equal(livePreview({ ...nb, rows }, ns({ overlayKeys: [9001] }), meta).token, null);
  assert.ok(livePreview({ ...nb, rows }, ns({ overlayKeys: [501] }), meta).token);
  // missing person link, unknown note ID (insert) and duplicate note IDs are held/invalid
  assert.equal(livePreview({ ...nb, rows }, ns({ current: [{ key: 501, person: null, values: { Note_Order_Newest_to_Oldest: "1" }, unreadable: [] }] }), meta).result.rows[0].outcome, "held");
  assert.match(livePreview({ ...nb, rows: [{ NoteID: "999", Person: "9001", Order: "1" }] }, ns(), meta).result.rows[0].reason!, /update-only|no approved insert policy/);
  assert.deepEqual(livePreview({ ...nb, rows: [rows[0], rows[0]] }, ns(), meta).result.rows.map((r) => r.outcome), ["invalid", "invalid"]);
  // source person link: mismatch (note re-linked 9001 -> 9002 in source) and absent/unmapped/blank all hold; never written
  const mm = livePreview({ ...nb, rows: [{ NoteID: "501", Person: "9002", Order: "2" }] }, ns(), meta);
  assert.equal(mm.token, null); assert.match(mm.result.rows[0].reason!, /does not match/);
  const um = livePreview({ ...nb, mapping: { NoteID: "ID", Order: "Note_Order_Newest_to_Oldest" }, rows: [{ NoteID: "501", Order: "2" }] }, ns(), meta);
  assert.equal(um.token, null); assert.match(um.result.rows[0].reason!, /map the source CPTID/);
  const bl = livePreview({ ...nb, rows: [{ NoteID: "501", Person: "", Order: "2" }] }, ns(), meta);
  assert.equal(bl.token, null); assert.match(bl.result.rows[0].reason!, /missing or invalid/);
  // CPTID is the verified link (never in values); Date not writable
  assert.ok(ops.every((o) => !("CPTID" in o.values)));
  const r = livePreview({ ...nb, mapping: { ...nb.mapping, D: "Date" }, rows: [{ NoteID: "501", Person: "9001", Order: "2", D: "2026-01-01" }] }, ns(), meta);
  assert.deepEqual(r.result.columns.filter((c) => ["Person", "D"].includes(c.header)).map((c) => c.state), ["person-link", "held"]);
});

test("WCBHC gifts (update-only, person-linked): Transaction_ID key, CPTID verified; missing person held; no inserts", () => {
  const gb = { client: "wcbhc", table: "non_campaign_giving_history", mode: "update" as const, mapping: { GiftID: "ID", Person: "CPTID", Amt: "Donation_Amount" } };
  const gs = (over: Partial<EngageState> = {}): EngageState => ({ registryRev: REGISTRY_META.rev, overrideHold: false, personLink: "CPTID", duplicateKeys: [],
    current: [{ key: 71, person: 5001, values: { Donation_Amount: "100" }, unreadable: [] }, { key: 72, person: 5001, values: { Donation_Amount: "25.5" }, unreadable: [] }, { key: 73, person: null, values: { Donation_Amount: "10" }, unreadable: [] }],
    baseline: [71, 72, 73].map((k, i) => ({ key: k, col: "Donation_Amount", value: ["100", "25.5", "10"][i] })), overlayKeys: [], prospectKeys: [], ...over });
  const rows = [{ GiftID: "71", Person: "5001", Amt: "150" }, { GiftID: "72", Person: "5001", Amt: "25.50" }, { GiftID: "73", Person: "", Amt: "12" }];
  const lp = livePreview({ ...gb, rows }, gs(), meta);
  assert.deepEqual(lp.result.rows.map((r) => r.outcome), ["update", "unchanged", "held"]);
  const ops = verifySourceToken(lp.token, SECRET, 2000).payload.ops;
  assert.deepEqual(ops.map((o) => [o.key, o.person, o.values]), [[71, 5001, { Donation_Amount: "150" }]]);
  assert.match(lp.result.rows[2].reason!, /person link missing/);
  // person mismatch, manual portal edit on the person, new gift ID: all held
  assert.equal(livePreview({ ...gb, rows: [{ GiftID: "71", Person: "5002", Amt: "150" }] }, gs(), meta).token, null);
  assert.equal(livePreview({ ...gb, rows: [rows[0]] }, gs({ overlayKeys: [5001] }), meta).token, null);
  assert.match(livePreview({ ...gb, rows: [{ GiftID: "999", Person: "5001", Amt: "1" }] }, gs(), meta).result.rows[0].reason!, /update-only|no approved insert policy/);
  const cg = livePreview({ client: "wcbhc", table: "giving_history", mode: "update", mapping: { T: "Transaction_ID", P: "CPTID", A: "Gift_Amount" }, rows: [{ T: "9001", P: "44", A: "500" }] },
    { registryRev: REGISTRY_META.rev, overrideHold: false, personLink: "CPTID", duplicateKeys: [], current: [{ key: 9001, person: 44, values: { Gift_Amount: "250" }, unreadable: [] }], baseline: [{ key: 9001, col: "Gift_Amount", value: "250" }], overlayKeys: [], prospectKeys: [] }, meta);
  assert.deepEqual(verifySourceToken(cg.token, SECRET, 2000).payload.ops.map((o) => [o.key, o.person]), [[9001, 44]]);
});


test("crosswalk + key kinds in reconciliation: CSNF text link must match exactly; PVAS bigint/text keys exact; unmapped/ambiguous held", async () => {
  const { parseKeyOf, canonLink } = await import("../lib/portal-v2/source-keys");
  assert.equal(parseKeyOf("bigint", "9999999999"), 9999999999); assert.equal(parseKeyOf("bigint", "9999999999.0"), 9999999999); assert.equal(parseKeyOf("bigint", "9007199254740993"), null); assert.equal(parseKeyOf("bigint", "1.5"), null);
  assert.equal(parseKeyOf("text", "01234"), "01234"); assert.equal(parseKeyOf("text", " 01234"), null); assert.equal(canonLink("int", "00555"), "555"); assert.equal(canonLink("int", "555.5"), null); assert.equal(canonLink("text", "001A"), "001A");
  const cs = (over: Partial<EngageState> = {}): EngageState => ({ registryRev: REGISTRY_META.rev, overrideHold: false, personLink: "Account_ID", duplicateKeys: [],
    current: [{ key: 11, person: 7001, link: "001A", values: { Amount: "100" }, unreadable: [] }, { key: 12, person: null, link: "002B", values: { Amount: "5" }, unreadable: [] }],
    baseline: [{ key: 11, col: "Amount", value: "100" }, { key: 12, col: "Amount", value: "5" }], overlayKeys: [], prospectKeys: [], ...over });
  const cb = { client: "csnf", table: "Raw_Data_Gift_File", mode: "update" as const, mapping: { GiftID: "ID", Acct: "Account_ID", Amt: "Amount" } };
  const lp = livePreview({ ...cb, rows: [{ GiftID: "11", Acct: "001A", Amt: "150" }, { GiftID: "12", Acct: "002B", Amt: "6" }] }, cs(), meta);
  assert.deepEqual(lp.result.rows.map((r) => r.outcome), ["update", "held"]); assert.match(lp.result.rows[1].reason!, /unmapped or ambiguous/);
  assert.deepEqual(verifySourceToken(lp.token, SECRET, 2000).payload.ops.map((o) => [o.key, o.person, o.link]), [[11, 7001, "001A"]]);
  for (const Acct of ["001a", "001A ", "002B", ""]) assert.equal(livePreview({ ...cb, rows: [{ GiftID: "11", Acct, Amt: "150" }] }, cs(), meta).token, null, Acct);
  const pt = livePreview({ client: "pvas", table: "givebutter_pledges", mode: "update", mapping: { Id: "Id", C: "Givebutter_Contact_ID", S: "Status" }, rows: [{ Id: "01234", C: "555", S: "fulfilled" }, { Id: "1234", C: "555", S: "x" }] },
    { registryRev: REGISTRY_META.rev, overrideHold: false, personLink: "Givebutter_Contact_ID", duplicateKeys: [], current: [{ key: "01234", person: 8001, link: "555", values: { Status: "active" }, unreadable: [] }], baseline: [{ key: "01234", col: "Status", value: "active" }], overlayKeys: [], prospectKeys: [] }, meta);
  assert.deepEqual(pt.result.rows.map((r) => [r.key, r.outcome]), [["01234", "update"], ["1234", "held"]]);
});
