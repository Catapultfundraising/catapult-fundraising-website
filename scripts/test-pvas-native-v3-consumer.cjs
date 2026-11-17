// Fictional HTTP composition only. Real immutable backend decoder/dispatcher/
// intent owners; scripted read rows/public commit receipts, NOT SQL/Tx proof.
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),Module=require("node:module");
const assert=require("node:assert/strict"),crypto=require("node:crypto"),ts=require("typescript"),React=require("react");
const {renderToStaticMarkup}=require("react-dom/server");
const root=process.cwd(),f2=path.join(__dirname,"fixtures/pvas-native-v2"),f3=path.join(__dirname,"fixtures/pvas-native-v3"),original=Module._load;
const sha=b=>crypto.createHash("sha256").update(b).digest("hex"),clone=x=>structuredClone(x);
for(const folder of [f2,f3]){
 const pins=JSON.parse(fs.readFileSync(path.join(folder,"pins.json")));
 for(const [name,p]of Object.entries(pins.files))assert.equal(sha(fs.readFileSync(path.join(folder,name))),typeof p==="string"?p:p.sha256,name);
}
for(const ext of [".ts",".tsx",".source"])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{
 fileName:f.replace(/\.source$/,""),compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const deny=()=>{throw Error("Unrelated backend dependency called");};
const unused=new Proxy({},{get:()=>deny});
let gate=true,accepted=false,ctx,hookMode=false,slots=[],cursor=0;
const canonical={pvasCanonicalEnabled:c=>gate&&c==="pvas"};
const store=new Map();
global.sessionStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
global.localStorage={getItem:()=>"",setItem:()=>{}};
let backendWrite,backendStatus;
Module._load=function(name,parent,main){
 if(parent?.filename.startsWith(f2)&&name.startsWith("./"))return original.call(this,path.join(f2,name.slice(2)+".ts.source"),parent,main);
 if(parent?.filename.startsWith(f3)&&name.startsWith("./")){
  if(name==="./pvasNativeCampaignTxV3")return {updateNativeCampaignV3:(...a)=>backendWrite(...a),nativeCampaignStatusV3:(...a)=>backendStatus(...a)};
  const n=name.slice(2)+".ts.source";
  if(fs.existsSync(path.join(f3,n)))return original.call(this,path.join(f3,n),parent,main);
  if(fs.existsSync(path.join(f2,n)))return original.call(this,path.join(f2,n),parent,main);
  if(name==="./sourceImport")return {SourceImportError:class extends Error{constructor(code){super(code);this.code=code;}}};
  return unused;
 }
 if(name==="server-only")return {};
 if(name.endsWith("/pvas-canonical")||name==="./pvas-canonical")return canonical;
 if(name==="react"&&parent?.filename.endsWith("/components/portal-v2.tsx"))return {...React,
  useContext:()=>ctx,useEffect:()=>{},useRef:()=>({current:null}),useState:initial=>{
   if(!hookMode)return React.useState(initial);
   const n=cursor++;if(!(n in slots))slots[n]=typeof initial==="function"?initial():initial;
   return [slots[n],v=>slots[n]=typeof v==="function"?v(slots[n]):v];
  }};
 if(name==="@/components/dashboard-shared")return {useSort:rows=>({sorted:rows}),SortTh:()=>null,NameLink:p=>p.name,DateInput:p=>React.createElement("input",p),isoToUs:v=>v??"",parseUsDateClient:v=>v};
 if(name.startsWith("@/components/")&&name!=="@/components/pvas-native-history")return new Proxy({},{get:()=>p=>React.createElement("div",p,p.children)});
 if(name.startsWith("@/"))name=path.join(root,name.slice(2));
 return original.call(this,name,parent,main);
};
const load=name=>require(path.join(root,name));
const W=load("lib/portal-v2/pvas-native-v3.ts"),C=load("lib/portal-v2/pvas-native-consumer.ts"),S=load("lib/portal-v2/pvas-state-wire.ts");
const M=load("lib/portal-v2/pvas-native-mutation-v3.ts"),client=load("lib/portal-v2/pvas-native-mutation.client.ts");
const action=load("lib/portal-v2/pvas-action.server.ts");
const B=require(path.join(f3,"pvasNativeGiftReadV3.ts.source"));
const Snap=require(path.join(f3,"pvasNativeCampaignSnapshotV3.ts.source"));
const Intent=require(path.join(f3,"pvasNativeCampaignMutationV3.ts.source"));
const Dispatch=require(path.join(f3,"pvasCanonicalPortal.ts.source"));
const schema=require(path.join(f3,"pvasNativeCampaignSchemaV3.ts.source"));
const oldRead=require(path.join(f2,"pvasNativeGiftReadV2.ts.source")),oldCodec=require(path.join(f2,"pvasNativeGiftFoundation.ts.source"));
const source={system:"portal_gifts",key:"9007199254740993"};
function gift(i=7,order="9007199254740993",business=null){
 return Snap.decodeCampaignSnapshotV3({v:3,gift:{giftId:i,cptid:9,version:4,order,representation:"native-campaign",source:{...source,key:String(BigInt(source.key)+BigInt(i))},
  sources:[{...source,key:String(BigInt(source.key)+BigInt(i))}],membership:{state:"active",retiredByRequestId:null},
  native:{id:String(BigInt(source.key)+BigInt(i)),cptid:business,donor_name:"Fictional",kind:"gift",amount:1.001,gift_date:"original date",batch_id:"9007199254740995",note:null}}});
}
function event(){
 return {giftId:900,cptid:9,version:1,order:"9007199254741999",representation:"admitted-event",sources:[{system:"manual",key:"fictional"}],
 event:{amount:"0.10",currency:"USD",date:null,year:2020,kind:"gift",status:"received",scope:"campaign",credit:"hard",campaign:null,fund:null,type:null,note:null,donorName:"Fictional"},voidReason:null};
}
function history(){
 return {giftId:901,cptid:9,version:1,order:"9007199254742000",representation:"native-history",source:{system:"client_gift_history",key:"9007199254740993"},
 sources:[{system:"client_gift_history",key:"9007199254740993"}],native:{amount:"-90071992547409.91",date:null,year:2020,status:"ReFuNdEd",campaign:"",fund:null,type:null,recordType:"gift",note:"",loadedAt:"2026-10-23T12:00:00.1234567"}};
}
function raw(g){
 const row=Object.fromEntries(["amount","currency","date","year","kind","status","scope","credit","campaign","fund","type","note","donorName","voidReason",...oldRead.NATIVE_SQL_COLUMNS,
 "nativeLifecycle","nativeRetiredRequestId","native_campaign_cptid","native_void_request_id","native_void_reason"].map(k=>[k,null]));
 for(const k of ["giftId","cptid","version","order","representation"])row[k]=g[k];
 if(g.representation==="native-campaign"){
  const c=Snap.campaignColumnsV3(g);Object.assign(row,c,{nativeLifecycle:c.native_lifecycle,nativeRetiredRequestId:c.native_retired_request_id});
  delete row.native_lifecycle;delete row.native_retired_request_id;
 }else if(g.representation==="native-history")Object.assign(row,oldCodec.nativeColumns(g));
 else Object.assign(row,g.event,{voidReason:g.voidReason});
 return row;
}
let records=[gift(),event(),history()],calls=[],lastOriginal;
const run=async(sql,p)=>{
 if(sql===B.GIFT_READ_SQL_V3.invalid)return {rows:[]};
 const selected=records.filter(r=>(p.lane==="history"?r.representation==="native-history"||r.event?.scope==="historical":r.representation==="native-campaign"||r.event?.scope==="campaign")&&
 (p.after===null||BigInt(r.order)>BigInt(p.after))&&(p.view==="provenance"||r.representation!=="native-campaign"||r.membership.state==="active")&&
 (!p.filterDonor||(r.representation==="native-campaign"?r.native.cptid:r.cptid)===p.donor)).slice(0,p.limit);
 if(sql===B.GIFT_READ_SQL_V3.page)return {rows:selected.map(raw)};
 assert.equal(sql,B.GIFT_READ_SQL_V3.sources);
 return {rows:selected.flatMap(r=>r.sources.map(s=>({source_system:s.system,source_key:s.key,gift_id:r.giftId,cptid:r.cptid,source_hash:"c".repeat(64),creation_version:1,request_id:"b".repeat(32)})))};
};
const deps={read:run,txf:f=>f(run),assertNativeReadCapabilityV3:schema.requireNativeCampaignSchemaV3};
const request={v:3,lane:"campaign",view:"current",after:null,limit:500};
const state=async()=>({v:3,stateVersion:3,giftWireVersion:3,nativeCampaignPage:await B.readNativeGiftPageV3(run,request,schema.requireNativeCampaignSchemaV3),
 prospects:[],updates:[],batches:[],databaseGiftEditsAvailable:false,canonicalAudit:[],historicalBatchPage:{next:null,done:true}});
async function receiver(body){
 calls.push(clone(body));
 if(body.op==="nativeStateV3"){assert.deepEqual(Object.keys(body).sort(),["client","op"]);return state();}
 return Dispatch.dispatchPvasCanonicalPortal(body,deps);
}
const compile=(source,require,extra={},fileName="fixture.ts")=>{
 const exports={},context=vm.createContext({exports,require,console,process,Buffer,Request,Response,AbortSignal,TextDecoder,TextEncoder,structuredClone,crypto:crypto.webcrypto,setTimeout,clearTimeout,...extra});
 vm.runInContext(ts.transpileModule(source,{fileName,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,context);
 return exports;
};
let fetchResponse;
const gateway=compile(fs.readFileSync(path.join(root,"lib/portal-v2/server.ts"),"utf8"),name=>{
 if(name==="./pvas-canonical")return canonical;
 if(name==="./pvas-action.server")return action;
 if(name==="./pvas-state-wire")return S;
 if(name==="./pvas-native-consumer")return C;
 if(name==="./pvas-native-v3")return W;
 if(name==="./pvas-native-mutation-v3")return M;
 if(name==="./pvas-native-write-acceptance.server")return {pvasNativeWriteAccepted:()=>accepted};
 if(name==="next/server")return {NextResponse:Response};
 if(name.endsWith("-auth"))return new Proxy({},{get:()=>async()=>true});
 if(name==="@/lib/pvas-data-store")return {getPvasRecords:async()=>({records:{}}),invalidatePvasDataCache:()=>{}};
 if(name.endsWith("/clients"))return {PORTAL_V2:{pvas:{goal:1000}}};
 return {};
},{fetch:async(_url,init)=>{assert.equal(init.cache,"no-store");return fetchResponse?fetchResponse(JSON.parse(init.body)):Response.json(await receiver(JSON.parse(init.body)));}});
const http=body=>gateway.portalV2Route("pvas").POST(new Request("https://fixture.invalid/api",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
async function main(){
 process.env.ENGAGE_PORTAL_URL="https://fixture.invalid/backend";process.env.PORTAL_WRITE_SECRET="offline-placeholder";
 records=[...Array.from({length:501},(_,i)=>gift(i+1,String(BigInt("9007199254740993")+BigInt(i)),i===500?null:9)),event()];
 const bytes=JSON.stringify(records);
 const st=await gateway.engageCall("pvas","state");
 assert.equal(st.status,200);assert.equal(st.body.gifts.length,502);assert.equal(st.body.gifts[500].cptid,null);
 assert.equal(st.body.gifts[500]._nativeGift.cptid,9,"technical root remains separate, not business fallback");
 assert.equal(st.body.gifts[0].amount,1.001);assert.equal(st.body.gifts.at(-1).amount,0.1);assert.equal(st.body.gifts.at(-1)._nativeGift.event.amount,"0.10");
 assert.equal(st.body.gifts.some(r=>"amountExact"in r),false);
 assert.deepEqual(calls.map(c=>c.op),["nativeStateV3","nativeGiftPageV3"]);
 assert.deepEqual(calls[1].request,{...request,after:records[499].order});
 assert.equal(st.body.databaseGiftEditsAvailable,false);assert.equal(JSON.stringify(records),bytes);
 const rawState=await state();
 for(const bad of [{...rawState,gifts:[]},{...rawState,stateVersion:2},{...rawState,v:2},{...rawState,nativeCampaignPage:{...rawState.nativeCampaignPage,records:[records[0]]}}])
  await assert.rejects(()=>C.consumeNativeStateCampaignV3(bad,deny));
 await assert.rejects(()=>C.consumeNativeStateCampaignV3(rawState,async()=>{throw Error("tail fails");}));
 console.log("PASS nativeStateV3 exact envelope + initial500 once + complete mixed cursor tail + genuine null business donor + fail-closed state");
 const result=await http({op:"nativeGiftPageV3",client:"pvas",request:{...request,donor:null}});
 assert.equal(result.status,200);const unassigned=await result.json();assert.equal(unassigned.records.length,1);assert.equal(unassigned.records[0].gift.native.cptid,null);
 for(const invalid of [{...request,lane:["campaign"]},{...request,view:["current"]},{...request,donor:0},{...request,after:9007199254740992},{...request,invented:true}]){
  const n=calls.length;assert.equal((await http({op:"nativeGiftPageV3",client:"pvas",request:invalid})).status,400);assert.equal(calls.length,n);
 }
 assert.equal((await http({op:"nativeGiftPageV3",client:"jag",request})).status,400);
 const g=gift(),snap={v:3,gift:g};assert.deepEqual(W.decodeMixedSnapshot(snap),g);
 for(const invalid of [{...snap,v:2},{...snap,gift:{...g,legacy:g.native}},{v:3,gift:{...g,native:{...g.native,cptid:undefined}}}])assert.throws(()=>W.decodeMixedSnapshot(invalid));
 const voided={...g,membership:{state:"voided",requestId:"a".repeat(32),reason:"Duplicate"}};
 assert.deepEqual(W.decodeMixedSnapshot({v:3,gift:voided}),voided);assert.throws(()=>W.mixedGiftPage({v:3,lane:"campaign",view:"current",records:[{v:3,gift:voided}],next:null,done:true},request));
 assert.throws(()=>W.mixedGiftPage({...unassigned,records:[{v:2,gift:g}]},{...request,donor:null}));
 const dbSource={system:"website_db",key:"db|Stewardship|9|pledge|"};
 const db={...g,source:dbSource,sources:[dbSource],native:{id:-7,key:dbSource.key,cptid:null,donor_name:"Fictional",kind:"pledge",amount:0.30000000000000004,gift_date:"1/2/2020",
  corrected:{by:"Original actor",at:"raw original clock",from:0.2}}};
 assert.deepEqual(W.decodeMixedSnapshot({v:3,gift:db}),Snap.decodeCampaignSnapshotV3({v:3,gift:db}));
 assert.deepEqual(W.campaignPresentationV3([db]).rows[0].row,db.native);
 assert.equal(Object.hasOwn(W.campaignPresentationV3([db]).rows[0].row,"status"),false);
 assert.throws(()=>W.campaignPresentationV3([db,db]));
 console.log("PASS actual HTTP -> exact-key backend dispatcher -> final enum-corrected reader -> strict snapshot decoder; null donor filter, malformed enums and lifecycle guards");
 records=[history()];
 const reader=load("lib/portal-v2/pvas-native-gifts.server.ts");
 global.fetch=async(_url,init)=>Response.json(await receiver(JSON.parse(init.body)));
 const h=await reader.readPvasNativeGiftsV2("history");
 assert.equal(h.records[0].native.amount,"-90071992547409.91");assert.equal(h.records[0].native.loadedAt,"2026-10-23T12:00:00.1234567");
 assert.equal(C.nativeHistoryDetail(h,9)[0].year,2020);
 const exportModel=load("lib/portal-v2/pvas-export-model.ts");
 const exportRecord={cptid:9,name:"Fictional",nativeGiftHistory:h,summary:{lifetime:123,gifts:4,largest:40,years:2,band:"Fictional"}};
 const out=exportModel.recordPayload(exportRecord),section=out.sections.find(s=>s.heading?.startsWith("Original historical detail"));
 assert.equal(out.cols[1].kind,"text");assert.equal(section.rows[0][1],h.records[0].native.amount);
 assert.equal(section.rows[0][2],null);assert.equal(section.rows[0][3],2020);
 assert.deepEqual(JSON.parse(section.rows[0][12]),h.records[0]);assert.equal(section.rows[0][11],"current");
 assert.ok(out.sections.every(s=>s.rows.every(row=>row.length===13)));
 assert.throws(()=>exportModel.recordPayload({...exportRecord,nativeGiftHistory:undefined}),/unavailable/);
 assert.throws(()=>C.nativeHistoryDetail(h,8),/record/);
 console.log("PASS actual history transport now v3 / unchanged strict v2 history envelopes; signed Decimal and raw date/year/status/7digits retained");
 const command={v:3,requestId:"a".repeat(32),rootCptid:9,target:{giftId:7,expectedVersion:4,source:g.source},action:"edit",values:{amount:"$123.456",kind:"pledge",date:"12/3/2026",note:null}};
 const body={op:"nativeCampaignMutationV3",client:"pvas",by:" Exact declared name ",command};
 const hash=Intent.hashCampaignMutationV3(command,body.by);
 assert.equal(await M.campaignPayloadHash(body),hash);
 const makeReceipt=(b,replayed=false)=>({v:3,kind:"gift",operation:b.op,requestId:b.command.requestId,rootCptid:b.command.rootCptid,payloadHash:Intent.hashCampaignMutationV3(b.command,b.by),
 giftId:7,version:5,order:g.order,action:b.command.action,changed:true,replayed});
 backendWrite=async(_tx,c,context)=>{assert.deepEqual(c,command);assert.equal(context.actor,body.by);lastOriginal=clone(c);return makeReceipt(body);};
 backendStatus=async(_tx,c,context)=>{assert.deepEqual(c,lastOriginal);assert.equal(context.actor,body.by);return {v:3,operation:body.op,requestId:command.requestId,payloadHash:hash,retry:false,status:"committed",receipt:makeReceipt(body)};};
 const beforeDenied=calls.length;assert.equal((await http(body)).status,503);assert.equal(calls.length,beforeDenied,"server default-deny before backend");
 accepted=true;const saved=await http(body);assert.equal(saved.status,200);await M.campaignReceipt(await saved.json(),body);
 assert.deepEqual(calls.at(-1),body,"no outer ID/actor/proof injection");
 const statusBody=M.campaignStatusBody(body);assert.equal((await http(statusBody)).status,200);assert.deepEqual(calls.at(-1),statusBody);
 const genericClient=load("lib/portal-v2/pvas-action.client.ts");
 for(const read of [{op:"nativeGiftPageV3",client:"pvas",request},statusBody]){
  const before=store.size;global.fetch=async(_url,init)=>{assert.deepEqual(JSON.parse(init.body),read);return Response.json({read:true});};
  assert.deepEqual(await (await genericClient.pvasActionFetch("pvas","/fixture",{method:"POST",body:JSON.stringify(read)})).json(),{read:true});
  assert.equal(store.size,before,"reads/status never acquire generic mutation IDs");
 }
 await assert.rejects(()=>genericClient.pvasActionFetch("pvas","/fixture",{method:"POST",body:JSON.stringify(body)}));
 for(const invalid of [{...body,requestId:command.requestId},{...body,by:""},{...body,command:{...command,actor:body.by}},{...statusBody,operation:"pvasGift"}])assert.equal((await http(invalid)).status,400);
 const voidBody={...body,command:{...command,action:"void",reason:" Duplicate "}};delete voidBody.command.values;
 assert.deepEqual(M.campaignCommand(voidBody.command),Intent.parseCampaignMutationV3(voidBody.command));
 console.log("PASS exact real website route -> backend dispatcher/intent/hash; all original controls and namespace/version/root target; default-deny write acceptance and original-command/by status");
 // Unknown COMMIT transport: preserve exact public intent over module reload;
 // check pending, absence and committed without any second write.
 let sent=[];global.fetch=async(_url,init)=>{sent.push(JSON.parse(init.body));throw Error("unknown COMMIT");};
 await assert.rejects(()=>client.submitCampaignChange("/api/pvas-data-v2",body));assert.deepEqual(client.pendingCampaignChange(),body);
 delete require.cache[require.resolve(path.join(root,"lib/portal-v2/pvas-native-mutation.client.ts"))];
 const restored=load("lib/portal-v2/pvas-native-mutation.client.ts");assert.deepEqual(restored.pendingCampaignChange(),body);
 await assert.rejects(()=>restored.submitCampaignChange("/api/pvas-data-v2",{...body,by:"changed"}));assert.equal(sent.length,1);
 for(const status of ["pending","not-observed"]){
  global.fetch=async(_url,init)=>{const b=JSON.parse(init.body);sent.push(b);assert.deepEqual(b,statusBody);return Response.json({v:3,operation:body.op,requestId:command.requestId,payloadHash:hash,retry:false,status,receipt:null});};
  assert.equal((await restored.checkCampaignChange("/api/pvas-data-v2")).status,status);assert.deepEqual(restored.pendingCampaignChange(),body);
 }
 global.fetch=async(_url,init)=>{const b=JSON.parse(init.body);sent.push(b);assert.deepEqual(b,statusBody);return Response.json({v:3,operation:body.op,requestId:command.requestId,payloadHash:hash,retry:false,status:"committed",receipt:makeReceipt(body)});};
 await restored.checkCampaignChange("/api/pvas-data-v2");assert.equal(restored.pendingCampaignChange(),null);
 assert.equal(sent.filter(b=>b.op==="nativeCampaignMutationV3").length,1);
 for(const value of [{...body,client:"jag"},{...body,command:{...command,proof:true}}]){
  store.set("pvas:campaign-change:v3:nativeCampaignMutationV3",JSON.stringify(value));assert.throws(()=>restored.pendingCampaignChange());
  await assert.rejects(()=>restored.submitCampaignChange("/api/pvas-data-v2",body));
 }
 // Structurally valid storage tampering is NOT authenticated by storage. It
 // can only perform a status lookup; the backend's actual body/by hash refuses.
 const tampered={...body,by:"Changed declared name"};
 store.set("pvas:campaign-change:v3:nativeCampaignMutationV3",JSON.stringify(tampered));
 global.fetch=async(_url,init)=>{assert.equal(JSON.parse(init.body).op,"nativeCampaignStatusV3");return Response.json({error:"conflict"},{status:409});};
 await assert.rejects(()=>restored.checkCampaignChange("/api/pvas-data-v2"));assert.deepEqual(restored.pendingCampaignChange(),tampered);
 store.clear();
 await assert.rejects(()=>restored.submitCampaignChange("/api/jag-data-v2",body));assert.equal(store.size,0);
 for(const values of [{amount:"n/a"},{date:"2/30/2026"},{donorCptid:-1}])assert.throws(()=>M.campaignCommand({...command,values}));
 console.log("PASS unknown COMMIT -> exact public intent retained across reload -> pending/absence retain -> verified committed clears; no auto write retry, tamper/cross-client refusal");
 // Actual component body/handlers, mocked hooks and inert UI dependencies.
 ctx={client:"pvas",state:{...st.body,goal:1000,databaseGiftEditsAvailable:false},reload:async()=>{}};
 const UI=load("components/portal-v2.tsx");const html=renderToStaticMarkup(React.createElement(UI.CampaignDonors));
 assert.ok(html.includes("Gift changes are currently unavailable."));assert.ok(!/held integration|native write|aggregate owners|SQL NULL|nativeCampaignInventory/.test(html));
 const History=load("components/pvas-native-history.tsx").PvasNativeHistory;
 const historyHtml=renderToStaticMarkup(React.createElement(History,{history:h,cptid:9}));
 assert.ok(historyHtml.includes("Gift history")&&historyHtml.includes("Not recorded"));assert.ok(!historyHtml.includes("<pre"));
 console.log("PASS familiar campaign/history UI, visible default-disabled Edit/Void, no raw JSON/protocol jargon");
 const hooks={...React,useContext:()=>ctx,useEffect:()=>{},useRef:()=>({current:null}),useState:initial=>{
   const n=cursor++;if(!(n in slots))slots[n]=typeof initial==="function"?initial():initial;
   return [slots[n],v=>slots[n]=typeof v==="function"?v(slots[n]):v];
 }};
 const component=compile(fs.readFileSync(path.join(root,"components/portal-v2.tsx"),"utf8")+"\nexport { AllGifts as TestAllGifts };",name=>{
  if(name==="react")return hooks;
  if(name.startsWith("@/"))return require(name);
  return require(name);
 },{localStorage:global.localStorage},"components/portal-v2.tsx");
 const nodes=(e)=>!e||typeof e!=="object"?[]:[e,...React.Children.toArray(e.props?.children).flatMap(nodes)];
 const render=()=>{cursor=0;return component.TestAllGifts();};
 const button=(tree,label)=>nodes(tree).find(e=>e.type==="button"&&e.props.children===label);
 const field=(tree,label)=>{const l=nodes(tree).find(e=>e.type==="label"&&React.Children.toArray(e.props.children).some(x=>typeof x==="string"&&x.startsWith(label)));assert.ok(l,label);return nodes(l).find(e=>e.props.onChange);};
 let reloads=0;
 ctx={client:"pvas",state:{...st.body,gifts:[{...g.native,_nativeGift:g}],databaseGiftEditsAvailable:true},reload:async()=>{reloads++;}};
 slots=[];let tree=render();field(tree,"Your name").props.onChange({target:{value:body.by}});tree=render();
 button(tree,"Edit").props.onClick();tree=render();
 field(tree,"Amount").props.onChange({target:{value:"$123.456"}});tree=render();
 field(tree,"Type").props.onChange({target:{value:"pledge"}});tree=render();
 field(tree,"Date").props.onChange("12/3/2026");tree=render();
 field(tree,"Note").props.onChange({target:{value:"Updated note"}});tree=render();
 // Refresh does not replace the dialog's captured original/version or inputs.
 ctx.state.gifts=[{...g.native,amount:999,_nativeGift:{...g,version:5}}];tree=render();
 backendWrite=async(_tx,c,context)=>{
  assert.equal(c.rootCptid,9);assert.equal(c.target.expectedVersion,4);assert.equal(context.actor,body.by);
  assert.deepEqual(c.values,{amount:"$123.456",kind:"pledge",date:"12/3/2026",note:"Updated note"});
  return makeReceipt({op:body.op,client:"pvas",by:context.actor,command:c});
 };
 global.fetch=async(_url,init)=>http(JSON.parse(init.body));
 await button(tree,"Save changes").props.onClick();assert.equal(reloads,1);assert.equal(store.size,0);
 tree=render();button(tree,"Void").props.onClick();tree=render();
 field(tree,"Reason for voiding").props.onChange({target:{value:"Duplicate"}});tree=render();
 backendWrite=async(_tx,c,context)=>{assert.equal(c.action,"void");assert.equal(c.reason,"Duplicate");assert.equal("values"in c,false);return {...makeReceipt({op:body.op,by:context.actor,command:c}),version:c.target.expectedVersion+1};};
 await button(tree,"Void this record").props.onClick();assert.equal(reloads,2);
 ctx.state.databaseGiftEditsAvailable=false;tree=render();assert.equal(button(tree,"Edit").props.disabled,true);
 console.log("PASS actual complete AllGifts body/edit/Void handlers -> exact HTTP -> backend intent receiver; amount/kind/date/note/reason, captured optimistic target and unsaved edit preservation");
 gate=false;const n=calls.length;await assert.rejects(()=>reader.readPvasNativeGiftsV2("history"));assert.equal(calls.length,n);
 const oldExport=exportModel.recordPayload({...exportRecord,nativeGiftHistory:undefined,gifts:[{date:"2020",amount:12}]});
 assert.equal(oldExport.cols[1].kind,"usd");assert.equal(oldExport.sections.at(-1).rows[0][1],12);
 for(const c of ["csnf","jag","wcbhc","baq"]){assert.deepEqual(action.pvasActionBody(c,"editGift",{by:"original"}),{by:"original"});}
 assert.equal(load("lib/portal-v2/pvas-native-write-acceptance.server.ts").pvasNativeWriteAccepted(),false);
 console.log("PASS all4 non-PVAS action owners unchanged/offgate; real write acceptance remains false");
}
main().catch(e=>{console.error(e);process.exitCode=1});
