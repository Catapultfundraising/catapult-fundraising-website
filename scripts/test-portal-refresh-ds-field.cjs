// Synthetic display-only regression. Never calls SQL, Blob, refresh routes or real fetch.
const fs = require("node:fs"), assert = require("node:assert/strict"), Module = require("node:module");
const ts = require("typescript");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, f);
global.fetch = async () => { throw new Error("Unexpected external request"); };
const common = require("../lib/portal-refresh/common.ts");
const cases = [
  ["$12,345", "$12,345"], ["$12,345.67", "$12,345.67"], ["$12345.67", "$12345.67"],
  ["-$12,345.67", "-$12,345.67"], ["$-12,345.67", "$-12,345.67"], ["($12,345.67)", "($12,345.67)"],
  [" $12,345 ", "$12,345"], ["$0", "$0"], ["$0.00", "$0.00"],
  [12345, "$12,345.00"], ["12345.67", "$12,345.67"], [-12345.67, "$-12,345.67"],
  [0, "$0.00"], ["0", "$0.00"], [null, ""], [undefined, ""], ["", ""], ["  ", ""],
  ["unavailable", "unavailable"], ["$12,34", "$12,34"], ["$12,345junk", "$12,345junk"],
  ["$1.2.3", "$1.2.3"], ["$$123", "$$123"], ["0x10", "0x10"], [false, "false"],
  [Infinity, "Infinity"], [NaN, "NaN"], ["1e999", "1e999"],
];
for (const [value, expected] of cases) assert.equal(common.dsField("SEC_Stock_Value", value), expected, `SEC ${String(value)}`);
for (const [value, expected] of [[12345.67, "$12,345.67"], ["12345.67", "$12,345.67"], [-12345.67, "$-12,345.67"], [0, "$0.00"], [null, ""], ["", ""], [" ", ""], ["unknown", "unknown"]]) {
  assert.equal(common.dsField("Real_Estate_Est", value), expected, `Estate ${String(value)}`);
}
// Unrelated DonorSearch fields must retain ordinary source-text serialization.
for (const field of ["Quality_Score", "RFM_Total", "Wealth_Based_Capacity", "Other_Field"]) {
  for (const value of ["$12,345", 12345.67, 0, null, "  native text  "]) assert.equal(common.dsField(field, value), common.s(value));
}

const sourceRows = Object.freeze(cases.map(([SEC_Stock_Value], i) => Object.freeze({
  CPTID: 700000 + i, First_Name: "Synthetic", Last_Name: `Fixture ${i}`,
  SEC_Stock_Value, Real_Estate_Est: 12345.67, Quality_Score: "42", Wealth_Based_Capacity: "$50K",
})));
const originalLoad = Module._load;
const mockedCommon = {
  ...common,
  rows: async query => /donorsearch_results/i.test(query) ? sourceRows : /COUNT\(\*\)/i.test(query) ? [{ n: 0 }] : [],
  loadedAsOf: async () => "2030-04-03", builtAt: () => "2030-04-05 14:30", pirLinks: async () => ({}),
  engageClientGifts: async () => [], engageClientContacts: async () => [],
};
Module._load = function(name, parent, isMain) {
  if (name === "./common" && /portal-refresh[\\/]/.test(parent?.filename || "")) return mockedCommon;
  return originalLoad.call(this, name, parent, isMain);
};
(async () => {
  const before = sourceRows.map(row => ({ ...row }));
  for (const client of ["jag", "csnf", "pvas", "wcbhc", "baq"]) {
    const { [`build${client[0].toUpperCase()}${client.slice(1)}`]: build } = require(`../lib/portal-refresh/${client}.ts`);
    const { records } = await build();
    for (const [i, [, expected]] of cases.entries()) {
      const ds = records.records[String(700000 + i)].ds;
      assert.equal(ds["SEC Stock Value"], expected, `${client} actual builder SEC display`);
      assert.equal(ds["Real Estate Est"], "$12,345.67", `${client} estate unchanged`);
      assert.equal(ds["Quality Score"], "42", `${client} unrelated DS unchanged`);
    }
    assert.deepEqual(sourceRows, before, `${client} leaves raw source row values unchanged`);
  }
  console.log("PASS DonorSearch SEC display: numeric/formatted/negative/zero/missing/malformed; estate/unrelated fields unchanged; all five actual mocked builders; no source mutation");
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { Module._load = originalLoad; });
