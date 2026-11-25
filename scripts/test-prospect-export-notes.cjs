// Synthetic-only source/manual note ownership and export regression. Never contacts services.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),Module=require("node:module"),ts=require("typescript");
const root=process.cwd(),original=Module._load;
for(const ext of [".ts",".tsx"]) require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
Module._load=function(name,parent,isMain){if(name==="server-only")return {};if(name.startsWith("@/"))name=path.join(root,name.slice(2));return original.call(this,name,parent,isMain);};
global.fetch=async()=>{throw Error("Unexpected network");};
const {buildOverlay}=require("../lib/portal-v2/record-overlay.ts");
const {prospectNotes}=require("../lib/portal-v2/prospect-notes.ts");
const long="ZZTEST multiline note\n".repeat(300)+"ZZTEST FINAL SENTINEL";
const updates=[{id:1,cptid:2,field:"merged_into",new_value:"1"},{id:2,cptid:3,field:"deleted",new_value:"duplicate"}];
const overlay=buildOverlay(updates);
const records={1:{cptid:1,name:"ZZTEST Survivor",notes:["ZZTEST original source"],calls:[{date:"2026-11-01",result:"Reached",comments:"ZZTEST call comments",by:"ZZTEST Caller"}],sourceHistory:{Historical_Notes:"DO NOT REVIVE STALE CANONICAL SOURCE"}},2:{cptid:2,name:"ZZTEST merged",notes:["ZZTEST merged source"]},3:{cptid:3,name:"ZZTEST deleted",notes:["DO NOT EXPORT DELETED"]}};
const tracking={prospects:{1:{reason:"ZZTEST current reason",by:"ZZTEST Staff",updatedAt:"2026-11-25"}},activity:[{id:"a",cptid:1,date:"2026-11-25",kind:"Note",note:long,by:"ZZTEST Author",at:"2026-11-25T01:00:00Z",editedBy:"ZZTEST Editor",editedAt:"2026-11-25T02:00:00Z"},{id:"sql:1",cptid:2,date:"",kind:"Original history",note:"",by:"",at:"",_canonical:{noteId:1,text:"",date:null,source:"Original history",deleted:false}},{id:"sql:2",cptid:1,date:"",kind:"Note",note:"",by:"",at:"",_canonical:{noteId:2,text:null,date:null,source:null,deleted:false}},{id:"gone",cptid:1,note:"DO NOT REVIVE DELETED HISTORY",_canonical:{deleted:true}}],removed:[{id:"removed",cptid:1,note:"DO NOT EXPORT REMOVED"}]};
const frozen=JSON.stringify({records,tracking});
const notes=prospectNotes(1,{records,prospects:[],tracking,overlay});
for(const text of ["ZZTEST original source","ZZTEST merged source","CPTID 2","ZZTEST call comments","ZZTEST Caller","ZZTEST current reason","ZZTEST Author","ZZTEST Editor","2026-11-25",long,"explicitly blank","NULL"])assert.ok(notes.includes(text),`Missing ${text.slice(0,80)}`);
for(const text of ["DO NOT REVIVE","DO NOT EXPORT"])assert.ok(!notes.includes(text));
assert.equal(prospectNotes(3,{records,prospects:[],tracking,overlay}),"");
assert.equal(JSON.stringify({records,tracking}),frozen);
const manual=prospectNotes(900,{records:{},prospects:[{cptid:900,full_name:"ZZTEST Added",note:"ZZTEST manual origin",created_at:"2026-11-24",created_by:"ZZTEST Creator"}],tracking:{prospects:{}},overlay:buildOverlay([])});
assert.ok(manual.includes("ZZTEST manual origin")&&manual.includes("ZZTEST Creator"));
console.log("PASS full source/manual/current/merged/deleted/blank/NULL and >5k multiline notes");

// Exercise the real server reconstruction owner for every client. All IO owners
// below are isolated synthetic functions; unexpected fetch/write remains fatal.
const clients=["jag","csnf","pvas","wcbhc","baq","imas"];
const idx=cptid=>({cptid,name:`ZZTEST ${cptid}`,kind:"Individual",city:"Fixture",lifetime:10,gifts:1,largest:10,last:"2026-01-01",years:1,band:"",capMin:0});
const allRecords=Object.fromEntries([1,2,3,4,5,7,8,9].map(c=>[c,{...idx(c),contact:{},summary:{lifetime:10,gifts:1,largest:10,first:"2026-01-01",last:"2026-01-01",years:1},gifts:[],notes:[],...records[c]}]));
allRecords[1].portfolio={solicitor:"ZZTEST Lead",ask:100};allRecords[4].portfolio={secondary:"ZZTEST Lead",ask:50};allRecords[7].portfolio={solicitor:"ZZTEST Lead",ask:20};allRecords[8].portfolio={secondary:"ZZTEST Other",ask:0};
const fixtureData={asOf:"2026-11-25",records:allRecords,index:Object.keys(allRecords).map(Number).map(idx)};
const fixtureTracking={...tracking,prospects:{...tracking.prospects,1:{...tracking.prospects[1],solicitor:"ZZTEST Lead"},7:{status:"Committed"},8:{status:"Disqualified"},9:{solicitor:"ZZTEST Lead",status:"Hold"}}};
const fixtureState={configured:true,prospects:[],gifts:[],batches:[],updates:[...updates,{id:3,cptid:9,field:"ask",new_value:"250",old_value:null}]};
const snapshot={builtAt:"2026-11-25 13:00",client:"ZZTEST",pool:[{...idx(1),ask:100,rating:100}],portfolio:[{...idx(1),ask:100}],board:[],top:[idx(1)],committed:[],stages:[]};
const prior=Module._load;
Module._load=function(name,parent,isMain){
 if((/^\.\.\/\w+-data-store$/.test(name))||/^@\/lib\/\w+-data-store$/.test(name))return Object.fromEntries(clients.flatMap(c=>{const n=c[0].toUpperCase()+c.slice(1);return [[`get${n}Records`,async()=>fixtureData],[`get${n}Snapshot`,async()=>snapshot]];}));
 if(/^\.\.\/\w+-tracking$/.test(name)||/^@\/lib\/\w+-tracking$/.test(name))return Object.fromEntries(clients.map(c=>[`get${c[0].toUpperCase()+c.slice(1)}Tracking`,async()=>fixtureTracking]));
 if(name==="./server"||name==="@/lib/portal-v2/server")return {portalCampaignStateSafe:async()=>fixtureState,portalStateSafe:async()=>fixtureState};
 return prior.call(this,name,parent,isMain);
};
(async()=>{
 const {reconstructDashboardExport,validateExportIntent}=require("../lib/portal-v2/dashboard-export.server.ts");
 const label="Prospect notes and activity";
 for(const client of clients){
  const all=await reconstructDashboardExport(client,{kind:"portfolio",solicitor:""},{title:"CLIENT CANNOT REPLACE SERVER TITLE"});
  assert.equal(all.title,"Portfolio prospects");assert.deepEqual(all.sections[0].rows.map(r=>r[0]).sort((a,b)=>a-b),[1,4,7,8,9],`${client} full assignment index, all statuses, outside pools`);
  const chosen=await reconstructDashboardExport(client,{kind:"portfolio",solicitor:"ZZTEST Lead"},{});
  assert.deepEqual(chosen.sections[0].rows.map(r=>r[0]).sort((a,b)=>a-b),[1,4,7,9],`${client} secondary-only/committed/hold roster`);
  assert.ok(chosen.cols.some(c=>c.label===label));assert.ok(JSON.stringify(chosen).includes("ZZTEST FINAL SENTINEL"));
  const summary=await reconstructDashboardExport(client,{kind:"portfolio",solicitor:"",summary:true},{});
  assert.ok(!summary.cols.some(c=>c.label===label));assert.equal(summary.sections[0].rows.find(r=>r[0]==="ZZTEST Lead")[1],4);
  const index=await reconstructDashboardExport(client,{kind:"index",ids:[1,4]},{});
  assert.ok(index.cols.some(c=>c.label===label));assert.ok(JSON.stringify(index).includes("ZZTEST merged source"));
  const report=await reconstructDashboardExport(client,{kind:"report",query:{fields:["name"]}},{});
  assert.equal(report.cols.filter(c=>c.label===label).length,1,`${client} saved fields cannot omit notes`);
  const selected=await reconstructDashboardExport(client,{kind:"report",query:{fields:["name","notes"]}},{});
  assert.equal(selected.cols.filter(c=>c.label===label).length,1);
  const detail=await reconstructDashboardExport(client,{kind:"record",id:1},{});
  assert.ok(JSON.stringify(detail).includes("ZZTEST merged source"));assert.ok(JSON.stringify(detail).includes("ZZTEST FINAL SENTINEL"));
  assert.equal(JSON.stringify(detail).split("ZZTEST original source").length-1,1,`${client} record notes not duplicated`);
  const table=await reconstructDashboardExport(client,{kind:"table",table:"Pyramid.0"},{});
  assert.ok(table.cols.some(c=>c.label===label));
  const aggregate=await reconstructDashboardExport(client,{kind:"table",table:"Campaign.0"},{});
  assert.ok(!aggregate.cols.some(c=>c.label===label),`${client} campaign-by-source remains aggregate`);
  await assert.rejects(()=>reconstructDashboardExport(client,{kind:"index",ids:[2]},{}),/merged\/deleted/);
 }
 assert.throws(()=>validateExportIntent({kind:"portfolio",solicitor:"",ids:[1]}));
 assert.throws(()=>validateExportIntent({kind:"portfolio",solicitor:"",summary:"true"}));
 console.log("PASS all-six authoritative portfolio/index/report/record/table exports, no aggregate notes, full roster selection");
})().catch(e=>{console.error(e);process.exitCode=1;});
