// Fictional history-page fixture only; real transport/collector/strict codecs.
const fs=require("node:fs"),path=require("node:path"),Module=require("node:module");
const assert=require("node:assert/strict"),ts=require(process.cwd()+"/node_modules/typescript");
const root=process.cwd(),original=Module._load;
require.extensions[".ts"]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{
 fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,esModuleInterop:true}
}).outputText,f);
Module._load=function(name,parent,main){
 if(name==="server-only")return {};
 if(name==="./pvas-canonical")return {pvasCanonicalEnabled:c=>c==="pvas"};
 return original.call(this,name,parent,main);
};
const W=require(path.join(root,"lib/portal-v2/pvas-native-v3.ts"));
const V2=require(path.join(root,"lib/portal-v2/pvas-native-gift-wire.ts"));
const {readPvasNativeGiftsV2}=require(path.join(root,"lib/portal-v2/pvas-native-gifts.server.ts"));
const request={v:3,lane:"history",view:"current",after:null,limit:5000};
function history(i){
 const order=String(BigInt("9007199254740993")+BigInt(i));
 return {v:2,gift:{giftId:i+1,cptid:9,version:1,order,representation:"native-history",
  source:{system:"client_gift_history",key:order},sources:[{system:"client_gift_history",key:order}],
  native:{amount:i%2?"-90071992547409.91":"0.00",date:i%2?null:"2020-02-29",
   year:i%2?-1:2020,status:i%2?"ReFuNdEd":null,campaign:"",fund:null,type:"Gift",
   recordType:"gift",note:i%2?"":"Fictional",loadedAt:"2026-10-23T12:00:00.1234567"}}};
}
(async()=>{
 assert.equal(W.mixedPageRequest(request).limit,5000);
 assert.equal(W.mixedPageRequest({...request,view:"provenance"}).limit,5000);
 assert.throws(()=>W.mixedPageRequest({...request,limit:5001}));
 assert.equal(W.mixedPageRequest({...request,lane:"campaign",limit:500}).limit,500);
 assert.throws(()=>W.mixedPageRequest({...request,lane:"campaign",limit:501}));
 assert.throws(()=>V2.decodeNativePageRequestV2({...request,v:2}));
 console.log("PASS historicalV3 max5000/5001 refusal; campaign500/501 refusal and V2 max500 unchanged");
 const rows=Array.from({length:5001},(_,i)=>history(i)),before=JSON.stringify(rows),calls=[];
 process.env.PORTAL_WRITE_SECRET="fictional-only";process.env.ENGAGE_PORTAL_URL="https://fixture.invalid/api";
 global.fetch=async(url,init)=>{
  assert.equal(url,"https://fixture.invalid/api");assert.equal(init.cache,"no-store");
  const body=JSON.parse(init.body);calls.push(body);
  assert.deepEqual(Object.keys(body).sort(),["client","op","request"]);
  assert.equal(body.op,"nativeGiftPageV3");assert.equal(body.client,"pvas");
  const r=body.request;
  if(r.lane==="campaign"){
   assert.equal(r.limit,500);
   return Response.json({v:3,lane:"campaign",view:r.view,records:[],next:null,done:true});
  }
  assert.equal(r.limit,5000);
  const page=r.after===null?rows.slice(0,5000):rows.slice(5000);
  if(r.after!==null)assert.equal(r.after,rows[4999].gift.order);
  const full=page.length===r.limit;
  return Response.json({v:3,lane:r.lane,view:r.view,records:page,next:full?page.at(-1).gift.order:null,done:!full});
 };
 const result=await readPvasNativeGiftsV2("history");
 assert.equal(result.records.length,5001);assert.equal(result.v,2);
 assert.deepEqual(calls.map(b=>b.request.after),[null,rows[4999].gift.order]);
 for(let i=0;i<rows.length;i++){
  assert.deepEqual(result.records[i].native,rows[i].gift.native);
  assert.deepEqual(result.records[i].sources,rows[i].gift.sources);
  assert.equal(result.records[i].order,rows[i].gift.order);
  assert.equal(result.records[i].legacy.amount,rows[i].gift.native.amount);
 }
 assert.equal(JSON.stringify(rows),before);
 await assert.rejects(()=>readPvasNativeGiftsV2("campaign"),/held: page/);
 assert.equal(calls.at(-1).request.limit,500);
 console.log("PASS actual helper→5000+tail exact BIGINT cursor→strict leaf decoder; signed/zero decimal/date/year/status/loadedAt/source unchanged; campaign still requests500");
})().catch(e=>{console.error(e);process.exitCode=1;});
