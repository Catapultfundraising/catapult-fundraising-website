// OFFLINE ONLY: real website gateway/parser/read consumers, mocked backend wire/Blob.
// Never SQL-engine, hosted acceptance, durable publication or production registration proof.
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const assert = require("node:assert/strict"), crypto = require("node:crypto"), Module = require("node:module"), ts = require("typescript");
const original = Module._load, root = process.cwd();
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, filename) => m._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
let renderedXlsx, renderedPdf;
let enabled = false, sql = { updates: [], prospects: [] }, source, transport;
const server = { portalCampaignStateSafe:async()=>sql, portalStateSafe:async()=>sql, engageCall: async () => ({ status: 200, body: sql }), secondarySolicitors: async () => ({}), saveSecondarySolicitor: async () => {}, logHistoryAudit: async () => {}, parseUsDate: s => s };
Module._load = function(name, parent, main) {
  if (name === "server-only") return {};
  if (name === "@react-pdf/renderer") return {Document:"Document",Page:"Page",View:"View",Text:"Text",renderToBuffer:async tree=>{renderedPdf=tree;return Buffer.from("mock PDF renderer");}};
  if (name.startsWith("@/")) name = path.join(root, name.slice(2));
  const file = name.startsWith(".") ? path.resolve(path.dirname(parent.filename), name) : name;
  // Generic-export test exercises route authorization/hold only, not PDF/XLSX rendering.
  if (/\/lib\/(jag|csnf|pvas|wcbhc|baq)-brand-pdf$/.test(file)) return { preparedOn: () => "Fictional test", registerBrandFonts: () => {}, bs:new Proxy({}, {get:()=>({})}) };
  if (/\/lib\/(jag|csnf|pvas|wcbhc|baq)-brand-xlsx$/.test(file)) return { buildBrandedXlsx: async payload => {renderedXlsx=payload;return Buffer.from("mock renderer; current data tested before rendering");} };
  if (file === path.join(root, "lib/portal-v2/direct-registration.server")) return { directLaneEnabled: () => enabled, APPROVED_WEBSITE_DIRECT_REGISTRATIONS: [], DIRECT_WEBSITE_INTEGRATION_ACCEPTED: false };
  if (file === path.join(root, "lib/portal-v2/server")) return server;
  return original.call(this, name, parent, main);
};
global.fetch = async (...args) => { if (transport) return transport(...args); throw new Error("NETWORK FORBIDDEN"); };
Object.assign(process.env, { RESEARCH_PASSWORD: "fictional-local-password", RESEARCH_AUTH_SECRET: "fictional-local-auth-secret" });
const COOKIE = crypto.createHash("sha256").update("fictional-local-password:fictional-local-auth-secret").digest("hex");
const { NextRequest } = require("next/server");
const wire = require("../lib/portal-v2/directFileProtocol.ts");
const gateway = require("../lib/portal-v2/direct-file-gateway.server.ts");
const reads = require("../lib/portal-v2/direct-source-state.server.ts");
const strict = require("../lib/portal-v2/direct-tracking-state.ts");
const { directSnapshot } = require("../lib/portal-v2/direct-snapshot.ts");
const { campaignAskAmount, effectiveAsk, askEdits, overlayCampaignAsks } = require("../lib/portal-v2/effective-ask.ts");
const { buildOverlay } = require("../lib/portal-v2/record-overlay.ts");
const { assignmentResolver } = require("../lib/portal-v2/effective-assignment.ts");
const { manualAssignmentPatch } = require("../lib/portal-v2/manual-assignment-patch.ts");
const { confirmedDirectReceipt } = require("../lib/portal-v2/direct-public-response.ts");
const { directSourceCall, readBoundedStream } = require("../lib/portal-v2/direct-source-transport.server.ts");
const { workbookParts, zipParts } = require("./fixtures/source-ooxml-test-fixture.ts");
const hex = c => c.repeat(64), ID = "a".repeat(32), secret = "fictional-source-bearer-long-enough-for-local-test";
const encode = s => Buffer.from(s).toString("base64"), doc = (prospects = {}, activity = [], removed = []) => ({ prospects, activity, removed, pirs: {} });
const track = async (client, d = doc()) => strict.readStrictTracking(client, async () => ({ kind: "bytes", bytes: Buffer.from(JSON.stringify(d)) }));
function file(csv = "Client_ID,CPTID,Campaign Ask,New Notes\n0001,900001,1500.25,New fictional visit\n") {
  return { requestId: ID, template: "fictional-portfolio", fileName: "fictional.csv", bytes: encode(csv), sourceDate: "2026-10-19", actor: "Fictional reviewer",
    parseSettings: { format: "csv" }, mapping: { Client_ID: "clientId", "Campaign Ask": "ask", "New Notes": "note", "@source-date": "noteDate" }, verifyCptidColumn: "CPTID", noteResolutions: { "1": "new-event" } };
}
function fixtureDeps() {
  const calls = [], receipts = new Map(); let manual = doc(), replyMutation, now = 1_793_000_000;
  const caps = { protocol: "direct-file-v1", client: "pvas", status: "known", reason: null, applyEnabled: true,
    templates: [{ template: "fictional-portfolio", revision: hex("a"), fields: ["ask", "primarySolicitor", "secondarySolicitor", "note"], cutovers: { ask: "2026-01-01", note: "2026-01-01" } }], solicitorAliases: { status: "unavailable", entries: [] } };
  const deps = { secret: () => secret, now: () => now, enabled: () => true, aliases: () => null, tracking: c => track(c, manual),
    call: async (client, op, body = {}) => {
      calls.push({ client, op, body });
      if (replyMutation) { const mutated = replyMutation(client, op, body); if (mutated) return mutated; }
      if (op === "directFileCapabilities") return { status: 200, body: { ...caps, client } };
      if (op === "directFileResolve") return { status: 200, body: { protocol: "direct-file-v1", status: "known", client, template: body.template, registrationRevision: hex("a"),
        matches: body.ids.map(x => { const cptid = /^00\d{2}$/.test(x.clientId) && Number(x.clientId) >= 1 && Number(x.clientId) <= 50 ? 900000 + Number(x.clientId) : null; return { ...x, cptid, reason: cptid !== null ? (x.verifyCptid !== null && x.verifyCptid !== cptid ? "cptid-conflict" : null) : "unknown-id" }; }) } };
      if (op === "directFileStatus") return { status: 200, body: receipts.get(body.requestId) ?? { protocol: "direct-file-v1", status: "not-found", client, requestId: body.requestId, note: "May be in flight; do not resend." } };
      assert.ok(["directFilePreview", "directFileCommit"].includes(op));
      assert.deepEqual(Object.keys(body).sort(), (op === "directFileCommit" ? ["approval", "batch", "fileContext", "manualContext"] : ["batch", "fileContext", "manualContext"]).sort());
      const b = body.batch, m = body.manualContext;
      assert.match(b.requestId, /^[a-f0-9]{32}$/); // actual backend boundary, NOT a permissive UUID mock.
      assert.equal(b.mappingDigest, wire.directFileHash({ parse: b.parse, mapping: b.mapping }));
      assert.equal(b.fileContextHash, wire.directFileHash(body.fileContext));
      assert.equal(m.payload.batchHash, wire.directFileHash(b));
      assert.equal(m.signature, crypto.createHmac("sha256", secret).update(wire.DIRECT_MANUAL_DOMAIN + JSON.stringify(m.payload)).digest("hex"));
      assert.deepEqual(Object.keys(m.payload), [...wire.DIRECT_MANUAL_KEYS]);
      assert.equal(m.payload.phase, op === "directFileCommit" ? "commit" : "preview");
      assert.equal(m.payload.observations[0].notesCoverage, "tracking-only");
      assert.equal(m.payload.observations[0].historicalRevision, null);
      const payloadHash = wire.directFileHash(b), previewHash = wire.directFileHash([b, m.payload.observations]);
      if (op === "directFilePreview") return { status: 200, body: { protocol: "direct-file-v1", status: "previewed", plan: { payloadHash, previewHash, proof: hex("b"), expiresAt: now * 1000 + 60000,
        decisions: b.cells.map(c => ({ ordinal: c.ordinal, cptid: c.cptid, field: c.field, before: null, after: c.value, action: c.field === "note" && c.noteResolution !== "new-event" ? "held" : c.value ? (c.field === "note" ? "append" : "set") : "unchanged", reason: c.field === "note" && c.noteResolution !== "new-event" ? "historical-coverage-incomplete" : null, eventKey: c.field === "note" ? hex("c") : null })) } } };
      if (body.approval.previewHash !== previewHash) return { status: 409, body: { code: "preview-changed" } };
      const receipt = { protocol: "direct-file-v1", requestId: b.requestId, client, status: "committed", saved: b.cells.length, held: 0, unchanged: 0, payloadHash, previewHash, effect: "source-state-only", effectiveChanges: "not-asserted", publication: "not-requested", replay: false };
      receipts.set(b.requestId, receipt); return { status: 200, body: receipt };
    } };
  return { deps, calls, receipts, setManual: d => { manual = d; }, mutate: fn => { replyMutation = fn; }, advance: () => now++ };
}
function request(body, headers = {}) { return new NextRequest("http://localhost:3100/api/pvas-data-direct-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", cookie: `catapult_research_auth=${COOKIE}`, ...headers }, body: JSON.stringify(body) }); }
let checks = 0;
async function check(name, run) { if(process.env.DIRECT_AUTH_ONLY==="1" && !name.includes("source gateway employee auth"))return; if(process.env.DIRECT_EXPORT_ONLY==="1" && !name.includes("export compatibility"))return; await run(); console.log(`ok ${++checks} - ${name}`); }
(async () => {
  console.log("# MOCK backend wire / NO SQL / NO network / original website code");
  await check("whole-file preview + commit + status use exact32hex, original bytes and signed ordered observations", async () => {
    const f = fixtureDeps(), route = gateway.directFileGateway("pvas", f.deps), input = file();
    const p = await route(request({ op: "preview", file: input })); assert.equal(p.status, 200); const preview = await p.json();
    assert.equal(f.calls.at(-1).body.fileContext.reviewCells, 2);
    assert.equal(f.calls.at(-1).body.batch.fileDigest, crypto.createHash("sha256").update(Buffer.from(input.bytes, "base64")).digest("hex"));
    const r = await route(request({ op: "commit", file: input, approval: { previewHash: preview.plan.previewHash, expiresAt: preview.plan.expiresAt, proof: preview.plan.proof } }));
    assert.equal(r.status, 200); const receipt = await r.json(); confirmedDirectReceipt(receipt, { client: "pvas", requestId: ID, payloadHash: preview.plan.payloadHash, previewHash: preview.plan.previewHash, cells: 2 });
    assert.equal((await (await route(request({ op: "status", requestId: ID }))).json()).publication, "not-requested");
    assert.equal(f.calls.filter(c => c.op === "directFileCommit").length, 1);
  });
  await check("auth cookie cannot substitute research; cross-origin/extra envelope/UUID36 reject before backend", async () => {
    const f = fixtureDeps(), route = gateway.directFileGateway("pvas", f.deps);
    assert.equal((await route(request({ op: "capabilities" }, { cookie: "catapult_pvas_data_auth=fictional" }))).status, 401);
    assert.equal((await route(request({ op: "capabilities" }, { origin: "https://foreign.invalid" }))).status, 403);
    assert.equal((await route(request({ op: "capabilities", client: "jag" }))).status, 400);
    assert.equal((await route(request({ op: "preview", file: { ...file(), requestId: crypto.randomUUID() } }))).status, 400);
    assert.equal((await route(request({ op: "status", requestId: "A".repeat(32) }))).status, 400);
    assert.equal(f.calls.length, 0);
  });
  await check("50 mapped cells including blanks accepted;51 rejected before resolve/preview/commit, never split", async () => {
    const make = n => { const f = file("Client_ID,Campaign Ask\n" + Array.from({ length: n }, (_, i) => `${String(i + 1).padStart(4, "0")},\n`).join("")); return { ...f, mapping: { Client_ID: "clientId", "Campaign Ask": "ask" }, verifyCptidColumn: null, noteResolutions: {} }; };
    let f = fixtureDeps(); assert.equal((await gateway.buildGatewayBatch("pvas", make(50), f.deps)).batch.cells.length, 50);
    f = fixtureDeps(); await assert.rejects(() => gateway.buildGatewayBatch("pvas", make(51), f.deps), e => e.code === "whole-file-cell-limit");
    assert.equal(f.calls.filter(c => c.op !== "directFileCapabilities").length, 0);
  });
  await check("backend lexical identity order joins exact client ID, never source position", async () => {
    const f = fixtureDeps();
    f.mutate((client, op, body) => op === "directFileResolve" ? { status: 200, body: { protocol: "direct-file-v1", status: "known", client, template: body.template, registrationRevision: hex("a"),
      matches: [...body.ids].sort((a, b) => a.clientId.localeCompare(b.clientId)).map(x => ({ ...x, cptid: 900000 + Number(x.clientId), reason: null })) } } : null);
    const input = { ...file("Client_ID,CPTID,Campaign Ask\n0002,900002,2.00\n0001,900001,1.00\n"),
      mapping: { Client_ID: "clientId", "Campaign Ask": "ask" }, noteResolutions: {} };
    const built = await gateway.buildGatewayBatch("pvas", input, f.deps);
    assert.deepEqual(built.batch.cells.map(c => [c.clientId, c.cptid, c.value]), [["0002", 900002, "2.00"], ["0001", 900001, "1.00"]]);
  });
  await check("identity conflict/unknown, formulas, numeric text writes, precision and unapproved aliases produce complete whole-file exceptions", async () => {
    const f = fixtureDeps();
    const bad = file("Client_ID,CPTID,Campaign Ask,New Notes\n0001,900002,1500.251,Normal note\nunknown,900003,-1,Other note\n");
    await assert.rejects(() => gateway.buildGatewayBatch("pvas", bad, f.deps), e => e.code === "whole-file-held" && e.exceptions.length >= 4 && e.exceptions.some(x => x.reason === "cptid-conflict"));
    assert.equal(f.calls.some(c => /Preview|Commit/.test(c.op)), false);
    const x = { ...file(), fileName: "numeric.xlsx", bytes: zipParts(workbookParts()).toString("base64"), parseSettings: { format: "xlsx", sheet: "Data", headerRow: 1 } };
    const b = await gateway.buildGatewayBatch("pvas", x, f.deps); assert.equal(b.batch.cells[0].value, "1500.25");
    const alias = file("Client_ID,Primary Solicitor\n0001,Unknown Staff\n"); alias.mapping = { Client_ID: "clientId", "Primary Solicitor": "primarySolicitor" }; alias.verifyCptidColumn = null; alias.noteResolutions = {};
    await assert.rejects(() => gateway.buildGatewayBatch("pvas", alias, f.deps), e => e.exceptions?.some(x => x.reason === "unknown-or-unreviewed-solicitor-alias"));
  });
  await check("virtual source date explicit, reserved literal header refused, historical notes never append", async () => {
    const f = fixtureDeps(), a = await gateway.buildGatewayBatch("pvas", file(), f.deps);
    assert.equal(a.batch.cells[1].noteDate, a.batch.sourceDate);
    const noDate = file(); delete noDate.mapping["@source-date"];
    await assert.rejects(() => gateway.buildGatewayBatch("pvas", noDate, f.deps), /note-date/);
    const historical = file("Client_ID,Historical Notes\n0001,Old historical event\n"); historical.mapping = { Client_ID: "clientId", "Historical Notes": "note", "@source-date": "noteDate" }; historical.verifyCptidColumn = null;
    await assert.rejects(() => gateway.buildGatewayBatch("pvas", historical, f.deps), /note-date-or-new/);
    await assert.rejects(() => gateway.buildGatewayBatch("pvas", file("Client_ID,@source-date\n0001,x\n"), f.deps), /reserved-source-date/);
  });
  await check("reparse/bind filename/bytes/sheet/declaration/mapping/date/resolution; late manual change invalidates old approval", async () => {
    const f = fixtureDeps(), base = await gateway.buildGatewayBatch("pvas", file(), f.deps);
    for (const changed of [{ ...file(), fileName: "different.csv" }, { ...file(), sourceDate: "2026-10-20" }, { ...file(), noteResolutions: {} }, file("Client_ID,CPTID,Campaign Ask,New Notes\n0001,900001,1500.26,New fictional visit\n")]) assert.notEqual(wire.directFileHash((await gateway.buildGatewayBatch("pvas", changed, f.deps)).batch), wire.directFileHash(base.batch));
    const route = gateway.directFileGateway("pvas", f.deps), p = await (await route(request({ op: "preview", file: file() }))).json();
    f.setManual(doc({ 900001: { solicitor: "", updatedAt: "2026-10-19", solicitorEdited: true } })); f.advance();
    const r = await route(request({ op: "commit", file: file(), approval: { previewHash: p.plan.previewHash, expiresAt: p.plan.expiresAt, proof: p.plan.proof } }));
    assert.equal(r.status, 503); assert.equal((await r.json()).requestId, ID); assert.equal(f.receipts.size, 0);
  });
  await check("malformed/foreign/hash/count/private replies never become committed in gateway OR independent UI boundary", async () => {
    for (const mutation of [() => ({}), r => ({ ...r, configured: false }), r => ({ ...r, requestId: "b".repeat(32) }), r => ({ ...r, client: "jag" }), r => ({ ...r, payloadHash: hex("f") }), r => ({ ...r, saved: 49 }), r => ({ ...r, __directPrivateV1: "NEVER PUBLIC" })]) {
      const f = fixtureDeps(), route = gateway.directFileGateway("pvas", f.deps), p = await (await route(request({ op: "preview", file: file() }))).json();
      const mock = { protocol: "direct-file-v1", requestId: ID, client: "pvas", status: "committed", saved: 2, held: 0, unchanged: 0, payloadHash: p.plan.payloadHash, previewHash: p.plan.previewHash, effect: "source-state-only", effectiveChanges: "not-asserted", publication: "not-requested" };
      const bad = mutation(mock);
      f.mutate((_, op) => op === "directFileCommit" ? { status: 200, body: bad } : null);
      const r = await route(request({ op: "commit", file: file(), approval: { previewHash: p.plan.previewHash, expiresAt: p.plan.expiresAt, proof: p.plan.proof } }));
      assert.equal(r.status, 503); const j = await r.json(); assert.equal(j.code, "unconfirmed"); assert.equal(j.requestId, ID); assert.equal(j.statusOp, "directFileStatus");
      assert.throws(() => confirmedDirectReceipt(bad, { client: "pvas", requestId: ID, payloadHash: p.plan.payloadHash, previewHash: p.plan.previewHash, cells: 2 }));
    }
  });
  await check("source transport exact endpoint/envelope, no redirects/retry, timeout and response cap", async () => {
    const env = { ENGAGE_SOURCE_IMPORT_URL: "https://fictional.invalid/api/source-import", PORTAL_WRITE_SECRET: secret }, sent = [];
    const fetcher = async (url, options) => { sent.push({ url, options, body: JSON.parse(options.body) }); return Response.json({ protocol: "direct-file-v1" }); };
    await directSourceCall("pvas", "directFilePreview", { batch: { client: "pvas" }, fileContext: {}, manualContext: {} }, fetcher, env);
    assert.deepEqual(Object.keys(sent[0].body).sort(), ["op", "batch", "fileContext", "manualContext"].sort());
    assert.equal(sent[0].body.client, undefined); assert.equal(sent[0].url, env.ENGAGE_SOURCE_IMPORT_URL);
    assert.equal(sent[0].options.redirect, "error"); assert.equal(sent[0].options.cache, "no-store"); assert.ok(sent[0].options.signal);
    await directSourceCall("pvas", "directFileStatus", { requestId: ID }, fetcher, env); assert.equal(sent[1].body.client, "pvas");
    let calls = 0;
    await assert.rejects(() => directSourceCall("pvas", "directFileCommit", {}, async () => { calls++; throw Error("lost reply"); }, env), e => e.unconfirmed === true); assert.equal(calls, 1);
    await assert.rejects(() => directSourceCall("pvas", "directFileState", {}, fetcher, { ...env, ENGAGE_SOURCE_IMPORT_URL: "https://fictional.invalid/api/portal-v2" }), /unconfigured/);
    let cancelled = false;
    const big = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(1_000_001)); }, cancel() { cancelled = true; } });
    await assert.rejects(() => readBoundedStream(big, 1000000, 100), /too-large/); assert.equal(cancelled, true);
    const hung = new ReadableStream({ pull() { return new Promise(() => {}); }, cancel() { cancelled = true; } });
    await assert.rejects(() => readBoundedStream(hung, 1000, 5)); // bounded synthetic deadline, not a polling loop.
  });
  await check("receipt status totals must be1..50 even without local expected count", async () => {
    for (const counts of [{ saved: 0, held: 0, unchanged: 0 }, { saved: 50, held: 1, unchanged: 0 }]) {
      const f = fixtureDeps(), raw = { protocol: "direct-file-v1", requestId: ID, client: "pvas", status: "committed", ...counts,
        payloadHash: hex("a"), previewHash: hex("b"), effect: "source-state-only", effectiveChanges: "not-asserted", publication: "not-requested" };
      f.mutate((_, op) => op === "directFileStatus" ? { status: 200, body: raw } : null);
      assert.equal((await gateway.directFileGateway("pvas", f.deps)(request({ op: "status", requestId: ID }))).status, 503);
      assert.throws(() => confirmedDirectReceipt(raw, { client: "pvas", requestId: ID }));
    }
  });
  await check("upload/read ten-integer-digit currency policy agrees at boundary, refusing broader backend range", async () => {
    const make = value => ({ ...file(`Client_ID,CPTID,Campaign Ask\n0001,900001,${value}\n`), mapping: { Client_ID: "clientId", "Campaign Ask": "ask" }, noteResolutions: {} });
    const f = fixtureDeps(), built = await gateway.buildGatewayBatch("pvas", make("9999999999.99"), f.deps);
    assert.equal(built.batch.cells[0].value, "9999999999.99");
    const value = { cptid: 900001, field: "ask", value: built.batch.cells[0].value, template: "fictional", authority_rev: hex("a"), request_id: ID, source_date: "2026-10-19", committed_at: "2026-10-19T12:00:00.000Z" };
    const state = { protocol: "direct-file-v1", status: "known", scope: "whole-client", complete: true, client: "pvas", revision: hex("d"), observedAt: "2026-10-19T12:00:00.000Z", values: [value], notes: [], note: "Source only" };
    assert.equal(reads.validateDirectState(state, "pvas").values[0].value, "9999999999.99");
    await assert.rejects(() => gateway.buildGatewayBatch("pvas", make("10000000000.00"), f.deps));
    assert.throws(() => reads.validateDirectState({ ...state, values: [{ ...value, value: "10000000000.00" }] }, "pvas"));
  });
  for (const client of strict.DIRECT_CLIENTS) {
    await check(`${client}: source gateway employee auth — matching dashboard, research/automation, isolation and CSRF`, async () => {
      const clients=["jag","csnf","pvas","wcbhc","baq"],cookies={};
      for(const c of clients){
        process.env[`${c.toUpperCase()}_DATA_PASSWORD`]=`fictional-${c}-employee-password`;
        process.env[`${c.toUpperCase()}_DATA_AUTH_SECRET`]=`fictional-${c}-auth-secret`;
        const auth=require(`../lib/${c}-data-auth.ts`);
        cookies[c]=`${auth[`${c.toUpperCase()}_DATA_COOKIE`]}=${await auth[`${c}DataCookieValue`]()}`
      }
      process.env.CRON_SECRET="fictional-existing-dashboard-automation-key";
      const f=fixtureDeps(),route=gateway.directFileGateway(client,f.deps);
      const post=(headers={},body={op:"capabilities"})=>route(new NextRequest(`http://localhost/api/${client}-data-direct-import`,{method:"POST",
        headers:{"content-type":"application/json",origin:"http://localhost",...headers},body:JSON.stringify(body)}));
      const denied=async(headers,status,code)=>{
        const before=f.calls.length,res=await post(headers);assert.equal(res.status,status);assert.equal(f.calls.length,before);
        const j=await res.json();if(code)assert.equal(j.code,code);
        if(status===401)assert.equal(j.dashboardLogin,`/${client}/data-dashboard/login`);
      };
      assert.equal((await post({cookie:cookies[client]})).status,200);
      assert.equal(f.calls.at(-1).client,client);
      await denied({},401,"dashboard-auth-required");
      await denied({cookie:`catapult_${client}_data_auth=invalid`},401,"dashboard-auth-required");
      for(const other of clients.filter(c=>c!==client))await denied({cookie:cookies[other]},401,"dashboard-auth-required");
      await denied({cookie:"catapult_jag_auth=fictional-study; catapult_jag_admin_auth=fictional-admin; catapult_board_review=fictional-board"},401,"dashboard-auth-required");
      assert.equal((await post({cookie:`catapult_research_auth=${COOKIE}`})).status,200);
      assert.equal((await post({"x-research-key":"fictional-local-password"})).status,200);
      assert.equal((await post({authorization:"Bearer fictional-existing-dashboard-automation-key"})).status,200);
      await denied({"x-research-key":"wrong"},401,"dashboard-auth-required");
      await denied({authorization:"Bearer wrong"},401,"dashboard-auth-required");
      await denied({cookie:cookies[client],origin:"https://cross-site.invalid"},403,"same-origin-required");
      await denied({cookie:cookies[client],origin:""},403,"same-origin-required");
      await denied({cookie:cookies[client],"sec-fetch-site":"cross-site"},403,"same-origin-required");
      await denied({cookie:cookies[client],"content-type":"text/plain"},413,"invalid-request-envelope");
      await denied({cookie:cookies[client],"content-length":"2900001"},413,"invalid-request-envelope");
      const before=f.calls.length;
      assert.equal((await post({cookie:cookies[client]},{op:"capabilities",client:clients.find(c=>c!==client)})).status,400);
      assert.equal(f.calls.length,before);
      assert.ok(f.calls.every(c=>c.client===client));
      const ui=fs.readFileSync(path.join(root,"components/direct-dashboard-upload.tsx"),"utf8");
      assert.equal(ui.includes("requires the existing research login in addition"),false);
      assert.ok(ui.includes("/${client}/data-dashboard/login"));
      assert.ok(ui.includes("Declared staff name"));assert.ok(ui.includes("!actor"));
      for(const c of clients){delete process.env[`${c.toUpperCase()}_DATA_PASSWORD`];delete process.env[`${c.toUpperCase()}_DATA_AUTH_SECRET`];}
      delete process.env.CRON_SECRET;
    });
    await check(`${client}: export compatibility — all registered current tables, index/record/report, filters/order/financial/OFF`, async () => {
      const dir=fs.mkdtempSync(path.join(os.tmpdir(),`export-${client}-`));process.env[`${client.toUpperCase()}_LOCAL_DIR`]=dir;
      const idx=(cptid,name)=>({cptid,name,lifetime:321,gifts:1,largest:321,first:"2020-01-01",last:"2026-01-01",years:1,band:"",capMin:1000000,ds:"A",capacity:"$1M"});
      const p={...idx(900001,"Fictional A"),rating:500000,ask:500000,solicitor:"Access staff",solicitor2:"",donorType:"Individual",active:true,get:123};
      const q={...p,...idx(900002,"Fictional B"),ask:250000};
      const raw={asOf:"2026-10-19",index:[p,q],records:Object.fromEntries([p,q].map(p=>[p.cptid,{...p,contact:{city:"Test"},gifts:[{date:"2026-01-01",amount:321}],summary:{...p},portfolio:{ask:p.ask,solicitor:"Access staff",secondary:"Access secondary"}}]))};
      fs.writeFileSync(path.join(dir,"records.json"),JSON.stringify(raw));
      let manual=doc();const save=()=>fs.writeFileSync(path.join(dir,"tracking.json"),JSON.stringify(manual));save();
      const financial={byCampaign:[{campaign:"General",gifts:1,total:321}],pledges:[{...p,amount:700,remaining:500}],transactions:[{...p,date:"2026-01-01",amount:321}]};
      const snapshot={client,asOf:raw.asOf,pool:[p,q],portfolio:[p,q],top:[p,q],board:[p,q],committed:[{...p,ask:123}],highWealth:[p,q],midLevel:[p],legacy:[p],lapsed:[p],
        highWealthCount:2,midLevelCount:1,legacyCount:1,lapsedCount:1,unrated:[{name:"Pipeline",type:"Trust",note:"Not a source note"}],notSeated:[{name:"Unseated",reason:"Review"}],
        fys:[{fy:2026,total:321,gifts:1,donors:1}],retention:[{fy:2026,rate:50,new:1}],stages:[{stage:"Individual",gifts:1,total:321}],givebutter:financial,
        donorType:[["Individual",2]],flags:{Friend:2},orgTypes:[["Trust",1]],health:{},batches:[{batch:"A",people:[p]}],
        feasibility:{byTier:[{tier:"A",prospects:1,completed:1,consider:1}],people:[{...p,tier:"A",consider:true,multiYear:false,leadership:false,introduce:true}]},
        alumni:{bySchool:[["Test School",1]],topZips:[["00001",1]]}};
      fs.writeFileSync(path.join(dir,"snapshot.json"),JSON.stringify(snapshot));
      enabled=true;sql={updates:[],prospects:[],gifts:[],batches:[]};
      const v=(field,value)=>({cptid:900001,field,value,template:"fictional",authority_rev:hex("a"),request_id:ID,source_date:"2026-10-19",committed_at:"2026-10-19T12:00:00.000Z"});
      const note={cptid:900001,event_key:hex("b"),body:"New source note — never manual activity",note_date:"2026-10-19",template:"fictional",request_id:ID,source_date:"2026-10-19",committed_at:"2026-10-19T12:00:00.000Z",declared_actor:"Declared test actor",file_name:"fictional.csv",file_digest:hex("c"),authority_rev:hex("a")};
      source={protocol:"direct-file-v1",status:"known",scope:"whole-client",complete:true,client,revision:hex("d"),observedAt:"2026-10-19T12:00:00.000Z",values:[v("ask","0.00"),v("primarySolicitor","Source staff")],notes:[note],note:"Source only"};
      transport=async()=>Response.json(source);process.env.ENGAGE_SOURCE_IMPORT_URL="https://fictional.invalid/api/source-import";process.env.PORTAL_WRITE_SECRET=secret;
      const route=require(`../app/api/${client}-data-export/route.tsx`);
      const post=(intent,format="xlsx",extra={})=>route.POST(new NextRequest(`http://localhost/api/${client}-data-export`,{method:"POST",headers:{cookie:`catapult_research_auth=${COOKIE}`},body:JSON.stringify({format,title:"Fictional report",cols:[{label:"FORGED"}],sections:[{rows:[["FORGED"]]}],intent,...extra})}));
      const askTable=["jag","csnf"].includes(client)?"GiftChartTab.2":"Portfolio.1";
      const parameters={goal:9000000};
      assert.equal((await post({kind:"table",table:askTable,parameters})).status,200);
      assert.equal(JSON.stringify(renderedXlsx).includes("FORGED"),false);
      if(!["jag","csnf"].includes(client)){
        assert.equal(renderedXlsx.sections[0].rows[0][3],0);
        assert.equal(renderedXlsx.sections[0].rows[0][1],"Source staff");
        const filtered={kind:"table",table:askTable,search:"Fictional",sort:{key:"name",dir:-1}};
        assert.equal((await post(filtered)).status,200);assert.deepEqual(renderedXlsx.sections[0].rows.map(r=>r[0]),["Fictional B","Fictional A"]);
        const before=JSON.stringify(renderedXlsx.cols);assert.equal((await post({...filtered,search:"Fictional A"})).status,200);assert.equal(renderedXlsx.sections[0].rows.length,1);assert.equal(JSON.stringify(renderedXlsx.cols),before);
        assert.equal((await post({...filtered,sort:{key:"madeUp",dir:1}})).status,400);
      }
      assert.equal((await post({kind:"table",table:"Pyramid.0",search:"Fictional",sort:{key:"name",dir:-1}})).status,200);
      assert.deepEqual(renderedXlsx.sections[0].rows.map(r=>r[0]),["Fictional B","Fictional A"]);
      assert.equal((await post({kind:"table",table:"Prospects.0",parameters:{pool:0,assignment:"unassigned"}})).status,200);assert.equal(renderedXlsx.sections[0].rows.length,0);
      assert.equal((await post({kind:"table",table:"Prospects.0",parameters:{pool:0,assignment:"assigned"}})).status,200);assert.equal(renderedXlsx.sections[0].rows.length,2);
      assert.equal((await post({kind:"index",ids:[900002,900001]})).status,200);
      assert.deepEqual(renderedXlsx.sections[0].rows.map(r=>r[0]),[900002,900001]);assert.equal(JSON.stringify(renderedXlsx).includes("Source staff"),true);
      assert.equal((await post({kind:"record",id:900001})).status,200);
      const recordXlsx=structuredClone(renderedXlsx);assert.ok(recordXlsx.sections.find(s=>s.heading==="Profile").rows.some(r=>r[0]==="Campaign ask"&&r[1]==="$0"));
      assert.ok(recordXlsx.sections.some(s=>s.heading?.startsWith("Imported source notes")&&JSON.stringify(s).includes("Declared test actor")));
      assert.equal(recordXlsx.sections.some(s=>s.heading?.startsWith("Campaign tracking")&&JSON.stringify(s).includes(note.body)),false);
      assert.equal((await post({kind:"record",id:900001},"pdf")).status,200);assert.ok(JSON.stringify(renderedPdf).includes(note.body));assert.ok(JSON.stringify(renderedPdf).includes("$0"));
      const query={fields:["name","solicitor","campaignReceived"],filters:[],sort:{field:"name",dir:1}};
      assert.equal((await post({kind:"report",query})).status,200);assert.deepEqual(renderedXlsx.cols.map(c=>c.label),["Name","Primary solicitor","Campaign gifts received"]);assert.ok(renderedXlsx.sections[0].rows.some(r=>r[1]==="Source staff"));
      assert.equal((await post({kind:"report",query:{...query,fields:["name","notAField"]}})).status,400);
      // Exercise all migrated finite table selectors, not a new fault matrix. Financial models use unchanged source bytes.
      const modelFile=fs.readFileSync(path.join(root,`lib/portal-v2/${client}-export-model.ts`),"utf8"),tables=[...modelFile.matchAll(/case "([^"]+)":/g)].map(m=>m[1]);
      const seating=require(`../lib/${client}-gc2p.ts`).seatGc2p(9000000,snapshot.pool,manual,[]);
      for(const table of tables){
        const par=table.startsWith("GiftChartTab.")?{goal:9000000,...(table==="GiftChartTab.1"?{level:seating.seated[0].level}:{})}:table==="Prospects.0"?{pool:0,assignment:"all"}:{};
        const response=await post({kind:"table",table,parameters:par});assert.equal(response.status,200,`${client}/${table}: ${response.status===200?"":await response.text()}`);
        assert.equal(renderedXlsx.sections[0].rows.every(r=>r.length===renderedXlsx.cols.length),true);
        if(table==="Overview.0")assert.ok(renderedXlsx.sections[0].rows.some(r=>r.includes(321)));
        if(table==="Givebutter.1")assert.ok(renderedXlsx.sections[0].rows.some(r=>r.includes(700)));
        if(table==="Givebutter.2")assert.ok(renderedXlsx.sections[0].rows.some(r=>r.includes(321)));
      }
      manual=doc({900001:{status:"Active",solicitor:"",solicitor2:"",solicitorEdited:true,updatedAt:"2026-10-19",by:"Manual staff"}});save();
      sql.updates=[{id:1,cptid:900001,field:"ask",new_value:"",old_value:"500000"}];
      assert.equal((await post({kind:"record",id:900001})).status,200);const profile=renderedXlsx.sections.find(s=>s.heading==="Profile").rows;
      assert.equal(profile.some(r=>r[0]==="Campaign ask"),false);assert.ok(profile.some(r=>r[0]==="Primary solicitor"&&r[1]==="Unassigned"));
      assert.equal((await post({kind:"index",ids:[123]})).status,400);
      assert.equal((await post({kind:"table",table:"Unknown.0"})).status,400);
      assert.equal((await post(undefined)).status,400);
      const good=source;source={configured:false};assert.equal((await post({kind:"record",id:900001})).status,503);source=good;
      enabled=false;assert.equal((await post(undefined)).status,200);assert.equal(renderedXlsx.cols[0].label,"FORGED");
      assert.deepEqual(manual.activity,[]);enabled=false;transport=null;delete process.env[`${client.toUpperCase()}_LOCAL_DIR`];fs.rmSync(dir,{recursive:true,force:true});
    });
    await check(`${client}: actual records loader/routes and server report retain source0, late manual clear, unknown refusal`, async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), `bounded-${client}-`));
      process.env[`${client.toUpperCase()}_LOCAL_DIR`] = dir;
      const idx = { cptid: 900001, name: "Fictional donor", lifetime: 100, gifts: 1, largest: 100, last: "2026-01-01", years: 1, band: "", capMin: 0 };
      const raw = { asOf: "2026-10-19", index: [idx], records: { 900001: { ...idx, contact: {}, gifts: [], summary: { ...idx }, portfolio: { ask: 500, solicitor: "Access staff", secondary: "Access secondary" } } } };
      fs.writeFileSync(path.join(dir, "records.json"), JSON.stringify(raw));
      let manual = doc();
      const save = () => fs.writeFileSync(path.join(dir, "tracking.json"), JSON.stringify(manual));
      save(); enabled = true; sql = { updates: [], prospects: [], gifts: [], batches: [] };
      const v = (field, value) => ({ cptid: 900001, field, value, template: "fictional", authority_rev: hex("a"), request_id: ID, source_date: "2026-10-19", committed_at: "2026-10-19T12:00:00.000Z" });
      source = { protocol: "direct-file-v1", status: "known", scope: "whole-client", complete: true, client, revision: hex("d"), observedAt: "2026-10-19T12:00:00.000Z", values: [v("ask", "0.00"), v("primarySolicitor", "Source staff"), v("secondarySolicitor", "Source secondary")], notes: [], note: "Source only" };
      transport = async () => Response.json(source);
      process.env.ENGAGE_SOURCE_IMPORT_URL = "https://fictional.invalid/api/source-import"; process.env.PORTAL_WRITE_SECRET = secret;
      const names = { pvas: "Pvas", jag: "Jag", csnf: "Csnf", wcbhc: "Wcbhc", baq: "Baq" };
      const load = require(`../lib/${client}-data-store.ts`)[`get${names[client]}Records`];
      const { recordsRoute } = require("../lib/portal-v2/records-route.ts");
      const { reportRoute } = require("../lib/portal-v2/report-route.ts");
      const route = recordsRoute(client, async () => true, load, async () => manual, async () => sql);
      const get = suffix => route.GET(new NextRequest(`http://localhost/api/${client}-data-records${suffix}`));
      let r = await get("?id=900001"); assert.equal(r.status, 200); let record = await r.json();
      assert.equal(record.portfolio.ask, 0); assert.equal(record.assignment.solicitor, "Source staff"); assert.equal(record.assignment.solicitor2, "Source secondary");
      const index = await (await get("")).json(); assert.equal(index.index[0].solicitor, "Source staff");
      let xlsxRows;
      const report = reportRoute(client, async () => true, load, async () => manual,
        { clientName: "Fictional", filePrefix: "QA", build: async body => { xlsxRows = body.sections.flatMap(s => s.rows); return Buffer.from("synthetic workbook builder receipt"); } }, async () => sql);
      const post = format => report.POST(new NextRequest("http://localhost/report", { method: "POST", body: JSON.stringify({ query: { fields: ["name", "solicitor", "solicitor2"], filters: [] }, format }) }));
      r = await post(); assert.equal(r.status, 200); assert.equal((await r.json()).rows[0].solicitor, "Source staff");
      assert.equal((await post("xlsx")).status, 200); assert.ok(xlsxRows[0].includes("Source staff"));
      sql = { ...sql, updates: [{ id: 1, cptid: 900001, field: "ask", new_value: null, old_value: "0.00" }, { id: 2, cptid: 900001, field: "solicitor2", new_value: "", old_value: null }] };
      manual = doc({ 900001: { solicitor: "", solicitorEdited: true, updatedAt: "2026-10-19" } }); save();
      record = await (await get("?id=900001")).json();
      assert.equal(record.campaignAsk.askBlank, true); assert.equal(record.assignment.solicitor, ""); assert.equal(record.assignment.solicitor2, "");
      const cleared = (await (await post()).json()).rows[0]; assert.equal(cleared.solicitor, ""); assert.equal(cleared.solicitor2, "");
      const good = source; source = { configured: false };
      assert.equal((await get("?id=900001")).status, 503); assert.equal((await post()).status, 503);
      source = good;
      // Failure of the second strict manual read also refuses a report without assignment columns.
      const fails = reportRoute(client, async () => true, load, async () => { throw Error("unknown"); }, undefined, async () => sql);
      // Enabled mode reads the authoritative strict owner, not this legacy callback; corrupt it there.
      fs.writeFileSync(path.join(dir, "tracking.json"), "{");
      assert.equal((await fails.POST(new NextRequest("http://localhost/report", { method: "POST", body: JSON.stringify({ query: { fields: ["name"] } }) }))).status, 503);
      enabled = false; transport = null; delete process.env[`${client.toUpperCase()}_LOCAL_DIR`]; fs.rmSync(dir, { recursive: true, force: true });
    });
    await check(`${client}: complete source layer only,31k Access baseline, source0/manual0+clear/withdrawal/unknown`, async () => {
      const base = { records: { 900001: { cptid: 900001, portfolio: { ask: 500, solicitor: "Access staff", secondary: "Access secondary" } } }, index: Array.from({ length: 31000 }, (_, i) => ({ cptid: i + 1, name: "Fictional" })) };
      const values = [{ cptid: 900001, field: "ask", value: "0.00", template: "fictional-portfolio", authority_rev: hex("a"), request_id: ID, source_date: "2026-10-19", committed_at: "2026-10-19T12:00:00.000Z" }, { cptid: 900001, field: "primarySolicitor", value: "Source staff", template: "fictional-portfolio", authority_rev: hex("a"), request_id: ID, source_date: "2026-10-19", committed_at: "2026-10-19T12:00:00.000Z" }];
      const state = { protocol: "direct-file-v1", status: "known", scope: "whole-client", complete: true, client, revision: hex("d"), observedAt: "2026-10-19T12:00:00.000Z", values, notes: [], note: "Source only" };
      let d = doc(), manualSql = { updates: [], prospects: [] };
      const deps = { enabled: () => true, state: async () => state, sql: async () => manualSql, tracking: c => track(c, d) };
      const result = await reads.directData(client, base, "records", deps);
      assert.equal(result.records[900001].portfolio.ask, 0); assert.equal(result.records[900001].portfolio.directAskPresent, true);
      assert.equal(result.index.length, 31000); assert.equal(base.records[900001].portfolio.ask, 500);
      const o = buildOverlay([]), resolved = effectiveAsk(900001, o, new Map(), id => result.records[id].portfolio.ask, id => result.records[id].portfolio.directAskPresent);
      assert.equal(campaignAskAmount({ ...resolved, rating: 10000 }), 0);
      manualSql = { updates: [{ id: 1, cptid: 900001, field: "ask", new_value: null, old_value: "0.00" }], prospects: [] };
      d = doc({ 900001: { solicitor: "", updatedAt: "2026-10-19", solicitorEdited: true } });
      const cleared = await reads.directData(client, base, "records", deps);
      assert.equal(cleared.records[900001].portfolio.ask, null); assert.equal(cleared.records[900001].portfolio.solicitor, "");
      const manual = effectiveAsk(900001, buildOverlay(manualSql.updates), askEdits(manualSql.updates), () => 500);
      assert.equal(campaignAskAmount({ ...manual, rating: 10000 }), 0);
      state.values = []; const withdrawn = await reads.directData(client, base, "records", deps); assert.equal(withdrawn.records[900001].portfolio.ask, 500);
      await assert.rejects(() => reads.directData(client, base, "records", { ...deps, state: async () => ({ configured: false }) }));
      await assert.rejects(() => reads.directData(client, base, "records", { ...deps, tracking: async () => ({ kind: "unavailable", reason: "read-failed" }) }));
      await assert.rejects(() => reads.directData(client, base, "records", { ...deps, sql: async () => ({ updates: null, prospects: [] }) }));
    });
    await check(`${client}: server/browser financial canary: committed/gift/pledge/Stewardship/Givebutter/unknown arrays byte-identical`, async () => {
      const amount = 765432, person = { cptid: 900001, ask: amount, rating: 900000, active: true, solicitor: "Access" };
      const base = { pool: [{ ...person }], portfolio: [{ ...person }], board: [{ ...person }, { ...person, active: false }],
        committed: [{ ...person }], gifts: [{ ...person, amount: 42 }], pledges: [{ ...person }], stewardship: [{ ...person }], givebutter: [{ ...person }], unrelated: [{ ...person }] };
      const frozen = JSON.stringify(base), boardCampaign = !["wcbhc", "baq"].includes(client);
      for (const ask of ["0.00", "500.00"]) {
        const view = { revision: hex("d"), values: [{ cptid: 900001, field: "ask", value: ask, source: true }] };
        const browser = directSnapshot(base, view, boardCampaign);
        assert.equal(browser.pool[0].ask, Number(ask)); assert.equal(browser.portfolio[0].ask, Number(ask));
        for (const key of ["committed", "gifts", "pledges", "stewardship", "givebutter", "unrelated"]) assert.equal(JSON.stringify(browser[key]), JSON.stringify(base[key]), key);
        assert.equal(browser.board[0].ask, boardCampaign ? Number(ask) : amount); assert.equal(browser.board[1].ask, amount);
        const state = { client, revision: hex("d"), values: view.values.map(x => ({ ...x, value: ask })), notes: [] };
        const observed = { state, tracking: { kind: "present", revision: hex("a"), document: doc() }, sql: { updates: [], prospects: [] } };
        assert.deepEqual(reads.composeDirectData(base, "snapshot", observed), { ...browser, directSourceRevision: hex("d") });
      }
      assert.equal(JSON.stringify(base), frozen);
    });
    await check(`${client}: raw tracking prospects/activity remain unchanged; GET->unrelated status save never promotes source`, async () => {
      const raw = doc({ 900001: { status: "Active", solicitorEdited: false, updatedAt: "" } }, [{ cptid: 900001, date: "2026-10-19", note: "Manual history" }]);
      const t = await track(client, raw), state = { protocol: "direct-file-v1", status: "known", scope: "whole-client", complete: true, client, revision: hex("d"), observedAt: "2026-10-19T12:00:00.000Z",
        values: [{ cptid: 900001, field: "primarySolicitor", value: "Source staff", template: "fictional", authority_rev: hex("a"), request_id: ID, source_date: "2026-10-19", committed_at: "2026-10-19T12:00:00.000Z" }], notes: [], note: "Source only" };
      const view = await reads.directTrackingView(client, raw, { enabled: () => true, state: async () => state, tracking: async () => t, sql: async () => ({ updates: [], prospects: [] }) });
      assert.deepEqual(view.prospects, raw.prospects); assert.deepEqual(view.activity, raw.activity);
      assert.equal(Object.hasOwn(view.prospects[900001], "solicitor"), false);
      const payload = { type: "status", status: "Active", ...manualAssignmentPatch("Source staff", "Source secondary", false, false) };
      assert.equal(Object.hasOwn(payload, "solicitor"), false); assert.equal(Object.hasOwn(payload, "solicitor2"), false);
      assert.deepEqual(manualAssignmentPatch("", "", true, true), { solicitor: "", solicitor2: "" });
    });
  }
  await check("actual trackingRoute GET->unrelated save preserves no-source manual objects and explicit clear", async () => {
    const client = "pvas", dir = fs.mkdtempSync(path.join(os.tmpdir(), "bounded-tracking-")); process.env.PVAS_LOCAL_DIR = dir;
    enabled = true; sql = { updates: [], prospects: [] };
    const value = { cptid: 900001, field: "primarySolicitor", value: "Source staff", template: "fictional", authority_rev: hex("a"), request_id: ID, source_date: "2026-10-19", committed_at: "2026-10-19T12:00:00.000Z" };
    source = { protocol: "direct-file-v1", status: "known", scope: "whole-client", complete: true, client, revision: hex("d"), observedAt: "2026-10-19T12:00:00.000Z", values: [value], notes: [], note: "Source only" };
    transport = async () => Response.json(source);
    process.env.ENGAGE_SOURCE_IMPORT_URL = "https://fictional.invalid/api/source-import"; process.env.PORTAL_WRITE_SECRET = secret;
    let stored = doc(); const save = async t => { stored = structuredClone(t); fs.writeFileSync(path.join(dir, "tracking.json"), JSON.stringify(t)); };
    await save(stored);
    const { trackingRoute } = require("../lib/tracking-route.ts"), route = trackingRoute(client, async () => true, async () => structuredClone(stored), save);
    const get = await route.GET(new NextRequest("http://localhost/api/pvas-data-tracking")); const view = await get.json();
    assert.deepEqual(view.prospects, {}); assert.ok(view.directAssignments);
    const update = async patch => route.POST(new NextRequest("http://localhost/api/pvas-data-tracking", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "status", cptid: 900001, status: "Active", by: "Fictional staff", ...patch }) }));
    assert.equal((await update(manualAssignmentPatch("Source staff", "", false, false))).status, 200);
    assert.equal(Object.hasOwn(stored.prospects[900001], "solicitor"), false); assert.equal(stored.prospects[900001].solicitorEdited, false);
    assert.equal(JSON.stringify(stored).includes("Source staff"), false); assert.equal(JSON.stringify(stored).includes("directAssignments"), false);
    assert.equal((await update(manualAssignmentPatch("", "", true, true))).status, 200);
    assert.equal(stored.prospects[900001].solicitor, ""); assert.equal(stored.prospects[900001].solicitorEdited, true);
    enabled = false; transport = null; delete process.env.PVAS_LOCAL_DIR; fs.rmSync(dir, { recursive: true, force: true });
  });
  console.log(`1..${checks}`);
})().catch(e => { console.error(e); process.exitCode = 1; });
