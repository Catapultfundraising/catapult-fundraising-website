// Fictional paired consumers. Reuse the already-pinned strict backend fixture;
// no helper/data/SQL/runtime capability, no external network or new test setup.
const {campaign,history,event,transport,wire}=require("./test-pvas-native-read-foundation.cjs");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),Module=require("node:module");
const assert=require("node:assert/strict"),ts=require("typescript"),React=require("react");
const {renderToStaticMarkup}=require("react-dom/server"),root=process.cwd(),fixtureLoader=Module._load;
let gate=true,networkCalls=0,ctx;
const canonical={pvasCanonicalEnabled:c=>gate&&c==="pvas"};
require.extensions[".tsx"]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{
  fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
}).outputText,f);
Module._load=function(name,parent,main){
  if(name==="server-only")return {};
  if(name.endsWith("/pvas-canonical")||name==="./pvas-canonical")return canonical;
  if(name==="react"&&parent.filename.endsWith("/components/portal-v2.tsx"))return {...React,useContext:()=>ctx};
  if(name==="@/lib/portal-v2/pvas-action.client")return {pvasActionFetch:()=>{networkCalls++;throw Error("No gift write permitted");}};
  if(name==="@/components/dashboard-shared")return {useSort:rows=>({sorted:rows}),SortTh:()=>null,NameLink:p=>p.name,DateInput:()=>null};
  if(name.startsWith("@/components/")&&name!=="@/components/pvas-native-history")return new Proxy({},{get:()=>()=>null});
  return fixtureLoader.call(this,name,parent,main);
};
const load=name=>require(path.join(root,name));
const consume=load("lib/portal-v2/pvas-native-consumer.ts"),stateWire=load("lib/portal-v2/pvas-state-wire.ts");
const reader=load("lib/portal-v2/pvas-native-gifts.server.ts"),action=load("lib/portal-v2/pvas-action.server.ts");
const compile=(source,require,extra={})=>{
  const exports={},context=vm.createContext({exports,require,console,process,Buffer,Request,Response,AbortSignal,TextDecoder,setTimeout,clearTimeout,...extra});
  vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,context);
  return exports;
};
async function main(){
  process.env.ENGAGE_PORTAL_URL="https://fixture.invalid/portal";process.env.PORTAL_WRITE_SECRET="synthetic-not-a-secret";
  const start=BigInt("9007199254740993"),records=Array.from({length:501},(_,i)=>campaign(i+1,(start+BigInt(i)).toString(),i===500));
  records.push(event(600,(start+BigInt(501)).toString(),"received","campaign","0.10"));
  const calls=[],send=transport(records,calls);
  const first=await send({op:"nativeGiftPageV2",client:"pvas",request:consume.NATIVE_STATE_CAMPAIGN_REQUEST});
  assert.equal(first.records.length,500);assert.equal(first.done,false);calls.length=0;
  const raw={configured:true,giftWireVersion:2,nativeCampaignPage:first,prospects:[],updates:[],batches:[],historicalBatchPage:{next:null,done:true}};
  const bytes=JSON.stringify(raw),whole=await consume.consumeNativeStateCampaignV2(raw,send);
  assert.equal(whole.records.length,502);assert.deepEqual(calls.map(c=>c.after),[first.next],"embedded initial page used exactly once, only tail fetched");
  assert.deepEqual(calls.map(c=>c.limit),[500]);assert.equal(JSON.stringify(raw),bytes);
  for(const bad of [{...raw,gifts:[]},{...raw,giftOverrides:[]},{...raw,voidedGifts:[]},{...raw,giftWireVersion:1},{...raw,nativeCampaignPage:{...first,view:"provenance"}}])
    await assert.rejects(()=>consume.consumeNativeStateCampaignV2(bad,()=>{throw Error("Bad state must not fetch");}));
  let later=0;await assert.rejects(()=>consume.consumeNativeStateCampaignV2(raw,async()=>{later++;throw Error("tail unavailable");}));assert.equal(later,1);
  console.log("PASS state marker2 / fixed limit500 / exact strict backend / initial once + complete BIGINT cursor tail; legacy arrays, wrong view and failed tail HOLD");

  let gatewayCalls=[];
  const backendFetch=async(_url,init)=>{
    assert.equal(init.cache,"no-store");const body=JSON.parse(init.body);gatewayCalls.push(body);
    if(body.op==="state")return Response.json(raw);
    assert.deepEqual(Object.keys(body).sort(),["client","op","request"],"new read never gains mutation requestId or command");
    return Response.json(await send(body));
  };
  const gateway=compile(fs.readFileSync(path.join(root,"lib/portal-v2/server.ts"),"utf8"),name=>{
    if(name==="./pvas-action.server")return action;
    if(name==="./pvas-canonical")return canonical;
    if(name==="./pvas-state-wire")return stateWire;
    if(name==="./pvas-native-consumer")return consume;
    if(name==="./pvas-native-gift-wire")return wire;
    if(name==="next/server")return {NextResponse:Response};
    if(name.endsWith("-auth"))return new Proxy({},{get:()=>async()=>true});
    if(name==="@/lib/pvas-data-store")return {getPvasRecords:async()=>({records:{}}),invalidatePvasDataCache:()=>{}};
    if(name.endsWith("/clients"))return {PORTAL_V2:{pvas:{goal:1}}};
    return {};
  },{fetch:backendFetch});
  const current=await gateway.engageCall("pvas","state");
  assert.equal(current.status,200);assert.equal(current.body.gifts.length,502);
  assert.equal(current.body.nativeCampaignInventory.length,502);
  assert.equal(current.body.gifts[500].id,"9007199254740993","manual original source ID remains a string");
  assert.equal(current.body.gifts[0].amount,0.3);assert.equal(current.body.gifts[501].amount,0.1);
  assert.equal(current.body.gifts.some(row=>Object.hasOwn(row,"amountExact")),false,"no fake FLOAT decimal lane");
  assert.equal(current.body.gifts[501]._nativeGift.event.amount,"0.10","exact event storage retained in metadata");
  assert.equal(Object.hasOwn(current.body,"giftOverrides"),false);
  const request={v:2,lane:"campaign",view:"provenance",after:null,limit:1};
  const fullBody={op:"nativeGiftPageV2",client:"pvas",request};
  const response=await gateway.portalV2Route("pvas").POST(new Request("https://fixture.invalid",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(fullBody)}));
  assert.equal(response.status,200);assert.equal((await response.json()).view,"provenance");
  assert.deepEqual(gatewayCalls.at(-1),{op:"nativeGiftPageV2",client:"pvas",request});
  const clientTransport=load("lib/portal-v2/pvas-action.client.ts");
  for(const body of [fullBody,{op:"pvasHistoricalUploads",before:null,limit:100}]){
    global.fetch=async(_url,init)=>{assert.deepEqual(JSON.parse(init.body),body);return Response.json({read:true});};
    const response=await clientTransport.pvasActionFetch("pvas","/fixture",{method:"POST",body:JSON.stringify(body)});
    assert.deepEqual(await response.json(),{read:true},"read path never creates a mutation identity or receipt");
  }
  const beforeWrong=gatewayCalls.length;
  assert.equal((await gateway.portalV2Route("pvas").POST(new Request("https://fixture.invalid",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...fullBody,client:"jag"})}))).status,400);
  assert.equal(gatewayCalls.length,beforeWrong,"authenticated client scope cannot be changed by page body");
  console.log("PASS actual gateway state -> embedded + paged strict native backend -> decoder/presentation; exact native read route; FLOAT lane and raw source/version/Decimal metadata retained");

  const h=history(),historyCalls=[];
  global.fetch=async(_url,init)=>{networkCalls++;return Response.json(await transport([h],historyCalls)(JSON.parse(init.body)));};
  const historyStream=await reader.readPvasNativeGiftsV2("history","current");
  assert.equal(historyStream.records[0].native.amount,"-90071992547409.91");
  assert.deepEqual(historyCalls,[{v:2,lane:"history",view:"current",after:null,limit:500}]);
  const donorHistory={...historyStream},detail=consume.nativeHistoryDetail(donorHistory,9);
  assert.equal(detail[0].date,null);assert.equal(detail[0].year,2020);assert.equal(detail[0].status,"RefUnDeD");
  assert.equal(detail[0].loadedAt,"2026-10-23T12:00:00.1234567");
  const {PvasNativeHistory}=load("components/pvas-native-history.tsx");
  const html=renderToStaticMarkup(React.createElement(PvasNativeHistory,{history:donorHistory,cptid:9}));
  for(const text of ["-90071992547409.91","SQL NULL","2020","RefUnDeD","2026-10-23T12:00:00.1234567","9007199254740993","current view"])assert.ok(html.includes(text));
  const exportModel=load("lib/portal-v2/pvas-export-model.ts");
  const r={cptid:9,name:"Fictional",nativeGiftHistory:donorHistory,summary:{lifetime:123,gifts:4,largest:40,years:2,band:"Fictional"}};
  const out=exportModel.recordPayload(r),section=out.sections.find(s=>s.heading?.startsWith("Original historical detail"));
  assert.equal(out.cols[1].kind,"text");assert.equal(section.rows[0][1],h.native.amount);
  assert.equal(section.rows[0][2],null);assert.equal(section.rows[0][3],2020);
  assert.deepEqual(JSON.parse(section.rows[0][12]),h,"export keeps all raw columns/types/aliases/version/order");
  assert.equal(section.rows[0][11],"current");assert.ok(out.sections.every(s=>s.rows.every(row=>row.length===13)));
  assert.throws(()=>exportModel.recordPayload({...r,nativeGiftHistory:undefined}),/unavailable/);
  assert.throws(()=>consume.nativeHistoryDetail(donorHistory,8),/record/);
  console.log("PASS actual history authenticated transport -> raw signed Decimal/date/year/status/loadedAt -> read-only SSR + typed-source export, no SQL-history sums or empty fallback");

  const {CampaignDonors}=load("components/portal-v2.tsx");
  ctx={client:"pvas",state:{...current.body,goal:1000},reload:()=>{throw Error("Unexpected reload");}};
  const beforeWrites=networkCalls;
  const campaignHtml=renderToStaticMarkup(React.createElement(CampaignDonors));
  assert.ok(campaignHtml.includes("Native gift detail is read-only"));
  assert.ok(campaignHtml.includes("Gift entry is unavailable"));
  assert.ok(campaignHtml.includes("Native campaign source facts"));
  assert.equal(networkCalls,beforeWrites,"render never enters v1 gift writes");
  gate=false;const count=networkCalls;await assert.rejects(()=>reader.readPvasNativeGiftsV2("history"));assert.equal(networkCalls,count,"offgate sends nothing");
  const old=exportModel.recordPayload({...r,nativeGiftHistory:undefined,gifts:[{date:"2020",amount:12}]});
  assert.equal(old.cols[1].kind,"usd");assert.equal(old.sections.at(-1).rows[0][1],12);
  assert.equal(JSON.stringify(raw),bytes,"all caller source facts remain unmodified");
  console.log("PASS actual campaign UI native read-only/no v1 writes; offgate no native transport; original legacy record export unchanged");
}
main().catch(error=>{console.error(error);process.exitCode=1});
