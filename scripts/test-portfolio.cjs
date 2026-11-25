// Synthetic fixtures only. No API, SQL, Blob or client donor data.
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const ts = require("typescript");
const root = process.cwd(), clients = ["jag", "csnf", "pvas", "wcbhc", "baq", "imas"];
const load = Module._load;
let selected = "";
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, filename) => m._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
Module._load = function(name, parent, isMain) {
  if (name === "react") return { ...load.call(this, name, parent, isMain), useState: () => [selected, value => { selected = value; }], useMemo: fn => fn() };
  if (name.startsWith("@/")) name = path.join(root, name.slice(2));
  return load.call(this, name, parent, isMain);
};
assert.ok(fs.existsSync("lib/portal-v2/portfolio.ts"), "shared full-index Portfolio model must exist");
assert.ok(fs.existsSync("components/portfolio.tsx"), "shared Portfolio UI must exist");
const { portfolioModel, portfolioAsk } = require("../lib/portal-v2/portfolio.ts");
const { Portfolio } = require("../components/portfolio.tsx");
const { buildOverlay } = require("../lib/portal-v2/record-overlay.ts");
const { effectiveAsk, askEdits } = require("../lib/portal-v2/effective-ask.ts");
const fixture = (cptid, solicitor, solicitor2, ask, extra = {}) => ({ cptid, name: `Fictional ${cptid}`, solicitor, solicitor2, campaignAsk: { ask }, ...extra });
const rows = [
  fixture(1, " Alpha ", "Beta", 100, { status: "Declined" }),
  fixture(2, "", "Alpha", 200, { status: "Unassigned", outsideScreenedPool: true }),
  fixture(3, "Alpha", "Alpha", 0, { campaignAsk: { ask: 0, askEdited: true }, sourceAsk: 900000 }),
  fixture(4, "Beta", "", null, { campaignAsk: { ask: null, askEdited: true, askBlank: true }, sourceAsk: 500000 }),
  fixture(5, "Unassigned", "", 999999),
  fixture(6, "", "", 999999, { assignmentConflict: true }),
  fixture(7, "", "Beta", 300, { assignmentConflict: true }),
];
const before = JSON.stringify(rows);
let model = portfolioModel(rows, portfolioAsk);
assert.deepEqual(model.rows.map(row => row.cptid), [1, 2, 3, 4, 7], "full index, either solicitor, any status, proven assignments only");
assert.deepEqual(model.stats, { assigned: 5, withAsk: 3, askTotal: 600 });
assert.deepEqual(model.solicitors, ["Alpha", "Beta"]);
assert.deepEqual(model.summary, [
  { solicitor: "Alpha", prospects: 3, primary: 2, secondary: 2, withAsk: 2, askTotal: 300 },
  { solicitor: "Beta", prospects: 3, primary: 1, secondary: 2, withAsk: 2, askTotal: 400 },
]);
assert.deepEqual(portfolioModel(rows, portfolioAsk, "Alpha").rows.map(row => row.cptid), [1, 2, 3]);
assert.deepEqual(portfolioModel(rows, portfolioAsk, "Beta").rows.map(row => row.cptid), [1, 4, 7]);
assert.equal(portfolioModel(rows, portfolioAsk, "Absent").rows.length, 0);
assert.deepEqual(portfolioModel([], portfolioAsk).stats, { assigned: 0, withAsk: 0, askTotal: 0 });
assert.equal(portfolioAsk({ campaignAsk: { ask: 0 }, ask: 999 }), 0);
assert.equal(portfolioAsk({ campaignAsk: { ask: null }, ask: 999 }), 0);
assert.equal(portfolioAsk({ ask: 999 }), 0, "never use source snapshot/rating fallback");
assert.equal(JSON.stringify(rows), before, "input remains immutable");
// Compose existing ask owner with the model: manual zero/blank and merged-source
// edits are not replaced by a source ask or capacity rating.
const updates = [
  { id: 1, cptid: 10, field: "merged_into", new_value: "11" },
  { id: 2, cptid: 10, field: "ask", new_value: "450" },
  { id: 3, cptid: 12, field: "ask", new_value: "0" },
  { id: 4, cptid: 13, field: "ask", new_value: "" },
];
const overlay = buildOverlay(updates), edits = askEdits(updates.map(row => ({ old_value: "0", ...row })));
const amounts = [11, 12, 13].map(cptid => ({ cptid, solicitor: "Alpha", campaignAsk: effectiveAsk(cptid, overlay, edits, id => id === 11 ? 0 : 99999) }));
assert.deepEqual(portfolioModel(amounts, portfolioAsk).stats, { assigned: 3, withAsk: 1, askTotal: 450 });
console.log("PASS full-index assignment selection, primary/secondary summaries, all statuses, blank/zero/merged ask composition, immutable and empty models");

function nodes(tree, type, out = []) {
  if (!tree || typeof tree !== "object") return out;
  if (tree.type === type) out.push(tree);
  for (const child of [tree.props?.children].flat(Infinity)) nodes(child, type, out);
  return out;
}
const PeopleTable = () => null, DownloadButtons = () => null;
const indexPayload = (title, subtitle, rows) => ({ title, subtitle, cols: [], sections: [{ rows: rows.map(row => [row.cptid]) }], notes: ["placeholder"], intent: { kind: "index", ids: rows.map(row => row.cptid) } });
function render(index = rows) { return Portfolio({ index, committedCount: 8, PeopleTable, DownloadButtons, indexPayload }); }
let tree = render(), downloads = nodes(tree, DownloadButtons);
const { renderToStaticMarkup } = require("react-dom/server");
const markup = renderToStaticMarkup(tree);
for (const label of ["Portfolio prospects", "With a Campaign Ask", "Total Campaign Asks", "Committed (Stewardship)"]) assert.ok(markup.includes(label));
assert.ok(markup.includes("explicitly cleared"), "cleared asks are not represented as saved zero-dollar asks");
assert.ok(renderToStaticMarkup(Portfolio({ index: [], PeopleTable, DownloadButtons, indexPayload })).includes("Not available"), "missing source Stewardship count is not fabricated as zero");
assert.ok(renderToStaticMarkup(Portfolio({ index: [fixture(90, "Alpha", "", 0, { campaignAsk: { ask: 0, askConflict: true } })], PeopleTable, DownloadButtons, indexPayload })).includes("conflicting campaign asks"));
assert.equal(downloads.length, 2);
assert.deepEqual(downloads[0].props.get().intent, { kind: "portfolio", solicitor: "", summary: true });
assert.deepEqual(downloads[0].props.get().notes, [], "summary contains no notes");
assert.deepEqual(downloads[1].props.get().intent, { kind: "portfolio", solicitor: "", summary: false });
assert.equal(downloads[0].props.get().title, "Solicitor assignments");
assert.equal(downloads[1].props.get().title, "Portfolio prospects");
assert.equal(nodes(tree, PeopleTable)[0].props.rows.length, 5);
nodes(tree, "select")[0].props.onChange({ target: { value: "Beta" } });
tree = render();
assert.deepEqual(nodes(tree, PeopleTable)[0].props.rows.map(row => row.cptid), [1, 4, 7]);
assert.deepEqual(nodes(tree, DownloadButtons)[1].props.get().intent, { kind: "portfolio", solicitor: "Beta", summary: false });
nodes(tree, "button").find(node => node.props.children === "Alpha").props.onClick();
assert.equal(selected, "Alpha", "summary name selects solicitor");
selected = "";
const many = Array.from({ length: 750 }, (_, i) => fixture(i + 1000, "Alpha", "", 1));
tree = render(many);
assert.equal(nodes(tree, PeopleTable)[0].props.rows.length, 750);
assert.equal(nodes(tree, PeopleTable)[0].props.max, 750, "full roster must not silently stop at PeopleTable default 500");
assert.equal(nodes(tree, DownloadButtons)[1].props.get().sections[0].rows.length, 750, "export placeholder covers entire selection, not browsing page");
for (const client of clients) {
  const source = fs.readFileSync(`components/${client}-data-dashboard.tsx`, "utf8");
  assert.match(source, /import \{ Portfolio \} from "@\/components\/portfolio"/);
  const tabs = source.match(/const TABS = \[([^\n]+)\]/)[1];
  assert.equal((tabs.match(/"Portfolio"/g) || []).length, 1, `${client}: exactly one Portfolio tab`);
  assert.match(tabs, /"Prospects", "Campaign Prospects", "Portfolio"/);
  assert.match(source, /tab === "Campaign Prospects" && <CampaignProspects index=\{index\}/, `${client}: Campaign Prospects preserved`);
  assert.match(source, /tab === "Portfolio" && <Portfolio index=\{index\} committedCount=\{.+\} PeopleTable=\{PeopleTable\} DownloadButtons=\{DownloadButtons\} indexPayload=\{indexPayload\}/);
  if (["jag", "csnf"].includes(client)) assert.match(source, /committed\?: unknown\[\] \}\)\.committed\?\.length/);
  else assert.match(source, /committedCount=\{data.committed.length\}/);
  assert.doesNotMatch(source, /function Portfolio\(/, `${client}: no stale source-only Portfolio implementation`);
}
console.log("PASS UI solicitor dropdown and summary selection, full roster >500, portfolio export selectors and summary no-notes; all-six wiring preserves Campaign Prospects");
