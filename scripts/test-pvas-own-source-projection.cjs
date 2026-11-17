// FICTIONAL offline preservation candidates only. No live HTTP/source/SQL.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),Module=require("node:module"),ts=require("typescript"),{createHash}=require("node:crypto");
const root=process.cwd(),loadOriginal=Module._load,sha=b=>createHash("sha256").update(b).digest("hex"),bytes=x=>Buffer.from(JSON.stringify(x));
const compile=(m,f,raw)=>m._compile(ts.transpileModule(raw.toString("utf8"),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
require.extensions[".ts"]=(m,f)=>compile(m,f,fs.readFileSync(f));
Module._load=function(name,parent,main){
  if(name==="server-only")return {};
  if(name.startsWith("@/"))name=path.join(root,name.slice(2));
  return loadOriginal.call(this,name,parent,main);
};
global.fetch=async()=>{throw Error("Forbidden offline fetch");};
const dir=path.join(root,"scripts/fixtures/pvas-own-source");
const recordOriginal=fs.readFileSync(path.join(dir,"records-route.precutover.ts.source"));
const captureOriginal=fs.readFileSync(path.join(dir,"pvas-precutover-capture.server.ts.source"));
assert.equal(sha(recordOriginal),"7f363458c9844a34314a543472ee11f5be0338f66a6061bb15341453d6ce863a");
assert.equal(sha(captureOriginal),"bdc51c3159a620b0bfc942114b332b6359bca8f70976d08598e42a45d09f4076");
function baselineModule(name,raw,overrides={}){
  const filename=path.join(root,"lib/portal-v2",name),m=new Module(filename,module);
  m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));
  const ordinary=m.require.bind(m);
  m.require=n=>Object.hasOwn(overrides,n)?overrides[n]:ordinary(n);
  compile(m,filename,raw);return m.exports;
}
const oldRecords=baselineModule("records-route.precutover.ts",recordOriginal);
const oldCapture=baselineModule("pvas-precutover-capture.server.ts",captureOriginal,{
  "./records-route.precutover":oldRecords,
  "node:fs/promises":{...require("node:fs/promises"),readFile:async(file,...args)=>
    path.resolve(String(file))===path.join(root,"lib/portal-v2/records-route.precutover.ts")?recordOriginal:require("node:fs/promises").readFile(file,...args)},
});
const capture=require("../lib/portal-v2/pvas-precutover-capture.server.ts");
const {currentRecordProjection}=require("../lib/portal-v2/records-route.precutover.ts");
const ids=[101,102,103,104,105,106],A=101,B=102,C=103,D=104,E=105,F=106;
const row=id=>({cptid:id,name:`Fictional ${id}`,city:`City ${id}`,lifetime:id,gifts:1,largest:id,last:"2020-01-02",years:1,band:"",capMin:0});
const data={asOf:"2026-11-17",index:ids.map(row),records:Object.fromEntries(ids.map(c=>[c,{
  cptid:c,name:`Fictional ${c}`,contact:{street:`Street ${c}`,city:`City ${c}`,state:"NV",zip:"00000",phone:"111",phone2:"222",phone3:"333",email:"a@example.invalid",email2:"b@example.invalid"},
  portfolio:{solicitor:c===D?"":`Base ${c}`,secondary:`Second ${c}`,...(c===E?{}:{ask:c})},
  gifts:[{date:"2020-01-02",amount:c}],notes:[`Own ${c}`],flags:[`Own flag ${c}`],
  summary:{lifetime:c,gifts:1,largest:c,last:"2020-01-02",years:1},...(c===A?{ds:{Rating:"Own DS",Capacity:"Own raw DS"}}:{})
}]))};
const tracking={prospects:{
  [A]:{solicitor:null,status:0,updatedAt:"2026-11-17",solicitorEdited:true},
  [B]:{status:null,updatedAt:"2026-11-17"},
  [C]:{status:"",solicitor:"Survivor"},[D]:{solicitorEdited:false},[E]:{solicitor:""},[F]:{status:"Hold"},
},activity:[{id:"activity-a",cptid:A,note:"Own note",date:"2026-11-17",kind:"Note",by:"Fiction",at:"2026-11-17"}],removed:[]};
const u=(id,cptid,field,new_value,old_value=null)=>({id,cptid,field,new_value,old_value,created_by:"Fiction",created_at:"2026-11-17T12:00:00.000Z"});
// Deliberately unsorted original storage: both fold order and raw ordinals matter.
const updates=[
  u(9,A,"dashboard:outcome",JSON.stringify({value:"Other",note:" Own explanation "})),
  u(1,A,"merged_into",String(B)),u(2,B,"merged_into",String(C)),u(3,D,"merged_into",String(C)),
  u(4,E,"merged_into",String(C)),u(5,F,"merged_into",String(C)),
  u(12,A,"contact:city",null,"Old city"),u(10,A,"ask","0","101"),u(11,A,"ask",null,"0"),
  u(13,B,"ask","0","102"),u(14,A,"solicitor2",null,"Second 101"),
  u(15,B,"dashboard:outcome",JSON.stringify({value:"",note:""})),
  u(16,D,"dashboard:outcome",JSON.stringify({value:"Other",note:""})),
  u(17,A,"wealth:request",JSON.stringify({name:"Own request"})),
  u(18,A,"wealth:ds",JSON.stringify({status:"matched",fields:{Rating:"Own screening"}})),
  u(19,F,"ask",null,"0"),
];
const state={prospects:[],gifts:[],updates,batches:[]};
const direct={protocol:"direct-file-v1",status:"known",scope:"whole-client",complete:true,client:"pvas",revision:"d".repeat(64),observedAt:"2026-11-17T12:00:00.000Z",values:[D,F].map(cptid=>({cptid,field:"ask",value:"0.00",template:"fiction",authority_rev:"a".repeat(64),request_id:"b".repeat(32),source_date:"2026-11-17",committed_at:"2026-11-17T12:00:00.000Z"})),notes:[],note:"Fiction only"};
const parts={snapshot:bytes({client:"pvas",asOf:"2026-11-17",pool:ids.map(row),portfolio:ids.map(row),board:[],top:[],committed:[]}),
  records:bytes(data),tracking:bytes(tracking),pirs:Buffer.from(" {} \n"),ids:bytes([]),portalState:bytes(state),directState:bytes(direct)};
const evidence={sources:Buffer.from(' {"FICTIONAL":"sources"} \n'),schema:Buffer.from(' {"FICTIONAL":"schema"} \n')};
const options={includeOwnMergedSources:true,ownSourceEvidence:evidence};
const changed=(part,edit)=>{const value=JSON.parse(parts[part]);edit(value);return {...parts,[part]:bytes(value)};};
(async()=>{
  const before=Object.fromEntries(Object.entries(parts).map(([k,v])=>[k,Buffer.from(v)]));
  const old=await oldCapture.projectFrozenPvas(root,parts),ordinary=await capture.projectFrozenPvas(root,parts);
  assert.deepEqual(ordinary,old,"DEFAULT entire output/proof exactly equals pinned original exporter");
  assert.deepEqual(await capture.projectFrozenPvas(root,parts,{includeOwnMergedSources:false}),old);
  const result=await capture.projectFrozenPvas(root,parts,options),own=result.ownSourceView;
  const {ownSourceView,...withoutSidecar}=result;
  assert.deepEqual(withoutSidecar,old,"opt-in leaves current records/index/snapshot/tracking/identity/proof exact");
  assert.deepEqual(parts,before,"all seven original byte parts remain untouched");
  assert.deepEqual(own.donorIds,[A,B,D,E,F],"derived cohort, no hardcoded hidden count");
  assert.equal(own.donorIdsSha256,sha(bytes(own.donorIds)));
  for(const flag of ["accepted","frozen","approved","activated"])assert.equal(own[flag],false);
  assert.match(own.semantics,/NOT historical visible HTTP/);
  const records=new Map(own.records.map(r=>[r.cptid,r])),cells=new Map(own.fieldStates.map(r=>[r.cptid,r.fields]));
  const closure=new Map(own.foldEvidence.donors.map(r=>[r.cptid,r]));
  assert.deepEqual(result.effectiveView.index.map(r=>r.cptid),[C],"hidden identities NOT activated");
  const current=currentRecordProjection("pvas",data,state,tracking),local=currentRecordProjection("pvas",data,state,tracking,{recordScope:"own-source"});
  assert.deepEqual(local.index,current.index,"record-only option cannot change its index");
  assert.deepEqual(current.record(A),oldRecords.currentRecordProjection("pvas",data,state,tracking).record(A));
  assert.equal(current.record(A).cptid,C);assert.equal(current.record(A).redirectedFrom.cptid,A);
  assert.equal(current.record(A).dsFromCptid,A);assert.equal(local.record(C).ds,undefined);
  assert.equal(local.record(C).wealth.original,null,"source DS never inherited by own survivor");
  for(const c of [A,B,C,D,E,F]){
    const r=local.record(c);assert.equal(r.cptid,c);assert.equal(r.name,`Fictional ${c}`);
    for(const key of ["redirectedFrom","mergedFrom","dsFromCptid"])assert.equal(Object.hasOwn(r,key),false);
    assert.equal(Object.hasOwn(r.campaignAsk,"askFromCptid"),false);
    assert.equal(r.gifts.length,1);assert.deepEqual(r.notes,[`Own ${c}`]);assert.deepEqual(r.flags,[`Own flag ${c}`]);
  }
  assert.equal(records.get(A).contact.city,"");assert.equal(records.get(A).campaignAsk.ask,null);
  assert.equal(records.get(A).campaignAsk.askBlank,true);assert.equal(records.get(A).portfolio.ask,0);
  assert.equal(cells.get(A).ask.state,"null");assert.equal(cells.get(A).ask.value,null,"semantic NULL never revived from portfolio presentation0");
  assert.equal(records.get(B).campaignAsk.ask,0);assert.equal(records.get(B).campaignAsk.askBlank,false);
  assert.equal(cells.get(B).ask.value,0);assert.equal(cells.get(E).ask.state,"undefined");
  assert.equal(records.get(D).campaignAsk.directAskPresent,true);assert.equal(records.get(D).campaignAsk.ask,0);
  assert.equal(closure.get(F).effectiveBase.portfolio.directManualAskPresent,true);
  assert.equal(records.get(F).campaignAsk.askBlank,true);
  assert.equal(records.get(A).assignment.solicitor,"");assert.equal(records.get(A).assignment.solicitor2,"");
  assert.equal(Object.hasOwn(tracking.prospects[A],"solicitor2"),false,"SQL secondary clear requires no invented raw tracking key");
  assert.equal(records.get(B).assignment.solicitor,"","legacy missing-key primary clear retained");
  assert.equal(records.get(E).assignment.solicitor,"","explicit own-key blank beats nonblank base");
  assert.equal(closure.get(E).tracking.prospect.value.solicitor,"");
  assert.equal(records.get(D).assignment.solicitor,"","empty baseline remains empty, NOT marked explicit manual clear");
  assert.equal(closure.get(D).tracking.prospect.value.solicitorEdited,false);
  assert.equal(records.get(A).outcome.value,"Other");assert.equal(records.get(A).outcome.note,"Own explanation");
  assert.equal(closure.get(A).outcomeEvents[0].valid,true);
  assert.deepEqual(records.get(B).outcome.value,"");assert.equal(closure.get(B).outcomeEvents[0].valid,true);
  assert.equal(records.get(D).outcome.value,"");assert.equal(closure.get(D).outcomeEvents[0].valid,false);
  assert.equal(records.get(E).outcome.value,"");assert.deepEqual(closure.get(E).outcomeEvents,[]);
  assert.equal(cells.get(A).status.value,0);assert.equal(cells.get(B).status.state,"null");
  assert.equal(cells.get(E).status.state,"absent");assert.equal(cells.get(F).status.value,"Hold");
  assert.equal(records.get(A).contactHistory[0].to,"");assert.equal(records.get(A).wealth.screening.fields.Rating,"Own screening");
  assert.equal(records.get(A).wealth.original.Rating,"Own DS");assert.equal(records.get(A).ds.Rating,"Own DS");
  assert.deepEqual(closure.get(A).updates.map(x=>x.key),["1","9","10","11","12","14","17","18"]);
  for(const c of own.donorIds){
    assert.equal(Object.keys(cells.get(c)).length,15);
    assert.deepEqual(closure.get(c).updates.map(x=>x.row),updates.filter(x=>x.cptid===c).sort((a,b)=>a.id-b.id));
    for(const x of closure.get(c).updates)assert.deepEqual(updates[x.ordinal],x.row);
    assert.deepEqual(closure.get(c).originalRecord,data.records[c]);
    assert.deepEqual(closure.get(c).originalIndexEntries.map(x=>x.row),data.index.filter(x=>x.cptid===c));
  }
  assert.equal(closure.get(D).directValues[0].key,`${D}:ask`);
  assert.equal(closure.get(A).tracking.activity[0].row.id,"activity-a");
  assert.equal(own.foldEvidence.byteBindings.sources.sha256,sha(evidence.sources));
  assert.equal(own.foldEvidence.byteBindings.schema.sha256,sha(evidence.schema));
  assert.equal(own.foldEvidence.originalSourceHashes["lib/portal-v2/records-route.precutover.ts"],sha(recordOriginal));
  assert.notEqual(own.foldEvidence.moduleSha256["lib/portal-v2/records-route.precutover.ts"],sha(recordOriginal));
  for(const [file,digest] of Object.entries(own.foldEvidence.moduleSha256))assert.equal(sha(fs.readFileSync(path.join(root,file))),digest);
  for(const [name,part] of Object.entries(parts))assert.equal(own.foldEvidence.partDigests[name],sha(part));
  assert.equal(JSON.parse(JSON.stringify(own)).fieldStates.find(x=>x.cptid===E).fields.ask.state,"undefined","JSON sidecar preserves undefined presence explicitly");
  const stringParts=changed("portalState",s=>s.updates.forEach(u=>u.id=String(u.id)));
  const stringBefore=Buffer.from(stringParts.portalState);
  const stringResult=await capture.projectFrozenPvas(root,stringParts,options);
  const {ownSourceView:stringSidecar,...stringOrdinary}=stringResult;
  assert.deepEqual(stringOrdinary,await oldCapture.projectFrozenPvas(root,stringParts),"safe exact SQL string IDs retain original default output");
  assert.deepEqual(stringSidecar.records,own.records);assert.deepEqual(stringSidecar.fieldStates,own.fieldStates);
  for(const donor of stringSidecar.foldEvidence.donors)for(const entry of donor.updates){
    assert.equal(typeof entry.row.id,"string");assert.equal(entry.key,entry.row.id);
    assert.deepEqual(entry.row,JSON.parse(stringParts.portalState).updates[entry.ordinal]);
  }
  assert.deepEqual(stringParts.portalState,stringBefore,"never normalize original row.id bytes");
  const boundary=changed("portalState",s=>s.updates[0].id=String(Number.MAX_SAFE_INTEGER));
  const edge=await capture.projectFrozenPvas(root,boundary,options);
  assert.equal(edge.ownSourceView.foldEvidence.donors.find(r=>r.cptid===A).updates.at(-1).row.id,"9007199254740991");
  const noMerge={...state,updates:[u(12,A,"contact:city",null)]};
  const city=currentRecordProjection("pvas",data,noMerge,tracking,{recordScope:"own-source"});
  assert.equal(city.index.find(r=>r.cptid===A).city,`City ${A}`);assert.equal(city.record(A).contact.city,"","own record clear is NOT old truthy index city");
  const cycle={...state,updates:[u(1,A,"merged_into",String(B)),u(2,B,"merged_into",String(A))]};
  const cyc=currentRecordProjection("pvas",data,cycle,tracking,{recordScope:"own-source"});
  assert.equal(cyc.record(A).cptid,A);assert.equal(cyc.record(B).cptid,B);assert.equal(cyc.index.some(r=>[A,B].includes(r.cptid)),false);
  assert.throws(()=>currentRecordProjection("jag",data,state,tracking,{recordScope:"own-source"}),/own-source HOLD: client/);
  for(const edit of [
    d=>delete d.records[A],d=>d.index.splice(0,1),d=>d.index.push({...d.index[0]}),
    d=>d.records.alias={...d.records[A]},d=>{d.records["0101"]=d.records[A];delete d.records[A];},
    d=>d.records[A].cptid=B,
  ])await assert.rejects(()=>capture.projectFrozenPvas(root,changed("records",edit),options),/own-source-original-identity/);
  for(const edit of [
    s=>delete s.updates[0].id,s=>s.updates[0].id=Number.MAX_SAFE_INTEGER+1,s=>s.updates[0].id=s.updates[1].id,
    s=>s.updates[0].id=String(s.updates[1].id),s=>s.updates[0].cptid=2147483648,
  ])await assert.rejects(()=>capture.projectFrozenPvas(root,changed("portalState",edit),options),/own-source-update-order-identity/);
  for(const invalid of ["9007199254740992","01","1e1","","+1"," 1","1 ","-1","1.0","0",0,-1,1.5])
    await assert.rejects(()=>capture.projectFrozenPvas(root,changed("portalState",s=>s.updates[0].id=invalid),options),/own-source-update-order-identity/);
  await assert.rejects(()=>capture.projectFrozenPvas(root,changed("portalState",s=>s.updates[1].new_value="9007199254740993"),options),/own-source-merge-identity/);
  for(const key of ["mergedFrom","redirectedFrom","dsFromCptid"]){
    const bad=changed("records",d=>d.records[A][key]=key==="dsFromCptid"?B:[]);
    await assert.rejects(()=>capture.projectFrozenPvas(root,bad,options),/already-derived-base/);
  }
  await assert.rejects(()=>capture.projectFrozenPvas(root,changed("records",d=>d.records[A].portfolio.askFromCptid=B),options),/already-derived-base/);
  const reference=changed("records",d=>{delete d.records[A];d.index=d.index.filter(r=>r.cptid!==A);});
  const refs=await capture.projectFrozenPvas(root,reference,options);
  assert.equal(refs.ownSourceView.donorIds.includes(A),false);assert.deepEqual(refs.ownSourceView.foldEvidence.excludedMergedIds,[A]);
  const rawRef={...data,index:data.index.filter(r=>r.cptid!==A)};
  assert.throws(()=>currentRecordProjection("pvas",rawRef,state,tracking,{recordScope:"own-source"}).record(A),/original-identity/);
  await assert.rejects(()=>capture.projectFrozenPvas(root,parts,{includeOwnMergedSources:true}),/own-source-evidence-bytes/);
  await assert.rejects(()=>capture.projectFrozenPvas(root,parts,{includeOwnMergedSources:true,ownSourceEvidence:{sources:sha(evidence.sources),schema:evidence.schema}}),/own-source-evidence-bytes/);
  const scratch=process.env.RUN_TMPDIR;assert.ok(scratch,"RUN_TMPDIR required for private synthetic code-drift fixture");
  const drift=fs.mkdtempSync(path.join(scratch,"own-source-code-drift-"));
  try{
    for(const file of Object.keys(old.proof.sourceHashes)){const target=path.join(drift,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
    fs.appendFileSync(path.join(drift,"lib/portal-v2/records-route.precutover.ts"),"\n// wrong original bytes\n");
    await assert.rejects(()=>capture.projectFrozenPvas(drift,parts,options),/precedence-code-drift/);
  }finally{fs.rmSync(drift,{recursive:true,force:true});}
  console.log("PASS fictional own-source record scope + opt-in derived sidecar: original full default parity; chains/cycles;15 fields/presence/clears; original folds/closure/byte pins; unsafe identities/order/code drift HOLD; reference-only exclusion; NO activation/actual-data run");
})().catch(e=>{console.error(e);process.exitCode=1;});
