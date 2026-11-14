// Synthetic-only assignment consistency regression. No network, SQL or Blob access.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const Module = require("node:module"), ts = require("typescript");
const root = process.cwd(), original = Module._load;
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
Module._load = function(name,parent,isMain) {
  if (name === "@/lib/portal-v2/server") return {portalCampaignStateSafe: async()=>{throw new Error("Unexpected state read")}};
  if (name.startsWith("@/")) name=path.join(root,name.slice(2));
  return original.call(this,name,parent,isMain);
};
global.fetch = async()=>{throw new Error("Unexpected external request")};
const {NextRequest} = require("next/server");
const {buildOverlay} = require("../lib/portal-v2/record-overlay.ts");
const {assignmentResolver,assignmentSnapshot,viewAssignment,isUnassigned,filterAssignments,assignmentMembers,belongsToSolicitor} = require("../lib/portal-v2/effective-assignment.ts");
const {recordsRoute} = require("../lib/portal-v2/records-route.ts");
const {buildReportRows,reportRoute} = require("../lib/portal-v2/report-route.ts");
const {runReport,sanitizeQuery} = require("../lib/portal-v2/report-fields.ts");
const update=(id,cptid,field,new_value)=>({id,cptid,field,new_value,old_value:null});
const record=(cptid,portfolio)=>({cptid,name:`ZZTEST ${cptid}`,portfolio,contact:{},gifts:[],summary:{lifetime:0,gifts:0,largest:0,years:0,last:"",band:""}});
const idx=cptid=>({cptid,name:`ZZTEST ${cptid}`,lifetime:0,gifts:0,largest:0,last:"",years:0,band:"",capMin:50000,capacity:"$50K"});
const records={"1":record(1,{solicitor:"Source Primary",secondary:"Source Secondary",ask:100000}),"2":record(2,{solicitor:"Unassigned",secondary:"Bill",ask:50000}),"3":record(3,undefined),"4":record(4,{solicitor:"Merged Lead",secondary:"Merged Secondary",ask:50000}),"5":record(5,{solicitor:"Conflicting Lead",ask:50000}),"6":record(6,undefined)};
const data={asOf:"fixture",index:[1,2,3,4,5,6].map(idx),records};
const tracking={prospects:{"1":{status:"Active",solicitor:"Manual Primary",updatedAt:"2026-11-14"} }};
const updates=[update(1,4,"merged_into","3"),update(2,1,"solicitor2","Manual Secondary")];
const state={prospects:[],gifts:[],batches:[],updates};
(async()=>{
 for(const client of ["jag","csnf","pvas","wcbhc","baq"]) {
  const frozen=JSON.stringify({data,tracking,state}), o=buildOverlay(updates), resolve=assignmentResolver(records,tracking,updates,o);
  assert.deepEqual(resolve(1),{solicitor:"Manual Primary",solicitor2:"Manual Secondary"});
  assert.deepEqual(resolve(2),{solicitor:"",solicitor2:"Bill"});assert.equal(isUnassigned(resolve(2)),false);
  assert.deepEqual(resolve(3),{solicitor:"Merged Lead",solicitor2:"Merged Secondary"});assert.deepEqual(resolve(4),resolve(3));
  assert.deepEqual(assignmentMembers(resolve(2)),["Bill"]);assert.equal(belongsToSolicitor(resolve(2),"Unassigned"),false);
  assert.deepEqual(assignmentMembers({solicitor:"Bill",solicitor2:"Bill"}),["Bill"]);
  const cleared=assignmentResolver(records,{prospects:{"1":{updatedAt:"saved",solicitor:undefined}}},[...updates,update(3,1,"solicitor2","")],o)(1);
  assert.deepEqual(cleared,{solicitor:"",solicitor2:""},"explicit dashboard clears never revive source");
  assert.deepEqual(viewAssignment({cptid:1,solicitor:"Source"},[{cptid:1,...resolve(1)}],{prospects:{"1":{updatedAt:"saved"}}}).solicitor,"");
  const conflict=assignmentResolver(records,null,[],buildOverlay([...updates,update(3,5,"merged_into","3")]))(3);
  assert.equal(conflict.assignmentConflict,true);assert.equal(isUnassigned(conflict),false);assert.equal(conflict.solicitor,"");
  const route=recordsRoute(client,async()=>true,async()=>data,async()=>tracking,async()=>state);
  const get=async(id)=>{const r=await route.GET(new NextRequest(`https://fixture.invalid/${id?`?id=${id}`:""}`));return {status:r.status,body:await r.json()};};
  const index=(await get()).body.index;
  const r=(await get(4)).body;assert.equal(r.cptid,3);assert.equal(r.redirectedFrom.cptid,4);
  assert.deepEqual(r.assignment,resolve(3));assert.equal(r.portfolio.solicitor,"Merged Lead");assert.equal(r.portfolio.secondary,"Merged Secondary");
  const own=(await get(1)).body;assert.equal(own.portfolio.solicitor,own.assignment.solicitor);assert.equal(own.portfolio.secondary,own.assignment.solicitor2);
  assert.equal((await get(99999)).status,404,"missing is not evidence of a failed save");
  const missingState={...state,updates:[update(99,1,"merged_into","99999")]};
  const missing=recordsRoute(client,async()=>true,async()=>data,async()=>tracking,async()=>missingState);
  assert.equal((await missing.GET(new NextRequest("https://fixture.invalid/?id=1"))).status,404,"missing merge target diagnosed, not recreated");
  const snap={pool:[{...idx(4),ask:50000}],portfolio:[{...idx(2),ask:50000}],board:[],highWealth:[idx(1),idx(2),idx(3),idx(4),idx(6)]};
  const view=assignmentSnapshot(snap,index,tracking,o);
  assert.equal(view.highWealth.length,4,"merged source shown only once");assert.equal(view.highWealth[1].solicitor2,"Bill");
  assert.deepEqual(filterAssignments(view.highWealth,"unassigned").map(r=>r.cptid),[6]);
  assert.equal(view.pool[0].cptid,3);assert.equal(view.pool[0].solicitor,"Merged Lead");
  const rows=buildReportRows(data,state,tracking), reports=new Map(rows.map(r=>[r.cptid,r]));
  assert.equal(reports.get(2).solicitor2,"Bill");assert.equal(reports.get(1).solicitor,"Manual Primary");assert.equal(reports.get(3).solicitor,"Merged Lead");
  const q=sanitizeQuery({fields:["name","solicitor","solicitor2"],filters:[{field:"solicitor",op:"empty"},{field:"solicitor2",op:"empty"}]});
  assert.deepEqual(runReport(rows,q).map(r=>r.cptid),[6],"report unassigned ANDs both blank columns");
  let payload;
  const report=reportRoute(client,async()=>true,async()=>data,async()=>tracking,{clientName:"ZZTEST",filePrefix:"ZZTEST",build:async p=>{payload=p;return Buffer.from("synthetic")}},async()=>state);
  const res=await report.POST(new NextRequest("https://fixture.invalid/",{method:"POST",body:JSON.stringify({query:{fields:["name","solicitor","solicitor2"],filters:[{field:"solicitor2",op:"equals",value:"Bill"}]},format:"xlsx"})}));
  assert.equal(res.status,200);assert.ok(payload.cols.some(c=>c.label==="Primary solicitor"));assert.ok(payload.cols.some(c=>c.label==="Secondary solicitor"));assert.ok(payload.sections[0].rows[0].includes("Bill"));
  assert.equal(JSON.stringify({data,tracking,state}),frozen,"read-only, immutable fixtures");
  const dashboard=fs.readFileSync(`components/${client}-data-dashboard.tsx`,"utf8"), crm=fs.readFileSync(`components/${client}-data-crm.tsx`,"utf8");
  assert.ok(dashboard.includes('label: "Primary Solicitor"'));assert.ok(dashboard.includes('label: "Secondary Solicitor"'));
  assert.ok(dashboard.includes("Unassigned (both blank)"));assert.ok(dashboard.includes("useCampaignAskSnapshot(snapshot, index, tracking)"));
  assert.ok(crm.includes('["Primary solicitor", assignment.solicitor'));assert.ok(crm.includes('["Secondary solicitor", assignment.solicitor2'));
  assert.ok(crm.includes('...r.assignment'));assert.ok(crm.includes('viewAssignment'));
  console.log(`PASS ${client}: source/manual/clears/secondary-only/merge-chain/conflict/missing-target; index/detail/header-contract/portfolio/filter/report/export; immutable isolated fixtures`);
 }
 // SQL-saved manual identity shadowed by a rebuilt note-only source placeholder.
 const manual={cptid:81,full_name:"ZZTEST Manual Identity",city:"Manual City",email:"manual@example.test"};
 const collision={asOf:"fixture",index:[{...idx(81),name:"CPTID 81"},{...idx(82),name:"Named Source"}],records:{
  "81":{...record(81),name:"CPTID 81",notes:["Source note 175","Source note 176"],contact:{},gifts:[{amount:123}],summary:{lifetime:123}},
  "82":{...record(82),name:"Named Source",contact:{email:"source@example.test"},notes:["Source facts"]}
 }};
 const manualState={prospects:[manual,{...manual,cptid:82,full_name:"Conflicting Manual Name"},{...manual,cptid:83,full_name:"Manual Only"}],gifts:[],updates:[],batches:[]};
 for(const client of ["jag","csnf","pvas","wcbhc","baq"]) {
  const route=recordsRoute(client,async()=>true,async()=>collision,async()=>({prospects:{}}),async()=>manualState);
  const fetchRecord=async(id)=>await (await route.GET(new NextRequest(`https://fixture.invalid/?id=${id}`))).json();
  const detail=await fetchRecord(81);assert.equal(detail.name,manual.full_name);assert.equal(detail.contact.email,manual.email);
  assert.deepEqual(detail.notes,collision.records["81"].notes);assert.equal(detail.gifts[0].amount,123);
  const named=await fetchRecord(82);assert.equal(named.name,"Named Source");assert.equal(named.contact.email,"source@example.test");
  assert.equal((await fetchRecord(83)).name,"Manual Only");
  const ix=await (await route.GET(new NextRequest("https://fixture.invalid/"))).json();
  assert.equal(ix.index.find(r=>r.cptid===81).name,manual.full_name);assert.equal(ix.index.filter(r=>r.cptid===81).length,1);
  const report=buildReportRows(collision,manualState,{prospects:{}});assert.equal(report.find(r=>r.cptid===81).name,manual.full_name);assert.equal(report.find(r=>r.cptid===81).email,manual.email);
  const merged={...manualState,updates:[update(100,83,"merged_into","81")]};
  const mergeRoute=recordsRoute(client,async()=>true,async()=>collision,async()=>({prospects:{}}),async()=>merged);
  const survivor=await (await mergeRoute.GET(new NextRequest("https://fixture.invalid/?id=83"))).json();
  assert.equal(survivor.name,manual.full_name);assert.equal(survivor.mergedFrom[0].name,"Manual Only");
  console.log(`PASS ${client}: manual placeholder identity/index/detail/report/merged source; source facts and named identities preserved`);
 }
 console.log("PASS assignment consistency: no external reads or writes");
})().catch(e=>{console.error(e);process.exitCode=1});
