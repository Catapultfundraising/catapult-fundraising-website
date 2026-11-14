// Fixture-only PDF proof. Loads normal public brand fonts/images; no private
// provider reads, writes, production endpoints or donor records are involved.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript");
const assert = require("node:assert/strict");
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, filename) => m._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
const original = Module._load;
const blankStats = { totalProspects: 0, tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0, dials: 0, emailsSent: 0, completed: 0, scheduled: 0, toBeRescheduled: 0, declined: 0, deceased: 0, inCallingProcess: 0 };
let fixture;
Module._load = function(name, parent, main) {
  if (name === "@/lib/jag-data") return {
    getJagDashboardData: async p => { assert.equal(p, "csnf-dashboard/data.json"); return fixture; },
    pickRandomQuotes: () => [],
  };
  if (name === "@vercel/blob") throw new Error("No private provider access allowed");
  if (name.startsWith("@/")) name = path.join(process.cwd(), name.slice(2));
  return original.call(this, name, parent, main);
};
const { aggregateSurvey, SURVEY_VERSION } = require("../lib/csnf-online-survey.ts");
fixture = {
  reportDate: "November 16, 2026", updatedAt: "2026-11-16T18:00:00Z", surveyRespondentCount: 0,
  stats: blankStats, completedInterviews: [], scheduledInterviews: [], toBeRescheduled: [],
  declined: [], deceased: [], feasibilitySignals: [], missionThemes: [], quotes: [],
  surveyResults: aggregateSurvey([
    { id: "00000000-0000-4000-8000-000000000001", surveyVersion: SURVEY_VERSION, submittedAt: "2026-11-13T20:00:00Z", answers: { q1: "Good", q4: ["Other", "Economic growth"], q1_comments: "PRIVATE_FIXTURE_COMMENT_MUST_NOT_APPEAR" } },
  ], new Date("2026-11-14T07:59:59.999Z")),
};
(async () => {
  const { buildSummaryPdf } = require("../lib/study-summary-pdf.tsx");
  const response = await buildSummaryPdf("csnf");
  assert.equal(response.status, 200);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
  fs.mkdirSync("/workspace/csnf-proof", { recursive: true });
  fs.writeFileSync("/workspace/csnf-proof/csnf-summary-fixture.pdf", bytes);
  const { extractText } = await import("unpdf");
  const extracted = await extractText(new Uint8Array(bytes), { mergePages: true });
  assert.ok(extracted.text.includes("Survey Results"));
  assert.ok(extracted.text.includes("1 online survey responses"));
  assert.ok(extracted.text.includes("Pacific"));
  assert.ok(!extracted.text.includes("PRIVATE_FIXTURE_COMMENT"));
  assert.ok(!extracted.text.includes("00000000-0000-4000"));
  console.log(`PASS actual CSNF PDF fixture: ${extracted.totalPages} pages; separate Survey Results, count/cutoff and no raw comments or IDs.`);
})().catch(e => { console.error(e); process.exit(1); });
