// Focused layout regression only: fictional elements, no data endpoints or fonts.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), ts = require("typescript");
const root = process.cwd(), m = { exports: {} };
new Function("module", "exports", "require", ts.transpileModule(fs.readFileSync(path.join(root, "lib/portal-v2/gift-report-layout.tsx"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText)(m, m.exports, id => id === "@react-pdf/renderer" ? { View: "View", Text: "Text" } : require(id));
const rows = [{ type: "FictionalDonor", text: "Full note ".repeat(600) }, { type: "AnotherDonor" }];
const tree = m.exports.GiftLevelRows({ heading: "Gift band", columns: "Column labels", rows, empty: "Empty level" });
const [heading, body] = tree.props.children;
assert.equal(heading.props.wrap, false, "band and column labels stay together");
assert.ok(heading.props.minPresenceAhead >= 20, "reserve the start of the first donor below the labels");
assert.deepEqual(heading.props.children, ["Gift band", "Column labels"], "never trap the first full note in the unbreakable heading");
assert.equal(body, rows, "full donor rows remain splittable siblings; no note excerpt or deletion");
for (const client of ["pvas", "baq", "csnf", "jag", "wcbhc"]) {
  const source = fs.readFileSync(path.join(root, `app/api/${client}-data-reports/route.tsx`), "utf8");
  const start = source.indexOf("rows={x.people.map((p) => (");
  assert.ok(start >= 0, `${client} uses the shared gift-level layout`);
  const donor = source.slice(start), row = donor.slice(donor.indexOf("<View"));
  const opening = row.slice(0, row.indexOf(">") + 1);
  assert.match(opening, /<View key=\{p.cptid\}/);
  assert.doesNotMatch(opening, /wrap=\{false\}/, `${client} donor row may wrap even for a multi-page note`);
  assert.match(donor, /\{noteTxt\(p\)\}/, `${client} prints the full source note`);
}
console.log("gift report pagination: PASS (shared heading start, splittable full-note donor rows, all five routes)");
