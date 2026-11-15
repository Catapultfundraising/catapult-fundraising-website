// Synthetic-only: no SQL, Blob, browser clock or network requests.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const Module = require("node:module");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const clients = ["jag", "csnf", "pvas", "wcbhc", "baq"];
for (const client of clients) {
  const source = fs.readFileSync(`components/${client}-data-dashboard.tsx`, "utf8");
  assert.match(source, /import \{ dashboardDateLabels \} from "@\/lib\/dashboard-dates";/, `${client}: shared formatter`);
  assert.match(source, /const dates = dashboardDateLabels\(snapshot\);/, `${client}: actual snapshot, not index.asOf`);
  const header = source.slice(source.indexOf("<header"), source.indexOf("</header>"));
  assert.match(header, /className="mt-1 text-sm text-white\/70">\{dates.refreshed\}<\/p>/, `${client}: refresh is primary`);
  assert.match(header, /className="text-xs text-white\/60">\{dates.source\}<\/p>/, `${client}: source is secondary`);
  assert.match(source, /\{dates.refreshed\}\. Lifetime totals/, `${client}: consistent footer`);
  assert.doesNotMatch(source, /Snapshot refreshed|Built \{data.builtAt\}|\{data\.(?:asOf|builtAt)\}/, `${client}: no raw freshness labels`);
  // CRM record-edit and interview timestamps are not dashboard refresh timestamps.
  const crm = fs.readFileSync(`components/${client}-data-crm.tsx`, "utf8");
  assert.doesNotMatch(crm, /Snapshot refreshed|Dashboard refreshed|Source data as of|\.asOf|\.builtAt/);
}

require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, f);
const { dashboardDateLabels } = require("../lib/dashboard-dates.ts");
const source = "2028-03-04";
assert.deepEqual(dashboardDateLabels({ builtAt: "2028-03-07 16:25", asOf: source }), {
  refreshed: "Dashboard refreshed 2028-03-07 16:25 Pacific", source: `Source data as of ${source}`,
});
assert.deepEqual(dashboardDateLabels({ builtAt: " 2028-02-29 00:05 ", asOf: " 2028-02-28 " }), {
  refreshed: "Dashboard refreshed 2028-02-29 00:05 Pacific", source: "Source data as of 2028-02-28",
});
for (const builtAt of [undefined, null, "", " ", 123, {}, "invalid", "2027-02-29 16:25", "2028-02-30 16:25", "2028-13-01 16:25", "2028-00-01 16:25", "2028-01-00 16:25", "2028-03-07 24:00", "2028-03-07 16:60", "2028-03-07", "2028-03-07 16:25 extra"]) {
  assert.deepEqual(dashboardDateLabels({ builtAt, asOf: source }), {
    refreshed: "Dashboard refresh time unavailable", source: `Source data as of ${source}`,
  }, `Never use source date or visit time for invalid/missing builtAt: ${JSON.stringify(builtAt)}`);
}
for (const asOf of [undefined, null, "", "not a date", 123, "2027-02-29", "2028-04-31", "2028-03-04 10:00"]) {
  assert.equal(dashboardDateLabels({ asOf }).source, "Source data date unavailable");
}
assert.deepEqual(dashboardDateLabels({}), {
  refreshed: "Dashboard refresh time unavailable", source: "Source data date unavailable",
});
// Render the actual header JSX from every dashboard, not a duplicate fixture.
for (const client of clients) {
  const file = `components/${client}-data-dashboard.tsx`;
  const text = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let header;
  const visit = node => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "header") header = node.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(header, `${client}: real header found`);
  const module = new Module(`${process.cwd()}/header-fixture.cjs`, require.main);
  module.paths = require.main.paths;
  module._compile(ts.transpileModule(`const DonorSearch = () => null; module.exports = ({data, dates}) => (${header});`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, `${process.cwd()}/header-fixture.cjs`);
  for (const builtAt of ["2028-03-07 16:25", undefined, "2028-02-30 09:00"]) {
    const data = { client: "Synthetic date QA", builtAt, asOf: source };
    const html = renderToStaticMarkup(React.createElement(module.exports, { data, dates: dashboardDateLabels(data) }));
    assert.ok(html.includes(builtAt === "2028-03-07 16:25" ? "Dashboard refreshed 2028-03-07 16:25 Pacific" : "Dashboard refresh time unavailable"));
    assert.ok(html.includes(`Source data as of ${source}`));
    assert.doesNotMatch(html, /Snapshot refreshed|undefined|Invalid Date/);
  }
}
const frozen = Object.freeze({ builtAt: "2028-11-05 01:30", asOf: source });
const expected = dashboardDateLabels(frozen);
const oldTZ = process.env.TZ;
try {
  for (const zone of ["UTC", "America/Los_Angeles", "Pacific/Auckland", "Asia/Tokyo"]) {
    process.env.TZ = zone;
    assert.deepEqual(dashboardDateLabels(frozen), expected, `Preserve native wall clock in ${zone}`);
  }
} finally {
  if (oldTZ === undefined) delete process.env.TZ; else process.env.TZ = oldTZ;
}
const formatterSource = fs.readFileSync("lib/dashboard-dates.ts", "utf8");
assert.doesNotMatch(formatterSource, /Date\.now|new Date|statSync|mtime|fetch\(/);
console.log("Dashboard dates: formatter valid/missing/invalid/source-only, timezone independence and all five header/CRM/footer bindings passed");
