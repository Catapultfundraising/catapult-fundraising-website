// Hermetic: no network, real Blob/SQL, donor submissions or SharePoint writes.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const Module = require("node:module"), ts = require("typescript");
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, filename) => m._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
const original = Module._load, ledger = new Map();
let failRead = false, failWrite = false, ambiguous = false, failList = false, dashboardSaves = 0, admin = true, holdDraft = null;
class BlobNotFoundError extends Error {}
Module._load = function(name, parent, main) {
  if (name === "@vercel/blob") return {
    BlobNotFoundError,
    get: async key => {
      if (failRead) throw new Error("fixture read unavailable");
      return ledger.has(key) ? { statusCode: 200, stream: new Response(ledger.get(key)).body } : null;
    },
    put: async (key, body, options) => {
      assert.equal(options.access, "private"); assert.equal(options.addRandomSuffix, false); assert.equal(options.allowOverwrite, false);
      if (holdDraft && key.endsWith("/revision-0000005.json")) { holdDraft.started(); await holdDraft.wait; }
      if (failWrite) throw new Error("fixture write unavailable");
      if (ledger.has(key)) throw new Error("fixture create conflict");
      ledger.set(key, body);
      if (ambiguous) throw new Error("fixture lost acknowledgment");
    },
    list: async ({ prefix, cursor }) => {
      if (failList) throw new Error("fixture list unavailable");
      const keys = [...ledger.keys()].filter(k => k.startsWith(prefix)), i = cursor ? Number(cursor) : 0;
      return { blobs: keys.slice(i, i + 1).map(pathname => ({ pathname })), hasMore: i + 1 < keys.length, cursor: String(i + 1) };
    },
  };
  if (name === "@/lib/jag-admin-auth") return { isJagAdminAuthed: async () => admin };
  if (name === "@/lib/jag-data") return { getJagDashboardData: async () => ({}), saveJagDashboardData: async () => { dashboardSaves++; } };
  if (name === "@/lib/vs-sync") return { buildPortalDataFromVanillaSoft: async () => ({ data: { stats: { completed: 7 }, completedInterviews: [] }, meta: {} }) };
  if (name.startsWith("@/")) name = path.join(process.cwd(), name.slice(2));
  return original.call(this, name, parent, main);
};
global.fetch = async () => { throw new Error("No network allowed"); };
const { NextRequest } = require("next/server");
const schema = require("../lib/csnf-online-survey.ts"), store = require("../lib/csnf-survey-store.ts");
const { SurveyAutosave, SurveyInputRejectedError, sendSurveyWrite } = require("../lib/csnf-survey-autosave.ts");
const route = require("../app/api/csnf-survey/route.ts"), exportRoute = require("../app/api/csnf-survey/export/route.ts"), sync = require("../app/api/portal-sync/route.ts");
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const payload = (n = 1, revision = 1, answers = {}) => ({ id: uuid(n), writeToken: "a".repeat(64), revision, status: revision === schema.SUBMITTED_REVISION ? "submitted" : "draft", surveyVersion: schema.SURVEY_VERSION, firstName: "Zoë", lastName: "O’Neill-李", telephone: "+44 (0)20 1234 5678 ext. 7", answers });
const request = (body, extra = {}) => new NextRequest("https://fixture.invalid/api/csnf-survey", { method: "POST", headers: { origin: "https://fixture.invalid", "content-type": "application/json", ...extra }, body: typeof body === "string" ? body : JSON.stringify(body) });
const ack = body => ({ id: body.id, revision: body.revision, status: body.status, updatedAt: "2026-11-13T21:00:00.000Z" });
const form = (answers = {}, firstName = "Zoë", lastName = "O’Neill-李") => ({ firstName, lastName, telephone: "", answers, website: "" });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const RealDate = Date;
function clock(iso) { global.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [iso])); } }; }
(async () => {
  assert.equal(schema.SURVEY_SCHEMA_VERSION, 2); assert.equal(schema.SURVEY_QUESTIONS.length, 19);
  assert.equal(schema.SURVEY_QUESTIONS.filter(q => !q.commentFor).length, 10);
  assert.equal(schema.SURVEY_QUESTIONS.filter(q => q.type === "multi").map(q => q.id).join(), "q4");
  assert.equal(schema.validateSurvey(payload()).firstName, "Zoë", "names-only partial is valid");
  assert.equal(schema.validateSurvey({ ...payload(), telephone: "" }).telephone, "");
  for (const body of [null, [], {}, { ...payload(), firstName: "" }, { ...payload(), lastName: " " }, { ...payload(), firstName: "a".repeat(121) }, { ...payload(), telephone: "1".repeat(81) }, { ...payload(), firstName: "bad\nname" }, { ...payload(), writeToken: "" }, { ...payload(), revision: 0 }, { ...payload(), revision: 1.5 }, { ...payload(), revision: schema.SUBMITTED_REVISION }, { ...payload(), status: "unknown" }, { ...payload(), id: "../../bad" }, { ...payload(), surveyVersion: "wrong" }, payload(1, 1, { bogus: "x" }), payload(1, 1, { q1: "invented" }), payload(1, 1, { q4: ["Other", "Other"] }), payload(1, 1, { q10: "x".repeat(2001) }), { ...payload(), website: "bot" }]) assert.throws(() => schema.validateSurvey(body));
  assert.equal((await route.POST(request(payload()))).status, 503); assert.equal(ledger.size, 0);
  process.env.CSNF_SURVEY_ENABLED = "true"; process.env.VERCEL_ENV = "preview";
  assert.equal((await route.POST(request(payload()))).status, 503); assert.equal(ledger.size, 0);
  process.env.VERCEL_ENV = "production";
  assert.equal((await route.POST(request(payload(), { origin: "https://other.invalid" }))).status, 403);
  assert.equal((await route.POST(request(payload(), { "content-type": "text/plain" }))).status, 415);
  assert.equal((await route.POST(request("{"))).status, 400);
  assert.equal((await route.POST(request("x".repeat(140000)))).status, 413);
  assert.equal((await route.POST(request({ ...payload(), lastName: "" }))).status, 400); assert.equal(ledger.size, 0);
  failWrite = true; assert.equal((await route.POST(request(payload()))).status, 503); assert.equal(ledger.size, 0); failWrite = false;
  failRead = true; assert.equal((await route.POST(request(payload()))).status, 503); assert.equal(ledger.size, 0); failRead = false;
  let result = await route.POST(request(payload())); assert.equal(result.status, 200); assert.equal((await result.json()).status, "draft");
  const firstBytes = [...ledger.entries()];
  assert.equal((await route.POST(request(payload()))).status, 200); assert.deepEqual([...ledger.entries()], firstBytes);
  assert.equal((await route.POST(request(payload(1, 1, { q1: "Average" })))).status, 409);
  assert.equal((await route.POST(request({ ...payload(1, 2), writeToken: "b".repeat(64) }))).status, 409);
  assert.deepEqual([...ledger.entries()], firstBytes, "wrong capability and changed retry cannot mutate any existing bytes");
  await store.saveSurvey(payload(1, 3, { q1: "Good", q1_comments: "PRIVATE_COMMENT" }));
  await store.saveSurvey(payload(1, 2, { q1: "Average" }));
  let projected = await store.listSurveyResponses();
  assert.equal(projected.length, 1); assert.equal(projected[0].revision, 3); assert.equal(projected[0].answers.q1, "Good", "late draft cannot overwrite higher revision");
  const final = payload(1, schema.SUBMITTED_REVISION, { q1: "Very good" });
  await Promise.all([store.saveSurvey(final), store.saveSurvey(final)]);
  assert.equal((await store.listSurveyResponses())[0].status, "submitted");
  await assert.rejects(store.saveSurvey(payload(1, 4)), schema.SurveyConflictError);
  await assert.rejects(store.saveSurvey({ ...final, telephone: "123" }), schema.SurveyConflictError);
  assert.equal((await store.saveSurvey(final)).status, "submitted");
  ambiguous = true; await store.saveSurvey(payload(2)); ambiguous = false;
  assert.equal((await store.listSurveyResponses()).length, 2, "pagination, owners ignored and snapshots projected once");
  assert.ok(![...ledger.values()].some(s => s.includes('"writeToken"')), "capability is hashed, never stored raw");
  failList = true; await assert.rejects(store.listSurveyResponses()); failList = false;
  const key = [...ledger.keys()].find(k => k.includes("revision-0000003")), originalBytes = ledger.get(key);
  const corrupt = JSON.parse(originalBytes); corrupt.answers.q1 = "Average"; ledger.set(key, JSON.stringify(corrupt));
  await assert.rejects(store.listSurveyResponses()); ledger.set(key, originalBytes);
  // A draft already in flight may land after final; final remains authoritative.
  const started = deferred(), release = deferred(); holdDraft = { started: started.resolve, wait: release.promise };
  const late = store.saveSurvey(payload(2, 5, { q1: "Average" })); await started.promise;
  await store.saveSurvey(payload(2, schema.SUBMITTED_REVISION, { q1: "Good" })); release.resolve(); await late; holdDraft = null;
  projected = await store.listSurveyResponses(); assert.equal(projected.find(r => r.id === uuid(2)).revision, schema.SUBMITTED_REVISION);
  // Historical cutoff uses the Friday revision, not a later current projection.
  clock("2026-11-13T23:00:00.000Z"); await store.saveSurvey(payload(99, 1, { q1: "Good" }));
  clock("2026-11-14T08:00:00.000Z"); await store.saveSurvey(payload(99, 2, { q1: "Average" }));
  clock("2026-11-15T23:00:00.000Z"); await store.saveSurvey(payload(99, schema.SUBMITTED_REVISION, { q1: "Very good" }));
  const cutoff = schema.surveyWeeklyCutoff(new Date("2026-11-16T18:00:00Z"));
  assert.equal(cutoff.toISOString(), "2026-11-14T07:59:59.999Z");
  let friday = (await store.listSurveyResponses(cutoff)).find(r => r.id === uuid(99));
  assert.equal(friday.status, "draft"); assert.equal(friday.revision, 1); assert.equal(friday.answers.q1, "Good");
  assert.equal(schema.surveyWeeklyCutoff(new Date("2026-07-13T18:00:00Z")).toISOString(), "2026-07-11T06:59:59.999Z");
  assert.equal(schema.surveyWeeklyCutoff(new Date("2026-03-09T18:00:00Z")).toISOString(), "2026-03-07T07:59:59.999Z");
  global.Date = RealDate;
  const after = await store.listSurveyResponses(new Date("2026-11-17T00:00:00Z"));
  const summary = schema.aggregateSurvey([{ ...friday, id: uuid(98) }, after.find(r => r.id === uuid(99))], new Date("2026-11-17T00:00:00Z"));
  const dedup = schema.aggregateSurvey([friday, after.find(r => r.id === uuid(99))], new Date("2026-11-17T00:00:00Z"));
  assert.equal(dedup.responseCount, 1); assert.equal(dedup.partialResponseCount, 0, "never count each autosave as another survey");
  assert.equal(summary.responseCount, 1); assert.equal(summary.partialResponseCount, 1);
  assert.equal(summary.questions.find(q => q.id === "q1").counts.find(c => c.label === "Very good").count, 1);
  assert.equal(summary.partialQuestions.find(q => q.id === "q1").counts.find(c => c.label === "Good").count, 1);
  for (const secret of ["Zoë", "O’Neill", "telephone", "PRIVATE_COMMENT", uuid(99)]) assert.ok(!JSON.stringify(summary).includes(secret));
  process.env.CRON_SECRET = "fixture-cron";
  const exp = auth => new NextRequest("https://fixture.invalid/api/csnf-survey/export", { headers: auth ? { authorization: auth } : {} });
  assert.equal((await exportRoute.GET(exp())).status, 401);
  assert.equal((await exportRoute.GET(exp("Bearer wrong"))).status, 401);
  result = await exportRoute.GET(exp("Bearer fixture-cron")); assert.equal(result.headers.get("cache-control"), "no-store");
  const exported = await result.json(); assert.equal(exported.schemaVersion, 2); assert.equal(exported.identityFields.length, 3);
  assert.ok(exported.responses.every(r => !("digest" in r) && !("writeToken" in r) && !("tokenHash" in r)));
  failList = true; assert.equal((await exportRoute.GET(exp("Bearer fixture-cron"))).status, 503); failList = false;
  clock("2026-11-16T18:00:00.000Z");
  const cronReq = () => new NextRequest("https://fixture.invalid/api/portal-sync?project=csnf", { headers: { authorization: "Bearer fixture-cron" } });
  result = await sync.POST(cronReq()); assert.equal(result.status, 200);
  let data = (await result.json()).data; assert.equal(data.stats.completed, 7); assert.equal(data.surveyResults.asOf, cutoff.toISOString()); assert.ok(data.surveyResults.partialResponseCount >= 1);
  const saves = dashboardSaves; failList = true;
  assert.equal((await sync.POST(cronReq())).status, 500); assert.equal(dashboardSaves, saves); failList = false;
  clock("2026-11-17T18:00:00.000Z"); failList = true;
  result = await sync.POST(cronReq()); assert.equal((await result.json()).saved, false); assert.equal(dashboardSaves, saves); failList = false;
  global.Date = RealDate; admin = false; assert.equal((await sync.POST(new NextRequest("https://fixture.invalid/api/portal-sync?project=csnf&force=1"))).status, 401);

  // Client controller lifecycle, deterministic deferred promises, no real timers.
  let writes = [], views = [];
  const save = new SurveyAutosave(uuid(50), "c".repeat(64), async b => { writes.push(structuredClone(b)); return ack(b); }, v => views.push(v));
  save.update(form({}, "Zoë", "")); await save.flush(); save.flushOnExit(); assert.equal(writes.length, 0, "names gate even on exit");
  save.update(form()); await save.flush(); assert.equal(writes.length, 1); assert.equal(writes[0].status, "draft", "partial saved without Submit");
  save.update(form({ q1: "Good" }, "", "O’Neill")); await save.flush(); assert.equal(writes.length, 1); assert.equal(views.at(-1).phase, "idle", "cleared name is not misleadingly Saved");
  save.update(form({ q1: "Good" })); await save.flush(); assert.equal(writes.at(-1).answers.q1, "Good");
  const gate = deferred(); writes = []; views = [];
  const serialized = new SurveyAutosave(uuid(51), "d".repeat(64), async b => { writes.push(structuredClone(b)); if (writes.length === 1) await gate.promise; return ack(b); }, v => views.push(v));
  serialized.update(form()); const saving = serialized.flush();
  serialized.update(form({ q1: "Good" })); void serialized.flush(); assert.equal(writes.length, 1);
  assert.notEqual(views.at(-1).phase, "saved"); gate.resolve(); await saving;
  assert.equal(writes.length, 2); assert.equal(writes[0].answers.q1, undefined); assert.equal(writes[1].answers.q1, "Good"); assert.ok(writes[1].revision > writes[0].revision);
  let failure = true; writes = []; views = [];
  const retry = new SurveyAutosave(uuid(52), "e".repeat(64), async b => { writes.push(structuredClone(b)); if (failure) { failure = false; throw new Error("fixture network failure"); } return ack(b); }, v => views.push(v));
  retry.update(form()); await retry.flush(); assert.equal(views.at(-1).phase, "error");
  retry.update(form({ q1: "Maybe" })); await retry.flush();
  assert.deepEqual(writes[0], writes[1], "retained ambiguous revision payload never mutated by edits");
  assert.ok(writes[2].revision > writes[1].revision); assert.equal(writes[2].answers.q1, "Maybe");
  const oldAck = deferred(); writes = []; views = [];
  const exiting = new SurveyAutosave(uuid(53), "f".repeat(64), async (b, keepalive) => { writes.push({ ...structuredClone(b), keepalive }); if (writes.length === 1) await oldAck.promise; return ack(b); }, v => views.push(v));
  exiting.update(form()); const old = exiting.flush(); exiting.update(form({ q1: "Good" })); exiting.flushOnExit();
  await Promise.resolve(); await Promise.resolve();
  assert.equal(writes.length, 2); assert.equal(writes[1].keepalive, true); assert.ok(writes[1].revision > writes[0].revision);
  void exiting.flush(true); exiting.flushOnExit(); await Promise.resolve(); await Promise.resolve();
  assert.equal(writes.at(-1).revision, schema.SUBMITTED_REVISION); assert.equal(writes.at(-1).answers.q1, "Good");
  oldAck.resolve(); await old; assert.equal(views.at(-1).phase, "submitted", "late draft ack cannot revert submitted state");
  const count = writes.length; exiting.update(form({ q1: "Average" })); await exiting.flush(); exiting.flushOnExit(); assert.equal(writes.length, count);
  writes = []; let reject = true;
  const corrected = new SurveyAutosave(uuid(54), "f".repeat(64), async b => { writes.push(structuredClone(b)); if (reject) { reject = false; throw new SurveyInputRejectedError(); } return ack(b); }, () => {});
  corrected.update(form({ q10: "x".repeat(2001) })); await corrected.flush(); corrected.update(form({ q10: "Corrected" })); await corrected.flush(); assert.equal(writes.length, 2); assert.ok(writes[1].revision > writes[0].revision);
  writes = []; views = []; let rejectFinal = true;
  const final400 = new SurveyAutosave(uuid(55), "e".repeat(64), async b => {
    writes.push(structuredClone(b));
    if (b.status === "submitted" && rejectFinal) { rejectFinal = false; throw new SurveyInputRejectedError(); }
    return ack(b);
  }, v => views.push(v));
  final400.update(form({ q1: "Good" })); await final400.flush(true);
  assert.equal(views.at(-1).phase, "error"); assert.equal(views.at(-1).finalizing, false, "known-not-persisted final400 unlocks correction");
  final400.update(form({ q1: "Average" })); await final400.flush();
  assert.equal(writes.at(-1).status, "draft"); assert.equal(writes.at(-1).answers.q1, "Average");
  await final400.flush(true); assert.equal(views.at(-1).phase, "submitted");
  const oldDraft = deferred(); views = [];
  const exit400 = new SurveyAutosave(uuid(56), "e".repeat(64), async (b, keepalive) => {
    if (keepalive) throw new SurveyInputRejectedError();
    if (b.status === "draft") await oldDraft.promise;
    return ack(b);
  }, v => views.push(v));
  exit400.update(form()); const waitingDraft = exit400.flush(); void exit400.flush(true); exit400.flushOnExit();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(views.at(-1).finalizing, false, "keepalive known400 also unlocks final state");
  oldDraft.resolve(); await waitingDraft;
  exit400.update(form({ q1: "Good" })); await exit400.flush(); await exit400.flush(true);
  assert.equal(views.at(-1).phase, "submitted");
  let transportCalls = [];
  const timedOut = new SurveyAutosave(uuid(57), "e".repeat(64), async b => {
    transportCalls.push(JSON.stringify(b));
    if (transportCalls.length === 1) return sendSurveyWrite(b, false, (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("fixture timeout")));
    }), 5);
    return ack(b);
  }, v => views.push(v));
  timedOut.update(form()); await timedOut.flush();
  assert.equal(views.at(-1).phase, "error", "hung ordinary transport becomes retryable, not indefinite Saving");
  await timedOut.flush(); assert.equal(transportCalls[0], transportCalls[1], "timeout retains exact ambiguous payload");
  assert.equal(views.at(-1).phase, "saved");
  await sendSurveyWrite({ ...payload(58), website: "" }, true, async (_url, options) => {
    assert.equal(options.signal, undefined); assert.equal(options.keepalive, true);
    return Response.json({ ok: true, ...ack(payload(58)) });
  }, 1);
  const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
  const Campaign = require("../components/csnf-campaign-page.tsx").default;
  const resource = renderToStaticMarkup(React.createElement(Campaign, { resourceOnly: true })), invitation = renderToStaticMarkup(React.createElement(Campaign, { schedulingLink: "https://fixture.invalid/schedule" }));
  assert.ok(!/interview|calendly/i.test(resource));
  assert.equal(resource.match(/<section id="case-for-support"[\s\S]*?(?=<section id="faq")/)[0], invitation.match(/<section id="case-for-support"[\s\S]*?(?=<section id="faq")/)[0]);
  assert.deepEqual(resource.match(/<details[\s\S]*?<\/details>/g), invitation.match(/<details[\s\S]*?<\/details>/g).slice(0, -1));
  assert.ok(fs.readFileSync("lib/csnf-survey.ts", "utf8").includes("getCsnfSurvey"));
  console.log("PASS v2 CSNF survey: identified drafts/names gate, immutable authorized revisions and terminal races, retries/coalescing/out-of-order/exit flush, capability privacy, export auth, prior-revision cutoff, submitted+partial cohort breakdowns/no PII, Monday gate, unchanged case/VIP.");
})().catch(e => { global.Date = RealDate; console.error(e); process.exit(1); });
