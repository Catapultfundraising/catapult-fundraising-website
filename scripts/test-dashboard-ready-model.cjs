// Composed real ready model -> campaign owner -> direct owner; fictional IO only.
const fs=require("node:fs"),assert=require("node:assert/strict"),ts=require("typescript");
function compile(file,deps={},globals={}) {
  const m={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(file,"utf8"),{fileName:file,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,esModuleInterop:true,jsx:ts.JsxEmit.React}}).outputText;
  new Function("module","exports","require",...Object.keys(globals),js)(m,m.exports,name=>{
    if(name==="server-only")return {};
    if(name==="next/server")return {NextResponse:Response};
    if(Object.hasOwn(deps,name))return deps[name];
    if(name.startsWith("node:"))return require(name);
    return {};
  },...Object.values(globals));
  return m.exports;
}
async function main(){
  const clients=["csnf","jag","wcbhc","baq"];
  const fail=()=>{throw Error("recursive current cache getter");};
  let trackingReads=0,stateReads=0,directReads=0;
  const canonical={pvasCanonicalEnabled:()=>false};
  const newer=compile("lib/portal-v2/sql-newer.ts");
  const strict=compile("lib/portal-v2/direct-tracking-state.ts",{
    "./directFileProtocol":{DIRECT_FILE_MAX_IDS:5000,DIRECT_STATE_MAX_NOTES:10000},
  });
  const live={LIVE_CLIENTS:clients,liveLocalDir:()=>false,liveBuild:fail,sqlTracking:async()=>{
    trackingReads++;return {prospects:{},activity:[],removed:[]};
  }};
  const source=async client=>{
    directReads++;return {status:200,body:{protocol:"direct-file-v1",status:"known",scope:"whole-client",complete:true,
      client,revision:"a".repeat(64),observedAt:"2026-11-18T00:00:00.000Z",values:[],notes:[],note:"Fictional"}};
  };
  const direct=compile("lib/portal-v2/direct-source-state.server.ts",{
    "./pvas-canonical":canonical,"./direct-tracking-state":strict,
    "./direct-registration.server":{directLaneEnabled:()=>true},
    "./direct-tracking-reader.server":{strictTrackingFor:fail},
    "./direct-source-transport.server":{directSourceCall:source},
    "./directFileProtocol":{DIRECT_STATE_MAX_IDS:5000,DIRECT_STATE_MAX_NOTES:10000,DIRECT_STATE_MAX_BYTES:4000000},
    "./direct-effective-state":{DirectReadUnavailable:class extends Error{},sourceNoteEntries:()=>[]},
  });
  const emptyState={configured:true,prospects:[],gifts:[],updates:[],batches:[],giftOverrides:[]};
  const serverDeps={
    "./pvas-canonical":canonical,"./direct-source-state.server":direct,
    "./pvas-action.server":{pvasActionBody:(_c,_o,b)=>b},
    "@/lib/client-live-data.server":live,"@/lib/portal-v2/sql-newer":newer,
    "@/lib/pvas-data-store":{getPvasSnapshot:fail,getPvasRecords:fail},
    "@/lib/wcbhc-data-store":{getWcbhcSnapshot:fail,getWcbhcRecords:fail},
    "@/lib/baq-data-store":{getBaqSnapshot:fail,getBaqRecords:fail},
    "@/lib/portal-v2/clients":{PORTAL_V2:{}},
    "@/lib/portal-v2/match":{nameKey:s=>s.toLowerCase().trim()},
  };
  const server=compile("lib/portal-v2/server.ts",serverDeps,{
    process:{env:{NODE_ENV:"production",ENGAGE_PORTAL_URL:"https://fictional.invalid",PORTAL_WRITE_SECRET:"fictional"}},
    fetch:async()=>{stateReads++;return Response.json(emptyState);},
  });
  const model=compile("lib/dashboard-ready-model.server.ts",{
    "./portal-v2/server":server,"./portal-v2/direct-source-state.server":direct,
    "./portal-v2/pvas-canonical":canonical,"./client-live-data.server":live,"./portal-v2/sql-newer":newer,
    // These projections have separate owner tests. This regression deliberately
    // keeps the real async campaign/direct owners, not observe/model mocks.
    "./portal-v2/records-route":{currentRecordProjection:(_c,r)=>r},
    "./portal-v2/current-dashboard-snapshot":{currentDashboardSnapshot:(_c,s)=>s},
  });
  for(const client of clients){
    const snapshot={committed:[{cptid:101,name:"Fictional donor",ask:75}],portfolio:[],givebutter:{
      transactions:[{cptid:101,name:"Fictional donor",amount:25,campaign:"Fictional",date:"2026-11-01",status:"paid"},
        {cptid:102,name:"Other fictional donor",amount:30,campaign:"Fictional",date:"2026-11-02",status:"paid"}],pledges:[]}};
    const built={snapshot,records:{index:[{cptid:101,name:"Fictional donor"}],records:{"101":{cptid:101,portfolio:{}}}},pirs:{}};
    const before=JSON.stringify(built),read=await model.prepareDashboardRead(client,built);
    assert.equal(JSON.stringify(built),before,"immutable in-progress snapshot/records are not mutated");
    assert.equal(read.tracking.directSourceRevision,"a".repeat(64));
    if(["wcbhc","baq"].includes(client)){
      assert.deepEqual(read.state.gifts.map(g=>g.amount),[75,30],"campaign gifts and Stewardship replacement semantics preserved");
      assert.equal(read.state.gifts[0].kind,"pledge");
    }else assert.deepEqual(read.state.gifts,[]);
  }
  assert.equal(trackingReads,4,"one SQL tracking read per preparation");
  assert.equal(stateReads,4);assert.equal(directReads,4);


  let directOn=true,queries=[];
  const fingerprint=compile("lib/portal-refresh/fingerprint.ts",{
    "./common":{rows:async sql=>{queries.push(sql);return sql.startsWith("SELECT t.name")
      ? [...Array.from({length:65},(_,i)=>({name:`fictional_long_source_table_${i}`})),{name:"legacy_engage_portal_batches"},{name:"legacy_retired"}]
      : Array.from(sql.matchAll(/SELECT '([^']+)' t/g),m=>({t:m[1],c:"1",k:"b".repeat(64)}));}},
    "../portal-v2/direct-registration.server":{directLaneEnabled:()=>directOn},
    "../portal-v2/direct-source-transport.server":{directSourceCall:source},
    "../portal-v2/direct-source-state.server":direct,
  });
  const fp=await fingerprint.clientFingerprint("wcbhc",true);
  assert.ok(fp.includes("direct-file-state"));assert.ok(fp.includes("a".repeat(64)));
  assert.ok(queries.length>2,"large schema hashes are split under gateway SQL limit");
  assert.ok(queries.every(sql=>sql.length<=19000));assert.ok(queries.every(sql=>!sql.includes("source_import.requests")));
  queries=[];directOn=false;
  assert.ok(!(await fingerprint.clientFingerprint("baq",true)).includes("direct-file-state"),"dependency mode matches actual direct owner");
  queries=[];await fingerprint.clientFingerprint("pvas",true);
  assert.ok(queries.some(sql=>sql.includes("pvas.[legacy_engage_portal_batches]")),"PVAS historical upload archive is fingerprinted");
  assert.ok(queries.every(sql=>!sql.includes("[legacy_retired]")));
  let opts;
  const adapter=compile("lib/dashboard-ready-blob.server.ts",{"@vercel/blob":{
    put:async(_p,_b,o)=>{opts=o;return {etag:"fictional-next"};},
  }},{process:{env:{BLOB_STORE_ID:"fictional"}}});
  await adapter.readyBlobStore.put("fictional.json",Buffer.from("{}"),null);
  assert.equal(opts.allowOverwrite,false);assert.equal(opts.ifMatch,undefined);
  await adapter.readyBlobStore.put("fictional.json",Buffer.from("{}"),"fictional-etag");
  assert.equal(opts.allowOverwrite,true);assert.equal(opts.ifMatch,"fictional-etag");
  // Exercise the actual provider's imperative callback with hooks captured at
  // render; an undo/save calls this callback, not a test-only invalidation.
  let callbacks=[],trace=[];
  compile("components/portal-v2.tsx",{
    react:{createContext:()=>({Provider:()=>null}),useState:x=>[x,()=>{}],useCallback:f=>(callbacks.push(f),f),useEffect:()=>{}},
    "@/lib/dashboard-ready.client":{loadDashboardReady:async c=>trace.push(`load:${c}`),invalidateDashboardReady:c=>trace.push(`invalidate:${c}`)},
    "@/lib/portal-v2/clients":{PORTAL_V2:{}},
  },{React:{createElement:()=>null}}).PortalV2Provider({client:"jag",children:null});
  await callbacks[1]();
  assert.deepEqual(trace,["invalidate:jag","load:jag"]);
  trace=[];await callbacks[0]();assert.deepEqual(trace,["load:jag"],"periodic load retains known optimization");
  console.log("PASS composed all-four ready campaign/direct owners: no recursive getters, one tracking read, Stewardship gifts, immutable inputs; actual Blob CAS options; actual provider imperative post-save epoch boundary");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
