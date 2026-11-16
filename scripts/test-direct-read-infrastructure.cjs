// MOCK Blob/no SQL. Real strict reader + real filesystem fixtures + current-main pure consumers.
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const assert = require("node:assert/strict"), Module = require("node:module"), ts = require("typescript");
const root = process.cwd(), original = Module._load;
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, filename) =>
  m._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
let blobRead;
Module._load = function(name, parent, main) {
  if (name === "server-only") return {}; // Node fixture harness, not a client bundler.
  if (name === "@vercel/blob") return { get: async (...args) => blobRead(...args) };
  if (name.startsWith("@/")) name = path.join(root, name.slice(2));
  return original.call(this, name, parent, main);
};
global.fetch = () => { throw new Error("NETWORK FORBIDDEN"); };
const strict = require("../lib/portal-v2/direct-tracking-state.ts");
const { strictTrackingFor, strictTrackingManualFor } = require("../lib/portal-v2/direct-tracking-reader.server.ts");
const { composeDirectValue, sourceNoteEntries, DIRECT_READ_INTEGRATION_ACCEPTED, APPROVED_DIRECT_READ_REGISTRATIONS } = require("../lib/portal-v2/direct-effective-state.ts");
const { buildOverlay } = require("../lib/portal-v2/record-overlay.ts");
const { effectiveAsk, askEdits, overlayCampaignAsks } = require("../lib/portal-v2/effective-ask.ts");
const { assignmentResolver, viewAssignment, filterAssignments } = require("../lib/portal-v2/effective-assignment.ts");
const known = value => ({ kind: "known", value }), absent = known({ present: false });
const present = value => known({ present: true, value });
const encode = x => new TextEncoder().encode(typeof x === "string" ? x : JSON.stringify(x));
const stateOf = (client, x) => strict.readStrictTracking(client, async () => ({ kind: "bytes", bytes: encode(x) }));
const doc = (prospects = {}, activity = [], removed = []) => ({ prospects, activity, removed });
let checks = 0;
function check(name, fn) { return Promise.resolve().then(fn).then(() => { ++checks; console.log(`ok ${checks} - ${name}`); }); }
(async () => {
  console.log("# MOCK Blob / NO SQL / synthetic local files only");
  await check("hard gate OFF and empty registrations; no HTTP callback route", () => {
    assert.equal(DIRECT_READ_INTEGRATION_ACCEPTED, false);
    assert.deepEqual(APPROVED_DIRECT_READ_REGISTRATIONS, []);
    assert.ok(Object.isFrozen(APPROVED_DIRECT_READ_REGISTRATIONS));
    assert.ok(fs.readFileSync("lib/portal-v2/direct-tracking-reader.server.ts", "utf8").includes('import "server-only"'));
  });
  for (const client of strict.DIRECT_CLIENTS) {
    await check(`${client}: absent distinct from read failure/invalid/actual empty; exact byte revision`, async () => {
      const a = await strict.readStrictTracking(client, async p => { assert.equal(p, `${client}-data/tracking.json`); return { kind: "absent" }; });
      const e = await stateOf(client, doc());
      assert.equal(a.kind, "absent"); assert.equal(e.kind, "present"); assert.notEqual(a.revision, e.revision);
      assert.notEqual(e.revision, (await stateOf(client, " " + JSON.stringify(doc()))).revision);
      assert.deepEqual(await strict.readStrictTracking(client, async () => { throw new Error("private failure"); }), { kind: "unavailable", reason: "read-failed" });
      for (const bad of ["null", "{}", "[]", "{", JSON.stringify(doc({ 1: { solicitor: [] } })), JSON.stringify(doc({}, [{ cptid: 1, date: "2026-02-30", note: "bad" }]))])
        assert.equal((await stateOf(client, bad)).kind, "unavailable");
      assert.equal((await strict.readStrictTracking(client, async () => ({ kind: "bytes", bytes: new Uint8Array([0xff]) }))).kind, "unavailable");
      assert.equal((await stateOf(client, "\ufeff" + JSON.stringify(doc()))).kind, "unavailable");
      assert.equal(strict.projectTrackingManual({ kind: "unavailable", reason: "invalid" }, [1]), null);
    });
    await check(`${client}: explicit blank/null/legacy clear ownership and complete active/removed notes`, async () => {
      const d = doc({
        1: { solicitor: null, solicitor2: "", ask: null },
        2: { updatedAt: "2026-11-15", solicitorEdited: true },
        3: { updatedAt: "2026-11-15", solicitorEdited: false },
      }, [{ cptid: 1, date: "2026-11-14", note: "Active" }], [{ cptid: 1, date: "2026-11-13", note: "Removed but reviewed" }]);
      const p = strict.projectTrackingManual(await stateOf(client, d), [1, 2, 3, 4]);
      assert.deepEqual(p[1].fields, { ask: { present: true }, primarySolicitor: { present: true }, secondarySolicitor: { present: true } });
      assert.equal(p[2].fields.primarySolicitor.present, true);
      assert.equal(p[3].fields.primarySolicitor.present, false);
      assert.equal(p[4].fields.ask.present, false);
      assert.equal(p[1].notesReviewed, true); assert.equal(p[1].notes.length, 2);
      assert.equal(p[1].revision.length, 64); assert.equal(p[1].revision, p[4].revision);
    });
    await check(`${client}: REAL filesystem strict re-read observes late edit and clear; errors not absence`, async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "direct-read-")), env = `${client.toUpperCase()}_LOCAL_DIR`, old = process.env[env];
      process.env[env] = dir;
      try {
        const p0 = await strictTrackingManualFor(client, [1]); assert.equal(p0[1].fields.primarySolicitor.present, false);
        fs.writeFileSync(path.join(dir, "tracking.json"), JSON.stringify(doc({ 1: { solicitor: "Late manual" } })));
        const p1 = await strictTrackingManualFor(client, [1]); assert.equal(p1[1].fields.primarySolicitor.present, true); assert.notEqual(p1[1].revision, p0[1].revision);
        fs.writeFileSync(path.join(dir, "tracking.json"), JSON.stringify(doc({ 1: { solicitor: null } })));
        const p2 = await strictTrackingManualFor(client, [1]); assert.equal(p2[1].fields.primarySolicitor.present, true); assert.notEqual(p2[1].revision, p1[1].revision);
        fs.writeFileSync(path.join(dir, "tracking.json"), "{"); assert.equal(await strictTrackingManualFor(client, [1]), null);
        fs.unlinkSync(path.join(dir, "tracking.json")); fs.mkdirSync(path.join(dir, "tracking.json"));
        assert.equal((await strictTrackingFor(client)).kind, "unavailable");
      } finally { if (old === undefined) delete process.env[env]; else process.env[env] = old; fs.rmSync(dir, { recursive: true, force: true }); }
    });
    await check(`${client}: MOCK Blob null only means absent; no cache, timeout, 304/error/truncation refuse`, async () => {
      const env = `${client.toUpperCase()}_LOCAL_DIR`, old = process.env[env]; delete process.env[env];
      try {
        blobRead = async (p, opts) => { assert.equal(p, `${client}-data/tracking.json`); assert.equal(opts.useCache, false); assert.equal(opts.access, "private"); assert.ok(opts.abortSignal); return null; };
        assert.equal((await strictTrackingFor(client)).kind, "absent");
        blobRead = async () => { throw new Error("Mock auth/permission error"); }; assert.equal((await strictTrackingFor(client)).kind, "unavailable");
        blobRead = async () => ({ statusCode: 304, stream: null }); assert.equal((await strictTrackingFor(client)).kind, "unavailable");
        blobRead = async () => ({ statusCode: 200, stream: new ReadableStream({ start(c) { c.enqueue(encode(doc())); c.close(); } }) });
        assert.equal((await strictTrackingFor(client)).kind, "present");
        blobRead = async () => ({ statusCode: 200, stream: new ReadableStream({ start(c) { c.enqueue(encode('{"prospects":')); c.error(new Error("truncated")); } }) });
        assert.equal((await strictTrackingFor(client)).kind, "unavailable");
      } finally { if (old !== undefined) process.env[env] = old; }
    });
  }
  await check("bounds: >100 IDs, duplicate IDs, >100 note review and oversized bytes refuse", async () => {
    const s = await stateOf("jag", doc({}, Array.from({ length: 101 }, () => ({ cptid: 1, date: "2026-11-15", note: "Fixture" }))));
    for (const ids of [[1], [1, 1], [], [0], ["1"], Array.from({ length: 101 }, (_, i) => i + 1)]) assert.equal(strict.projectTrackingManual(s, ids), null);
    assert.equal((await stateOf("jag", " ".repeat(4 * 1024 * 1024 + 1))).kind, "unavailable");
    assert.notEqual((await stateOf("jag", doc())).revision, (await stateOf("csnf", doc())).revision);
  });
  await check("composition late manual edits/clears > direct > Access; withdrawal differs from unknown", () => {
    assert.equal(composeDirectValue(absent, present("Direct"), "Access"), "Direct");
    for (const value of ["Late manual", "", null, 0]) assert.equal(composeDirectValue(present(value), present("Direct"), "Access"), value);
    assert.equal(composeDirectValue(absent, absent, "Access"), "Access", "known source withdrawal");
    for (const [m, d] of [[{ kind: "unavailable" }, absent], [absent, { kind: "unavailable" }], [present("manual"), { kind: "unavailable" }]])
      assert.throws(() => composeDirectValue(m, d, "Access"), /retain last good/);
    for (const bad of [null, {}, known(null), known({}), known({ present: "false" }), known({ present: true })])
      assert.throws(() => composeDirectValue(bad, absent, "Access"), /retain last good/);
  });
  await check("source notes remain immutable attributed lane; manual history is untouched", () => {
    const manual = [{ id: "manual", note: "Same text" }], before = JSON.stringify(manual);
    const notes = [{ cptid: 1, event_key: "event", body: "Same text", note_date: "2026-11-15", declared_actor: "Fixture", template: "fixture" }];
    const result = sourceNoteEntries(notes, 1);
    assert.equal(result.length, 1); assert.equal(result[0].editable, false); assert.equal(result[0].lane, "direct-source");
    assert.equal(result[0].declared_actor, "Fixture"); assert.ok(result[0].attribution.includes("not verified"));
    assert.ok(Object.isFrozen(result[0])); assert.equal(JSON.stringify(manual), before); assert.notEqual(result[0], notes[0]);
  });
  await check("current-main consumers CONTRACT ONLY: composed base then existing manual ask/assignments/snapshot/header/filter", () => {
    const baseAsk = composeDirectValue(absent, present(250), 100);
    const records = { 1: { portfolio: { ask: baseAsk, solicitor: "Direct primary", secondary: "Direct secondary" } } };
    const updates = [{ id: 1, cptid: 1, field: "ask", new_value: null, old_value: "100" }, { id: 2, cptid: 1, field: "solicitor2", new_value: "", old_value: "Direct secondary" }];
    const overlay = buildOverlay(updates);
    assert.equal(effectiveAsk(1, overlay, askEdits(updates), () => baseAsk).ask, null);
    const snap = overlayCampaignAsks({ pool: [{ cptid: 1, ask: baseAsk }], portfolio: [{ cptid: 1, ask: baseAsk }], board: [] }, overlay, askEdits(updates), false);
    assert.equal(snap.portfolio[0].ask, 0); assert.equal(snap.pool[0].ask, 0);
    const tracking = { prospects: { 1: { solicitor: "", solicitorEdited: true, updatedAt: "2026-11-15" } } };
    const assignment = assignmentResolver(records, tracking, updates, overlay)(1);
    assert.deepEqual(assignment, { solicitor: "", solicitor2: "" });
    assert.equal(viewAssignment({ cptid: 1 }, [{ cptid: 1, ...assignment }], tracking).solicitor, "");
    assert.equal(filterAssignments([assignment], "unassigned").length, 1);
    // This is not a transport hookup, rendered UI or SQL-engine acceptance.
  });
  console.log(`1..${checks}`);
})().catch(e => { console.error(e); process.exitCode = 1; });
