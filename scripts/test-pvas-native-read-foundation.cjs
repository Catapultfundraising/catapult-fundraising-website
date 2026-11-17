/* Fictional composed caller -> pinned backend reader -> strict website decoder
 * -> pure presentation. No route/capability issuer, SQL or network. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),crypto=require("node:crypto"),Module=require("node:module"),ts=require("typescript");
const root=path.resolve(__dirname,".."),fixture=path.join(__dirname,"fixtures/pvas-native-v2"),original=Module._load;
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const pins=JSON.parse(fs.readFileSync(path.join(fixture,"pins.json"),"utf8"));
for(const [name,pin]of Object.entries(pins.files))assert.equal(sha(fs.readFileSync(path.join(fixture,name))),pin,name);
for(const ext of [".ts",".source"])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{
  fileName:f.replace(/\.source$/,""),compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
Module._load=function(name,parent,main){
  if(parent?.filename.startsWith(fixture)&&name.startsWith("./"))name=path.join(fixture,name.slice(2)+".ts.source");
  if(name.startsWith("@/"))name=path.join(root,name.slice(2));
  return original.call(this,name,parent,main);
};
global.fetch=()=>{throw Error("No live fetch allowed");};
const wire=require(path.join(root,"lib/portal-v2/pvas-native-gift-wire.ts"));
const read=require(path.join(root,"lib/portal-v2/pvas-native-gift-read.ts"));
const present=require(path.join(root,"lib/portal-v2/pvas-native-gift-presentation.ts"));
const backend=require(path.join(fixture,"pvasNativeGiftReadV2.ts.source"));
const codec=require(path.join(fixture,"pvasNativeGiftFoundation.ts.source"));
const schema=require(path.join(fixture,"pvasNativeGiftSchemaV2.ts.source"));
assert.equal(wire.PVAS_NATIVE_READ_PIN.readerSha256,pins.files["pvasNativeGiftReadV2.ts.source"]);
assert.equal(wire.PVAS_NATIVE_READ_PIN.contractSha256,pins.files["NATIVE-WIRE-CONTRACT.md"]);
assert.equal(wire.PVAS_NATIVE_READ_PIN.schemaRevision,schema.PVAS_NATIVE_GIFT_SCHEMA_V2.revision);
const {campaignByLevel}=require(path.join(root,"lib/portal-v2/clients.ts"));
const clone=x=>structuredClone(x),bad=(x,fn=wire.decodeNativeGiftRecordV2)=>assert.throws(()=>fn(x));
function campaign(id=1,order="0",manual=false,retired=false){
 const source={system:manual?"portal_gifts":"website_db",key:manual?"9007199254740993":`db|Stewardship|${id}|pledge|`};
 const native={id:manual?source.key:-id,cptid:id,donor_name:"FICTIONAL",kind:"pledge",amount:0.3,gift_date:null,
   ...(manual?{batch_id:"9007199254740995"}:{key:source.key}),note:"",corrected:{by:"Original actor",at:"raw original time",from:0.2}};
 return {giftId:id,cptid:id,version:1,order,sources:[source],representation:"native-campaign",source,native,
   membership:{state:retired?"retired":"active",retiredByRequestId:retired?"a".repeat(32):null},legacy:clone(native)};
}
function history(id=20,amount="-90071992547409.91",date=null,year=2020){
 const source={system:"client_gift_history",key:"9007199254740993"};
 const native={amount,date,year,status:"RefUnDeD",campaign:"",fund:null,type:null,recordType:"gift",note:"",loadedAt:"2026-10-23T12:00:00.1234567"};
 return {giftId:id,cptid:9,version:1,order:"9007199254740993",sources:[source],representation:"native-history",source,native,
   legacy:{id:source.key,cptid:9,date,amount,status:native.status,campaign:"",fund:null,type:null,year,note:"",record_type:"gift"}};
}
function event(id=3,order="3",status="received",scope="campaign",amount="0.10"){
 return {giftId:id,cptid:1,version:1,order,sources:[{system:"manual",key:`fictional-${id}`}],representation:"admitted-event",
  event:{amount,currency:"USD",date:null,year:2020,kind:"gift",status,scope,credit:"hard",campaign:null,fund:null,type:null,note:null,donorName:"FICTIONAL"},
  voidReason:status==="void"?"Original reason":null};
}
const eventKeys="amount currency date year kind status scope credit campaign fund type note donorName voidReason".split(" ");
function sqlRow(record){
 const row=Object.fromEntries([...eventKeys,...backend.NATIVE_SQL_COLUMNS,"nativeLifecycle","nativeRetiredRequestId"].map(k=>[k,null]));
 for(const k of ["giftId","cptid","version","order","representation"])row[k]=record[k];
 if(record.representation==="admitted-event")Object.assign(row,record.event,{voidReason:record.voidReason});
 else{
  Object.assign(row,codec.nativeColumns(record));
  if(record.representation==="native-campaign"){row.nativeLifecycle=record.membership.state;row.nativeRetiredRequestId=record.membership.retiredByRequestId;}
 }
 return row;
}
function transport(records,calls=[]){
 return async body=>{
  assert.deepEqual(Object.keys(body).sort(),["client","op","request"]);assert.equal(body.op,"nativeGiftPageV2");assert.equal(body.client,"pvas");
  assert.deepEqual(Object.keys(body.request).sort(),["after","lane","limit","v","view"]);calls.push(clone(body.request));
  const request=body.request;
  const selected=records.filter(r=>(request.lane==="history"?r.representation==="native-history"||r.event?.scope==="historical":r.representation==="native-campaign"||r.event?.scope==="campaign")
   &&(request.view==="provenance"||r.representation!=="native-campaign"||r.membership.state==="active")
   &&(request.after===null||BigInt(r.order)>BigInt(request.after))).sort((a,b)=>BigInt(a.order)<BigInt(b.order)?-1:1).slice(0,request.limit);
  return backend.readNativeGiftPageV2(async(sql,params)=>{
   assert.deepEqual(params,{lane:request.lane,view:request.view,after:request.after,limit:request.limit});
   if(sql===backend.NATIVE_GIFT_READ_SQL.invalidOrder)return {rows:[]};
   if(sql===backend.NATIVE_GIFT_READ_SQL.page)return {rows:selected.map(sqlRow)};
   assert.equal(sql,backend.NATIVE_GIFT_READ_SQL.links);
   return {rows:selected.flatMap(r=>r.sources.map(s=>({giftId:r.giftId,cptid:r.cptid,...s})))};
  },request,actual=>assert.deepEqual(actual,schema.PVAS_NATIVE_GIFT_SCHEMA_V2));
 };
}
async function main(){
 const native=campaign(),retired=campaign(2,"2",true,true),hidden=event(4,"1","void"),received=event(3,"9007199254740993");
 const originals=[native,hidden,retired,received],bytes=JSON.stringify(originals),calls=[];
 const request={v:2,lane:"campaign",view:"provenance",after:null,limit:1};
 const all=await read.collectNativeGiftPagesV2("pvas",transport(originals,calls),request);
 assert.deepEqual(all.records.map(r=>r.giftId),[1,4,2,3]);
 assert.deepEqual(calls.map(r=>r.after),[null,"0","1","2","9007199254740993"],"full final page requires empty tail, including hidden event pages");
 const projection=present.nativeCampaignPresentationV2(all.records);
 assert.deepEqual(projection.inventory,all.records);assert.deepEqual(projection.rows.map(x=>x.metadata.giftId),[1,3]);
 assert.deepEqual(projection.rows[0].row,native.native);assert.equal(projection.rows[1].metadata.event.amount,"0.10");
 assert.equal(projection.rows[1].row.amount,0.1);assert.ok(projection.rows.every(x=>!Object.hasOwn(x.row,"amountExact")));
 assert.equal(projection.rows[0].row.corrected.by,"Original actor");assert.equal(Object.hasOwn(projection.rows[0].row,"status"),false);
 const numeric=projection.rows.map(x=>x.row);
 const chart={rows:[{level:1,gifts:1}]};
 const result=campaignByLevel(chart,numeric);
 assert.equal(result.donors[0].pledges,0.3);assert.equal(result.donors[0].gifts,0.1);assert.equal(result.donors[0].credit,0.3);
 assert.equal(JSON.stringify(originals),bytes,"decoder/adapters never mutate source facts");
 for(const state of ["absent",null,"","Native original status"]){
  const v=clone(native);
  if(state==="absent"){delete v.native.status;delete v.legacy.status;}else{v.native.status=state;v.legacy.status=state;}
  const decoded=wire.decodeNativeGiftRecordV2(v);
  assert.deepEqual(decoded.native,v.native);assert.deepEqual(present.nativeCampaignPresentationV2([decoded]).rows[0].row,v.legacy);
 }
 const excludedEvents=[event(80,"80"),event(81,"81"),event(82,"82","void")];
 excludedEvents[0].event.currency="EUR";excludedEvents[1].event.credit="soft";
 assert.equal(present.nativeCampaignPresentationV2(excludedEvents).rows.length,0);
 assert.equal(present.nativeCampaignPresentationV2(excludedEvents).inventory.length,3,"noncontributing event inventory never discarded");
 const current=await read.collectNativeGiftPagesV2("pvas",transport(originals),{...request,view:"current",limit:2});
 assert.deepEqual(current.records.map(r=>r.giftId),[1,4,3]);
 const h=history(),hist=await read.collectNativeGiftPagesV2("pvas",transport([h]),{...request,lane:"history"});
 const hp=present.nativeHistoryPresentationV2(hist.records);
 assert.deepEqual(hp.rows[0].row,h.legacy);assert.equal(hp.rows[0].metadata.native.loadedAt,"2026-10-23T12:00:00.1234567");
 assert.equal(hp.rows[0].row.date,null);assert.equal(hp.rows[0].row.year,2020);assert.equal(hp.rows[0].row.amount,"-90071992547409.91");
 for(const amount of ["0.00","-0.00"]){const v=history(20,amount);assert.equal(present.nativeHistoryPresentationV2([wire.decodeNativeGiftRecordV2(v)]).rows[0].row.amount,amount);}
 const historicalEvent=event(22,"9007199254740994","void","historical");
 assert.equal(present.nativeHistoryPresentationV2([h,historicalEvent]).rows.length,1,"native status preserved; only admitted status filtered");
 for(const status of [null,"","void","received"]){
  const v=clone(h);v.native.status=status;v.legacy.status=status;
  assert.equal(present.nativeHistoryPresentationV2([wire.decodeNativeGiftRecordV2(v)]).rows.length,1);
 }
 for(const mutate of [
  v=>v.unknown=true,v=>delete v.membership,v=>v.membership.extra=true,v=>v.membership.retiredByRequestId="a".repeat(32),
  v=>v.membership={state:"retired",retiredByRequestId:"a".repeat(32)},v=>v.native.amount="0.30",
  v=>v.legacy.note=null,v=>v.native.extra="",v=>v.source.key="different",v=>v.sources.push(clone(v.sources[0])),
  v=>v.sources.push({key:v.sources[0].key,system:v.sources[0].system}),
  v=>v.sources[0].key=" leading",v=>v.order="01",v=>v.order="9223372036854775808",v=>v.version=0]){
   const value=clone(native);mutate(value);bad(value);
 }
 for(const mutate of [v=>delete v.view,v=>v.view="active",v=>v.requestId="a".repeat(32),v=>v.limit=501,v=>v.after=0,v=>v.v=1]){
  const req=clone(request);mutate(req);bad(req,wire.decodeNativePageRequestV2);
 }
 for(const mutate of [v=>v.native.loadedAt="2026-02-30T12:00:00.1234567",v=>v.native.loadedAt="2026-10-23T24:00:00.1234567",
   v=>v.native.loadedAt="2026-10-23T12:00:00.123Z",v=>v.legacy.date="2020",v=>v.membership={state:"active",retiredByRequestId:null}]){
  const value=clone(h);mutate(value);bad(value);
 }
 for(const mutate of [v=>v.event.extra=true,v=>v.event.amount="0.1",v=>v.event.amount="0.00",v=>v.event.kind="pledge",
  v=>v.event.date="2020-02-30",v=>v.voidReason="unexpected"]){const v=clone(received);mutate(v);bad(v);}
 const page=await transport([native])(read.nativeGiftPageBodyV2("pvas",{...request,limit:2}));
 for(const mutate of [v=>v.v=1,v=>v.view="current",v=>v.next="0",v=>v.done=false,v=>v.rows=v.records,v=>v.records.push(clone(v.records[0]))]){
  const v=clone(page);mutate(v);bad(v,x=>wire.decodeNativeGiftPageV2(x,{...request,limit:2}));
 }
 await assert.rejects(read.collectNativeGiftPagesV2("pvas",transport([native]),request,1),/incomplete/);
 await assert.rejects(read.collectNativeGiftPagesV2("pvas",async()=>({rows:[],next:null,done:true}),request),/page/);
 for(const client of ["jag","csnf","wcbhc","baq"])await assert.rejects(read.collectNativeGiftPagesV2(client,()=>{throw Error("must not call")},request),/request/);
 const sameAlias=campaign(5,"5");sameAlias.source=clone(native.source);sameAlias.sources=[clone(native.source)];sameAlias.native.key=native.source.key;sameAlias.legacy.key=native.source.key;
 await assert.rejects(read.collectNativeGiftPagesV2("pvas",transport([native,sameAlias]),request),/source/);
 const wrongLane=await transport([native])(read.nativeGiftPageBodyV2("pvas",{...request,limit:2}));
 bad(wrongLane,x=>wire.decodeNativeGiftPageV2({...x,lane:"history"},{...request,lane:"history",limit:2}));
 const retiredPage={v:2,lane:"campaign",view:"current",records:[retired],next:null,done:true};
 bad(retiredPage,x=>wire.decodeNativeGiftPageV2(x,{...request,view:"current",limit:2}));
 const unsafe=event(9,"9","received","campaign","45035996273000.02");
 assert.throws(()=>present.nativeCampaignPresentationV2([unsafe]),/roundtrip/);
 const fortyThree=Array.from({length:43},(_,n)=>campaign(n+100,String(n)));
 const many=await read.collectNativeGiftPagesV2("pvas",transport(fortyThree),{...request,view:"current",limit:7});
 assert.deepEqual(many.records.map(r=>r.order),fortyThree.map(r=>r.order));
 assert.deepEqual(present.nativeCampaignPresentationV2(many.records).rows.map(x=>x.row),fortyThree.map(x=>x.native));
 const orderSensitive=[campaign(60,"0"),event(62,"1"),campaign(61,"2")];
 orderSensitive[0].native.amount=1e16;orderSensitive[0].legacy.amount=1e16;
 orderSensitive[1].event.amount="1.00";
 orderSensitive[2].native.amount=-1e16;orderSensitive[2].legacy.amount=-1e16;
 const ordered=present.nativeCampaignPresentationV2(orderSensitive).rows.map(x=>x.row.amount).reduce((a,b)=>a+b,0);
 assert.equal(ordered,0,"one lane-order Number stream, not native subtotal0 plus event subtotal1");
 let sqlCalls=0;
 await assert.rejects(backend.readNativeGiftPageV2(async()=>{sqlCalls++;return{rows:[]}},request),/native-runtime-unwired/);
 assert.equal(sqlCalls,0,"fixture owner has no capability issuer");
 console.log("PASS composed exact-envelope -> pinned strict backend -> website v2 decoder/paginator -> pure history/campaign adapters; current/provenance membership, strings/FLOAT/decimals, full pagination, preserved aliases, fail-closed negatives, off-client no calls; NO runtime wiring");
}
main().catch(e=>{console.error(e);process.exitCode=1});
