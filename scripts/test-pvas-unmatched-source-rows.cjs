// Fictional PVAS rows: screening/phone rows whose CPTID has no canonical contact
// are set aside and flagged, never turned into records that fail the whole read.
const fs=require("node:fs"),path=require("node:path"),Module=require("node:module");
const assert=require("node:assert/strict"),ts=require("typescript"),original=Module._load,root=process.cwd();
const transpile=(source,file)=>ts.transpileModule(source,{fileName:file,compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,esModuleInterop:true}}).outputText;
for(const ext of [".ts",".tsx"])require.extensions[ext]=(m,f)=>m._compile(transpile(fs.readFileSync(f,"utf8"),f),f);
let common;
Module._load=function(name,parent,main){
  if(name==="server-only")return {};
  if(name.endsWith("/pvas-canonical")||name==="./pvas-canonical")return {pvasCanonicalEnabled:c=>c==="pvas",PVAS_CANONICAL_ACCEPTED:false};
  if(name==="./common"&&parent.filename.endsWith("/portal-refresh/pvas.ts"))return common;
  if(name==="../portal-v2/pvas-native-gifts.server")return {readPvasNativeGiftsV2:async()=>({v:2,lane:"history",view:"current",records:[]})};
  if(name.startsWith("@/"))name=path.join(root,name.slice(2));
  return original.call(this,name,parent,main);
};
global.fetch=async()=>{throw Error("No network");};
const load=name=>require(path.join(root,name));
const fields=Object.fromEntries("fullName firstName middleName lastName street street2 city state zip phone phone2 email email2 spouseFirstName spouseMiddleName spouseLastName ask primarySolicitor secondarySolicitor phone3 phone4 dsRating wealthCapacity majorGiftScore realEstate stock status outcome".split(" ").map(k=>[k,null]));
const profile=id=>({cptid:id,clientId:null,presence:{},fields:{...fields,...(id===1?{dsRating:"DS2"}:{})},extras:{},
  identity:{isProspect:false,deleted:false,deleteReason:null,mergedInto:null,version:0,createdBy:null,createdAt:null}});
const known=[1,2];
const fixtures={
  giving_history_overview:[{CPTID:1,Total_Gift_Amount:100,Total_of_Gifts:1,Largest_Gift_Amount:100}],
  donorsearch_results:[{CPTID:1,DS_Rating:"DS2",Wealth_Based_Capacity:"$50,000 - $99,999"},
    {CPTID:900,DS_Rating:"DS1",Wealth_Based_Capacity:"$1 M+",First_Name:"Fictional",Last_Name:"Orphan"},
    {CPTID:901,DS_Rating:"DS3"},{CPTID:901,DS_Rating:"DS3"}],
  phone_numbers:[{CPTID:2,Phone1:"7025550100"},{CPTID:901,Phone1:"7025550101"},{CPTID:903,Phone1:"7025550103"}],
};
const realCommon=load("lib/portal-refresh/common.ts");
common={...realCommon,rows:async q=>structuredClone(fixtures[q.match(/pvas\.\[([a-z_]+)\]/)?.[1]]??[]),
  loadedAsOf:async()=>"2026-11-18",pirLinks:async()=>({}),
  engageClientContacts:async()=>known.map(id=>({cptid:id,name:`Fictional ${id}`,_canonicalContact:profile(id)}))};
(async()=>{
  const {buildCanonicalPvas}=load("lib/portal-refresh/pvas.ts");
  const built=await buildCanonicalPvas();
  const recs=built.records.records;
  assert.deepEqual(Object.keys(recs).map(Number).sort((a,b)=>a-b),known,"only canonical contacts become records");
  assert.deepEqual(built.records.index.map(r=>r.cptid).sort((a,b)=>a-b),known);
  assert.deepEqual(built.snapshot.unmatchedSource,{donorsearch:{rows:3,cptids:[900,901]},phones:{rows:2,cptids:[901,903]}});
  assert.equal(built.snapshot.health.dsScreened,1,"orphan screening rows are not counted");
  assert.ok(!built.snapshot.highWealth.some(p=>p.cptid===900),"orphan $1M+ row is not in high wealth");
  assert.equal(recs["1"].ds["DS Rating"],"DS2","matched contact keeps its screening");
  assert.equal(recs["2"].contact.phone,"(702) 555-0100","matched phones still apply");
  // The state read that previously failed for every orphan record now validates.
  const {canonicalPvasState}=load("lib/portal-v2/pvas-state-wire.ts");
  assert.doesNotThrow(()=>canonicalPvasState({v:3,stateVersion:3,giftWireVersion:3,updates:[],prospects:[],batches:[]},recs,[]));
  // A clean build reports nothing set aside.
  fixtures.donorsearch_results=fixtures.donorsearch_results.slice(0,1);fixtures.phone_numbers=fixtures.phone_numbers.slice(0,1);
  const clean=await buildCanonicalPvas();
  assert.deepEqual(clean.snapshot.unmatchedSource,{donorsearch:{rows:0,cptids:[]},phones:{rows:0,cptids:[]}});
  console.log("ok - PVAS unmatched screening/phone rows are set aside and flagged");
})().catch(e=>{console.error(e);process.exit(1);});
