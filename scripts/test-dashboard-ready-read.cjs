// Actual authenticated routes/browser publisher with fictional IO only.
const fs=require("node:fs"),assert=require("node:assert/strict"),ts=require("typescript");
function compile(file,deps={},globals={}) {
  const m={exports:{}};
  const source=ts.transpileModule(fs.readFileSync(file,"utf8"),{
    fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,esModuleInterop:true},
  }).outputText;
  const req=name=>{
    if(name==="server-only")return {};
    if(name==="next/server")return {NextResponse:Response};
    if(Object.hasOwn(deps,name))return deps[name];
    return {};
  };
  new Function("module","exports","require",...Object.keys(globals),source)(m,m.exports,req,...Object.values(globals));
  return m.exports;
}
const request=(url,headers={})=>({nextUrl:new URL(url),headers:new Headers(headers)});
async function main() {
  let warms=0,reads=0,auth=true,ttl=120000;
  const env={CRON_SECRET:"fictional",BLOB_STORE_ID:"fictional",VERCEL_ENV:"production"};
  const server={
    READY_CLIENTS:["pvas","csnf","jag","wcbhc","baq"],
    readyClient:c=>["pvas","csnf","jag","wcbhc","baq"].includes(c),
    refreshDashboardReady:async()=>{warms++;},
    readyPayload:async()=>{reads++;return {generation:"fictional",freshness:{stale:false}};},
  };
  const deps={"@/lib/portal-v2/pvas-canonical":{pvasCanonicalEnabled:()=>true},"@/lib/dashboard-ready-cache.server":{readyFailureStage:()=>undefined},"@/lib/dashboard-ready.server":server,"@/lib/pvas-shared-cache.server":{cacheTtlMs:()=>ttl}};
  for(const c of server.READY_CLIENTS)deps[`@/lib/${c}-data-auth`]=new Proxy({},{get:()=>async()=>auth});
  const globals={process:{env},Response,Request,Headers};
  const read=compile("app/api/dashboard-ready/route.ts",deps,globals);
  const warm=compile("app/api/dashboard-ready-refresh/route.ts",deps,globals);
  const url="https://fictional.invalid/api/dashboard-ready?client=pvas",warmUrl="https://fictional.invalid/api/dashboard-ready-refresh?client=pvas";
  auth=false;assert.equal((await read.GET(request(url))).status,401);assert.equal(reads,0);
  auth=true;assert.equal((await read.GET(request(url))).status,200);assert.equal(reads,1);
  assert.equal((await warm.GET(request(warmUrl))).status,401);assert.equal(warms,0);
  const bearer={authorization:"Bearer fictional"};
  assert.equal((await warm.GET(request(warmUrl,bearer))).status,200);assert.equal(warms,1);
  env.VERCEL_ENV="preview";
  assert.equal((await warm.GET(request(warmUrl,bearer))).status,403);
  assert.equal((await warm.POST(request(warmUrl,bearer))).status,403);
  assert.equal((await warm.POST(request(warmUrl,{...bearer,"x-dashboard-ready-prewarm":"1"}))).status,200);
  ttl=0;
  assert.equal((await (await read.GET(request(url))).json()).mode,"uncached");
  const count=warms;assert.equal((await warm.POST(request(warmUrl,{...bearer,"x-dashboard-ready-prewarm":"1"}))).status,200);
  assert.equal(warms,count,"disabled cron does not build and discard");

  // Both actual browser consumers share one published generation. A record
  // request retains that exact generation, never the server's latest pointer.
  let calls=[],release,mode="ready",counter=0;
  const bundle=()=>({generation:`generation-${++counter}`,index:[{cptid:101}],tracking:{prospects:{}},
    state:{configured:true,dashboardGeneration:`generation-${counter}`,readySnapshot:{pool:[]}}});
  let next=bundle();
  const client=compile("lib/dashboard-ready.client.ts",{},{
    fetch:async(url,init)=>{
      calls.push({url,init});
      if(url.includes("-data-records?id="))return Response.json({ok:true});
      const snapshot=next;
      if(release===true)await new Promise(r=>{release=r;});
      if(mode==="failed")return Response.json({error:"unavailable"},{status:503});
      if(mode==="uncached"){
        if(url.includes("/api/dashboard-ready"))return Response.json({mode:"uncached"});
        if(url.includes("-data-records"))return Response.json({index:[{cptid:101}],directSourceRevision:"same"});
        if(url.includes("-data-tracking"))return Response.json({prospects:{},directSourceRevision:"same"});
        return Response.json({configured:true,prospects:[],gifts:[],updates:[],batches:[],directSourceRevision:"same"});
      }
      return Response.json(snapshot);
    },
  });
  const seenA=[],seenB=[];
  client.subscribeDashboardReady("jag",b=>seenA.push(b));
  client.subscribeDashboardReady("jag",b=>seenB.push(b));
  const [a,b]=await Promise.all([client.loadDashboardReady("jag"),client.loadDashboardReady("jag")]);
  assert.equal(a,b);assert.equal(seenA[0],seenB[0]);assert.equal(calls.length,1);
  assert.equal(a.index.dashboardGeneration,a.generation);
  await client.fetchDashboardRecord("jag",101);
  assert.ok(calls.at(-1).url.endsWith(`generation=${a.generation}`));

  // A save invalidates an already-running read, so its late response can
  // never overwrite the post-save paired generation in either provider.
  client.invalidateDashboardReady("jag");release=true;
  const old=client.loadDashboardReady("jag");
  await new Promise(r=>setImmediate(r));const unblock=release;release=false;
  client.invalidateDashboardReady("jag");next=bundle();
  const current=await client.loadDashboardReady("jag");unblock();await old;
  assert.equal(seenA.at(-1),current);assert.equal(seenB.at(-1),current);
  assert.equal(seenA.length,2,"superseded response was not published");


  const flagged=Response.json({ok:true},{headers:{"X-Dashboard-Refresh":"unconfirmed","X-Dashboard-Refresh-After":"5000"}});
  assert.equal(client.noteDashboardRefreshResponse("jag",flagged),true);
  next={...bundle(),state:{configured:true,dashboardGeneration:`generation-${counter}`,dashboardFreshness:{verifiedAt:4000}}};
  assert.equal((await client.loadDashboardReady("jag")).state.dashboardRefreshUnconfirmed,true,"retained pre-save view is not relabelled current");
  client.invalidateDashboardReady("jag");
  next={...bundle(),state:{configured:true,dashboardGeneration:`generation-${counter}`,dashboardFreshness:{verifiedAt:6000}}};
  assert.equal((await client.loadDashboardReady("jag")).state.dashboardRefreshUnconfirmed,false,"later verified ready read clears local barrier");
  client.invalidateDashboardReady("jag");mode="failed";
  await assert.rejects(client.loadDashboardReady("jag"),/unavailable/);
  assert.equal(calls.filter(c=>c.url.includes("-data-v2")).length,0,"transient ready failure never becomes permissive uncached fallback");
  mode="uncached";const uncached=await client.loadDashboardReady("jag");
  assert.equal(uncached.mode,"uncached");assert.equal(uncached.index.dashboardGeneration,undefined);
  await client.fetchDashboardRecord("jag",101);assert.doesNotMatch(calls.at(-1).url,/generation=/);
  console.log("PASS authenticated ready/cron routes, preview opt-in, disabled mode, shared browser single flight/publication, exact record generation, post-save supersession, no silent failure fallback");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
