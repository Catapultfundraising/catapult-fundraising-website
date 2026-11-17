// Synthetic-only composed regression. Backend guard/date functions are exact
// excerpts pinned to the held backend archive, not permissive website mocks.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const assert = require("node:assert/strict"), ts = require("typescript");
const root = process.cwd(), read = f => fs.readFileSync(path.join(root, f), "utf8");
const fixture = JSON.parse(read("scripts/fixtures/pvas-reviewed-backend.json"));
const compile = (source, require = () => ({}), extra = {}) => {
  const exports = {};
  const context = vm.createContext({exports, require, console, process, Buffer, Request, Response,
    AbortSignal, TextDecoder, setTimeout, clearTimeout, ...extra});
  vm.runInContext(ts.transpileModule(source, {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  }}).outputText, context);
  return {exports, context};
};
const canonical = {pvasCanonicalEnabled: c => c === "pvas"};
const action = compile(read("lib/portal-v2/pvas-action.server.ts"), n =>
  n === "node:async_hooks" ? require(n) : n === "./pvas-canonical" ? canonical : {}).exports;
const backend = compile(fixture.envelope + "\n" + fixture.displayDate +
  "\nexports.envelope=envelope;exports.displayDate=displayDate;", undefined,
  {fail: () => {throw Error("invalid-command");}}).exports;
let sent = [], replyStatus = 200;
const fakeFetch = async (_url, init) => {
  const body = JSON.parse(init.body); sent.push(body);
  if (body.op === "pvasRequestStatus") {
    backend.envelope(body, ["op", "client", "requestId"]);
    return Response.json({found:true,requestId:body.requestId,receipt:{ok:true,requestId:body.requestId}});
  }
  backend.envelope(body, ["op", "client", "command"]);
  return Response.json(replyStatus === 200 ? {ok:true,requestId:body.command.requestId} : {error:"held"}, {status:replyStatus});
};
const server = compile(read("lib/portal-v2/server.ts"), n => {
  if(n === "./pvas-action.server") return action;
  if(n === "./pvas-canonical") return canonical;
  if(n === "next/server") return {NextResponse:Response};
  if(n.endsWith("-auth")) return new Proxy({}, {get:()=>async()=>true});
  if(n === "@/lib/pvas-data-store") return {invalidatePvasDataCache:()=>{}};
  if(n.endsWith("/clients")) return {PORTAL_V2:{pvas:{goal:1000000}}};
  return {};
}, {fetch:fakeFetch}).exports;
const requestId = "a".repeat(32), by = "Fictional";
const post = body => server.portalV2Route("pvas").POST(new Request("https://fixture.invalid/api", {
  method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body),
}));
const plain = x => JSON.parse(JSON.stringify(x));
(async()=>{
  process.env.ENGAGE_PORTAL_URL = "https://fixture.invalid/portal";
  process.env.PORTAL_WRITE_SECRET = "synthetic-not-a-secret";
  for (const op of ["pvasFields","pvasContact","pvasNote","pvasGift","pvasBatch","pvasBatchUndo"]) {
    const command = {requestId, actor:by};
    const response = await post({op,by,requestId,command});
    assert.equal(response.status,200,`${op}: actual route -> engageCall -> actionBody -> strict backend envelope: ${await response.clone().text()}`);
    assert.deepEqual(sent.at(-1),{op,client:"pvas",command});
    assert.equal((await response.json()).requestId,requestId);
    // A direct server caller also owns identity inside command, not ALS/outer.
    await server.engageCall("pvas",op,{command});
    assert.deepEqual(sent.at(-1),{op,client:"pvas",command});
    // A stale outer ID must not silently override the immutable command ID.
    assert.throws(()=>action.pvasActionBody("pvas",op,{requestId:"b".repeat(32),command}));
  }
  const before = sent.length;
  assert.equal((await post({op:"pvasFields",by,requestId,command:{actor:by,requestId:"b".repeat(32)}})).status,400);
  assert.equal(sent.length,before,"mismatched browser IDs never forwarded");
  replyStatus=503;
  const uncertain=await post({op:"pvasGift",by,requestId,command:{actor:by,requestId}});
  assert.equal(uncertain.status,503);
  assert.deepEqual(await uncertain.json(),{error:"Canonical save unconfirmed; reconcile the same requestId",requestId,unconfirmed:true});
  assert.equal((await post({op:"pvasRequestStatus",requestId})).status,200);
  assert.deepEqual(sent.at(-1),{op:"pvasRequestStatus",client:"pvas",requestId});
  assert.deepEqual(plain(action.pvasActionBody("jag","pvasGift",{requestId,command:{}})),{requestId,command:{}});
  console.log("PASS composed route + direct caller: all six strict envelopes; mismatch refusal; unconfirmed/status recovery; non-PVAS unchanged");

  const trackingSource=read("lib/pvas-tracking.ts");
  const tracker=compile(trackingSource.slice(trackingSource.indexOf("const object ="),
    trackingSource.indexOf("\n/** Existing"))+"\nexports.canonicalHistory=canonicalHistory;").exports;
  const row = rawDate => ({id:"sql:1",cptid:1,...backend.displayDate(rawDate),
    kind:"Note",note:"Fictional",by:"",at:"",
    _canonical:{noteId:1,rowId:1,cptid:1,version:0,text:"Fictional",date:rawDate,source:null,order:null,deleted:false}});
  for(const date of ["1/2/2020","01/02/2020","1/02/2020","01/2/2020","2/29/2020","2020-02-29",
    "2/29/2019","4/31/2020","13/1/2020","0/2/2020","1/0/2020","2020-02-30","Spring 2009",null,""]) {
    const view=row(date), before=JSON.stringify(view);
    assert.equal(tracker.canonicalHistory(view),true,`backend projection parity: ${date}`);
    assert.equal(JSON.stringify(view),before,"raw metadata retained byte-for-byte");
    if(view.sourceDate) {
      assert.equal(view.date,"");
      assert.equal(tracker.canonicalHistory({...view,sourceDate:undefined}),false,"unknown dates require honest sourceDate");
      assert.equal(tracker.canonicalHistory({...view,date:"2020-01-01"}),false,"no fabricated date");
    }
  }
  assert.equal(tracker.canonicalHistory({...row("1/2/2020"),date:"2020-02-01"}),false);
  console.log("PASS backend-to-website single-digit/padded/leap/calendar-invalid/unknown/null dates and immutable raw metadata");

  const money=compile(read("lib/portal-v2/pvas-financials.ts")).exports;
  const rounding=read("lib/portal-refresh/common.ts").match(/export const round2 = [^\n]+/)[0];
  const {round2}=compile(rounding).exports;
  for(const wire of ["0.00","0.01","0.29","1.15","100.00","1234567.89","90071992547409.91"]) {
    assert.equal(round2(money.displayMoney(wire)).toFixed(2),wire);
  }
  for(const wire of ["45035996273000.02","9999999999999999.99"]) {
    assert.throws(()=>money.displayMoney(wire),/display/);
    assert.equal(money.centsMoney(money.moneyCents(wire)),wire,"exact wire remains supported");
  }
  assert.equal(round2(1.005),1.01,"shared other-client rounding unchanged");
  console.log("PASS actual shared round2 cent-stability boundary; large unstable values HOLD; exact wire and other-client rounding unchanged");
})().catch(e=>{console.error(e);process.exitCode=1;});
