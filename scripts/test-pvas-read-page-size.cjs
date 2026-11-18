// Fictional changed-path fixtures only: no SQL/network/actual donor inputs.
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const ts=require(process.cwd()+"/node_modules/typescript");
const env={PORTAL_WRITE_SECRET:"fictional",ENGAGE_PORTAL_URL:"https://fictional.invalid/api"};
const gate={pvasCanonicalEnabled:c=>c==="pvas"};
function compile(file,deps={},globals={}){
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{
  target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,esModuleInterop:true
 }}).outputText,{exports,process:{env},console,Buffer,Response,Request,AbortSignal,
  TextEncoder,TextDecoder,structuredClone,setTimeout,clearTimeout,...globals,require:name=>{
   if(name==="server-only")return {};
   if(["./pvas-canonical","../portal-v2/pvas-canonical","./portal-v2/pvas-canonical"].includes(name))return gate;
   if(name==="next/server")return {NextResponse:Response};
   if(name in deps)return deps[name];
   if(name.endsWith("-auth"))return new Proxy({},{get:()=>async()=>true});
   return {};
  }});
 return exports;
}
(async()=>{
 let requests=[],badCursor=false;
 const common=compile("lib/portal-refresh/common.ts",{},{
  fetch:async(_url,init)=>{
   const b=JSON.parse(init.body);requests.push(b);
   assert.equal(init.cache,"no-store");
   const size=Math.min(b.limit,2000),remaining=2001-b.afterId,n=Math.min(size,remaining);
   return Response.json({rows:Array.from({length:n},(_,i)=>({cptid:b.afterId+i+1,id:b.afterId+i+1})),
    next:badCursor?b.afterId:(remaining>size?b.afterId+n:null),done:remaining<=size});
  }});
 assert.equal((await common.engageClientContacts("pvas")).length,2001);
 assert.deepEqual(requests.map(b=>[b.limit,b.afterId]),[[1000,0],[1000,1000],[1000,2000]]);
 requests=[];
 assert.equal((await common.engageClientContacts("csnf")).length,2001);
 assert.deepEqual(requests.map(b=>[b.limit,b.afterId]),[[10000,0],[10000,2000]]);
 badCursor=true;
 await assert.rejects(()=>common.engageClientContacts("pvas"),/Invalid PVAS canonical contact page/);
 console.log("PASS canonical1000 pages, backend2000 clamp, exact advancing cursor, stalled cursor refusal; legacy10000 unchanged");

 let builds=0,lastLoaded,projected,backendBodies=[],release,stateStarted;
 const started=new Promise(r=>{stateStarted=r;});
 const store=compile("lib/pvas-data-store.ts",{
  "./portal-refresh/pvas":{buildPvas:async()=>{builds++;return{snapshot:{},records:{index:[],records:{},asOf:""},pirs:{}}}}
 });
 const load=async()=>lastLoaded=await store.getPvasRecords();
 const gateway=compile("lib/portal-v2/server.ts",{
  "./pvas-existing-only":{pvasExistingOperationAllowed:()=>true},
  "./pvas-action.server":{pvasActionBody:(_c,_op,b)=>b},
  "./pvas-native-consumer":{consumeNativeStateCampaignV3:async()=>({records:[]})},
  "./pvas-state-wire":{canonicalPvasState:(_raw,records)=>{projected=records;return{updates:[],prospects:[],gifts:[]};}},
  "./pvas-native-write-acceptance.server":{pvasNativeWriteAccepted:()=>false},
  "@/lib/pvas-data-store":{getPvasRecords:load},
  "@/lib/portal-v2/clients":{PORTAL_V2:{pvas:{goal:1000}}},
 },{fetch:async(_url,init)=>{
  backendBodies.push(JSON.parse(init.body));stateStarted();
  if(backendBodies.length===1)await new Promise(r=>{release=r;});
  return Response.json({configured:true});
 }});
 const routes=compile("lib/portal-v2/records-route.ts",{
  "@/lib/portal-v2/server":gateway,
  "./direct-source-state.server":{currentTracking:(_c,f)=>f(),requireCurrentSql:()=>{}},
  "@/lib/portal-v2/record-overlay":{buildOverlay:()=>({})},
  "@/lib/portal-v2/campaign-records":{campaignRecords:()=>new Map()},
  "./effective-assignment":{assignmentResolver:()=>()=>({})},
 });
 const request=()=>({nextUrl:new URL("https://fictional.invalid/api/pvas-data-records")});
 const route=routes.recordsRoute("pvas",async()=>true,load,async()=>({prospects:{}}));
 const pending=route.GET(request());
 await started;assert.equal(builds,1);release();
 assert.equal((await pending).status,200);
 assert.equal(builds,1,"state projection must reuse even after completed builder cleared pending");
 assert.equal(projected,lastLoaded.records,"same request-owned map, not a refetched clone");
 assert.deepEqual(backendBodies,[{op:"nativeStateV3",client:"pvas"}],"internal context never enters public envelope");
 assert.equal((await route.GET(request())).status,200);
 assert.equal(builds,2,"next Reload must build afresh");
 await gateway.portalCampaignStateSafe("pvas");
 assert.equal(builds,3,"standalone state still obtains required records");
 for(const client of ["csnf","jag","wcbhc","baq"]){
  let context="not called";
  const legacy=routes.recordsRoute(client,async()=>true,load,async()=>({prospects:{}}),
   async(_c,ctx)=>{context=ctx;return{updates:[],prospects:[],gifts:[]};});
  assert.equal((await legacy.GET(request())).status,200);assert.equal(context,undefined);
 }
 const before=backendBodies.length;
 assert.equal((await routes.recordsRoute("pvas",async()=>true,async()=>null).GET(request())).status,503);
 assert.equal(backendBodies.length,before,"failed initial load cannot bypass unavailable gate");
 console.log("PASS real records route→state helpers→gateway reuses exact request map despite delayed state, no wire widening/cache; Reload/standalone fresh, other4 unchanged, failed load503");
})().catch(e=>{console.error(e);process.exitCode=1;});
