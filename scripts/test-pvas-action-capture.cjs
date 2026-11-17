// Synthetic-only browser replay + frozen-precedence producer regression.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),Module=require("node:module"),ts=require("typescript"),{createHash,webcrypto}=require("node:crypto");
const root=process.cwd(),original=Module._load;
for(const ext of [".ts",".tsx"])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
Module._load=function(name,parent,main){
  if(name==="server-only")return {};
  if(name==="./pvas-canonical")return {pvasCanonicalEnabled:c=>c==="pvas"};
  if(name.startsWith("@/"))name=path.join(root,name.slice(2));
  return original.call(this,name,parent,main);
};
global.crypto=webcrypto;
let storage=new Map();
global.sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const sha=b=>createHash("sha256").update(b).digest("hex"),load=f=>require(path.join(root,f));
const bytes=x=>Buffer.from(JSON.stringify(x));
const freshAction=()=>{delete require.cache[require.resolve("../lib/portal-v2/pvas-action.client.ts")];return load("lib/portal-v2/pvas-action.client.ts").pvasActionFetch;};
const init={method:"POST",body:JSON.stringify({op:"pvasGift",by:"Fictional",command:{actor:"Fictional",action:"create",source:{system:"manual",key:"@new-manual-action"}}})};
(async()=>{
  const sent=[];
  global.fetch=async(url,i)=>{sent.push({url,body:JSON.parse(i.body)});throw Error("lost response");};
  await assert.rejects(()=>freshAction()("pvas","/api/pvas-data-v2",init));
  const first=sent[0].body;
  assert.match(first.requestId,/^[a-f0-9]{32}$/);
  assert.equal(first.command.source.key,first.requestId);
  assert.equal(storage.size,1);
  assert.equal([...storage.values()][0].includes("Fictional"),false,"no donor/actor payload stored");
  global.fetch=async(url,i)=>{
    const body=JSON.parse(i.body);sent.push({url,body});
    if(body.op==="pvasRequestStatus")return Response.json({found:false,requestId:body.requestId});
    assert.deepEqual(body,first,"reload retry retains original ID/time/source and payload");
    return Response.json({ok:true,requestId:body.requestId});
  };
  assert.equal((await freshAction()("pvas","/api/pvas-data-v2",init)).status,200);
  assert.equal(storage.size,0,"confirmed receipt retires action");
  assert.equal(sent[1].body.op,"pvasRequestStatus");
  // Malformed200 is not a receipt; recovery read precedes any further write.
  global.fetch=async()=>Response.json({});
  const bad=await freshAction()("pvas","/api/pvas-data-v2",init);
  assert.equal(bad.status,503);assert.equal(storage.size,1);
  let writes=0;
  global.fetch=async(_url,i)=>{const b=JSON.parse(i.body);if(b.op!=="pvasRequestStatus")writes++;return Response.json({found:true,requestId:b.requestId,receipt:{changed:true}});};
  assert.equal((await freshAction()("pvas","/api/pvas-data-v2",init)).status,409);assert.equal(writes,0);
  global.fetch=async(_url,i)=>{const b=JSON.parse(i.body);return Response.json({found:true,pending:true,requestId:b.requestId,receipt:null});};
  assert.equal((await freshAction()("pvas","/api/pvas-data-v2",init)).status,503,"pending is not a claimed committed receipt");
  global.fetch=async()=>Response.json({}, {status:503});
  assert.equal((await freshAction()("pvas","/api/pvas-data-v2",init)).status,503);assert.equal(writes,0);
  const actionServer=load("lib/portal-v2/pvas-action.server.ts");
  assert.throws(()=>actionServer.pvasActionBody("pvas","pvasFields",{}));
  const monthly={request:{requestId:"a".repeat(32)},originalBytesBase64:"QUJD"};
  assert.deepEqual(actionServer.pvasActionBody("pvas","monthlyCommit",monthly),monthly,"monthly exact outer envelope not widened");
  assert.deepEqual(actionServer.withPvasAction("b".repeat(32),()=>actionServer.pvasActionBody("pvas","setTracking",{by:"Fictional"})),{by:"Fictional",requestId:"b".repeat(32)});
  console.log("PASS browser reload/uncertainty/status-first/same-payload/malformed receipt and nested identity");

  global.fetch=async()=>{throw Error("Offline capture must not fetch");};
  const capture=load("lib/portal-v2/pvas-precutover-capture.server.ts");
  const catalog=JSON.parse(fs.readFileSync("scripts/fixtures/pvas-capture-catalog.json","utf8"));
  const sources=Object.fromEntries([...new Set(catalog.map(c=>`${c.TABLE_SCHEMA}.${c.TABLE_NAME}`))].map(t=>[t,{count:0,rows:[]}]));
  const state={prospects:[],gifts:[],updates:[],batches:[]};
  const tracking={prospects:{},activity:[],removed:[]};
  const direct={protocol:"direct-file-v1",status:"known",scope:"whole-client",complete:true,client:"pvas",revision:"d".repeat(64),observedAt:"2026-11-16T12:00:00.000Z",values:[],notes:[],note:"Source only"};
  const parts={snapshot:bytes({client:"pvas",asOf:"2026-11-16",pool:[],portfolio:[],board:[],top:[],committed:[]}),records:bytes({asOf:"2026-11-16",index:[],records:{}}),tracking:Buffer.from(' {\n"prospects":{},"activity":[],"removed":[] }\n'),pirs:Buffer.from(' {} \n'),ids:bytes([]),portalState:bytes(state),directState:bytes(direct)};
  const schemaWire="[]";
  const manifest={version:1,client:"pvas",target:{database:"Catapult-clients",server:"catapultadmin"},freeze:{marker:"a".repeat(32),frozen:true},capture:{commit:capture.PRE_CUTOVER_COMMIT,extractorVersion:"fixture",schemaWire,schemaSha256:sha(Buffer.from(schemaWire,"utf16le"))},sources,tracking:{},contacts:[],effective:[],notes:[],noteAliases:[],gifts:{schemaDigest:"a".repeat(64),tables:{},crosswalk:[],reconciliation:[]},coverage:{approved:true,identitiesComplete:true,effectiveComplete:true,notesComplete:true,giftsComplete:true,receiptsComplete:true,sourceKeys:Object.fromEntries(Object.keys(sources).map(t=>[t,[]])),externalDigests:{}}};
  // Projection runs BEFORE manifest construction, with no weakened final
  // manifest validator and no second implementation of legacy precedence.
  const partsBefore=Object.fromEntries(Object.entries(parts).map(([k,v])=>[k,Buffer.from(v)]));
  const projected=await capture.projectFrozenPvas(root,parts);
  assert.equal(projected.held,true);
  assert.deepEqual(projected.effectiveView.records,[]);
  assert.deepEqual(projected.effectiveView.index,[]);
  assert.equal(projected.proof.sourceCommit,capture.PRE_CUTOVER_COMMIT);
  assert.equal(projected.proof.partDigests.tracking,sha(parts.tracking));
  assert.equal(projected.proof.partDigests.pirs,sha(parts.pirs));
  assert.deepEqual(parts,partsBefore,"projection never re-encodes original byte inputs");
  assert.deepEqual(JSON.parse(JSON.stringify(projected)),projected,"projection is JSON-safe for deterministic offline assembler");
  await assert.rejects(()=>capture.projectFrozenPvas(root,{...parts,tracking:bytes({broken:true})}),/original-tracking-invalid/);
  await assert.rejects(()=>capture.projectFrozenPvas("/nonexistent/unpinned-root",parts));
  const empty=await capture.captureFrozenPvas(root,{manifest,parts});
  assert.deepEqual(empty.effectiveView,((({index,...view})=>view)(projected.effectiveView)));
  console.log("PASS manifest-free sealed projection: pinned precedence/original byte digests/JSON-safe/invalid tracking refusal");
  assert.equal(empty.held,true);assert.equal(empty.proof.donorCount,0);
  assert.equal(empty.attachments.tracking.sha256,sha(parts.tracking),"ORIGINAL whitespace bytes hashed");
  assert.deepEqual(Buffer.from(empty.attachments.pirs.bytes,"base64"),parts.pirs);
  const temp=fs.mkdtempSync(path.join(require("node:os").tmpdir(),"pvas-capture-fixture-"));
  try{
    const paths={};for(const[k,v]of Object.entries(parts)){paths[k]=path.join(temp,k+".json");fs.writeFileSync(paths[k],v);}
    const mf=path.join(temp,"manifest.json"),cfg=path.join(temp,"config.json"),out=path.join(temp,"NEW");
    fs.writeFileSync(mf,JSON.stringify(manifest));fs.writeFileSync(cfg,JSON.stringify({manifest:mf,parts:paths}));
    const run=()=>require("node:child_process").spawnSync(process.execPath,["scripts/capture-pvas-precutover.cjs",cfg,out],{encoding:"utf8"});
    const cli=run();assert.equal(cli.status,0,cli.stderr);assert.equal(JSON.parse(cli.stdout).held,true);
    assert.deepEqual(fs.readFileSync(path.join(out,"tracking.original")),parts.tracking);
    assert.equal(fs.statSync(path.join(out,"manifest.json")).mode&0o777,0o600);
    assert.equal(fs.statSync(out).mode&0o777,0o700);
    assert.equal(run().status,1,"refuses to overwrite an existing capture directory");
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
  const malformed=structuredClone(manifest);delete malformed.sources["pvas.notes"];
  await assert.rejects(()=>capture.captureFrozenPvas(root,{manifest:malformed,parts}),/exact-catalog-inventory/);
  const orphan=structuredClone(manifest),col=catalog.filter(c=>c.TABLE_SCHEMA==="source_import"&&c.TABLE_NAME==="audit");
  const value=Object.fromEntries(col.map(c=>[c.COLUMN_NAME,c.COLUMN_NAME==="client"?"pvas":c.COLUMN_NAME==="request_id"?"orphan":null]));
  orphan.sources["source_import.audit"]={count:1,rows:[{value,wire:JSON.stringify(value)}]};orphan.coverage.sourceKeys["source_import.audit"]=["1"];
  await assert.rejects(()=>capture.captureFrozenPvas(root,{manifest:orphan,parts}),/request-closure/);
  const big=structuredClone(manifest);
  for(const table of ["requests","audit"]){
    const cols=catalog.filter(c=>c.TABLE_SCHEMA==="source_import"&&c.TABLE_NAME===table);
    const val=Object.fromEntries(cols.map(c=>[c.COLUMN_NAME,c.COLUMN_NAME==="client"?"pvas":c.COLUMN_NAME==="request_id"?"a".repeat(32):c.COLUMN_NAME==="id"?"9007199254740993":null]));
    const wire=JSON.stringify(val).replace('"id":"9007199254740993"','"id":9007199254740993');
    big.sources[`source_import.${table}`]={count:1,rows:[{value:val,wire}]};big.coverage.sourceKeys[`source_import.${table}`]=[table==="audit"?"9007199254740993":"a".repeat(32)];
  }
  assert.equal((await capture.captureFrozenPvas(root,{manifest:big,parts})).held,true,"parent normalizer BIGINT strings compare against exact raw wire, not rounded Number");
  console.log("PASS offline capture exact inventory/original bytes/receipt closure");

  // Old direct0 beats the baseline, but an explicit old manual5 beats direct0;
  // old blank manual assignment remains a real clear, never source fallback.
  const id=900001,p={cptid:id,name:"Fictional",lifetime:0,gifts:0,largest:0,last:"",years:0,capMin:0,ds:"",capacity:"",ask:123,solicitor:"Baseline",solicitor2:""};
  const record={cptid:id,name:p.name,contact:{street:"",city:"",state:"",zip:"",phone:"",phone2:"",phone3:"",email:"",email2:""},portfolio:{ask:123,solicitor:"Baseline",secondary:""},summary:{lifetime:0,gifts:0,largest:0,years:0,band:""}};
  const donorParts={...parts,snapshot:bytes({client:"pvas",asOf:"2026-11-16",pool:[p],portfolio:[p],board:[],top:[p],committed:[]}),records:bytes({asOf:"2026-11-16",index:[p],records:{[id]:record}})};
  const v=(field,value)=>({cptid:id,field,value,template:"fixture",authority_rev:"a".repeat(64),request_id:"b".repeat(32),source_date:"2026-11-16",committed_at:"2026-11-16T12:00:00.000Z"});
  donorParts.directState=bytes({...direct,values:[v("ask","0.00"),v("primarySolicitor","Source")]});
  const fields="fullName firstName middleName lastName street street2 city state zip phone phone2 email email2 spouseFirstName spouseMiddleName spouseLastName ask primarySolicitor secondarySolicitor phone3 phone4 dsRating wealthCapacity majorGiftScore realEstate stock status outcome".split(" ");
  const donorManifest=structuredClone(manifest);
  donorManifest.contacts=[{cptid:id,client_id:null,is_prospect:false,deleted:false,merged_into:null,extension_doc:{},delete_reason:null,version:0,created_by:null,created_at:"2026-11-16T12:00:00"}];
  const values={fullName:"Fictional",street:"",city:"",state:"",zip:"",phone:"",phone2:"",phone3:"",email:"",email2:"",ask:0,primarySolicitor:"Source",secondarySolicitor:"",status:null};
  donorManifest.effective=[{cptid:id,fields:Object.fromEntries(fields.map(field=>{const value=Object.hasOwn(values,field)?values[field]:null;return [field,{state:value===null?"null":"value",value,clear:false,source:{table:"website_effective",key:String(id),field,raw:value,winner:"Reviewed fixture"}}]}))}];
  const zero=await capture.captureFrozenPvas(root,{manifest:donorManifest,parts:donorParts});
  assert.equal(zero.effectiveView.records[0].campaignAsk.ask,0);
  const zeroProjection=await capture.projectFrozenPvas(root,donorParts);
  assert.deepEqual(zeroProjection.effectiveView.records,zero.effectiveView.records);
  assert.equal(zeroProjection.effectiveView.records[0].campaignAsk.ask,0);
  assert.equal(zeroProjection.effectiveData.records[id].portfolio.ask,0);
  const wrong=structuredClone(donorManifest);wrong.effective[0].fields.ask.value=1;
  await assert.rejects(()=>capture.captureFrozenPvas(root,{manifest:wrong,parts:donorParts}),/old-effective-value-mismatch/);
  const manualTracking={...tracking,prospects:{[id]:{status:"Active",solicitor:"",solicitorEdited:true,updatedAt:"2026-11-16T12:00:00.000Z",by:"Fixture"}}};
  donorParts.tracking=bytes(manualTracking);
  donorParts.portalState=bytes({...state,updates:[{id:1,cptid:id,field:"ask",old_value:"123",new_value:"5",by:"Fixture",at:"2026-11-16T12:00:00.000Z"}]});
  for(const [field,value]of Object.entries({ask:5,primarySolicitor:"",status:"Active"})){const c=donorManifest.effective[0].fields[field];c.state="value";c.value=value;c.source.raw=value;c.clear=value==="";}
  const manual=await capture.captureFrozenPvas(root,{manifest:donorManifest,parts:donorParts});
  assert.equal(manual.effectiveView.records[0].campaignAsk.ask,5);assert.equal(manual.effectiveView.records[0].assignment.solicitor,"");
  const manualProjection=await capture.projectFrozenPvas(root,donorParts);
  assert.deepEqual(manualProjection.effectiveView.records,manual.effectiveView.records);
  assert.deepEqual(manualProjection.effectiveView.snapshot,manual.effectiveView.snapshot);
  assert.deepEqual(manualProjection.effectiveView.tracking,manual.effectiveView.tracking);
  assert.equal(manualProjection.effectiveView.records[0].campaignAsk.ask,5);
  assert.equal(manualProjection.effectiveView.records[0].assignment.solicitor,"");
  const hiddenId=id+1,mergedId=id+2,restoredId=id+3;
  const hiddenRecords=JSON.parse(donorParts.records.toString("utf8"));
  for(const c of [hiddenId,mergedId,restoredId]){
    hiddenRecords.records[c]={...structuredClone(record),cptid:c,name:`Hidden ${c}`};
    hiddenRecords.index.push({...p,cptid:c,name:`Hidden ${c}`});
  }
  const identityUpdates=[
    {id:1,cptid:hiddenId,field:"deleted",old_value:null,new_value:"Reviewed fixture delete",created_by:"Fixture",created_at:"2026-11-16T12:00:00.000Z"},
    {id:2,cptid:mergedId,field:"merged_into",old_value:null,new_value:String(id)},
    {id:3,cptid:restoredId,field:"deleted",old_value:null,new_value:"Old delete"},
    {id:4,cptid:restoredId,field:"deleted",old_value:"Old delete",new_value:""}
  ];
  const identityParts={...donorParts,records:bytes(hiddenRecords),portalState:bytes({...state,updates:identityUpdates})};
  const identityProjection=await capture.projectFrozenPvas(root,identityParts);
  assert.equal(identityProjection.identityState.complete,true);
  assert.equal(identityProjection.identityState.sourceSha256,sha(identityParts.portalState));
  assert.deepEqual(identityProjection.identityState.mergedInto,[[mergedId,id]]);
  assert.equal(identityProjection.identityState.deleted.length,1);
  assert.equal(identityProjection.identityState.deleted[0][0],hiddenId);
  assert.equal(identityProjection.identityState.deleted[0][1].reason,"Reviewed fixture delete");
  assert.equal(identityProjection.effectiveView.index.some(r=>r.cptid===hiddenId||r.cptid===mergedId),false);
  assert.equal(identityProjection.effectiveView.index.some(r=>r.cptid===restoredId),true);
  for(const c of [hiddenId,mergedId,restoredId])assert.equal(identityProjection.effectiveData.records[c].name,`Hidden ${c}`);
  assert.deepEqual(JSON.parse(JSON.stringify(identityProjection.identityState)),identityProjection.identityState,"no Map-to-empty-object loss");
  console.log("PASS shared offline projection: direct0/manual5/blank assignment clear; hidden records plus serialized merged/deleted/restored identity maps");
  const missingAlias=structuredClone(donorParts);
  missingAlias.tracking=bytes({...manualTracking,activity:[{id:"old-id",cptid:id,date:"2026-11-16",kind:"Note",note:"Fictional",by:"Fixture",at:"2026-11-16T12:00:00.000Z"}]});
  await assert.rejects(()=>capture.captureFrozenPvas(root,{manifest:donorManifest,parts:missingAlias}),/tracking-occurrence-alias/);
  console.log("PASS offline OLD effective precedence: direct0/manual5/blank clear and note occurrence holds");
})().catch(e=>{console.error(e);process.exitCode=1;});
