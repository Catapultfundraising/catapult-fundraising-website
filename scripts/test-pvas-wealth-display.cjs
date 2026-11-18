// Synthetic selector + actual component SSR regression. No browser/network IO.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const Module=require("node:module"),ts=require("typescript"),React=require("react");
const {renderToStaticMarkup}=require("react-dom/server"),original=Module._load,root=process.cwd();
for(const ext of [".ts",".tsx"])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{
  fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
}).outputText,f);
let canonicalGate=true,stateIndex=0,pirState=null,networkCalls=0;
global.fetch=async()=>{networkCalls++;throw Error("Forbidden synthetic external request");};
Module._load=function(name,parent,main){
  if(name==="react"&&parent.filename.endsWith("/components/record-tools.tsx"))return {...React,
    useState:initial=>[stateIndex++===0?pirState:initial,()=>{}],useEffect:()=>{},useRef:initial=>({current:initial})};
  if(name==="@/lib/portal-v2/pvas-canonical")return {pvasCanonicalEnabled:c=>canonicalGate&&c==="pvas"};
  if(name==="@/lib/portal-v2/pvas-action.client")return {pvasActionFetch:()=>{throw Error("Unexpected write");}};
  if(name==="@/components/dashboard-shared")return {useRecordNav:()=>({})};
  if(name==="lucide-react")return new Proxy({},{get:()=>()=>null});
  if(name.startsWith("@/"))name=path.join(root,name.slice(2));
  return original.call(this,name,parent,main);
};
const {wealthDisplayValues,WealthSection}=require(path.join(root,"components/record-tools.tsx"));
const names="fullName firstName middleName lastName street street2 city state zip phone phone2 email email2 spouseFirstName spouseMiddleName spouseLastName ask primarySolicitor secondarySolicitor phone3 phone4 dsRating wealthCapacity majorGiftScore realEstate stock status outcome".split(" ");
function record(capacity="SQL CAP",rating="SQL RATING"){
  return {cptid:7,name:"Fictional",ds:{"Wealth-Based Capacity":"DS CAP","DS Rating":"DS RATING"},
    wealth:{edits:{capacity:{value:"STAFF CAP",from:"old",by:"STAFF",at:"2020-01-01"},rating:{value:"STAFF RATING",from:"old",by:"STAFF",at:"2020-01-01"}}},
    _canonicalContact:{cptid:7,clientId:null,presence:{},fields:{...Object.fromEntries(names.map(k=>[k,null])),wealthCapacity:capacity,dsRating:rating},
      extras:{},identity:{isProspect:false,deleted:false,deleteReason:null,mergedInto:null,version:0,createdBy:null,createdAt:null}}};
}
const pir={found:true,capacity:"PIR CAP",rating:"PIR RATING",profile:"Fixture PIR",updatedAt:"2026-11-17T00:00:00Z",status:"complete"};
function render(client,r,p=pir){
  stateIndex=0;pirState=p;
  const html=renderToStaticMarkup(React.createElement(WealthSection,{client,r,pirName:"Fixture PIR",onSaved:()=>{}}));
  const values=[...html.matchAll(/class="mt-0\.5 font-display text-lg[^"]*">([^<]*)<\/p>/g)].map(m=>m[1]);
  assert.equal(values.length,2,"actual primary wealth cards rendered");
  return {html,values};
}
for(const [value,expected] of [["SQL CAP","SQL CAP"],[null,"SQL NULL"],["","(blank)"],[0,"0"]]){
  const r=record(value,value),before=JSON.stringify({r,pir});
  const selected=wealthDisplayValues("pvas",r,pir);
  assert.equal(selected.capacity,value);assert.equal(selected.rating,value);
  assert.equal(selected.capSrc,"PVAS SQL");assert.equal(selected.ratingSrc,"PVAS SQL");
  const {html,values}=render("pvas",r);
  assert.deepEqual(values,[expected,expected],"PIR/staff/DS cannot replace explicit canonical raw value");
  assert.ok(html.includes("PVAS SQL"));assert.ok(html.includes("PIR reference (Fixture PIR; status complete"));
  assert.ok(html.includes("capacity PIR CAP, rating PIR RATING"));
  assert.ok(html.includes("does not replace PVAS SQL values"));
  assert.equal(html.includes("The PIR wins over DonorSearch"),false);
  assert.equal(html.includes("by STAFF"),false,"legacy edit attribution not falsely attached to canonical SQL value");
  for(const label of ["pvas.portfolio.Wealth_Capacity","pvas.donorsearch_results.Wealth_Based_Capacity","pvas.wealth_extensions.wealth_capacity",
    "pvas.portfolio.DS_Rating","pvas.donorsearch_results.DS_Rating","pvas.wealth_extensions.ds_rating"])assert.ok(html.includes(label),"owner chain not single-column claim");
  assert.equal(JSON.stringify({r,pir}),before,"raw canonical and PIR objects not mutated");
}
assert.throws(()=>wealthDisplayValues("pvas",{...record(),_canonicalContact:undefined},pir),/Canonical raw contact/);
for(const client of ["jag","csnf","wcbhc","baq"]){
  const r=record();delete r._canonicalContact;
  assert.deepEqual(render(client,r).values,["STAFF CAP","STAFF RATING"]);
  delete r.wealth;
  assert.deepEqual(render(client,r).values,["PIR CAP","PIR RATING"]);
  assert.ok(render(client,r).html.includes("The PIR wins over DonorSearch unless someone edits the value."));
  assert.equal(render(client,r).html.includes("PVAS SQL"),false);
  assert.deepEqual(render(client,r,{found:false}).values,["DS CAP","DS RATING"]);
  r.wealth={edits:{capacity:{value:""},rating:{value:""}}};
  const selected=wealthDisplayValues(client,r,pir);
  assert.equal(selected.capacity,"PIR CAP");assert.equal(selected.capSrc,"Edited","original truthy edit-object attribution retained");
}
canonicalGate=false;
assert.deepEqual(render("pvas",record()).values,["STAFF CAP","STAFF RATING"],"held acceptance=false keeps old presentation");
assert.equal(networkCalls,0);
console.log("PASS actual WealthSection SSR + selector: conflicting SQL/PIR/staff/DS; exact NULL/blank/zero; separate PIR/status/owner chains; raw immutability; all4other clients and gatefalse unchanged; no network");
