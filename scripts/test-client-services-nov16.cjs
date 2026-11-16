// Hermetic focused policy checks: no SQL, Blob, production writes or network.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const Module = require("node:module"), ts = require("typescript"), crypto = require("node:crypto");
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, filename) => m._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
const original = Module._load;
let builds = 0, writes = 0, closes = 0;
const build = async () => { builds++; return { snapshot: { asOf: "fixture", kpi: { gifts: 1, total: 1, donors: 1 }, health: { constituents: 1 }, pool: [] }, records: { index: [{}] }, pirs: {} }; };
Module._load = function(name, parent, main) {
  if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
  if (name === "@/lib/jag-data") return { pickRandomQuotes: () => [], buildContactList: () => [], generateObservations: () => ["Fictional observation"], computeResponseRate: () => 0, deltaLabel: () => null };
  if (name === "@vercel/blob") return { put: async () => { writes++; } };
  if (/^@\/lib\/portal-refresh\/(csnf|jag|pvas|wcbhc|baq)$/.test(name)) return Object.fromEntries(["Csnf", "Jag", "Pvas", "Wcbhc", "Baq"].map(c => [`build${c}`, build]));
  if (name === "@/lib/portal-refresh/ids") return { buildIds: async () => [] };
  if (name === "@/lib/portal-refresh/common") return { closePool: async () => { closes++; } };
  if (/^@\/lib\/(csnf|jag|pvas|wcbhc|baq)-(data-store|tracking)$/.test(name)) return {};
  if (name === "@/lib/portal-v2/clients") return { idsPath: () => "fixture" };
  if (name.startsWith("@/")) name = path.join(process.cwd(), name.slice(2));
  return original.call(this, name, parent, main);
};
global.fetch = async () => { throw new Error("Network forbidden"); };
const schema = require("../lib/csnf-online-survey.ts");
const refresh = require("../app/api/portal-data-refresh/route.ts");
const { NextRequest } = require("next/server");
const complete = Object.fromEntries(schema.SURVEY_QUESTIONS.filter(q => q.type !== "text").map(q => [q.id, q.type === "multi" ? [q.options[0]] : q.options[0]]));
const payload = { id: "00000000-0000-4000-8000-000000000001", writeToken: "a".repeat(64), revision: schema.SUBMITTED_REVISION, status: "submitted", surveyVersion: schema.SURVEY_VERSION, firstName: "Sample", lastName: "Reviewer", telephone: "", answers: complete };
(async () => {
  // This failed on origin/main: empty final submissions were accepted.
  assert.throws(() => schema.validateSurvey({ ...payload, answers: {} }), schema.SurveyValidationError);
  assert.equal(schema.validateSurvey(payload).status, "submitted");
  for (const q of Object.keys(complete)) {
    const answers = { ...complete, [q]: q === "q4" ? [] : " " };
    assert.throws(() => schema.validateSurvey({ ...payload, answers }), schema.SurveyValidationError, `missing ${q} must fail`);
    assert.equal(schema.validateSurvey({ ...payload, status: "draft", revision: 1, answers }).status, "draft");
  }
  assert.equal(schema.validateSurvey({ ...payload, status: "draft", revision: 1, answers: {} }).status, "draft");
  assert.equal(schema.validateSurvey({ ...payload, answers: {} }, { requireCompleteSubmission: false }).status, "submitted", "historical receipt reads remain compatible");
  assert.deepEqual(schema.missingRequiredSurveyQuestions({}), Object.keys(complete));
  assert.deepEqual(schema.missingRequiredSurveyQuestions(complete), []);
  // Hash of JSON.stringify on origin/main (exporter's canonical JSON uses a different encoding).
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(schema.SURVEY_QUESTIONS)).digest("hex"), "5f3e5a061c0d933b5edf4022b8bb1b431cc981640bb95f6e634cab444f341151");
  const config = JSON.parse(fs.readFileSync("vercel.json"));
  assert.deepEqual(config.crons, [{ path: "/api/portal-sync?project=csnf", schedule: "0 15 * * *" }], "VanillaSoft preserved; all five Access schedules removed");
  const req = (client, auth = true, method = "GET") => new NextRequest(`https://fixture.invalid/api/portal-data-refresh?client=${client}`, { method, headers: auth ? { authorization: "Bearer fixture-cron" } : {} });
  process.env.CRON_SECRET = "fixture-cron";
  assert.equal((await refresh.GET(req("all", false))).status, 401);
  for (const client of ["all", "jag", "csnf", "pvas", "wcbhc", "baq"]) assert.equal((await refresh.GET(req(client))).status, 410);
  assert.equal(builds, 0); assert.equal(writes, 0); assert.equal(closes, 0);
  assert.equal((await refresh.POST(req("all", false, "POST"))).status, 401);
  assert.equal((await refresh.POST(req("unknown", true, "POST"))).status, 400);
  const oldLog = console.log; console.log = () => {};
  try {
    assert.equal((await refresh.GET(req("all&dry=1"))).status, 200);
    assert.equal(builds, 5); assert.equal(writes, 0);
    assert.equal((await refresh.POST(req("jag", true, "POST"))).status, 200);
    assert.equal(builds, 6); assert.equal(writes, 2); assert.equal(closes, 2);
  } finally { console.log = oldLog; }
  const page = fs.readFileSync("app/csnf-survey/page.tsx", "utf8");
  assert.match(page, /absolute: "Online Survey \| CSN Foundation"/); assert.match(page, />Online Survey<\/h1>/);
  assert.match(page, /CSNF_SURVEY_ENABLED === "true" && process.env.VERCEL_ENV !== "preview"/);
  const form = fs.readFileSync("components/csnf-survey-form.tsx", "utf8");
  assert.ok(!form.includes("Survey questions are optional."));
  assert.match(form, /missingRequiredSurveyQuestions\(latest.current.answers\)/);
  const dashboard = fs.readFileSync("components/study-dashboard.tsx", "utf8");
  assert.ok(dashboard.indexOf("{showSurveyResults &&") > dashboard.indexOf("{/* General observations */}"));
  assert.equal(dashboard.split("{showSurveyResults &&").length, 2);
  const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
  const { StudyDashboard } = require("../components/study-dashboard.tsx");
  const stats = { totalProspects: 0, tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0, dials: 0, emailsSent: 0, completed: 0, scheduled: 0, toBeRescheduled: 0, declined: 0, deceased: 0, inCallingProcess: 0 };
  const data = { reportDate: "November 16, 2026", updatedAt: "2026-11-16T18:00:00Z", surveyRespondentCount: 0, stats, completedInterviews: [], scheduledInterviews: [], toBeRescheduled: [], declined: [], deceased: [], feasibilitySignals: [], missionThemes: [], quotes: [] };
  for (const hasResults of [false, true]) {
    data.surveyResults = hasResults ? { surveyVersion: schema.SURVEY_VERSION, asOf: "2026-11-14T07:59:59.999Z", responseCount: 0, partialResponseCount: 0, questions: [], partialQuestions: [] } : undefined;
    const rendered = renderToStaticMarkup(React.createElement(StudyDashboard, { data, eyebrow: "Fixture", title: "Fixture", description: "Fixture", showSurveyResults: true }));
    assert.equal((rendered.match(/id="online-survey-results"/g) ?? []).length, 1);
    assert.ok(rendered.indexOf('id="online-survey-results"') > rendered.indexOf("General Observations"));
    assert.ok(rendered.indexOf('id="online-survey-results"') > rendered.indexOf("Contact List"));
  }
  assert.ok(!renderToStaticMarkup(React.createElement(StudyDashboard, { data, eyebrow: "Fixture", title: "Fixture", description: "Fixture", showSurveyResults: false })).includes("online-survey-results"));
  const upload = fs.readFileSync("components/monthly-gift-upload.tsx", "utf8");
  assert.match(upload, />Import monthly gifts<\/h3>/); assert.match(upload, /current campaign only/); assert.match(upload, /Not pledges, refunds, YTD\/annual totals/);
  console.log("PASS client services Nov16: Q1–Q9 final gate/draft compatibility/stable export hash, five disabled Access GETs and schedules, preserved authenticated manual dry/live POST and VanillaSoft, exact visible labels/order.");
})().catch(e => { console.error(e); process.exit(1); });
