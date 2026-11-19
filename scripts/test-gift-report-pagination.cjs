// Focused layout regression only: fictional elements, no data endpoints or fonts.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), ts = require("typescript");
const root = process.cwd(), m = { exports: {} };
new Function("module", "exports", "require", ts.transpileModule(fs.readFileSync(path.join(root, "lib/portal-v2/gift-report-layout.tsx"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText)(m, m.exports, id => id === "@react-pdf/renderer" ? { View: "View", Text: "Text" } : require(id));
const React = require("react");
const rows = [React.createElement("View", { key: "one" }, "Full note ".repeat(600)),
  React.createElement("View", { key: "two", style: { flexDirection: "row" } }, "Another donor")];
const tree = m.exports.GiftLevelRows({ heading: "Gift band", columns: "Column labels", rows, empty: "Empty level" });
const [heading, body] = tree.props.children;
assert.equal(tree.type, Symbol.for("react.fragment"), "band is page-flow siblings, never a whole-band container");
assert.equal(heading.props.wrap, false, "band and column labels stay together");
assert.ok(heading.props.minPresenceAhead >= 20, "reserve the start of the first donor below the labels");
assert.deepEqual(heading.props.children, ["Gift band", "Column labels"], "never trap the first full note in the unbreakable heading");
assert.equal(body[0], rows[0], "full first note remains the original splittable sibling");
assert.equal(body[1].props.children, rows[1].props.children, "last row content remains intact");
assert.equal(body[1].props.wrap, undefined, "last row stays splittable");
assert.deepEqual(body[1].props.style, [{ flexDirection: "row" }, { marginBottom: 10 }]);
assert.equal(tree.props.children.length, 2, "no standalone gap node can spill onto an empty page");
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
