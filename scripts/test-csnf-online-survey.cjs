// Hermetic tests: no network, real Blob, SQL, donor submissions or SharePoint.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const Module = require("node:module"), ts = require("typescript");
const root = process.cwd();
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, filename) => m._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
const original = Module._load;
const ledger = new Map();
let failRead = false, failWrite = false, ambiguous = false, failList = false, dashboardSaves = 0, admin = true;
class BlobNotFoundError extends Error {}
Module._load = function(name, parent, main) {
  if (name === "@vercel/blob") return {
    BlobNotFoundError,
    get: async key => {
      if (failRead) throw new Error("fixture read unavailable");
      if (!ledger.has(key)) return null;
      return { statusCode: 200, stream: new Response(ledger.get(key)).body };
    },
    put: async (key, body, options) => {
      assert.equal(options.access, "private"); assert.equal(options.addRandomSuffix, false); assert.equal(options.allowOverwrite, false);
      if (failWrite) throw new Error("fixture write unavailable");
      if (ledger.has(key)) throw new Error("fixture conflict");
      ledger.set(key, body);
      if (ambiguous) throw new Error("fixture lost acknowledgment");
    },
    list: async ({ prefix, cursor }) => {
      if (failList) throw new Error("fixture list unavailable");
      const keys = [...ledger.keys()].filter(k => k.startsWith(prefix));
      const i = cursor ? Number(cursor) : 0;
      return { blobs: keys.slice(i, i + 1).map(pathname => ({ pathname })), hasMore: i + 1 < keys.length, cursor: String(i + 1) };
    },
  };
  if (name === "@/lib/jag-admin-auth") return { isJagAdminAuthed: async () => admin };
  if (name === "@/lib/jag-data") return { getJagDashboardData: async () => ({}), saveJagDashboardData: async () => { dashboardSaves++; } };
  if (name === "@/lib/vs-sync") return { buildPortalDataFromVanillaSoft: async () => ({ data: { stats: { completed: 7 }, completedInterviews: [] }, meta: {} }) };
  if (name.startsWith("@/")) name = path.join(root, name.slice(2));
  return original.call(this, name, parent, main);
};
global.fetch = async () => { throw new Error("No network allowed"); };
const { NextRequest } = require("next/server");
const schema = require("../lib/csnf-online-survey.ts");
const store = require("../lib/csnf-survey-store.ts");
const route = require("../app/api/csnf-survey/route.ts");
const exportRoute = require("../app/api/csnf-survey/export/route.ts");
const sync = require("../app/api/portal-sync/route.ts");
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const payload = (n = 1, answers = { q1: "Good", q4: ["Economic growth", "Other"], q1_comments: "=private text" }) => ({ id: uuid(n), surveyVersion: schema.SURVEY_VERSION, answers });
const request = (body, extra = {}) => new NextRequest("https://fixture.invalid/api/csnf-survey", { method: "POST", headers: { origin: "https://fixture.invalid", "content-type": "application/json", ...extra }, body: typeof body === "string" ? body : JSON.stringify(body) });
const snapshots = () => [...ledger.entries()];
(async () => {
  assert.equal(schema.SURVEY_QUESTIONS.length, 19);
  assert.equal(schema.SURVEY_QUESTIONS.filter(q => !q.commentFor).length, 10);
  assert.equal(schema.SURVEY_QUESTIONS.filter(q => q.type === "multi").map(q => q.id).join(), "q4");
  assert.ok(schema.SURVEY_QUESTIONS.every(q => !q.required));
  assert.equal(schema.validateSurvey(payload()).answers.q1_comments, "=private text");
  for (const body of [null, [], {}, payload(1, {}), { ...payload(), id: "../../bad" }, { ...payload(), surveyVersion: "wrong" }, payload(1, { bogus: "x" }), payload(1, { q1: "invented" }), payload(1, { q4: ["Other", "Other"] }), payload(1, { q4: "Other" }), payload(1, { q1: [] }), payload(1, { q10: "x".repeat(2001) }), { ...payload(), website: "bot" }]) assert.throws(() => schema.validateSurvey(body));
  assert.equal((await route.POST(request(payload()))).status, 503); assert.equal(ledger.size, 0);
  process.env.CSNF_SURVEY_ENABLED = "true"; process.env.VERCEL_ENV = "preview";
  assert.equal((await route.POST(request(payload()))).status, 503); assert.equal(ledger.size, 0);
  process.env.VERCEL_ENV = "production";
  assert.equal((await route.POST(request(payload(), { origin: "https://other.invalid" }))).status, 403);
  assert.equal((await route.POST(request(payload(), { "content-type": "text/plain" }))).status, 415);
  assert.equal((await route.POST(request("{"))).status, 400);
  assert.equal((await route.POST(request("x".repeat(140000)))).status, 413);
  assert.equal((await route.POST(request(payload(1, {})))).status, 400); assert.equal(ledger.size, 0);
  failWrite = true;
  assert.equal((await route.POST(request(payload()))).status, 503); assert.equal(ledger.size, 0);
  failWrite = false; failRead = true;
  assert.equal((await route.POST(request(payload()))).status, 503); assert.equal(ledger.size, 0);
  failRead = false;
  assert.equal((await route.POST(request(payload()))).status, 200);
  const first = snapshots();
  assert.equal((await route.POST(request(payload()))).status, 200);
  assert.deepEqual(snapshots(), first, "replay must preserve all preexisting bytes");
  assert.equal((await route.POST(request(payload(1, { q1: "Average" })))).status, 409);
  assert.deepEqual(snapshots(), first, "changed payload must not overwrite existing receipt");
  ambiguous = true; assert.equal((await route.POST(request(payload(2)))).status, 200); ambiguous = false;
  await Promise.all([store.saveSurvey(payload(3)), store.saveSurvey(payload(3))]);
  assert.equal(ledger.size, 3);
  assert.equal((await store.listSurveyResponses()).length, 3, "pagination collects every row");
  failList = true;
  await assert.rejects(store.listSurveyResponses());
  failList = false;
  const existingKey = [...ledger.keys()][0], savedBytes = ledger.get(existingKey);
  const corrupt = JSON.parse(savedBytes); corrupt.answers.q1 = "Average"; ledger.set(existingKey, JSON.stringify(corrupt));
  await assert.rejects(store.listSurveyResponses());
  await assert.rejects(store.saveSurvey(payload()), schema.SurveyConflictError);
  ledger.set(existingKey, savedBytes);
  process.env.CRON_SECRET = "fixture-cron";
  const exp = auth => new NextRequest("https://fixture.invalid/api/csnf-survey/export", { headers: auth ? { authorization: auth } : {} });
  assert.equal((await exportRoute.GET(exp())).status, 401);
  assert.equal((await exportRoute.GET(exp("Bearer wrong"))).status, 401);
  let out = await exportRoute.GET(exp("Bearer fixture-cron"));
  assert.equal(out.headers.get("cache-control"), "no-store");
  const exported = await out.json(); assert.equal(exported.schemaVersion, 1); assert.equal(exported.responses.length, 3);
  assert.ok(exported.responses.every(r => !("digest" in r)));
  failList = true; assert.equal((await exportRoute.GET(exp("Bearer fixture-cron"))).status, 503); failList = false;
  const rows = await store.listSurveyResponses();
  const cutoff = new Date("2026-11-13T23:00:00Z");
  const aggregate = schema.aggregateSurvey([{ ...rows[0], submittedAt: "2026-11-13T22:00:00Z" }, { ...rows[1], submittedAt: "2026-11-14T01:00:00Z" }], cutoff);
  assert.equal(aggregate.responseCount, 1); assert.equal(aggregate.questions.length, 9);
  assert.equal(aggregate.questions.find(q => q.id === "q1").counts.find(c => c.label === "Good").count, 1);
  assert.ok(!JSON.stringify(aggregate).includes("private text")); assert.ok(!JSON.stringify(aggregate).includes(uuid(1)));
  assert.equal(schema.surveyWeeklyCutoff(new Date("2026-11-16T18:00:00Z")).toISOString(), "2026-11-14T07:59:59.999Z");
  assert.equal(schema.surveyWeeklyCutoff(new Date("2026-07-13T18:00:00Z")).toISOString(), "2026-07-11T06:59:59.999Z");
  assert.equal(schema.surveyWeeklyCutoff(new Date("2026-03-09T18:00:00Z")).toISOString(), "2026-03-07T07:59:59.999Z");
  const fridayEnd = schema.surveyWeeklyCutoff(new Date("2026-11-16T18:00:00Z"));
  assert.equal(schema.aggregateSurvey([
    { ...rows[0], submittedAt: fridayEnd.toISOString() },
    { ...rows[1], submittedAt: new Date(fridayEnd.getTime() + 1).toISOString() },
    { ...rows[2], submittedAt: "2026-11-15T22:00:00Z" },
  ], fridayEnd).responseCount, 1, "Friday-end inclusive; Saturday midnight and Sunday excluded");
  const syncReq = () => new NextRequest("https://fixture.invalid/api/portal-sync?project=csnf&force=1");
  let result = await sync.POST(syncReq()); assert.equal(result.status, 200);
  let data = (await result.json()).data; assert.equal(data.stats.completed, 7); assert.equal(data.completedInterviews.length, 0); assert.equal(data.surveyResults.responseCount, 3);
  const saves = dashboardSaves; failList = true;
  assert.equal((await sync.POST(syncReq())).status, 500); assert.equal(dashboardSaves, saves, "failed survey read never publishes apparent zero");
  failList = false;
  result = await sync.GET(new NextRequest("https://fixture.invalid/api/portal-sync?project=csnf&preview=1")); assert.equal(result.status, 200); assert.equal(dashboardSaves, saves, "preview never saves dashboard");
  const RealDate = Date;
  global.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ["2026-11-16T18:00:00Z"])); } };
  const cronReq = () => new NextRequest("https://fixture.invalid/api/portal-sync?project=csnf", { headers: { authorization: "Bearer fixture-cron" } });
  result = await sync.POST(cronReq());
  assert.equal(result.status, 200); data = (await result.json()).data;
  assert.equal(data.surveyResults.asOf, "2026-11-14T07:59:59.999Z", "Monday CRON saves prior Friday cutoff");
  global.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ["2026-11-17T18:00:00Z"])); } };
  const mondaySaves = dashboardSaves; failList = true;
  result = await sync.POST(cronReq());
  assert.equal(result.status, 200); assert.equal((await result.json()).saved, false); assert.equal(dashboardSaves, mondaySaves, "Tuesday CRON is skipped before any survey storage read");
  failList = false; global.Date = RealDate;
  admin = false; assert.equal((await sync.POST(syncReq())).status, 401);
  assert.deepEqual([...ledger.entries()].slice(0, 1), first, "all original receipts remain immutable after entire suite");
  for (const file of ["app/csnf-survey/page.tsx", "components/csnf-survey-form.tsx"]) {
    assert.ok(!/calendly|schedule|interview/i.test(fs.readFileSync(file, "utf8")), "survey has no interview or scheduling language");
  }
  assert.ok(fs.readFileSync("lib/csnf-survey.ts", "utf8").includes("getCsnfSurvey"), "unrelated interview lookup is preserved");
  assert.ok(fs.readFileSync("middleware.ts", "utf8").includes('matchPrefix: "/api/csnf-summary-pdf"'));
  const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
  const Campaign = require("../components/csnf-campaign-page.tsx").default;
  const resourceHtml = renderToStaticMarkup(React.createElement(Campaign, { resourceOnly: true }));
  const invitationHtml = renderToStaticMarkup(React.createElement(Campaign, { schedulingLink: "https://fixture.invalid/schedule" }));
  assert.ok(!/interview|calendly|fixture.invalid\/schedule/i.test(resourceHtml), "/csnf resource mode contains no stale interview invitation or FAQ");
  assert.equal((invitationHtml.match(/href="https:\/\/fixture.invalid\/schedule"/g) || []).length, 2, "VIP/default scheduling CTAs retained");
  assert.ok(invitationHtml.includes("Will I be asked to make a gift during my interview?"));
  assert.equal(resourceHtml.match(/<section id="case-for-support"[\s\S]*?(?=<section id="faq")/)[0], invitationHtml.match(/<section id="case-for-support"[\s\S]*?(?=<section id="faq")/)[0], "substantive case HTML identical in both modes");
  const resourceFaqs = resourceHtml.match(/<details[\s\S]*?<\/details>/g);
  const invitationFaqs = invitationHtml.match(/<details[\s\S]*?<\/details>/g);
  assert.deepEqual(resourceFaqs, invitationFaqs.slice(0, -1), "all substantive FAQ answers unchanged; only interview-only question hidden");
  assert.ok(fs.readFileSync("app/csnf/page.tsx", "utf8").includes("<CsnfCampaignPage resourceOnly />"));
  assert.ok(fs.readFileSync("app/csnfvip/page.tsx", "utf8").includes("csnf-tier-1-interview"));
  console.log("PASS CSNF online survey: source schema, strict validation, preview guard, size/origin/type gates, private immutable persistence, retry/conflict/concurrency/ambiguous save, pagination/read failures/corruption, export auth, PII-free aggregates, Pacific DST cutoffs, separate sync counts and fail-closed snapshot, existing interview/PDF isolation.");
})().catch(e => { console.error(e); process.exitCode = 1; });
