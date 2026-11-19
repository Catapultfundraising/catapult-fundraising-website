// Fictional current-own ask composition; no actual producer, SQL or network.
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),Module=require("node:module");
const assert=require("node:assert/strict"),ts=require("typescript"),React=require("react");
const {renderToStaticMarkup}=require("react-dom/server"),original=Module._load,root=process.cwd();
let gate=true,built,common,askCalls=0,overlayCalls=0,editorState,editorHook=0,reportPool,reportExtraIds;
const canonical={pvasCanonicalEnabled:client=>gate&&client==="pvas",PVAS_CANONICAL_ACCEPTED:false};
const transpile=(source,file)=>ts.transpileModule(source,{fileName:file,compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,
}}).outputText;
for(const ext of [".ts",".tsx"])require.extensions[ext]=(m,f)=>m._compile(transpile(fs.readFileSync(f,"utf8"),f),f);
let effective;
Module._load=function(name,parent,main){
  if(name==="server-only")return {};
  if(name==="next/server")return {NextResponse:Response};
  if(name.endsWith("/pvas-canonical")||name==="./pvas-canonical")return canonical;
  if(name==="./common"&&parent.filename.endsWith("/portal-refresh/pvas.ts"))return common;
  if(name==="../portal-v2/pvas-native-gifts.server")return {readPvasNativeGiftsV2:async()=>({v:2,lane:"history",view:"current",records:[]})};
  if(name==="@/lib/portal-v2/server")return {};
  if(name==="react"&&parent.filename.endsWith("/components/ask-amount-panel.tsx"))return {...React,
    useEffect:()=>{},useState:initial=>[editorHook++===0?editorState:initial,()=>{}]};
  if(name==="@/lib/portal-v2/pvas-action.client")return {pvasActionFetch:()=>{throw Error("No mutation");}};
  if(name==="./direct-source-state.server")return {requireCurrentSql:()=>{},currentTracking:async(_client,get)=>get()};
  if(name==="./effective-ask"&&effective)return {...effective,
    effectiveAsk:(...args)=>{askCalls++;return effective.effectiveAsk(...args);},
    overlayCampaignAsks:(...args)=>{overlayCalls++;return effective.overlayCampaignAsks(...args);}};
  if(name.startsWith("@/"))name=path.join(root,name.slice(2));
  return original.call(this,name,parent,main);
};
global.fetch=async()=>{throw Error("No network");};
const load=name=>require(path.join(root,name));
effective=load("lib/portal-v2/effective-ask.ts");
const fields=Object.fromEntries("fullName firstName middleName lastName street street2 city state zip phone phone2 email email2 spouseFirstName spouseMiddleName spouseLastName ask primarySolicitor secondarySolicitor phone3 phone4 dsRating wealthCapacity majorGiftScore realEstate stock status outcome".split(" ").map(k=>[k,null]));
const profile=(id,ask)=>({cptid:id,clientId:null,presence:{},fields:{...fields,ask},
  extras:{},identity:{isProspect:false,deleted:false,deleteReason:null,mergedInto:null,version:0,createdBy:null,createdAt:null}});
const profiles=[profile(1,250000),profile(2,500000),profile(3,null),profile(4,null)];
const fixtures={
  portfolio:[1,2,3].map(CPTID=>({CPTID,row_id:CPTID,Account_Name:`Fictional ${CPTID}`,Campaign_Ask:999999})),
  giving_history_overview:[{CPTID:3,Total_Gift_Amount:123.45,Total_of_Gifts:2,Largest_Gift_Amount:100}],
  calendar_year_giving:[{CPTID:3,Calendar_Year:2020,SumOfGift_Amount:123.45}],
  board_info:[{CPTID:3,Account_Name:"Fictional board"},{CPTID:1,Account_Name:"Fictional source board"}],
};
const realCommon=load("lib/portal-refresh/common.ts");
common={...realCommon,rows:async query=>structuredClone(fixtures[query.match(/pvas\.\[([a-z_]+)\]/)?.[1]]??[]),
  loadedAsOf:async()=>"2026-11-17",pirLinks:async()=>({}),
  engageClientContacts:async()=>profiles.map(p=>({cptid:p.cptid,name:`Fictional ${p.cptid}`,_canonicalContact:structuredClone(p)}))};
const update=(id,cptid,field,new_value)=>({id,cptid,field,new_value,old_value:null});
const updates=[update(1,1,"merged_into","2"),update(2,2,"merged_into","3"),
  update(3,1,"ask","750000"),update(4,2,"ask","1000000"),update(5,3,"ask","1500000")];
const state={prospects:[],gifts:[],batches:[],updates};
const tracking={prospects:Object.fromEntries(profiles.map(p=>[p.cptid,{solicitor:"",solicitor2:"",updatedAt:"",by:"",
  _canonicalTracking:{objectPresent:false,statusPresent:false}}])),activity:[],pirs:{}};
function compile(source,require){
  const exports={},context=vm.createContext({exports,require,console,process,Buffer,Request,Response,AbortSignal,
    setTimeout,clearTimeout,TextDecoder});
  vm.runInContext(transpile(source,"source.tsx"),context);return exports;
}
function getAskGateway(){
  return compile(fs.readFileSync(path.join(root,"lib/portal-v2/server.ts"),"utf8"),name=>{
    if(name.endsWith("dashboard-ready-invalidation.server"))return {withDashboardMutationRefresh:run=>run};
    if(name==="./pvas-canonical")return canonical;
    if(name==="./pvas-action.server")return load("lib/portal-v2/pvas-action.server.ts");
    if(name==="next/server")return {NextResponse:Response};
    if(name.endsWith("-auth"))return new Proxy({},{get:()=>async()=>true});
    if(name==="@/lib/pvas-data-store")return {getPvasRecords:async()=>built.records};
    if(name.endsWith("/clients"))return {PORTAL_V2:{pvas:{goal:9000000}}};
    return {};
  }).portalV2Route("pvas");
}
async function reportBranch(snapshot){
  reportPool=null;
  const report=compile(fs.readFileSync(path.join(root,"app/api/pvas-data-reports/route.tsx"),"utf8"),name=>{
    if(name.endsWith("/pvas-canonical"))return canonical;
    if(name.endsWith("/current-dashboard-snapshot"))return load("lib/portal-v2/current-dashboard-snapshot.ts");
    if(name.endsWith("/records-route"))return load("lib/portal-v2/records-route.ts");
    if(name==="next/server")return {NextResponse:Response};
    if(name.endsWith("/gift-report-layout"))return {reportDataAsOf:()=>"Fictional build date"};
    if(name.endsWith("/pvas-data-auth"))return {isPvasDataAuthed:async()=>true};
    if(name.endsWith("/pvas-data-store"))return {getPvasSnapshot:async()=>snapshot,getPvasRecords:async()=>built.records};
    if(name.endsWith("/pvas-tracking"))return {getPvasTracking:async()=>tracking};
    if(name.endsWith("/direct-source-state.server"))return {
      directData:async(_client,value)=>value,currentTracking:async(_client,get)=>get(),
      directTrackingView:async(_client,value)=>value,requireCurrentSql:()=>{},
    };
    if(name.endsWith("/server"))return {portalStateSafe:async()=>state};
    if(name.endsWith("/record-overlay"))return load("lib/portal-v2/record-overlay.ts");
    if(name.endsWith("/effective-ask"))return {...effective,overlayCampaignAsks:(...args)=>{
      overlayCalls++;return effective.overlayCampaignAsks(...args);
    }};
    if(name.endsWith("/gift-chart"))return load("lib/gift-chart.ts");
    if(name.endsWith("/pvas-gc2p"))return {extrasFromIndex:index=>{reportExtraIds=index.map(row=>row.cptid);return [];},seatGc2p:(_goal,pool)=>{
      reportPool=pool;throw Error("Stop after actual report ask composition, before rendering");
    }};
    return {};
  });
  const response=await report.GET({nextUrl:new URL("https://fixture.invalid?report=gc2p&goal=9000000")});
  assert.equal(response.status,503);assert.ok(reportPool,"actual report reached captured GC2P pool");
  return reportPool;
}
function hookReader(extraState={}){
  return compile(fs.readFileSync(path.join(root,"components/portal-v2.tsx"),"utf8"),name=>{
    if(name==="react")return {...React,useContext:()=>({client:"pvas",state:{...state,configured:true,...extraState}}),useMemo:fn=>fn()};
    if(name.endsWith("/pvas-canonical"))return canonical;
    if(name.endsWith("/current-dashboard-snapshot"))return load("lib/portal-v2/current-dashboard-snapshot.ts");
    return {};
  }).useCampaignAskSnapshot;
}
async function main(){
  const {buildCanonicalPvas}=load("lib/portal-refresh/pvas.ts");
  const {currentRecordProjection,recordsRoute}=load("lib/portal-v2/records-route.ts");
  const {currentDashboardSnapshot}=load("lib/portal-v2/current-dashboard-snapshot.ts");
  const {AskAmountPanel}=load("components/ask-amount-panel.tsx"),gateway=getAskGateway();
  const hook=hookReader();
  for(const raw of [null,0,625000]){
    profiles[2].fields.ask=raw;profiles[3].fields.ask=raw;
    built=await buildCanonicalPvas();
    for(const id of [3,4])assert.equal(built.records.records[id].portfolio.ask,raw,"full record raw NULL/zero/number, portfolio and nonportfolio");
    assert.equal(built.snapshot.portfolio.find(p=>p.cptid===3).ask,raw??0,"numeric cell presentation not raw SQL0");
    assert.equal(built.snapshot.board[0].ask,raw??0);
    assert.equal(built.snapshot.kpi.total,123.45);assert.equal(built.records.records[3].summary.lifetime,123.45);
    assert.deepEqual(built.records.records[3].years,[{year:2020,amount:123.45}]);
    const before=JSON.stringify({built,state,tracking}),start=askCalls;
    const current=currentRecordProjection("pvas",built.records,state,tracking);
    const record=current.record(1);
    assert.equal(record.cptid,3);assert.equal(record.campaignAsk.ask,raw);assert.equal(record.portfolio.ask,raw);
    assert.deepEqual(record.campaignAsk,{ask:raw,askEdited:true,askBlank:raw===null});
    assert.equal(record.mergedFrom.length,2);assert.equal(askCalls,start,"no old base/board/merge precedence invoked");
    assert.equal(effective.campaignAskAmount(record.campaignAsk,999999),raw??0);
    assert.equal(JSON.stringify({built,state,tracking}),before,"source raw inputs untouched");
    if(process.argv.includes("--reproduce-post-assignment-gap")){
      const visible=currentDashboardSnapshot("pvas",built.snapshot,current.index,tracking,updates);
      assert.ok(visible.pool.some(p=>p.cptid===3&&p.ask>0));
      console.log("REPRODUCED bypass-only snapshot: hidden source pool membership retained positive ask under NULL survivor");
      return;
    }
    const reply=await gateway.POST(new Request("https://fixture.invalid",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({op:"getAsk",cptid:3})}));
    assert.equal(reply.status,200);editorState=await reply.json();assert.equal(editorState.ask,raw);assert.equal(editorState._canonicalExpected,raw);
    editorHook=0;const html=renderToStaticMarkup(React.createElement(AskAmountPanel,{client:"pvas",cptid:3,base:999999}));
    assert.ok(html.includes(raw===null?"Not set":raw.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0})));
    const priorOverlay=overlayCalls;
    const visible=currentDashboardSnapshot("pvas",built.snapshot,current.index,tracking,updates);
    assert.equal(overlayCalls,priorOverlay,"canonical snapshot never invokes legacy ask fold");
    // Source-only pool membership must not relabel a hidden ask as own current ask.
    assert.ok(visible.pool.every(p=>p.cptid!==3||p.ask===(raw??0)),"canonical own snapshot ask under merged source membership");
    assert.ok(visible.pool.every(p=>p.rating===p.ask&&p.ask>0),"canonical builder pool rule; no source rating fallback");
    assert.equal(visible.portfolio.find(p=>p.cptid===3).ask,raw??0);
    assert.equal(visible.board[0].ask,raw??0);
    assert.equal(visible.board[1].cptid,1,"existing board membership/identity untouched");
    assert.equal(visible.board[1].ask,raw??0,"active source board reads final survivor own ask");
    assert.deepEqual(visible.kpi,built.snapshot.kpi);assert.deepEqual(visible.fys,built.snapshot.fys);
    const rows=await reportBranch(built.snapshot);
    assert.deepEqual(reportExtraIds,[3,4],"GC2P extras receive same filtered current index, not raw hidden sources");
    assert.deepEqual(rows.map(p=>[p.cptid,p.ask,p.rating]),visible.pool.map(p=>[p.cptid,p.ask,p.rating]),"actual standalone GC2P uses same current identity + own ask composition");
    assert.equal(overlayCalls,priorOverlay,"standalone canonical report never invokes legacy ask fold");
    assert.throws(()=>currentDashboardSnapshot("pvas",built.snapshot,null,tracking,updates));
    assert.throws(()=>currentDashboardSnapshot("pvas",built.snapshot,[...current.index,current.index[0]],tracking,updates),/Ambiguous/);
    assert.equal(hook(built.snapshot,null,tracking).directReadUnavailable,true,"actual hook initial load gates before strict core");
    const invalidIndex=current.index.map(row=>({...row,_canonicalContact:undefined}));
    assert.throws(()=>currentDashboardSnapshot("pvas",built.snapshot,invalidIndex,tracking,updates));
    assert.equal(hook(built.snapshot,invalidIndex,tracking).directReadUnavailable,true);
    assert.equal(hook(built.snapshot,current.index,tracking).directReadUnavailable,undefined);
    // Exercise the actual HTTP serialization boundary, not the rich server index.
    const api=recordsRoute("pvas",async()=>true,async()=>built.records,async()=>tracking,async()=>state);
    const http=await api.GET({nextUrl:new URL("https://fixture.invalid/api/pvas-data-records")});
    assert.equal(http.status,200);
    const wire=await http.json();
    assert.ok(wire.index.every(row=>!Object.hasOwn(row,"_canonicalContact")),"full editor profiles stay off HTTP index");
    const browser=hook(built.snapshot,wire.index,tracking);
    assert.equal(browser.directReadUnavailable,undefined,"serialized HTTP index must satisfy actual dashboard hook");
    assert.deepEqual(JSON.parse(JSON.stringify(browser)),JSON.parse(JSON.stringify(visible)),"slim browser composition matches rich server asks/assignments/merges");
    assert.deepEqual(wire.index.find(row=>row.cptid===3)._canonicalAsk,{cptid:3,ask:raw},"raw NULL/zero/value survives JSON exactly");
    assert.equal(hookReader({directSourceRevision:"new"})(built.snapshot,wire.index,tracking).directReadUnavailable,true,"revision mismatch remains gated");
    const paired=Object.assign([...wire.index],{directSourceRevision:"same"});
    assert.equal(hookReader({directSourceRevision:"same"})(built.snapshot,paired,tracking).directReadUnavailable,undefined);
    for(const malformed of [undefined,null,{}, {cptid:2,ask:raw}, {cptid:3},
      {cptid:3,ask:undefined},{cptid:3,ask:"123"},{cptid:3,ask:false},
      {cptid:3,ask:NaN},{cptid:3,ask:Infinity},{cptid:3,ask:raw,extra:true}]){
      const badWire=wire.index.map(row=>row.cptid===3?{...row,_canonicalAsk:malformed}:row);
      assert.equal(hook(built.snapshot,badWire,tracking).directReadUnavailable,true,"malformed compact owner fails closed");
      // Even a rich profile must not hide a malformed present compact owner.
      const mixed=badWire.map(row=>({...row,_canonicalContact:profiles.find(p=>p.cptid===row.cptid)}));
      assert.equal(hook(built.snapshot,mixed,tracking).directReadUnavailable,true);
    }
    const missingWire=wire.index.map(row=>{const copy={...row};delete copy._canonicalAsk;return copy;});
    assert.equal(hook(built.snapshot,missingWire,tracking).directReadUnavailable,true,"missing compact/full ask cannot become default zero");
    const absentSurvivor=wire.index.filter(row=>row.cptid!==3);
    assert.equal(hook(built.snapshot,absentSurvivor,tracking).directReadUnavailable,true,"missing merged survivor remains unavailable");
    const invalidBuild=structuredClone(built.records);
    invalidBuild.index.find(row=>row.cptid===3)._canonicalContact.fields.ask="123";
    const invalidApi=recordsRoute("pvas",async()=>true,async()=>invalidBuild,async()=>tracking,async()=>state);
    assert.equal((await invalidApi.GET({nextUrl:new URL("https://fixture.invalid")})).status,503,"server never serializes invalid raw asks");


    const sourceOnly={...built.snapshot,pool:[{...built.snapshot.portfolio.find(row=>row.cptid===1),rating:250000}],
      portfolio:[{...built.snapshot.portfolio.find(row=>row.cptid===1)}],board:[]};
    const missingSurvivor=current.index.filter(row=>row.cptid!==3),sourceOnlyBytes=JSON.stringify(sourceOnly);
    assert.throws(()=>currentDashboardSnapshot("pvas",sourceOnly,missingSurvivor,tracking,updates),
      /profile unavailable/,"raw linked source cannot disappear before required survivor validation");
    assert.equal(hook(sourceOnly,missingSurvivor,tracking).directReadUnavailable,true);
    assert.equal(JSON.stringify(sourceOnly),sourceOnlyBytes);
    const deletedUpdates=[...updates,update(6,3,"deleted","Fictional deleted target")];
    const excluded=currentDashboardSnapshot("pvas",sourceOnly,missingSurvivor,tracking,deletedUpdates);
    assert.deepEqual(excluded.pool,[]);assert.deepEqual(excluded.portfolio,[],
      "deleted targets retain original membership exclusion without borrowing/defaulting");
    const dirty=structuredClone(built.snapshot);
    for(const lane of ["pool","portfolio","board"])for(const row of dirty[lane])Object.assign(row,{
      askEdited:true,askBlank:true,askConflict:true,askFromCptid:1,directAskPresent:true,directManualAskPresent:true});
    const clean=currentDashboardSnapshot("pvas",dirty,current.index,tracking,updates);
    for(const lane of ["pool","portfolio","board"])for(const row of clean[lane])for(const key of [
      "askEdited","askBlank","askConflict","askFromCptid","directAskPresent","directManualAskPresent",
    ])assert.equal(Object.hasOwn(row,key),false,"no inherited/global source authority flags");
  }
  for(const malformed of [undefined,"123",false,NaN]){
    profiles[2].fields.ask=malformed;
    await assert.rejects(buildCanonicalPvas);
    const bad=structuredClone(built.records);bad.records[3]._canonicalContact.fields.ask=malformed;
    assert.throws(()=>currentRecordProjection("pvas",bad,state,tracking).record(3));
    assert.throws(()=>currentDashboardSnapshot("pvas",built.snapshot,bad.index,tracking,updates));
  }
  delete profiles[2].fields.ask;await assert.rejects(buildCanonicalPvas);
  const missing=structuredClone(built.records);delete missing.records[3]._canonicalContact.fields.ask;
  assert.throws(()=>currentRecordProjection("pvas",missing,state,tracking).record(3));
  gate=false;
  const legacySnapshot={pool:[{cptid:3,ask:0,rating:123}],portfolio:[{cptid:3,ask:0}],board:[]};
  assert.equal(effective.campaignAskAmount(legacySnapshot.pool[0]),123);
  for(const client of ["pvas","csnf","jag","wcbhc","baq"]){
    gate=client!=="pvas";
    const count=overlayCalls;currentDashboardSnapshot(client,legacySnapshot,null,undefined,[]);
    assert.equal(overlayCalls,count+1,"legacy fold still runs");
    const current=currentRecordProjection(client,built.records,state,tracking).record(3);
    assert.equal(current.campaignAsk.ask,1500000,"legacy survivor manual edit unchanged");
  }
  console.log("PASS canonical raw ask NULL/zero/number, builder/editor/current record and snapshot/report owner; legacy clients/fallback unchanged");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
