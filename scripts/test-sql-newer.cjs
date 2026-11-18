// Synthetic-only: newest change wins between dashboard edits and client SQL values. No network, SQL or Blob.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),ts=require("typescript");
const src=path.join(process.cwd(),"lib/portal-v2/sql-newer.ts"),m={exports:{}};
new Function("module","exports","require",ts.transpileModule(fs.readFileSync(src,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(m,m.exports,require);
const {supersededEdits,withoutSuperseded,stampTrackingBases,applyTrackingBases,recordBase,sameValue}=m.exports;
const recs={
  "1":{contact:{phone:"(210) 555-1111",email:"a@x.org"},ds:{"DS Rating":"1A","Wealth-Based Capacity":"$1,000,000"},portfolio:{solicitor:"Pat",secondary:"",ask:5000}},
  "2":{contact:{phone:"(210) 555-9999"},ds:{},portfolio:{solicitor:"Unassigned",ask:0}},
  "3":{contact:{}},
};
const base=recordBase("baq",recs);
const u=(id,cptid,field,o,n)=>({id,cptid,field,old_value:o,new_value:n});

// SQL unchanged since the edit: dashboard edit keeps applying (incl. format-only differences).
assert.equal(supersededEdits([u(1,1,"contact:phone","(210) 555-1111","555-2222")],base).size,0);
assert.equal(supersededEdits([u(1,1,"contact:phone","210.555.1111","555-2222")],base).size,0,"punctuation-only differences are the same value");
assert.equal(supersededEdits([u(1,1,"ask","5000","7500")],base).size,0);
assert.equal(supersededEdits([u(1,1,"ask","$5,000.00","7500")],base).size,0);
assert.equal(supersededEdits([u(1,1,"wealth:capacity","$1,000,000","$2,000,000")],base).size,0);
// Chain of edits still continuing from the original SQL value.
assert.equal(supersededEdits([u(1,1,"contact:email","a@x.org","b@x.org"),u(2,1,"contact:email","b@x.org","c@x.org")],base).size,0);
// SQL equals the dashboard value: nothing to decide.
assert.equal(supersededEdits([u(1,2,"contact:phone","(210) 555-0000","(210) 555-9999")],base).size,0);

// SQL changed after the edit: SQL wins.
let d=supersededEdits([u(1,2,"contact:phone","(210) 555-0000","(210) 555-1234")],base);
assert.deepEqual([...d],["2|contact:phone"]);
assert.equal(supersededEdits([u(1,1,"ask","4000","7500")],base).size,1);
assert.equal(supersededEdits([u(1,1,"wealth:rating","2B","3C")],base).size,1);
// A newer dashboard edit made after SQL won starts a new run and applies again.
assert.equal(supersededEdits([u(1,1,"ask","4000","7500"),u(2,1,"ask","5000","6000")],base).size,0);
// Unknown base never drops an edit; dashboard-only fields never yield.
assert.equal(supersededEdits([u(1,99,"contact:phone","x","y"),u(2,1,"merged_into",null,"5"),u(3,1,"dashboard:outcome",null,"{}")],base).size,0);
assert.equal(supersededEdits([u(1,3,"ask","100","200")],base).size,0,"no portfolio ask = unknown");
// Blank base: an edit on a blank field stays until SQL fills it.
assert.equal(supersededEdits([u(1,3,"contact:email",null,"z@x.org")],base).size,0);
assert.equal(supersededEdits([u(1,2,"contact:email",null,"z@x.org")],recordBase("baq",{"2":{contact:{email:"sql@x.org"}}})).size,1);

const st={updates:[u(1,2,"contact:phone","(210) 555-0000","(210) 555-1234"),u(2,2,"merged_into",null,"5")],prospects:[]};
const out=withoutSuperseded(st,d);
assert.deepEqual(out.updates.map(x=>x.id),[2]); assert.equal(st.updates.length,2,"input untouched");

// Tracking solicitors.
const prev={"1":{status:"Active",solicitor:"Pat",updatedAt:"t0",by:"a"}};
let next=stampTrackingBases({"1":{status:"Active",solicitor:"Lee",updatedAt:"t1",by:"b"},"2":{status:"Hold",updatedAt:"t1",by:"b",solicitorEdited:false}},prev,base);
assert.equal(next["1"].solicitorBase,"Pat","stamps the SQL value it replaced");
assert.ok(!("solicitorBase" in next["2"]));
// later status-only save keeps the stamp
let again=stampTrackingBases({"1":{status:"Hold",solicitor:"Lee",updatedAt:"t2",by:"c"}},next,base);
assert.equal(again["1"].solicitorBase,"Pat");
// SQL unchanged: dashboard solicitor shows
assert.equal(applyTrackingBases(again,base)["1"].solicitor,"Lee");
// SQL changed to someone else: SQL wins
const moved=recordBase("baq",{"1":{portfolio:{solicitor:"Kim"}}});
const view=applyTrackingBases(again,moved)["1"];
assert.ok(!("solicitor" in view)&&view.solicitorEdited===false&&view.status==="Hold");
// SQL changed to the same person the dashboard chose: keep
assert.equal(applyTrackingBases(again,recordBase("baq",{"1":{portfolio:{solicitor:"lee"}}}))["1"].solicitor,"Lee");
// Legacy entries without a stamp keep working as before
assert.equal(applyTrackingBases({"9":{solicitor:"X",updatedAt:"t",by:"a"}},moved)["9"].solicitor,"X");
// secondary
let s2=stampTrackingBases({"1":{solicitor2:"Sam",updatedAt:"t",by:"a"}},{},base);
assert.equal(s2["1"].solicitor2Base,"");
assert.ok(!("solicitor2" in applyTrackingBases(s2,recordBase("baq",{"1":{portfolio:{secondary:"Ray"}}}))["1"]));
assert.ok(sameValue("solicitor","Unassigned",""));
console.log("sql newer wins: PASS");
