// Synthetic-only source/manual note ownership and export regression. Never contacts services.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),Module=require("node:module"),ts=require("typescript");
const root=process.cwd(),original=Module._load;
for(const ext of [".ts",".tsx"]) require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
Module._load=function(name,parent,isMain){if(name==="server-only")return {};if(name.startsWith("@/"))name=path.join(root,name.slice(2));return original.call(this,name,parent,isMain);};
global.fetch=async()=>{throw Error("Unexpected network");};
const {buildOverlay}=require("../lib/portal-v2/record-overlay.ts");
const {prospectNotes,gc2pSourceNotes}=require("../lib/portal-v2/prospect-notes.ts");
const long="ZZTEST multiline note\n".repeat(300)+"ZZTEST FINAL SENTINEL";
const updates=[{id:1,cptid:2,field:"merged_into",new_value:"1"},{id:2,cptid:3,field:"deleted",new_value:"duplicate"}];
const overlay=buildOverlay(updates);
const records={1:{cptid:1,name:"ZZTEST Survivor",notes:["ZZTEST original source"],calls:[{date:"2026-11-01",result:"Reached",comments:"ZZTEST call comments",by:"ZZTEST Caller"}],sourceHistory:{Historical_Notes:"DO NOT REVIVE STALE CANONICAL SOURCE"}},2:{cptid:2,name:"ZZTEST merged",notes:["ZZTEST merged source"]},3:{cptid:3,name:"ZZTEST deleted",notes:["DO NOT EXPORT DELETED"]}};
const tracking={prospects:{1:{reason:"ZZTEST current reason",by:"ZZTEST Staff",updatedAt:"2026-11-25"}},activity:[{id:"a",cptid:1,date:"2026-11-25",kind:"Note",note:long,by:"ZZTEST Author",at:"2026-11-25T01:00:00Z",editedBy:"ZZTEST Editor",editedAt:"2026-11-25T02:00:00Z"},{id:"sql:1",cptid:2,date:"",kind:"Original history",note:"",by:"",at:"",_canonical:{noteId:1,text:"",date:null,source:"Original history",deleted:false}},{id:"sql:2",cptid:1,date:"",kind:"Note",note:"",by:"",at:"",_canonical:{noteId:2,text:null,date:null,source:null,deleted:false}},{id:"gone",cptid:1,note:"DO NOT REVIVE DELETED HISTORY",_canonical:{deleted:true}}],removed:[{id:"removed",cptid:1,note:"DO NOT EXPORT REMOVED"}]};
const literal="  Original source note — 2026-11-25 by Actual Body Author\r\nSource date is part of this genuine note.  ";
records[1].notes.push(" \r\n ",literal);
records[1].portfolio={task:"ZZTEST task",relationship:"ZZTEST relationship"};
records[1].directSourceNotes=[{event_key:"event1",body:"ZZTEST imported body",note_date:"GENERATED_DATE",declared_actor:"GENERATED_ACTOR",file_name:"GENERATED_FILE",source_date:"GENERATED_SOURCE_DATE"}];
tracking.directSourceNotes=[{cptid:1,event_key:"event1",body:"ZZTEST imported body"},{cptid:1,event_key:"event2",body:"ZZTEST other imported body"}];
tracking.activity.push({cptid:1,date:"",at:"",note:"DO NOT REVIVE OLD WRAPPER BODY",by:"GENERATED_ACTOR",_canonical:{text:"ZZTEST effective canonical body",date:"GENERATED_DATE",deleted:false}});
const expected=["ZZTEST original source",literal,"ZZTEST call comments","ZZTEST task","ZZTEST relationship","ZZTEST imported body","ZZTEST current reason","ZZTEST merged source",long,"ZZTEST effective canonical body","ZZTEST other imported body"].join("\n\n");
const frozen=JSON.stringify({records,tracking});
const notes=prospectNotes(1,{records,prospects:[],tracking,overlay});
assert.equal(notes,expected,"only exact substantive note bodies, blank-line separated");
for(const value of ["DO NOT REVIVE","DO NOT EXPORT","ZZTEST Caller","ZZTEST Author","ZZTEST Editor","GENERATED_","explicitly blank","NULL","from CPTID","Campaign history","Dashboard activity"])assert.ok(!notes.includes(value),`Generated metadata leaked: ${value}`);
assert.equal(gc2pSourceNotes({note:"  Source GC2P note is genuine body  ",history:"History body"},{}),"  Source GC2P note is genuine body  \n\nHistory body");
assert.equal(gc2pSourceNotes({note:" \n ",history:""},{}),"");
assert.equal(gc2pSourceNotes({note:"Same",history:"Same history"},{portfolio:{task:"Same",relationship:"Same history"}}),"");
assert.equal(prospectNotes(10,{records:{10:{name:"Genuinely named source"}},prospects:[{cptid:10,note:"DO NOT EXPORT COLLISION"}],tracking:{},overlay:buildOverlay([])}),"");
assert.equal(prospectNotes(3,{records,prospects:[],tracking,overlay}),"");
assert.equal(JSON.stringify({records,tracking}),frozen);
const manual=prospectNotes(900,{records:{},prospects:[{cptid:900,full_name:"ZZTEST Added",note:"ZZTEST manual origin",created_at:"2026-11-24",created_by:"ZZTEST Creator"}],tracking:{prospects:{}},overlay:buildOverlay([])});
assert.equal(manual,"ZZTEST manual origin");
console.log("PASS full source/manual/current/merged/deleted/blank/NULL and >5k multiline notes");

// Exercise the real server reconstruction owner for every client. All IO owners
// below are isolated synthetic functions; unexpected fetch/write remains fatal.
const clients=["jag","csnf","pvas","wcbhc","baq","imas"];
const idx=cptid=>({cptid,name:`ZZTEST ${cptid}`,kind:"Individual",city:"Fixture",lifetime:10,gifts:1,largest:10,last:"2026-01-01",years:1,band:"",capMin:0});
const allRecords=Object.fromEntries([1,2,3,4,5,7,8,9].map(c=>[c,{...idx(c),contact:{},summary:{lifetime:10,gifts:1,largest:10,first:"2026-01-01",last:"2026-01-01",years:1},gifts:[],notes:[],...records[c]}]));
allRecords[1].portfolio={...allRecords[1].portfolio,solicitor:"ZZTEST Lead",ask:100};allRecords[4].portfolio={secondary:"ZZTEST Lead",ask:50};allRecords[7].portfolio={solicitor:"ZZTEST Lead",ask:20};allRecords[8].portfolio={secondary:"ZZTEST Other",ask:0};
const fixtureData={directSourceRevision:"ZZTEST revision",asOf:"2026-11-25",records:allRecords,index:Object.keys(allRecords).map(Number).map(idx)};
const fixtureTracking={...tracking,directSourceRevision:"ZZTEST revision",pirs:{1:{name:"ZZTEST PIR",url:"https://fixture.invalid/pir"}},prospects:{...tracking.prospects,1:{...tracking.prospects[1],solicitor:"ZZTEST Lead"},7:{status:"Committed"},8:{status:"Disqualified"},9:{solicitor:"ZZTEST Lead",status:"Hold"}}};
const fixtureState={configured:true,prospects:[],gifts:[],batches:[],updates:[...updates,{id:3,cptid:9,field:"ask",new_value:"250",old_value:null}]};
const snapshot={directSourceRevision:"ZZTEST revision",builtAt:"2026-11-25 13:00",client:"ZZTEST",pool:[{...idx(1),note:"ZZTEST pool body",history:"ZZTEST pool history",ask:100,rating:100,basis:"Committee",ds:"",capacity:""}],portfolio:[{...idx(1),ask:100}],board:[],top:[idx(1)],committed:[],stages:[]};
let capturedXlsx, authed=true, expectPairedOnly=false, pairedCalls=0, pairedError=null;
const pairedValue={built:{snapshot,records:fixtureData,readyRead:{records:fixtureData,state:fixtureState,tracking:fixtureTracking}},freshness:{generation:"00000000-0000-4000-8000-000000000001",builtAt:1,verifiedAt:2,stale:false}};
const prior=Module._load;
Module._load=function(name,parent,isMain){
 if(name==="../dashboard-ready.server")return {inspectDashboardReady:async client=>{assert.equal(client,"imas");pairedCalls++;if(pairedError)throw pairedError;return pairedValue;}};
 if(/^@\/lib\/\w+-data-auth$/.test(name))return Object.fromEntries(clients.map(c=>[`is${c[0].toUpperCase()+c.slice(1)}DataAuthed`,async()=>authed]));
 if(/^@\/lib\/\w+-brand-xlsx$/.test(name))return {buildBrandedXlsx:async payload=>{capturedXlsx=payload;return Buffer.from("ZZTEST synthetic");}};
 if(/^@\/lib\/\w+-brand-pdf$/.test(name))return {registerBrandFonts:()=>{},preparedOn:()=>"2026-11-25",bs:{},NAVY:"#0E1E31",BRASS:"#B08D57",LINE:"#DCE1E7",CREAM:"#F5F2EC",LOGO_ASPECT:1,LOGO_URL:"https://example.test/unused.png"};
 if((/^\.\.\/\w+-data-store$/.test(name))||/^@\/lib\/\w+-data-store$/.test(name))return Object.fromEntries(clients.flatMap(c=>{const n=c[0].toUpperCase()+c.slice(1);return [[`get${n}Records`,async()=>{assert.equal(expectPairedOnly,false,"IMAS must not independently read records");return fixtureData;}],[`get${n}Snapshot`,async()=>{assert.equal(expectPairedOnly,false,"IMAS must not independently read snapshot");return snapshot;}]];}));
 if(/^\.\.\/\w+-tracking$/.test(name)||/^@\/lib\/\w+-tracking$/.test(name))return Object.fromEntries(clients.map(c=>[`get${c[0].toUpperCase()+c.slice(1)}Tracking`,async()=>{assert.equal(expectPairedOnly,false,"IMAS must not independently read tracking");return fixtureTracking;}]));
 if(name==="./server"||name==="@/lib/portal-v2/server")return {portalCampaignStateSafe:async()=>{assert.equal(expectPairedOnly,false,"IMAS must not independently read state");return fixtureState;},portalStateSafe:async()=>fixtureState};
 return prior.call(this,name,parent,isMain);
};
(async()=>{
 const {reconstructDashboardExport,validateExportIntent}=require("../lib/portal-v2/dashboard-export.server.ts");
 const {PROSPECT_NOTES_LABEL:label}=require("../lib/portal-v2/report-fields.ts");
 for(const client of clients){
  expectPairedOnly=client==="imas";
  const all=await reconstructDashboardExport(client,{kind:"portfolio",solicitor:""},{title:"CLIENT CANNOT REPLACE SERVER TITLE"});
  assert.equal(all.title,"Portfolio prospects");assert.deepEqual(all.sections[0].rows.map(r=>r[0]).sort((a,b)=>a-b),[1,4,7,8,9],`${client} full assignment index, all statuses, outside pools`);
  const chosen=await reconstructDashboardExport(client,{kind:"portfolio",solicitor:"ZZTEST Lead"},{});
  assert.deepEqual(chosen.sections[0].rows.map(r=>r[0]).sort((a,b)=>a-b),[1,4,7,9],`${client} secondary-only/committed/hold roster`);
  for(const payload of [all,chosen]){const n=payload.cols.findIndex(c=>c.label===label);assert.equal(payload.sections[0].rows.find(r=>r[0]===1)[n],expected);}
  assert.ok(chosen.cols.some(c=>c.label===label));assert.ok(JSON.stringify(chosen).includes("ZZTEST FINAL SENTINEL"));
  const summary=await reconstructDashboardExport(client,{kind:"portfolio",solicitor:"",summary:true},{});
  assert.ok(!summary.cols.some(c=>c.label===label));assert.equal(summary.sections[0].rows.find(r=>r[0]==="ZZTEST Lead")[1],4);
  const index=await reconstructDashboardExport(client,{kind:"index",ids:[1,4]},{});
  assert.equal(index.sections[0].rows[0][index.cols.findIndex(c=>c.label===label)],expected);assert.ok(index.cols.some(c=>c.label===label));assert.ok(JSON.stringify(index).includes("ZZTEST merged source"));
  const report=await reconstructDashboardExport(client,{kind:"report",query:{fields:["name"]}},{});
  assert.equal(report.sections[0].rows.find(r=>r[0]===idx(1).name)[report.cols.findIndex(c=>c.label===label)],expected);assert.equal(report.cols.filter(c=>c.label===label).length,1,`${client} saved fields cannot omit notes`);
  const selected=await reconstructDashboardExport(client,{kind:"report",query:{fields:["name","notes"]}},{});
  assert.equal(selected.cols.filter(c=>c.label===label).length,1);
  const detail=await reconstructDashboardExport(client,{kind:"record",id:1},{});
  assert.equal(detail.sections.find(s=>s.heading===label).rows[0][1],expected);assert.ok(JSON.stringify(detail).includes("ZZTEST merged source"));assert.ok(JSON.stringify(detail).includes("ZZTEST FINAL SENTINEL"));
  assert.equal(JSON.stringify(detail).split("ZZTEST original source").length-1,1,`${client} record notes not duplicated`);
  const table=await reconstructDashboardExport(client,{kind:"table",table:"Pyramid.0"},{});
  assert.equal(table.sections[0].rows[0][table.cols.findIndex(c=>c.label===label)],expected);assert.ok(table.cols.some(c=>c.label===label));
  const aggregate=await reconstructDashboardExport(client,{kind:"table",table:"Campaign.0"},{});
  assert.ok(!aggregate.cols.some(c=>c.label===label),`${client} campaign-by-source remains aggregate`);
  await assert.rejects(()=>reconstructDashboardExport(client,{kind:"index",ids:[2]},{}),/merged\/deleted/);
 }
 expectPairedOnly=false;
 // Manual-only records must use raw p.note, not prospectRecord's generated Added metadata.
 fixtureState.prospects.push({cptid:900,full_name:"ZZTEST manual only",note:"  Manual original body\r\nSource date is genuine.  ",created_by:"GENERATED_CREATOR",created_at:"2026-11-25"});
 for(const client of clients){expectPairedOnly=client==="imas";const detail=await reconstructDashboardExport(client,{kind:"record",id:900},{});assert.equal(detail.sections.find(s=>s.heading===label).rows[0][1],fixtureState.prospects[0].note);assert.ok(!JSON.stringify(detail).includes("GENERATED_CREATOR"));}
 fixtureState.prospects.pop();expectPairedOnly=false;
 const priorUpdates=fixtureState.updates.length;
 for(const cptid of [1,4,7,9])fixtureState.updates.push({id:100+cptid,cptid,field:"ask",new_value:"",old_value:"100"});
 const unknownSummary=await reconstructDashboardExport("jag",{kind:"portfolio",solicitor:"ZZTEST Lead",summary:true},{});
 assert.equal(unknownSummary.sections[0].rows[0][5],null,"all unknown/cleared summary amounts remain blank, not fabricated zero");
 assert.equal(unknownSummary.sections[0].rows[0][7],4);
 fixtureState.updates.splice(priorUpdates);
 assert.ok(pairedCalls>=10,"real IMAS reconstruction traversed paired authority for every export kind");
 // Missing/mismatched parity must remain a hard hold, even if the direct mode
 // is not enabled in a preview. Never weaken the existing integrity fences.
 const revision=fixtureData.directSourceRevision;
 delete fixtureData.directSourceRevision;
 for(const client of clients.filter(c=>c!=="imas"))await assert.rejects(()=>reconstructDashboardExport(client,{kind:"portfolio",solicitor:""},{}),/Source changed/);
 expectPairedOnly=true;
 await reconstructDashboardExport("imas",{kind:"portfolio",solicitor:""},{});
 expectPairedOnly=false;
 fixtureData.directSourceRevision=revision;
 snapshot.directSourceRevision="ZZTEST different revision";
 for(const client of clients.filter(c=>c!=="imas"))await assert.rejects(()=>reconstructDashboardExport(client,{kind:"table",table:"Pyramid.0"},{}),/Source changed/);
 snapshot.directSourceRevision=revision;
 expectPairedOnly=true;
 pairedValue.freshness.stale=true;
 await assert.rejects(()=>reconstructDashboardExport("imas",{kind:"portfolio",solicitor:""},{}),/paired report view/);
 pairedValue.freshness.stale=false;pairedValue.freshness.failedAt=3;
 await assert.rejects(()=>reconstructDashboardExport("imas",{kind:"portfolio",solicitor:""},{}),/paired report view/);
 delete pairedValue.freshness.failedAt;
 const fresh=pairedValue.freshness;pairedValue.freshness=undefined;
 await assert.rejects(()=>reconstructDashboardExport("imas",{kind:"portfolio",solicitor:""},{}),/paired report view/);
 pairedValue.freshness=fresh;
 const read=pairedValue.built.readyRead;delete pairedValue.built.readyRead;
 await assert.rejects(()=>reconstructDashboardExport("imas",{kind:"portfolio",solicitor:""},{}),/Incomplete ready build/);
 pairedValue.built.readyRead=read;
 pairedError=new Error("Displayed ready generation invalidated; reload");
 await assert.rejects(()=>reconstructDashboardExport("imas",{kind:"portfolio",solicitor:""},{}),/generation invalidated/);
 pairedError=null;expectPairedOnly=false;
 console.log("PASS IMAS validated paired original-SQL owner without independent IO; absent/stale/failed/generation holds and all-five missing-revision fences");
 assert.throws(()=>validateExportIntent({kind:"portfolio",solicitor:"",ids:[1]}));
 assert.throws(()=>validateExportIntent({kind:"portfolio",solicitor:"",summary:"true"}));
 const {NextRequest}=require("next/server");
 for(const client of clients){
  const route=require(`../app/api/${client}-data-reports/route.tsx`);
  authed=false;
  assert.equal((await route.GET(new NextRequest(`https://fixture.invalid/?report=gc2p&goal=1000000&format=xlsx`))).status,401);
  authed=true;capturedXlsx=undefined;
  const response=await route.GET(new NextRequest(`https://fixture.invalid/?report=gc2p&goal=1000000&format=xlsx`));
  assert.equal(response.status,200,`${client} GC2P synthetic source`);
  assert.ok(capturedXlsx,`${client} XLSX built`);
  assert.ok(!JSON.stringify(capturedXlsx).includes("PIR on file."));
  assert.ok(!JSON.stringify(capturedXlsx).includes("Placed at this level by the committee."));
  assert.ok(JSON.stringify(capturedXlsx).includes("ZZTEST FINAL SENTINEL"),`${client} specialized GC2P full activity notes`);
  const noteCol=capturedXlsx.cols.findIndex(c=>c.label==="Notes"),nameCol=capturedXlsx.cols.findIndex(c=>c.label==="Prospect");
  const sourceRow=capturedXlsx.sections.flatMap(s=>s.rows).find(r=>r[nameCol]===idx(1).name);assert.ok(sourceRow,`${client} source note row`);assert.equal(sourceRow[noteCol],expected+"\n\nZZTEST pool body\n\nZZTEST pool history");
  const below=capturedXlsx.sections.find(s=>s.heading?.startsWith("Below "));
  for(const row of below.rows)assert.equal(row.length,capturedXlsx.cols.length,`${client} below-row note column alignment`);
 }
 console.log("PASS six specialized GC2P authenticated XLSX paths retain complete notes including below-threshold rows");
 console.log("PASS all-six authoritative portfolio/index/report/record/table exports, no aggregate notes, full roster selection");
})().catch(e=>{console.error(e);process.exitCode=1;});
