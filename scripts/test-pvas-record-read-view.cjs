// Focused synthetic GET-only alias/immutability regression. No SQL/Blob/network.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), ts = require("typescript");
const root = process.cwd(), modules = new Map();
let canonical = true, build, reads = 0, stateReads = 0;
const legacy = { getPvasRecords: async () => ({ legacy: true }) };
const cache = { get: async () => { reads++; return build; }, invalidate: async () => {} };
function local(file) {
  const full = path.join(root, file);
  if (modules.has(full)) return modules.get(full).exports;
  const m = { exports: {} }; modules.set(full, m);
  const load = id => {
    if (id === "server-only") return {};
    if (id === "@vercel/blob") return { get: () => assert.fail("no Blob"), put: () => assert.fail("no Blob") };
    if (id.endsWith("/pvas-shared-cache.server") || id === "./pvas-shared-cache.server")
      return { createPvasSharedCache: () => cache, cacheTtlMs: () => 120000 };
    if (id === "./dashboard-ready-cache.server") return {createDashboardReadyCache: () => cache};
    if (id === "./dashboard-ready-blob.server") return {readyBlobStore: null};
    if (id === "./dashboard-ready-model.server") return {};
    if (id === "./portal-refresh/pvas") return { buildPvas: () => assert.fail("no build IO") };
    if (id === "./portal-refresh/fingerprint") return { clientFingerprint: () => assert.fail("no SQL") };
    if (id.endsWith("/pvas-data-store.legacy")) return legacy;
    if (id.endsWith("/pvas-canonical")) return { pvasCanonicalEnabled: () => canonical };
    if (id === "@/lib/pvas-tracking") return { getPvasTracking: async () => tracking };
    if (id === "@/lib/pvas-data-auth") return { isPvasDataAuthed: async () => true };
    if (id === "@/lib/portal-v2/server") return { portalCampaignStateSafe: async (client, context) => {
      assert.equal(client, "pvas");
      assert.equal(context.pvasRecords, build.records.records, "canonical validation receives build-owned records, no clone");
      stateReads++;
      return local("lib/portal-v2/pvas-state-wire.ts").canonicalPvasState(rawState, context.pvasRecords, []);
    } };
    if (id === "./direct-source-state.server") return {
      currentTracking: async (_, get) => get(),
      requireCurrentSql: (_, state) => assert.ok(state && Array.isArray(state.updates)),
    };
    const candidate = id.startsWith("@/") ? path.join(root, id.slice(2)) :
      id.startsWith(".") ? path.resolve(path.dirname(full), id) : null;
    if (candidate && fs.existsSync(candidate + ".ts")) return local(path.relative(root, candidate + ".ts"));
    return require(id);
  };
  const source = ts.transpileModule(fs.readFileSync(full, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function("module", "exports", "require", source)(m, m.exports, load);
  return m.exports;
}
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
const typed = "fullName firstName middleName lastName street street2 city state zip phone phone2 email email2 spouseFirstName spouseMiddleName spouseLastName ask primarySolicitor secondarySolicitor phone3 phone4 dsRating wealthCapacity majorGiftScore realEstate stock status outcome".split(" ");
function record(id, mergedInto = null, deleted = false) {
  const fields = Object.fromEntries(typed.map(k => [k, null]));
  Object.assign(fields, { fullName: `Fictional ${id}`, ask: id === 1001 ? 700 : null, outcome: "" });
  return {
    cptid: id, name: `Fictional ${id}`, contact: { street: "Fictional road" }, flags: ["Example"],
    gifts: [{ date: "2026-11-01", amount: 100 }], notes: ["Fictional note"], calls: [{ note: "Example" }],
    board: [{ active: true, ask: 50 }], committees: ["Example"], givebutter: [{ amount: 1 }],
    ...(id === 1002 ? { ds: { rating: "Example" }, portfolio: { solicitor: "Source", ask: 50 } } : {}),
    summary: { lifetime: 100, gifts: 1, largest: 100, years: 1, first: "2026-11-01", last: "2026-11-01" },
    _canonicalContact: { cptid: id, clientId: null, fields, extras: { nested: { value: "Example" } }, presence: {},
      identity: { isProspect: false, deleted, deleteReason: deleted ? "Fictional" : null, mergedInto, version: 1, createdBy: null, createdAt: null } },
  };
}
const rows = [record(1001), record(1002, 1001), record(1003, 1002), record(1004, null, true), record(1005)];
// Exercise enrichment of a source placeholder using the saved prospect identity.
rows[4].name = "CPTID 1005"; rows[4].contact = {};
build = freeze({ records: { asOf: "2026-11-18", index: rows.map(r => ({
  cptid: r.cptid, name: r.name, city: "", lifetime: 100, gifts: 1, largest: 100,
  last: "2026-11-01", years: 1, band: "", capMin: 0, _canonicalContact: r._canonicalContact,
})), records: Object.fromEntries(rows.map(r => [String(r.cptid), r])) } });
const rawState = freeze({
  v: 3, stateVersion: 3, giftWireVersion: 3,
  prospects: [{ cptid: 1005, full_name: "Fictional saved prospect", city: "Example" }], batches: [],
  updates: [{ id: 1, cptid: 1001, field: "wealth:capacity", old_value: null, new_value: "Example" }],
});
const tracking = freeze({ prospects: { 1001: { solicitor: "Fictional solicitor", solicitor2: "" } } });
async function main() {
  const store = local("lib/pvas-data-store.ts"), { NextRequest } = require("next/server");
  const before = JSON.stringify(build);
  const view = await store.readPvasRecordsView();
  assert.equal(view, build.records);
  assert.equal(view.index, build.records.index);
  assert.equal(view.records, build.records.records);
  const copy = await store.getPvasRecords();
  assert.notEqual(copy, view); assert.notEqual(copy.index, view.index); assert.notEqual(copy.records, view.records);
  copy.records["1001"].contact.street = "Changed copy";
  copy.records["1001"]._canonicalContact.extras.nested.value = "Changed copy";
  copy.index[0].name = "Changed copy";
  assert.equal(JSON.stringify(build), before, "public getter remains independently mutable");
  const { GET } = local("app/api/pvas-data-records/route.ts");
  const get = async query => {
    const r = await GET(new NextRequest(`https://localhost/api/pvas-data-records${query}`));
    assert.equal(r.status, 200, `request ${query} succeeds with deeply frozen inputs`);
    return { body: await r.json(), timing: r.headers.get("Server-Timing") };
  };
  const first = await get("?id=1003"), detail = first.body;
  assert.match(first.timing, /memo;desc="miss"/);
  assert.equal(detail.cptid, 1001); assert.equal(detail.redirectedFrom.cptid, 1003);
  assert.equal(detail.summary.lifetime, 300); assert.equal(detail.gifts.length, 3);
  assert.equal(detail.assignment.solicitor, "Fictional solicitor");
  assert.equal(detail.campaignAsk.ask, 700); assert.equal(detail._canonicalContact.fields.ask, 700);
  assert.equal(detail.ds.rating, "Example", "merged-source nested fields remain available");
  const index = await get("");
  assert.match(index.timing, /memo;desc="hit"/);
  assert.deepEqual(index.body.index.map(r => r.cptid), [1001, 1005], "merge chain and deletion preserved");
  assert.equal(index.body.index[0]._canonicalContact, undefined, "HTTP index alone is slim");
  assert.equal((await get("?id=1005")).body.name, "Fictional saved prospect");
  assert.deepEqual((await get("?drill=year&v=2026")).body.cptids, [1001, 1002, 1003, 1004, 1005]);
  assert.equal(stateReads, 1, "same build retains memo");
  assert.equal(JSON.stringify(build), before, "canonical validation, index, merged detail, enrichment and drill never mutate build");
  // A new cache identity gets the corresponding new graph/view, not the prior alias.
  const nextBuild = structuredClone(build);
  nextBuild.records.records["1001"].notes.push("Fictional refreshed note");
  build = freeze(nextBuild);
  assert.equal(await store.readPvasRecordsView(), build.records);
  assert.notEqual(await store.readPvasRecordsView(), view);
  assert.ok((await get("?id=1001")).body.notes.includes("Fictional refreshed note"));
  assert.equal(stateReads, 2, "new build reprojects native state");
  const readyState = local("lib/portal-v2/pvas-state-wire.ts").canonicalPvasState(rawState, build.records.records, []);
  const readyKey = { readyRead: { records: build.records, state: readyState, tracking } };
  const readyRoute = local("lib/portal-v2/records-route.ts").recordsRoute("pvas", async () => true,
    async () => assert.fail("prepared route must not reload records"),
    async () => assert.fail("prepared route must not refetch tracking"),
    async () => assert.fail("prepared route must not refetch native state"),
    async generation => generation === "fictional-generation" ? readyKey : null);
  const preparedResponse = await readyRoute.GET(new NextRequest("https://localhost/api/pvas-data-records?id=1003&generation=fictional-generation"));
  assert.equal(preparedResponse.status, 200);
  const preparedDetail = await preparedResponse.json();
  assert.equal(preparedDetail.cptid,1001); assert.equal(preparedDetail.campaignAsk.ask,700);
  assert.equal(preparedDetail.dashboardGeneration,"fictional-generation");
  assert.equal((await readyRoute.GET(new NextRequest("https://localhost/api/pvas-data-records?id=1003&generation=wrong-generation"))).status,503,
    "an unavailable displayed generation never falls through to the latest build");
  canonical = false;
  assert.deepEqual(await store.readPvasRecordsView(), { legacy: true }, "legacy still delegates to legacy getter");
  canonical = true; build = null;
  assert.equal(await store.readPvasRecordsView(), null, "cache failure remains fail-closed");
  assert.ok(reads > 0);
  console.log("PVAS read-only records view: PASS (alias, public clone isolation, frozen canonical state/projection/HTTP/drill, new-build memo, legacy/failure)");
}
main().catch(e => { console.error(e); process.exit(1); });
