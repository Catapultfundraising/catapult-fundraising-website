// Fictional actual component + route composition; no SQL/network/browser IO.
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const assert=require("node:assert/strict"),Module=require("node:module"),ts=require("typescript");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server"),root=process.cwd();
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const original=Module._load;
let gate=true,client="pvas",currentState,posts=[],confirms=0,reloads=0,providerMode=false,reloadCallback,stateWrites=[];
const canonical={pvasCanonicalEnabled:c=>gate&&c==="pvas"};
for(const ext of [".ts",".tsx"])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{
  fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
}).outputText,f);
global.confirm=()=>{confirms++;return true;};
global.fetch=async()=>{throw Error("No real external request permitted");};
Module._load=function(name,parent,main){
  if(name==="react"&&parent.filename.endsWith("/components/portal-v2.tsx"))return {...React,
    useContext:()=>({client,state:currentState,reload:async()=>{reloads++;}}),
    useState:initial=>[initial,value=>{if(providerMode)stateWrites.push(value);}],useEffect:()=>{},
    useCallback:callback=>{reloadCallback=callback;return callback;}};
  if(name.endsWith("/pvas-canonical")||name==="./pvas-canonical")return canonical;
  if(name==="@/lib/portal-v2/pvas-action.client")return {pvasActionFetch:async(_client,_url,init)=>{
    posts.push(JSON.parse(init.body));return Response.json({ok:true});}};
  if(name==="@/components/dashboard-shared")return {useSort:rows=>({sorted:rows}),SortTh:()=>null};
  if(name==="@/lib/portal-v2/clients")return {PORTAL_V2:Object.fromEntries(["pvas","jag","csnf","wcbhc","baq"].map(c=>[c,{api:"/fictional"}]))};
  if(name.startsWith("@/")&&name!=="@/lib/portal-v2/pvas-upload-history")return {};
  if(name.startsWith("@/"))name=path.join(root,name.slice(2));
  return original.call(this,name,parent,main);
};
const policy=require(path.join(root,"lib/portal-v2/pvas-upload-history.ts"));
const {AuditLog,PortalV2Provider}=require(path.join(root,"components/portal-v2.tsx"));
const batch=(id,extra={})=>({id,kind:"upload",file_name:"Fictional upload",created_by:"Fixture",
  created_at:"2026-01-01T00:00:00Z",new_rows:1,changed_rows:2,gift_rows:3,undone_at:null,undone_by:null,...extra});
const archive=batch("9223372036854775807",{_undo:{kind:"pre-cutover",namespace:"legacy-engage"}});
const newUpload=batch(7,{_undo:{kind:"unverified",namespace:"canonical-pvas"}});
function elements(tree,type,out=[]){
  if(Array.isArray(tree))for(const x of tree)elements(x,type,out);
  else if(React.isValidElement(tree)){if(tree.type===type)out.push(tree);elements(tree.props.children,type,out);}
  return out;
}
function view(c,rows){
  client=c;currentState={batches:rows};return AuditLog();
}
const compile=(source,load,extra={})=>{
  const exports={},context=vm.createContext({exports,require:load,console,process,Buffer,Request,Response,AbortSignal,TextDecoder,setTimeout,clearTimeout,...extra});
  vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,context);
  return exports;
};
(async()=>{
  const rows=[archive,newUpload,batch("7",{_undo:{kind:"pre-cutover",namespace:"legacy-engage"}}),
    batch("8",{_undo:{kind:"pre-cutover",namespace:"legacy-engage"},undone_at:"2026-01-02T00:00:00Z"})];
  const before=JSON.stringify(rows),tree=view("pvas",rows),html=renderToStaticMarkup(tree);
  assert.ok(html.includes("Pre-cutover · read-only"));assert.ok(html.includes("Undone "));
  assert.ok(html.includes("Undo for new uploads is not yet available in this view."));
  assert.equal((html.match(/Fictional upload/g)||[]).length,4,"all original headers retained, including previously undone");
  const buttons=elements(tree,"button");assert.equal(buttons.length,3);
  for(const button of buttons){assert.equal(button.props.disabled,true);await button.props.onClick();}
  assert.equal(posts.length,0);assert.equal(confirms,0);assert.equal(reloads,0,"guard rejects before confirm, network and reload");
  const keys=elements(tree,"tr").map(x=>x.key).filter(Boolean);
  assert.equal(new Set(keys).size,rows.length,"archive and current numeric ID namespace cannot collide");
  assert.equal(policy.uploadUndoPolicy("pvas",archive).kind,"pre-cutover");
  for(const row of [newUpload,batch(1),batch(1,{_undo:{kind:"pre-cutover",namespace:"wrong"}})])
    assert.equal(policy.uploadUndoPolicy("pvas",row).kind,"unverified","no timestamp/id/absence-based archive inference or capability");
  assert.equal(JSON.stringify(rows),before,"original header fields and BIGINT string untouched");
  for(const c of ["jag","csnf","wcbhc","baq","pvas"]){
    gate=c!=="pvas";
    const old=view(c,[batch(4)]),button=elements(old,"button")[0];
    assert.equal(button.props.disabled,false);
    assert.equal(renderToStaticMarkup(old).includes("Pre-cutover"),false);
    await button.props.onClick();
    assert.deepEqual(posts.at(-1),{op:"undo",batchId:4,by:""});
  }
  console.log("PASS actual AuditLog render/action: archive read-only, BIGINT strings, equal numeric IDs, undone history retained, unverified disabled, no canonical Undo issued; all4clients/gatefalse unchanged");

  gate=true;
  const archiveRows=Array.from({length:203},(_,i)=>batch((BigInt("9223372036854775807")-BigInt(i)).toString(),
    {_undo:{kind:"pre-cutover",namespace:"legacy-engage"},file_name:i===0?null:"Fictional",created_by:null}));
  const first={batches:[newUpload,...archiveRows.slice(0,200)],
    historicalBatchPage:{next:archiveRows[199].id,done:false},other:"retained"};
  const page={v:1,namespace:"legacy-engage",rows:archiveRows.slice(200),next:null,done:true};
  const firstBefore=JSON.stringify(first),readCursors=[];
  const complete=await policy.completePvasUploadHistory(first,async before=>{readCursors.push(before);return page;});
  assert.deepEqual(readCursors,[archiveRows[199].id]);
  assert.deepEqual(complete.batches,[newUpload,...archiveRows]);
  assert.deepEqual(complete.historicalBatchPage,{next:null,done:true});assert.equal(complete.other,"retained");
  assert.equal(JSON.stringify(first),firstBefore,"initial batches, null metadata, raw ordinals not mutated or sorted");
  for(const broken of [
    {...page,rows:[archiveRows[199]]},
    {...page,rows:[archiveRows[202],archiveRows[201]]},
    {...page,rows:[{...archiveRows[200],id:1}]},
    {...page,rows:[{...archiveRows[200],id:"9223372036854775808"}]},
    {...page,rows:[],next:archiveRows[199].id,done:false},
    {...page,next:archiveRows[200].id,done:false},
    {...page,namespace:"canonical-pvas"},
    {...page,extra:true},
  ])await assert.rejects(()=>policy.completePvasUploadHistory(first,async()=>broken));
  await assert.rejects(()=>policy.completePvasUploadHistory({batches:[]},async()=>page));
  assert.deepEqual(policy.historicalUploadsReadBody({op:"pvasHistoricalUploads"}),{before:null,limit:100});
  for(const value of [0,"0","01","1e2","-1","9223372036854775808"])assert.throws(()=>policy.historicalUploadsReadBody({op:"pvasHistoricalUploads",before:value}));
  for(const limit of [0,201,"100",1.5])assert.throws(()=>policy.historicalUploadsReadBody({op:"pvasHistoricalUploads",limit}));
  assert.throws(()=>policy.historicalUploadsReadBody({op:"pvasHistoricalUploads",requestId:"unexpected"}));
  console.log("PASS exact history page composition: first200 + remaining3, raw descending BIGINT-string cursors/null metadata, complete/not-partial, duplicate/order/shape/cursor guards");

  const action=compile(read("lib/portal-v2/pvas-action.server.ts"),n=>n==="node:async_hooks"?require(n):n==="./pvas-canonical"?canonical:{}); 
  let sent=[],reply={status:410,body:{code:"pvas-historical-upload-read-only",retry:false,error:"ignored upstream detail"}};
  const server=compile(read("lib/portal-v2/server.ts"),n=>{
    if(n==="./pvas-action.server")return action;
    if(n==="./pvas-canonical")return canonical;
    if(n==="./pvas-upload-history")return policy;
    if(n==="next/server")return {NextResponse:Response};
    if(n.endsWith("-auth"))return new Proxy({},{get:()=>async()=>true});
    if(n==="@/lib/pvas-data-store")return {invalidatePvasDataCache:()=>{}};
    if(n.endsWith("/clients"))return {PORTAL_V2:{pvas:{goal:1}}};
    return {};
  },{fetch:async(_url,init)=>{
    const body=JSON.parse(init.body);sent.push(body);
    if(body.op==="pvasHistoricalUploads"){
      assert.deepEqual(Object.keys(body).sort(),["before","client","limit","op"]);
      assert.equal(body.client,"pvas");assert.equal(typeof body.before,"string");
      return Response.json(page);
    }
    assert.deepEqual(Object.keys(body).sort(),["client","command","op"],"strict backend command envelope");
    return Response.json(reply.body,{status:reply.status});
  }});
  process.env.ENGAGE_PORTAL_URL="https://fixture.invalid/portal";process.env.PORTAL_WRITE_SECRET="synthetic-not-a-secret";
  const id="a".repeat(32),by="Fixture",command={requestId:id,actor:by,batchId:"9223372036854775807",batchNamespace:"legacy-engage"};
  const post=body=>server.portalV2Route("pvas").POST(new Request("https://fixture.invalid",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
  const history=await post({op:"pvasHistoricalUploads",before:archiveRows[199].id,limit:200});
  assert.equal(history.status,200);assert.deepEqual(await history.json(),page);
  assert.deepEqual(sent.pop(),{op:"pvasHistoricalUploads",client:"pvas",before:archiveRows[199].id,limit:200},"read has no requestId/command widening");
  assert.equal((await post({op:"pvasHistoricalUploads",before:1})).status,400);assert.equal(sent.length,0);
  providerMode=true;stateWrites=[];
  global.fetch=async(url,init)=>{
    if(!init?.method)return Response.json(first);
    assert.equal(init.cache,"no-store");
    assert.deepEqual(JSON.parse(init.body),{op:"pvasHistoricalUploads",before:archiveRows[199].id,limit:200});
    return server.portalV2Route("pvas").POST(new Request("https://fixture.invalid",{...init}));
  };
  PortalV2Provider({client:"pvas",children:null});await reloadCallback();
  assert.deepEqual(stateWrites[0],complete,"actual provider -> website read route -> exact backend envelope -> all archive headers");
  sent=[];stateWrites=[];
  global.fetch=async(_url,init)=>init?.method?Response.json({error:"unavailable"},{status:503}):Response.json(first);
  PortalV2Provider({client:"pvas",children:null});await reloadCallback();
  assert.equal(typeof stateWrites[0],"function","failed later page retains last-good state marked unavailable, never partial success");
  assert.deepEqual(stateWrites[0]({batches:["last-good"]}),{batches:["last-good"],configured:false,error:"Current state unavailable; retained last good data, not current success"});
  for(const c of ["jag","csnf","wcbhc","baq","pvas"]){
    gate=c!=="pvas";stateWrites=[];let reads=0;
    global.fetch=async(_url,init)=>{assert.deepEqual(init,{cache:"no-store"});reads++;return Response.json({batches:[]});};
    PortalV2Provider({client:c,children:null});await reloadCallback();assert.equal(reads,1);
    assert.deepEqual(stateWrites[0],{batches:[]});
  }
  providerMode=false;gate=true;
  console.log("PASS actual provider -> website POST -> exact history envelope, all pages retained; partial read marked unavailable; other4clients/gatefalse no extra reads");
  const legacy=await post({op:"undo",batchId:command.batchId,by,requestId:id});
  assert.equal(legacy.status,410);assert.equal(sent.length,0,"old namespace rejected before upstream query/mutation");
  assert.equal((await legacy.json()).code,policy.HISTORICAL_UPLOAD_READ_ONLY.code);
  const refused=await post({op:"pvasBatchUndo",by,requestId:id,command});
  assert.equal(refused.status,410);
  assert.deepEqual(await refused.json(),{...policy.HISTORICAL_UPLOAD_READ_ONLY,requestId:id});
  assert.deepEqual(sent.at(-1),{op:"pvasBatchUndo",client:"pvas",command},"archive identity not Number-coerced or replaced by canonical ID");
  for(const [status,body] of [[503,{code:policy.HISTORICAL_UPLOAD_READ_ONLY.code,retry:false}],[410,{code:"other",retry:false}],[410,{code:policy.HISTORICAL_UPLOAD_READ_ONLY.code,retry:true}]]){
    reply={status,body};
    const response=await post({op:"pvasBatchUndo",by,requestId:id,command}),data=await response.json();
    assert.equal(response.status,503);assert.notEqual(data.code,policy.HISTORICAL_UPLOAD_READ_ONLY.code);
    if(status===503)assert.equal(data.unconfirmed,true,"uncertain response retains same-ID recovery");
  }
  assert.equal(policy.historicalUploadRejection("pvasGift",410,{code:policy.HISTORICAL_UPLOAD_READ_ONLY.code,retry:false}),null);
  console.log("PASS actual website POST -> strict envelope -> synthetic backend410 -> honest static refusal; old undo no forwarding; unrelated/uncertain errors unchanged; no namespace or BIGINT coercion");
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{Module._load=original;});
