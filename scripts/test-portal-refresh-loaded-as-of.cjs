// Synthetic-only: actual shared helper + five builders, mocked read feed; no SQL/Blob/publication.
const fs = require("node:fs"), assert = require("node:assert/strict"), Module = require("node:module");
const ts = require("typescript");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, f);
const common = require("../lib/portal-refresh/common.ts");
const { dashboardDateLabels } = require("../lib/dashboard-dates.ts");
const clients = ["jag", "csnf", "pvas", "wcbhc", "baq"];
const cases = [
  { name: "no rows", rows: [], expected: "" },
  { name: "null max", rows: [{ d: null }], expected: "" },
  { name: "missing max", rows: [{}], expected: "" },
  { name: "blank max", rows: [{ d: "  " }], expected: "" },
  { name: "failed/missing log", error: true, expected: "" },
  { name: "invalid text", rows: [{ d: "not a date" }], expected: "" },
  { name: "invalid Date", rows: [{ d: new Date(NaN) }], expected: "" },
  { name: "invalid calendar", rows: [{ d: "2030-02-30" }], expected: "" },
  { name: "invalid month", rows: [{ d: "2030-13-03" }], expected: "" },
  { name: "invalid day zero", rows: [{ d: "2030-04-00" }], expected: "" },
  { name: "invalid year zero", rows: [{ d: "0000-01-01" }], expected: "" },
  { name: "non-leap day", rows: [{ d: "2030-02-29" }], expected: "" },
  { name: "SQL Date", rows: [{ d: new Date("2030-04-03T23:25:00Z") }], expected: "2030-04-03" },
  { name: "ISO feed timestamp", rows: [{ d: "2030-04-03T23:25:00.000Z" }], expected: "2030-04-03" },
  { name: "ISO calendar", rows: [{ d: "2030-04-03" }], expected: "2030-04-03" },
  { name: "US calendar", rows: [{ d: "4/3/2030" }], expected: "2030-04-03" },
  { name: "leap day", rows: [{ d: "2028-02-29" }], expected: "2028-02-29" },
];
const savedEnv = { direct: process.env.PORTAL_SQL_DIRECT, secret: process.env.PORTAL_WRITE_SECRET, url: process.env.ENGAGE_READ_URL };
const originalFetch = global.fetch, originalLoad = Module._load;
process.env.PORTAL_SQL_DIRECT = "0"; process.env.PORTAL_WRITE_SECRET = "synthetic-only"; process.env.ENGAGE_READ_URL = "https://fixture.invalid/read";
let active, expectedClient, queries = 0;
global.fetch = async (url, options) => {
  assert.equal(url, "https://fixture.invalid/read"); assert.equal(options.method, "POST");
  assert.equal(JSON.parse(options.body).query, `SELECT MAX(loaded_at) AS d FROM ${expectedClient}._load_log`);
  queries++;
  return { ok: !active.error, status: active.error ? 400 : 200, json: async () => active.error ? { error: "Synthetic missing source log" } : { rows: active.rows.map(r => ({ ...r })) } };
};
const built = "2030-04-05 14:30";
const fakeRows = Object.freeze([Object.freeze({ CPTID: 700001, First_Name: "Synthetic", Last_Name: "Fixture" })]);
const mocked = { ...common, rows: async q => /donorsearch_results/i.test(q) ? fakeRows : /COUNT\(\*\)/i.test(q) ? [{ n: 0 }] : [],
  builtAt: () => built, pirLinks: async () => ({}), engageClientGifts: async () => [], engageClientContacts: async () => [] };
Module._load = function(name, parent, main) {
  if (name === "./common" && /portal-refresh[\\/]/.test(parent?.filename || "")) return mocked;
  return originalLoad.call(this, name, parent, main);
};
(async () => {
  for (const client of clients) {
    expectedClient = client;
    const build = require(`../lib/portal-refresh/${client}.ts`)[`build${client[0].toUpperCase()}${client.slice(1)}`];
    let stable;
    for (const fixture of cases) {
      active = fixture; const previousQueries = queries;
      assert.equal(await common.loadedAsOf(client), fixture.expected, `${client} ${fixture.name}: never invent today`);
      assert.equal(queries, previousQueries + 1, "one mocked read; no error retries or write queries");
      const { snapshot, records } = await build();
      assert.equal(snapshot.asOf, fixture.expected, `${client} actual builder source date`);
      assert.equal(snapshot.builtAt, built, `${client} actual build timestamp unaffected`);
      assert.equal(records.asOf, built, `${client} record-index build timestamp remains separate`);
      const labels = dashboardDateLabels(snapshot);
      assert.equal(labels.source, fixture.expected ? `Source data as of ${fixture.expected}` : "Source data date unavailable");
      assert.equal(labels.refreshed, `Dashboard refreshed ${built} Pacific`);
      const withoutSource = { ...snapshot, asOf: "" };
      if (stable) assert.deepEqual(withoutSource, stable, `${client}: only source-date metadata changes`); else stable = withoutSource;
    }
  }
  assert.equal(common.pdate("2030-02-30"), "2030-02-30", "shared pdate behavior intentionally unchanged outside loadedAsOf");
  console.log("PASS truthful loadedAsOf: valid/missing/error/invalid calendar; actual all-five builders + dashboard labels; builtAt/index/other snapshot fields unchanged");
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => {
  global.fetch = originalFetch; Module._load = originalLoad;
  for (const [key, value] of [["PORTAL_SQL_DIRECT", savedEnv.direct], ["PORTAL_WRITE_SECRET", savedEnv.secret], ["ENGAGE_READ_URL", savedEnv.url]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
