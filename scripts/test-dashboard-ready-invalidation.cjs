// Actual website dispatch with mocked transport only; never sends a request.
const fs=require("node:fs"),assert=require("node:assert/strict"),ts=require("typescript");
function compile(file,deps,globals={}) {
  const m={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(file,"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,esModuleInterop:true},
  }).outputText;
  new Function("module","exports","require",...Object.keys(globals),js)(m,m.exports,name=>{
    if(name==="server-only")return {};
    if(name==="next/server")return {NextResponse:Response};
    if(Object.hasOwn(deps,name))return deps[name];
    if(name.endsWith("-auth"))return new Proxy({},{get:()=>async()=>true});
    return {};
  },...Object.values(globals));
  return m.exports;
}
async function main(){
  const clients=["csnf","jag","wcbhc","baq"],invalidations=[];
  let fail=false,calls=0,canonical=false,confirmed=false;
  const env={ENGAGE_PORTAL_URL:"https://fictional.invalid",PORTAL_WRITE_SECRET:"fictional"};
  const transport=async()=>{calls++;return Response.json(fail?{error:"fictional failure"}:{ok:true,...(confirmed?{requestId:"a".repeat(32)}:{})},{status:fail?503:200});};
  const live={LIVE_CLIENTS:clients,liveLocalDir:()=>false,invalidateLive:async c=>invalidations.push(c)};
  const deps={
    "./pvas-canonical":{pvasCanonicalEnabled:()=>canonical},
    "./pvas-action.server":{pvasActionBody:(_c,_op,body)=>body,withPvasAction:(_id,run)=>run(),PvasActionIdentityError:class extends Error{}},
    "./pvas-existing-only":{pvasExistingOperationAllowed:()=>true},
    "@/lib/client-live-data.server":live,
    "@/lib/portal-v2/clients":{PORTAL_V2:Object.fromEntries([...clients,"pvas"].map(c=>[c,{goal:1000}]))},
    "./contact-schema":{CONTACT_KEYS:["city"]},
    "@/lib/pvas-data-store":{invalidatePvasDataCache:async()=>invalidations.push("pvas")},
  };
  // The real CONTACT_KEYS import path is inspected through the source rather
  // than reimplementing the contact schema.
  const source=fs.readFileSync("lib/portal-v2/server.ts","utf8");
  const contactImport=source.match(/import\s*\{[^}]*CONTACT_KEYS[^}]*\}\s*from\s*["']([^"']+)/);
  if(contactImport)deps[contactImport[1]]={CONTACT_KEYS:["city"]};
  const server=compile("lib/portal-v2/server.ts",deps,{process:{env,NODE_ENV:"test"},fetch:transport});
  function req(body){return new Request("https://fictional.invalid",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});}
  for(const client of clients){
    const route=server.portalV2Route(client);
    assert.equal((await route.POST(req({op:"setContact",cptid:101,by:"Fictional",changes:{city:"Example"},current:{city:""}}))).status,200);
    assert.equal(invalidations.at(-1),client,"successful actual generic edit invalidates full ready");
    const before=invalidations.length;fail=true;
    assert.equal((await route.POST(req({op:"setContact",cptid:101,by:"Fictional",changes:{city:"Other"},current:{city:""}}))).status,500);
    assert.equal(invalidations.length,before,"failed transport does not assert successful edit invalidation");
    fail=false;
    assert.equal((await route.POST(req({op:"invalid-read"}))).status,400);
    assert.equal(invalidations.length,before,"invalid operation does not invalidate");
  }
  // Canonical PVAS success invalidation remains at its actual gateway receipt
  // boundary, not a cached expected-state substitution.
  canonical=true;
  const before=invalidations.length;
  // The mocked receipt deliberately carries no requestId: it must NOT be
  // misclassified as a confirmed canonical mutation.
  await server.engageCall("pvas","setTrackingCompactV1",{});
  assert.equal(invalidations.length,before);
  confirmed=true;await server.engageCall("pvas","setTrackingCompactV1",{});
  assert.equal(invalidations.at(-1),"pvas");
  const canonicalCount=invalidations.length;fail=true;
  await server.engageCall("pvas","setTrackingCompactV1",{});
  assert.equal(invalidations.length,canonicalCount,"failed canonical response never claims success");
  fail=false;confirmed=false;
  assert.ok(calls>=clients.length*2);

  const trackingInvalidations=[];
  const tracking=compile("lib/client-live-data.server.ts",{
    "./dashboard-ready-cache.server":{createDashboardReadyCache:o=>({invalidate:async()=>trackingInvalidations.push(o.prefix)})},
    "./pvas-shared-cache.server":{cacheTtlMs:()=>120000},
    "./dashboard-ready-blob.server":{readyBlobStore:null},
    "./dashboard-ready-model.server":{DASHBOARD_READY_COMPATIBILITY:"fictional"},
  },{process:{env},fetch:transport});
  for(const client of clients){
    fail=false;await tracking.saveSqlTracking(client,{prospects:{},activity:[]});
    assert.equal(trackingInvalidations.at(-1),`dashboard-ready/${client}`);
    const n=trackingInvalidations.length;fail=true;
    await assert.rejects(tracking.saveSqlTracking(client,{prospects:{},activity:[]}));
    assert.equal(trackingInvalidations.length,n);
  }
  canonical=false;fail=false;
  const direct=compile("lib/portal-v2/direct-file-gateway.server.ts",{
    ...deps,
    "./directFileProtocol":{DIRECT_FILE_MAX_CELLS:2000},
    "./direct-source-transport.server":{readBoundedStream:async stream=>Buffer.from(await new Response(stream).arrayBuffer())},
  },{process:{env}});
  for(const client of clients){
    const receipt={protocol:"direct-file-v1",client,requestId:"a".repeat(32),status:"committed",saved:1,held:0,unchanged:0,
      payloadHash:"b".repeat(64),previewHash:"c".repeat(64),effect:"source-state-only",effectiveChanges:"not-asserted",publication:"not-requested"};
    let status=200,body=receipt;
    const gateway=direct.directFileGateway(client,{call:async()=>({status,body})});
    const request=()=>{const r=req({op:"status",requestId:receipt.requestId});r.nextUrl=new URL(r.url);r.headers.set("origin",r.nextUrl.origin);return r;};
    assert.equal((await gateway(request())).status,200);
    assert.equal(invalidations.at(-1),client,"confirmed direct receipt invalidates effective ready view");
    const n=invalidations.length;status=503;body={code:"fictional-failure"};
    assert.equal((await gateway(request())).status,503);assert.equal(invalidations.length,n);
    status=200;body={protocol:"direct-file-v1",client,requestId:receipt.requestId,status:"not-found",note:"Fictional"};
    assert.equal((await gateway(request())).status,200);assert.equal(invalidations.length,n,"unconfirmed direct request never asserts successful save");
  }
  console.log("PASS actual all-five generic/canonical/tracking invalidation and four direct receipts: confirmed success vs failure/nonreceipt; no transport reaches network");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
