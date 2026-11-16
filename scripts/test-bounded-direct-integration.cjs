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
  const calls = [], receipts = new Map(); let manual = doc(), inventory = null, replyMutation, now = 1_793_000_000;
  const caps = { protocol: "direct-file-v1", client: "pvas", status: "known", reason: null, applyEnabled: true,
    templates: [{ template: "fictional-portfolio", revision: hex("a"), fields: ["ask", "primarySolicitor", "secondarySolicitor", "note"], cutovers: { ask: "2026-01-01", note: "2026-01-01" } }], solicitorAliases: { status: "unavailable", revision: null, entries: [] } };
  const deps = { secret: () => secret, now: () => now, enabled: () => true, inventory: async () => inventory, tracking: c => track(c, manual),
    call: async (client, op, body = {}) => {
      calls.push({ client, op, body });
      if (replyMutation) { const mutated = replyMutation(client, op, body); if (mutated) return mutated; }
      if (op === "directFileCapabilities" || op === "directFileResolve") {
        if (inventory) {
          const context=body.solicitorContext,base={op,client,...body};delete base.solicitorContext;
          assert.equal(context.payload.operationHash,wire.directFileHash(base));
          assert.equal(context.payload.client,client);assert.equal(context.payload.revision,inventory.revision);
          assert.equal(context.payload.expiresAt-context.payload.issuedAt,120);
          assert.equal(context.signature,crypto.createHmac("sha256",secret).update(wire.DIRECT_SOLICITOR_DOMAIN+wire.directFileHash(context.payload)).digest("hex"));
        } else assert.equal(body.solicitorContext,undefined);
      }
      const aliases=inventory?wire.compileDirectSolicitors(inventory.names):caps.solicitorAliases;
      if (op === "directFileCapabilities") return { status: 200, body: { ...caps, client, solicitorAliases:aliases } };
      if (op === "directFileResolve") return { status: 200, body: { protocol: "direct-file-v1", status: "known", client, template: body.template, registrationRevision: hex("a"), solicitorAliases:aliases,
        matches: body.ids.map(x => { const cptid = /^0\d{3}$/.test(x.clientId) && Number(x.clientId) >= 1 && Number(x.clientId) <= 500 ? 900000 + Number(x.clientId) : null; return { ...x, cptid, reason: cptid !== null ? (x.verifyCptid !== null && x.verifyCptid !== cptid ? "cptid-conflict" : null) : "unknown-id" }; }) } };
      if (op === "directFileStatus") return { status: 200, body: receipts.get(body.requestId) ?? { protocol: "direct-file-v1", status: "not-found", client, requestId: body.requestId, note: "May be in flight; do not resend." } };
      assert.ok(["directFilePreview", "directFileCommit"].includes(op));
      assert.deepEqual(Object.keys(body).sort(), (op === "directFileCommit" ? ["approval", "batch", "fileContext", "manualContext"] : ["batch", "fileContext", "manualContext"]).sort());
      const b = body.batch, m = body.manualContext;
      assert.match(b.requestId, /^[a-f0-9]{32}$/); // actual backend boundary, NOT a permissive UUID mock.
      assert.equal(b.mappingDigest, wire.directFileHash({ parse: b.parse, mapping: b.mapping }));
      assert.equal(b.fileContextHash, wire.directFileHash(body.fileContext));
      assert.equal(m.payload.batchHash, wire.directFileHash(b));
      assert.equal(m.signature, crypto.createHmac("sha256", secret).update(wire.DIRECT_MANUAL_DOMAIN + JSON.stringify(m.payload)).digest("hex"));
      assert.deepEqual(Object.keys(m.payload), [...wire.DIRECT_MANUAL_KEYS,...(inventory?["solicitorAliases"]:[])]);
      if(inventory)assert.deepEqual(m.payload.solicitorAliases,inventory);
      assert.equal(m.payload.phase, op === "directFileCommit" ? "commit" : "preview");
      assert.equal(m.payload.observations[0].notesCoverage, "tracking-only");
      assert.equal(m.payload.observations[0].historicalRevision, null);
      const payloadHash = wire.directFileHash(b), previewHash = wire.directFileHash([b, m.payload.observations, m.payload.solicitorAliases??null]);
      if (op === "directFilePreview") return { status: 200, body: { protocol: "direct-file-v1", status: "previewed", plan: { payloadHash, previewHash, proof: hex("b"), expiresAt: now * 1000 + 60000,
        decisions: b.cells.map(c => {
          if(["primarySolicitor","secondarySolicitor"].includes(c.field)&&c.value) {
            const entry=aliases.entries.find(e=>e.alias===wire.normalizeDirectSolicitor(c.value)),reason=aliases.status!=="known"?"solicitor-aliases-unavailable":!entry?"unknown-solicitor":!entry.canonical?"ambiguous-solicitor":null;
            return {ordinal:c.ordinal,cptid:c.cptid,field:c.field,before:null,after:reason?c.value:entry.canonical,action:reason?"held":"set",reason,eventKey:null};
          }
          return ({ ordinal: c.ordinal, cptid: c.cptid, field: c.field, before: null, after: c.value, action: c.field === "note" && c.noteResolution !== "new-event" ? "held" : c.value ? (c.field === "note" ? "append" : "set") : "unchanged", reason: c.field === "note" && c.noteResolution !== "new-event" ? "historical-coverage-incomplete" : null, eventKey: c.field === "note" ? hex("c") : null }); }) } } };
      if (body.approval.previewHash !== previewHash) return { status: 409, body: { code: "preview-changed" } };
      const receipt = { protocol: "direct-file-v1", requestId: b.requestId, client, status: "committed", saved: b.cells.length, held: 0, unchanged: 0, payloadHash, previewHash, effect: "source-state-only", effectiveChanges: "not-asserted", publication: "not-requested", replay: false };
      receipts.set(b.requestId, receipt); return { status: 200, body: receipt };
    } };
  return { deps, calls, receipts, setManual: d => { manual = d; }, setInventory: names => {inventory=names===null?null:{revision:wire.compileDirectSolicitors(names).revision,names};}, mutate: fn => { replyMutation = fn; }, advance: () => now++ };
}
function request(body, headers = {}) { return new NextRequest("http://localhost:3100/api/pvas-data-direct-import", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100", cookie: `catapult_research_auth=${COOKIE}`, ...headers }, body: JSON.stringify(body) }); }
let checks = 0;
async function check(name, run) { if(process.env.DIRECT_SOLICITORS_CAPACITY_ONLY==="1"&&!/solicitor capacity|whole-file preview|receipt status totals|backend lexical identity|source gateway employee auth|complete source layer only|raw tracking prospects/.test(name))return; if(process.env.MONTHLY_ONLY && (!name.includes("monthly campaign") || (process.env.MONTHLY_ONLY==="parser" && !name.includes("monthly campaign parser"))))return; if(process.env.DIRECT_STATE_IDS_ONLY==="1" && !name.includes("SQL manual state row-id boundary"))return; if(process.env.DIRECT_AUTH_ONLY==="1" && !name.includes("source gateway employee auth"))return; if(process.env.DIRECT_EXPORT_ONLY==="1" && !name.includes("export compatibility"))return; await run(); console.log(`ok ${++checks} - ${name}`); }
(async () => {
  console.log("# MOCK backend wire / NO SQL / NO network / original website code");
  await check("monthly campaign parser: exact cash, original bytes, stable IDs, dates, unsupported rows and unchanged notes quotas", async () => {
    const monthly=require("../lib/portal-v2/monthly-file.server.ts"),pub=require("../lib/portal-v2/monthly-wire.ts"),parser=require("../lib/portal-v2/source-file-preview.ts");
    const make=(csv="Client_ID,Transaction_ID,Amount,Date,Type,Status,Currency\n0001,T-01,1500.25,2026-11-10,gift,received,USD\n")=>({bytes:encode(csv),fileName:"cash.csv",requestId:ID,source:"Fictional CRM",sourceDate:"2026-11-15",period:"2026-11",actor:"Fictional staff",campaignOnly:true,receivedUsdCash:true,parseSettings:{format:"csv"},dateSystem:"iso",mapping:{Client_ID:"clientId",Transaction_ID:"transactionId",Amount:"amount",Date:"date",Type:"kind",Status:"status",Currency:"currency"}});
    const ids=[{clientId:"0001",cptid:900001,name:"Fictional donor"}],a=monthly.buildMonthlyRequest("jag",monthly.parseMonthlyFile(make()),ids);
    assert.equal(a.request.rows[0].amount,"1500.25");assert.equal(a.request.rows[0].clientId,"0001");assert.equal(a.request.campaignOnly,true);assert.equal(a.request.rows[0].status,"received");
    assert.equal(a.request.fileDigest,crypto.createHash("sha256").update(Buffer.from(make().bytes,"base64")).digest("hex"));
    assert.equal(a.payloadHash,crypto.createHash("sha256").update(pub.monthlyCanonical(a.request)).digest("hex"));
    for(const value of ["1.001","1,50","-1","0","1e3","9999999999999.00"])assert.throws(()=>monthly.monthlyMoney(value,false));
    assert.equal(monthly.monthlyMoney("$1,500.25",false),"1500.25");assert.equal(monthly.monthlyMoney("999999999999.99",true),"999999999999.99");
    for(const value of ["NaN","-0","1.001","1e999"])assert.throws(()=>monthly.monthlyMoney(value,true));
    for(const changed of [{...make(),fileName:"renamed.csv"},{...make(),sourceDate:"2026-11-14"},{...make(),source:"Different CRM"}])assert.notEqual(monthly.buildMonthlyRequest("jag",changed,ids).payloadHash,a.payloadHash);
    for(const csv of [
      "Client_ID,Transaction_ID,Amount,Date,Type,Status,Currency\n0001,T-01,100.00,2026-11-10,pledge,received,USD\n",
      "Client_ID,Transaction_ID,Amount,Date,Type,Status,Currency\n0001,T-01,100.00,2026-11-10,gift,pending,USD\n",
      "Client_ID,Transaction_ID,Amount,Date,Type,Status,Currency\n0001,T-01,100.00,2026-11-10,gift,received,CAD\n",
      "Client_ID,Transaction_ID,Amount,Date,Type,Status,Currency\n0001,T-01,100.00,2026-10-10,gift,received,USD\n",
      "Client_ID,Transaction_ID,Amount,Date,Type,Status,Currency\n0001,,100.00,2026-11-10,gift,received,USD\n",
      "Client_ID,Transaction_ID,Amount,Date,Type,Status,Currency\n1,T-01,100.00,2026-11-10,gift,received,USD\n",
      "Client_ID,Transaction_ID,Amount,Date,Type,Status,Currency\n,T-01,100.00,2026-11-10,gift,received,USD\n"
    ])assert.throws(()=>monthly.buildMonthlyRequest("jag",make(csv),ids),e=>e.exceptions.length===1);
    assert.throws(()=>monthly.buildMonthlyRequest("jag",make(),[...ids,{clientId:"0001",cptid:900002,name:"Ambiguous"}]),e=>e.exceptions[0].reason.includes("ambiguous"));
    assert.throws(()=>monthly.parseMonthlyFile({...make(),receivedUsdCash:false}));
    assert.throws(()=>monthly.buildMonthlyRequest("jag",make("Client_ID,Transaction_ID,Amount,Date,Type,Status,Currency,cptid\n0001,T-01,100.00,2026-11-10,gift,received,USD,900002\n"),ids),/Map supplied CPTID/);
    assert.throws(()=>monthly.buildMonthlyRequest("jag",{...make(),mapping:{...make().mapping,Type:""}},ids),/Map the kind/);
    const twice=make(Buffer.from(make().bytes,"base64").toString().trimEnd()+"\n0001,T-01,1500.25,2026-11-10,gift,received,USD\n");
    assert.throws(()=>monthly.buildMonthlyRequest("jag",twice,ids),e=>e.exceptions[0].reason.includes("Duplicate"));
    const many=make("Client_ID,Transaction_ID,Amount,Date,Type,Status,Currency\n"+Array.from({length:1000},(_,i)=>`0001,T-${i},1.01,2026-11-10,gift,received,USD`).join("\n"));
    assert.equal(monthly.buildMonthlyRequest("jag",many,ids).request.rows.length,1000);
    assert.throws(()=>parser.inspectSourceFile(many.bytes),/500/);
    assert.throws(()=>monthly.buildMonthlyRequest("jag",{...many,bytes:encode(Buffer.from(many.bytes,"base64").toString()+"\n0001,overflow,1.01,2026-11-10,gift,received,USD")},ids),/1000/);
    assert.equal(monthly.monthlyTransactionDate("46336",true,"excel1900"),"2026-11-10");
    for(const v of ["60","46336.5"])assert.throws(()=>monthly.monthlyTransactionDate(v,true,"excel1900"));
    assert.throws(()=>monthly.monthlyTransactionDate("46336",true,"iso"));assert.throws(()=>monthly.monthlyTransactionDate("2026-02-30",false,"iso"));
    const fix=require("./fixtures/source-ooxml-test-fixture.ts"),parts=fix.workbookParts();
    const header=`<row r="7">${["Client_ID","Transaction_ID","Amount","Date"].map((v,i)=>fix.textCell(String.fromCharCode(65+i)+"7",v)).join("")}</row>`;
    const xml=(formula=false)=>`<worksheet xmlns="${fix.NS}"><sheetData>${header}<row r="8">${fix.textCell("A8","0001")}${fix.textCell("B8","T-01")}${fix.numberCell("C8","1500.25",formula?"1+1":undefined)}${fix.numberCell("D8","46336")}</row></sheetData></worksheet>`;
    const xf={...make(),fileName:"cash.xlsx",parseSettings:{format:"xlsx",sheet:"Data",headerRow:7},dateSystem:"excel1900",mapping:{Client_ID:"clientId",Transaction_ID:"transactionId",Amount:"amount",Date:"date"},bytes:fix.zipParts({...parts,"xl/worksheets/sheet1.xml":xml()}).toString("base64")};
    const xb=monthly.buildMonthlyRequest("jag",xf,ids);assert.equal(xb.request.rows[0].amount,"1500.25");assert.equal(xb.request.rows[0].date,"2026-11-10");assert.equal(xb.request.rows[0].row,8);
    assert.throws(()=>monthly.buildMonthlyRequest("jag",{...xf,bytes:fix.zipParts({...parts,"xl/worksheets/sheet1.xml":xml(true)}).toString("base64")},ids),e=>e.exceptions[0].reason.includes("Formula"));
  });
  await check("monthly campaign gateway: all-five existing employee auth, exact wire, preview/commit/status, holds and uncertain replies", async () => {
    const {monthlyGiftGateway}=require("../lib/portal-v2/monthly-gateway.server.ts"),pub=require("../lib/portal-v2/monthly-wire.ts"),mf=require("../lib/portal-v2/monthly-file.server.ts");
    const ids=[{clientId:"0001",cptid:900001,name:"Fictional donor"}];
    const file={bytes:encode("Client_ID,Transaction_ID,Amount,Date\n0001,T-01,1500.25,2026-11-10\n0001,T-02,1500.25,2026-11-10\n"),fileName:"cash.csv",requestId:ID,source:"Fictional CRM",sourceDate:"2026-11-15",period:"2026-11",actor:"Fictional staff",campaignOnly:true,receivedUsdCash:true,parseSettings:{format:"csv"},dateSystem:"iso",mapping:{Client_ID:"clientId",Transaction_ID:"transactionId",Amount:"amount",Date:"date"}};
    const clients=["jag","csnf","pvas","wcbhc","baq"],cookies={};
    for(const c of clients){process.env[`${c.toUpperCase()}_DATA_PASSWORD`]=`fictional-${c}`;const a=require(`../lib/${c}-data-auth.ts`);cookies[c]=`${a[`${c.toUpperCase()}_DATA_COOKIE`]}=${await a[`${c}DataCookieValue`]()}`;}
    for(const client of clients){
      const calls=[],receipts=new Map();let malformed=null;
      const deps={identities:async c=>{assert.equal(c,client);return ids},call:async(c,op,b)=>{
        calls.push({c,op,b});assert.equal(c,client);if(malformed)return{status:200,body:malformed};
        if(op==="monthlyStatus")return{status:200,body:receipts.get(b.requestId)||{v:1,status:"not-found",requestId:b.requestId,client}};
        const r=b.request;assert.equal(r.client,client);assert.equal(r.campaignOnly,true);assert.equal(r.basis,"received-cash");assert.equal(r.rows[0].kind,"gift");assert.equal(r.rows[0].currency,"USD");
        const payloadHash=crypto.createHash("sha256").update(pub.monthlyCanonical(r)).digest("hex");
        if(receipts.has(r.requestId))return{status:200,body:{...receipts.get(r.requestId),replayed:true}};
        if(op==="monthlyPreview")return{status:200,body:{v:1,status:"preview",requestId:r.requestId,payloadHash,planHash:hex("c"),expiresAt:Date.now()+300000,proof:hex("b"),counts:{new:2,unchanged:0,held:0},totals:{new:"3000.50",unchanged:"0.00",held:"0.00"},rows:r.rows.map(x=>({row:x.row,action:"new",reason:null}))}};
        assert.equal(op,"monthlyCommit");assert.equal(b.approval.confirm,true);
        const result={v:1,status:"committed",requestId:r.requestId,client,payloadHash,batchId:42,counts:{new:2,unchanged:0,held:0},totals:{new:"3000.50",unchanged:"0.00",held:"0.00"},scope:"campaign-gifts-only",replayed:false};receipts.set(r.requestId,result);return{status:200,body:result};
      }};
      const route=monthlyGiftGateway(client,deps),post=(body,headers={})=>route(new NextRequest(`http://localhost/api/${client}-data-monthly-import`,{method:"POST",headers:{"content-type":"application/json",origin:"http://localhost",cookie:cookies[client],...headers},body:JSON.stringify(body)}));
      for(const other of clients.filter(c=>c!==client))assert.equal((await post({op:"preview",file},{cookie:cookies[other]})).status,401);
      assert.equal((await post({op:"preview",file},{cookie:""})).status,401);assert.equal((await post({op:"preview",file},{origin:"https://foreign.invalid"})).status,403);
      assert.equal((await post({op:"preview",client:"foreign",file})).status,400);assert.equal(calls.length,0);
      const p=await(await post({op:"preview",file})).json();assert.equal(p.plan.counts.new,2);assert.equal(p.review.currency,"USD");
      const hash=mf.buildMonthlyRequest(client,file,ids).payloadHash;pub.confirmedMonthlyPlan(p.plan,ID,hash,mf.buildMonthlyRequest(client,file,ids).request.rows);
      const reply=await post({op:"commit",file,approval:{planHash:p.plan.planHash,expiresAt:p.plan.expiresAt,proof:p.plan.proof,confirm:true}});assert.equal(reply.status,200);
      pub.confirmedMonthlyReceipt(await reply.json(),client,ID,hash,2);
      assert.equal((await(await post({op:"status",requestId:ID})).json()).status,"committed");
      assert.equal((await(await post({op:"preview",file})).json()).receipt.replayed,true);
      malformed={};const bad=await post({op:"commit",file,approval:{planHash:hex("c"),expiresAt:p.plan.expiresAt,proof:hex("b"),confirm:true}});assert.equal(bad.status,503);assert.equal((await bad.json()).requestId,ID);
      assert.equal((await post({op:"status",requestId:ID})).status,400);
      const before=calls.length;assert.equal((await post({op:"preview",file:{...file,receivedUsdCash:false}})).status,422);assert.equal(calls.length,before);
    }
    for(const c of clients)delete process.env[`${c.toUpperCase()}_DATA_PASSWORD`];
    const base={v:1,status:"committed",requestId:ID,client:"jag",payloadHash:hex("a"),batchId:null,counts:{new:0,unchanged:0,held:0},totals:{new:"0.00",unchanged:"0.00",held:"0.00"},scope:"campaign-gifts-only",replayed:true};
    assert.throws(()=>pub.confirmedMonthlyReceipt(base,"jag",ID));
    assert.throws(()=>pub.confirmedMonthlyReceipt({...base,counts:{new:1001,unchanged:0,held:0}},"jag",ID));
    // Exercise actual shared legacy transport owner for monthly envelopes, bounded replies and timeout/no-redirect options.
    const serverFile=path.join(root,"lib/portal-v2/server.ts"),realModule=new Module(serverFile,module);realModule.filename=serverFile;realModule.paths=Module._nodeModulePaths(path.dirname(serverFile));require.extensions[".ts"](realModule,serverFile);
    process.env.ENGAGE_PORTAL_URL_OVERRIDE="https://fictional.invalid/api/portal-v2";process.env.PORTAL_WRITE_SECRET=secret;
    transport=async(url,options)=>{assert.equal(url,"https://fictional.invalid/api/portal-v2");assert.equal(options.redirect,"error");assert.equal(options.cache,"no-store");assert.ok(options.signal instanceof AbortSignal);const body=JSON.parse(options.body);assert.equal(body.op,"monthlyStatus");assert.equal(body.client,"jag");assert.equal(body.requestId,ID);return Response.json({v:1,status:"not-found",requestId:ID,client:"jag"})};
    assert.equal((await realModule.exports.engageCall("jag","monthlyStatus",{requestId:ID})).body.status,"not-found");
    transport=async()=>new Response("not-json");await assert.rejects(()=>realModule.exports.engageCall("jag","monthlyStatus",{requestId:ID}));
    transport=null;delete process.env.ENGAGE_PORTAL_URL_OVERRIDE;delete process.env.PORTAL_WRITE_SECRET;
    const ui=fs.readFileSync(path.join(root,"components/monthly-gift-upload.tsx"),"utf8");
    assert.ok(ui.includes("Not found yet does not prove"));assert.ok(ui.includes('setUpload(null); setHeaders([]); setMapping({})'));assert.ok(ui.includes('setPending(p); setBusy(true)'));
  });
  await check("solicitor capacity: complete inventory observations, ambiguity, unavailable and exact all-five ownership", async () => {
    const {observeSolicitorInventory}=require("../lib/portal-v2/direct-solicitor-inventory.server.ts");
    const nativeEmpty={highWealth:[],midLevel:[],legacy:[],lapsed:[],top:[],portfolio:[],committed:[]};
    for(const client of strict.DIRECT_CLIENTS) {
      let snap={...nativeEmpty,client:"Fictional client label",pool:[{solicitor:"Jane Smith"}],portfolio:[{solicitor2:"Alex Lee"}]},tr=await track(client,doc({"900001":{solicitor:"Pat Green",solicitor2:"Jane Smith"}}));
      let state={updates:[{id:1,cptid:900001,field:"solicitor",new_value:"Old spelling"},{id:2,cptid:900001,field:"solicitor",new_value:"Current Staff"},{id:3,cptid:900002,field:"solicitor2",new_value:"Voided",voided:true}],prospects:[]};
      const deps={snapshot:async c=>{assert.equal(c,client);return snap},tracking:async()=>tr,sql:async()=>state};
      const observed=await observeSolicitorInventory(client,deps);assert.deepEqual(observed.names,["Alex Lee","Current Staff","Jane Smith","Pat Green"]);
      assert.equal(observed.revision,wire.compileDirectSolicitors(observed.names).revision);
      snap=null;assert.equal(await observeSolicitorInventory(client,deps),null);
      snap={...nativeEmpty,client:"Fictional label",pool:[]};tr=await track(client);state={updates:[],prospects:[]};
      assert.deepEqual((await observeSolicitorInventory(client,deps)).names,[]);
      state={configured:false,updates:[],prospects:[]};assert.equal(await observeSolicitorInventory(client,deps),null);
      state={updates:[],prospects:[]};tr={kind:"unavailable"};assert.equal(await observeSolicitorInventory(client,deps),null);
      tr=await track(client);snap={...nativeEmpty,client:"Fictional",pool:[{solicitor:5}]};assert.equal(await observeSolicitorInventory(client,deps),null);
    }
    const ambiguous=wire.compileDirectSolicitors(["Jane Smith"," jane  smith "]);assert.equal(ambiguous.entries[0].canonical,null);
    const ui=fs.readFileSync("components/direct-dashboard-upload.tsx","utf8");for(const key of ["solicitor:","primarysolicitor:","secondarysolicitor:","solicitor2:"])assert.ok(ui.includes(key));
    const conf=JSON.parse(fs.readFileSync("vercel.json","utf8"));assert.equal(conf.git.deploymentEnabled["feat/direct-solicitors-capacity-nov15"],false);assert.ok(conf.crons.length>0);
  });
  await check("solicitor capacity: signed exact operations, raw upload preserved, canonical after and precise holds", async () => {
    const input={...file("Client_ID,Primary Solicitor,Secondary Solicitor\n0001,  jane  smith ,Unknown Staff\n"),mapping:{Client_ID:"clientId","Primary Solicitor":"primarySolicitor","Secondary Solicitor":"secondarySolicitor"},verifyCptidColumn:null,noteResolutions:{}};
    for(const client of strict.DIRECT_CLIENTS){
      const f=fixtureDeps();f.setInventory(["Jane Smith","Alex Lee"]);
      const route=gateway.directFileGateway(client,f.deps),r=await route(request({op:"preview",file:input}));
      assert.equal(r.status,200,await r.clone().text());const p=await r.json();assert.equal(p.plan.decisions[0].after,"Jane Smith");assert.equal(p.plan.decisions[1].after,"Unknown Staff");assert.equal(p.plan.decisions[1].reason,"unknown-solicitor");
      assert.equal(f.calls.at(-1).body.batch.cells[0].value,"  jane  smith ");
      f.setInventory(["Jane Smith","Additional Staff"]);
      const changed=await route(request({op:"commit",file:input,approval:{previewHash:p.plan.previewHash,expiresAt:p.plan.expiresAt,proof:p.plan.proof}}));
      assert.equal(changed.status,503);assert.equal((await changed.json()).code,"unconfirmed");
      f.setInventory(["Jane Smith","Alex Lee"]);
      const committed=await route(request({op:"commit",file:input,approval:{previewHash:p.plan.previewHash,expiresAt:p.plan.expiresAt,proof:p.plan.proof}}));
      assert.equal(committed.status,200);assert.equal(f.calls.at(-1).body.manualContext.payload.phase,"commit");

      const last=f.calls.at(-1);assert.equal(Object.keys(last.body.manualContext.payload).at(-1),"solicitorAliases");
      const caps=await gateway.gatewayCapabilities(client,f.deps);assert.equal(caps.solicitorAliases.entries[0].canonical,"Alex Lee");
      f.setInventory(["Jane Smith","jane smith"]);let q=await(await route(request({op:"preview",file:input}))).json();assert.equal(q.plan.decisions[0].reason,"ambiguous-solicitor");assert.equal(q.plan.decisions[0].after,"  jane  smith ");
      f.setInventory(null);q=await(await route(request({op:"preview",file:input}))).json();assert.equal(q.plan.decisions[0].reason,"solicitor-aliases-unavailable");
      f.setInventory(["Jane Smith"]);f.mutate((c,op,body)=>op==="directFilePreview"?{status:200,body:{protocol:"direct-file-v1",status:"previewed",plan:{payloadHash:wire.directFileHash(body.batch),previewHash:hex("b"),proof:hex("c"),expiresAt:123,decisions:body.batch.cells.map(cell=>({ordinal:cell.ordinal,cptid:cell.cptid,field:cell.field,before:null,after:"Different person",action:"set",reason:null,eventKey:null}))}}}:null);
      assert.equal((await route(request({op:"preview",file:input}))).status,503);
    }
  });
  await check("solicitor capacity: complete 5000-source-ID view and 5000-note projection byte/count safeguards", async () => {
    const makeValue=i=>({cptid:900000+i,field:"primarySolicitor",value:"Jane Smith",template:"fictional",authority_rev:hex("a"),request_id:ID,source_date:"2026-11-15",committed_at:"2026-11-15T00:00:00Z"});
    const state={protocol:"direct-file-v1",status:"known",scope:"whole-client",complete:true,client:"jag",revision:hex("a"),observedAt:"2026-11-15T00:00:00Z",values:Array.from({length:5000},(_,i)=>makeValue(i+1)),notes:[],note:"Complete source layer"};
    assert.equal(reads.validateDirectState(state,"jag").values.length,5000);
    assert.throws(()=>reads.validateDirectState({...state,values:[...state.values,makeValue(5001)]},"jag"));
    assert.throws(()=>reads.validateDirectState({...state,values:state.values.map(v=>({...v,value:"X".repeat(300)}))},"jag"));
    const notes=Array.from({length:5000},()=>({cptid:900001,date:"2026-11-15",note:"New event"})),tr=await track("jag",doc({},notes));
    assert.equal(strict.projectTrackingManual(tr,[900001])["900001"].notes.length,5000);
    assert.equal(strict.projectTrackingManual(await track("jag",doc({},[...notes,notes[0]])),[900001]),null);
    const f=fixtureDeps();f.setManual(doc({},Array.from({length:400},()=>({...notes[0],note:"X".repeat(4000)}))));
    const r=await gateway.directFileGateway("pvas",f.deps)(request({op:"preview",file:file()}));assert.equal(r.status,413);assert.equal((await r.json()).code,"manual-context-byte-limit");
    assert.equal(f.calls.some(c=>c.op==="directFilePreview"),false);
    const receipt={protocol:"direct-file-v1",requestId:ID,client:"pvas",status:"committed",saved:2000,held:0,unchanged:0,payloadHash:hex("a"),previewHash:hex("b"),effect:"source-state-only",effectiveChanges:"not-asserted",publication:"not-requested"};
    confirmedDirectReceipt(receipt,{client:"pvas",requestId:ID});f.receipts.set(ID,receipt);
    assert.equal((await gateway.directFileGateway("pvas",f.deps)(request({op:"status",requestId:ID}))).status,200);
  });
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
  await check("solicitor capacity: 500 rows x4 fields including blanks=2000, 501 rows refuse before mutation", async () => {
    const make=n=>({...file("Client_ID,Campaign Ask,Primary Solicitor,Secondary Solicitor,New Notes\n"+Array.from({length:n},(_,i)=>`${String(i+1).padStart(4,"0")},,,,\n`).join("")),
      mapping:{Client_ID:"clientId","Campaign Ask":"ask","Primary Solicitor":"primarySolicitor","Secondary Solicitor":"secondarySolicitor","New Notes":"note","@source-date":"noteDate"},verifyCptidColumn:null,noteResolutions:{}});
    const f=fixtureDeps(),built=await gateway.buildGatewayBatch("pvas",make(500),f.deps);
    assert.equal(wire.DIRECT_FILE_MAX_CELLS,2000);assert.equal(built.batch.cells.length,2000);assert.equal(built.fileContext.reviewCells,2000);
    const route=gateway.directFileGateway("pvas",f.deps),preview=await route(request({op:"preview",file:make(500)}));
    assert.equal(preview.status,200);const p=await preview.json();require("../lib/portal-v2/direct-public-response.ts").confirmedDirectPreview(p);
    assert.equal(f.calls.at(-1).body.manualContext.payload.observations.length,500);
    await assert.rejects(()=>gateway.buildGatewayBatch("pvas",make(501),f.deps),/500/);
    assert.equal(f.calls.filter(c=>c.op==="directFileCommit").length,0);
    const pub=require("../lib/portal-v2/direct-public-response.ts"),valid=JSON.parse(JSON.stringify(p));
    valid.plan.decisions[0].ordinal=501;assert.throws(()=>pub.confirmedDirectPreview(valid));
  });
  await check("backend lexical identity order joins exact client ID, never source position", async () => {
    const f = fixtureDeps();
    f.mutate((client, op, body) => op === "directFileResolve" ? { status: 200, body: { protocol: "direct-file-v1", status: "known", client, template: body.template, registrationRevision: hex("a"), solicitorAliases:{status:"unavailable",revision:null,entries:[]},
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
    assert.equal((await gateway.buildGatewayBatch("pvas", alias, f.deps)).batch.cells[0].value,"Unknown Staff"); // Backend holds unknown aliases; original upload stays raw.
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
  await check("receipt status totals must be1..2000 even without local expected count", async () => {
    for (const counts of [{ saved: 0, held: 0, unchanged: 0 }, { saved: 2000, held: 1, unchanged: 0 }]) {
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
  await check("SQL manual state row-id boundary: actual137 driver strings, strict reads/order, exact integers and untouched other IDs/ops/errors", async () => {
    // Execute the REAL established state owner, not the normal suite's server stub.
    const filename=path.join(root,"lib/portal-v2/server.ts"),actualModule=new Module(filename,module);
    actualModule.filename=filename;actualModule.paths=Module._nodeModulePaths(path.dirname(filename));
    require.extensions[".ts"](actualModule,filename);const actual=actualModule.exports;
    process.env.ENGAGE_PORTAL_URL_OVERRIDE="https://fictional.invalid/api/portal-v2";process.env.PORTAL_WRITE_SECRET=secret;
    const raw={updates:Array.from({length:137},(_,i)=>({id:String(137-i),cptid:900001,client_id:"0001",field:"ask",old_value:null,new_value:`${137-i}.00`,created_at:"2026-11-15T00:00:00Z",extra:"untouched"})),
      prospects:Array.from({length:161},(_,i)=>({id:String(i+1000),cptid:800001+i,client_id:`000${i}`,full_name:`Fictional ${i}`})),
      gifts:[{id:"9007199254740993",cptid:900003,client_id:"00042",kind:"gift",amount:1}],batches:[],giftOverrides:[]};
    const before=structuredClone(raw);let reply=raw,status=200,calls=0;
    transport=async(url,options)=>{calls++;assert.equal(url,"https://fictional.invalid/api/portal-v2");assert.equal(JSON.parse(options.body).client,"jag");return {status,json:async()=>reply}};
    const state={protocol:"direct-file-v1",status:"known",scope:"whole-client",complete:true,client:"jag",revision:hex("d"),observedAt:"2026-11-15T00:00:00.000Z",notes:[],
      values:[{cptid:900001,field:"ask",value:"200.00",template:"fictional",authority_rev:hex("a"),request_id:ID,source_date:"2026-11-15",committed_at:"2026-11-15T00:00:00.000Z"}],note:"Source only"};
    const dependencies={enabled:()=>true,state:async()=>state,tracking:()=>track("jag",doc()),sql:async()=>(await actual.engageCall("jag","state")).body};
    const result=await actual.engageCall("jag","state");
    assert.equal(result.body.updates.length,137);assert.equal(result.body.prospects.length,161);
    assert.ok(result.body.updates.every(u=>typeof u.id==="number"&&Number.isSafeInteger(u.id)));
    assert.deepEqual(result.body.updates.map(u=>u.id),raw.updates.map(u=>Number(u.id)));
    assert.notEqual(result.body,raw);assert.notEqual(result.body.updates,raw.updates);
    result.body.updates.forEach((u,i)=>{assert.notEqual(u,raw.updates[i]);const {id,...rest}=u;const {id:oldId,...oldRest}=raw.updates[i];assert.deepEqual(rest,oldRest)});
    assert.deepEqual(raw,before);assert.equal(result.body.updates[0].client_id,"0001");assert.equal(result.body.updates[0].cptid,900001);
    assert.equal(result.body.prospects[0].id,"1000");assert.equal(result.body.gifts[0].id,"9007199254740993");assert.equal(result.body.gifts[0].client_id,"00042");
    const observed=await reads.observeDirect("jag",dependencies);
    assert.equal(reads.currentDirectValues(observed).get(900001).get("ask").value,"137.00");
    assert.equal(reads.currentDirectValues(observed).get(900001).get("ask").source,false);
    assert.equal(askEdits(observed.sql.updates).get(900001).value,137);
    const view=reads.composeDirectData({index:[{cptid:900001}],records:{900001:{cptid:900001,portfolio:{ask:50}}}},"records",observed);
    assert.equal(view.records[900001].portfolio.ask,137);
    assert.equal((await actual.portalStateSafe("jag")).updates[0].id,137);
    assert.equal((await actual.portalCampaignStateSafe("jag")).updates[0].id,137);
    for(const value of [0,1,-1,Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER,"0","1","-1",String(Number.MAX_SAFE_INTEGER),String(Number.MIN_SAFE_INTEGER)]){
      reply={...raw,updates:[{...raw.updates[0],id:value}]};const normal=(await actual.engageCall("jag","state")).body.updates[0].id;assert.equal(normal,Number(value));assert.ok(Number.isSafeInteger(normal));
    }
    for(const value of [""," "," 1","1 ","+1","01","-0","1.0","1e2","1.5","9007199254740992","9007199254740993","-9007199254740992","Infinity","NaN","1x",null,{},[],true,Number.MAX_SAFE_INTEGER+1,1.5,NaN]){
      reply={...raw,updates:[{...raw.updates[0],id:value}]};
      await assert.rejects(()=>actual.engageCall("jag","state"),e=>e.message==="Invalid manual update row ID");
      await assert.rejects(()=>reads.observeDirect("jag",dependencies));
    }
    reply={...raw,updates:[{...raw.updates[0],cptid:"900001"}]};
    assert.equal((await actual.engageCall("jag","state")).body.updates[0].cptid,"900001");
    await assert.rejects(()=>reads.observeDirect("jag",dependencies));
    // Failed/misconfigured states and non-state operations stay byte/content-compatible.
    reply={...raw,updates:[{...raw.updates[0],id:"not-a-row-id"}]};
    assert.equal((await actual.engageCall("jag","other-existing-op")).body,reply);
    status=503;assert.equal((await actual.engageCall("jag","state")).body,reply);
    status=200;reply={...reply,error:"Fictional state unavailable"};assert.equal((await actual.engageCall("jag","state")).body,reply);
    reply={...raw,configured:false,updates:[{...raw.updates[0],id:"not-a-row-id"}]};assert.equal((await actual.engageCall("jag","state")).body,reply);
    assert.ok(calls>0);assert.deepEqual(raw,before);transport=null;delete process.env.ENGAGE_PORTAL_URL_OVERRIDE;delete process.env.PORTAL_WRITE_SECRET;
  });
  await check("source gateway employee auth: all-five actual registrations/config, existing shared wiring and blank PVAS identity hold", async () => {
    const filename=path.join(root,"lib/portal-v2/direct-registration.server.ts"),actualModule=new Module(filename,module);
    actualModule.filename=filename;actualModule.paths=Module._nodeModulePaths(path.dirname(filename));
    require.extensions[".ts"](actualModule,filename);const actual=actualModule.exports;
    const clients=["jag","csnf","pvas","wcbhc","baq"], savedUrl=process.env.ENGAGE_SOURCE_IMPORT_URL,savedSecret=process.env.PORTAL_WRITE_SECRET;
    try {
      assert.deepEqual(actual.APPROVED_WEBSITE_DIRECT_REGISTRATIONS.map(r=>r.client),clients);
      for(const r of actual.APPROVED_WEBSITE_DIRECT_REGISTRATIONS){assert.equal(r.template,"staff-notes-asks-v1");assert.deepEqual(r.solicitorAliases,{});assert.ok(Object.isFrozen(r));}
      for(const url of [undefined,"http://fictional.invalid/api/source-import","https://fictional.invalid/api/portal-v2"]){
        if(url===undefined)delete process.env.ENGAGE_SOURCE_IMPORT_URL;else process.env.ENGAGE_SOURCE_IMPORT_URL=url;
        process.env.PORTAL_WRITE_SECRET=secret;for(const c of clients)assert.equal(actual.directLaneEnabled(c),false);
      }
      process.env.ENGAGE_SOURCE_IMPORT_URL="https://fictional.invalid/api/source-import";delete process.env.PORTAL_WRITE_SECRET;
      for(const c of clients)assert.equal(actual.directLaneEnabled(c),false);
      process.env.PORTAL_WRITE_SECRET=secret;
      for(const c of clients){
        assert.equal(actual.directLaneEnabled(c),true);
        const read=f=>fs.readFileSync(path.join(root,f),"utf8");
        assert.ok(read(`lib/${c}-data-store.ts`).includes(`directData("${c}", raw, "records")`));
        assert.ok(read(`app/api/${c}-data-direct-import/route.ts`).includes(`directFileGateway("${c}")`));
        assert.ok(read(`app/api/${c}-data-tracking/route.ts`).includes(`trackingRoute("${c}",`));
        assert.ok(read(`app/api/${c}-data-reports/route.tsx`).includes(`directData("${c}", raw, "snapshot")`));
        assert.ok(read(`app/api/${c}-data-export/route.tsx`).includes(`directLaneEnabled("${c}")`));
        assert.ok(read(`components/${c}-data-dashboard.tsx`).includes(`<PortalV2Provider client="${c}">`));
        assert.ok(read(`components/${c}-data-dashboard.tsx`).includes('<AddAndUpload />'));
      }
      assert.ok(fs.readFileSync(path.join(root,"components/portal-v2.tsx"),"utf8").includes('<DirectDashboardUpload key={`direct:${client}`} client={client} />'));
      const f=fixtureDeps(),r=await gateway.directFileGateway("pvas",f.deps)(request({op:"preview",file:file("Client_ID,CPTID,Campaign Ask,New Notes\\n,900001,100.00,New fictional note\\n")}));
      assert.equal(r.status,400);const held=await r.json();
      assert.equal(held.code,"invalid-or-unavailable"); // Existing parser rejects blank identity before resolution; UI displays a safe hold.
      assert.equal(f.calls.filter(c=>c.op==="directFileResolve"||c.op==="directFileCommit").length,0);
    } finally {
      if(savedUrl===undefined)delete process.env.ENGAGE_SOURCE_IMPORT_URL;else process.env.ENGAGE_SOURCE_IMPORT_URL=savedUrl;
      if(savedSecret===undefined)delete process.env.PORTAL_WRITE_SECRET;else process.env.PORTAL_WRITE_SECRET=savedSecret;
    }
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
      assert.equal(result.records[900001].portfolio.solicitor,"Source staff");
      state.values.push({...values[1],field:"secondarySolicitor",value:"Source secondary"});
      let secondary=await reads.directData(client,base,"records",deps);assert.equal(secondary.records[900001].portfolio.secondary,"Source secondary");
      manualSql={updates:[{id:2,cptid:900001,field:"solicitor2",new_value:"",old_value:"Source secondary"}],prospects:[]};
      secondary=await reads.directData(client,base,"records",deps);assert.equal(secondary.records[900001].portfolio.secondary,"");

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
