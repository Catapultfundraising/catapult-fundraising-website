// Fictional composition only. Exact pinned backend read owner, injected query
// rows (NOT SQL-engine/writer proof), then actual website reader/resolver/UI/route.
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),Module=require("node:module");
const assert=require("node:assert/strict"),crypto=require("node:crypto"),ts=require("typescript"),React=require("react");
const {renderToStaticMarkup}=require("react-dom/server"),root=process.cwd(),original=Module._load;
let gate=true,state,saved,payload,context,hookMode=false,hookValues=[],hookIndex=0,route,validateBackend;
const canonical={pvasCanonicalEnabled:client=>gate&&client==="pvas",PVAS_CANONICAL_ACCEPTED:false};
const transpile=(src,file)=>ts.transpileModule(src,{fileName:file,compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,
}}).outputText;
for(const ext of [".ts",".tsx"])require.extensions[ext]=(m,f)=>m._compile(transpile(fs.readFileSync(f,"utf8"),f),f);
const shared={useSort:rows=>({sorted:rows}),SortTh:()=>null,NameLink:p=>p.name,DateInput:()=>null,
  HistoryList:()=>null,todayUs:()=>"11/17/2026",parseUsDateClient:()=>true};
const gateway={engageCall:async(_client,op,args)=>{
  if(op==="getTracking")return {status:200,body:{configured:true,state:structuredClone(state)}};
  assert.equal(op,"setTracking");saved=structuredClone(args.data);
  validateBackend(plain({requestId:args.requestId,actor:args.by,data:saved}));
  // Capture full-state intent, NOT a backend writer simulation. Subsequent
  // reads retain the independent pinned-read fixture, not raw requested notes.
  return {status:200,body:{ok:true,requestId:args.requestId,revision:state.revision}};
},secondarySolicitors:async()=>({}),saveSecondarySolicitor:async()=>{},logHistoryAudit:async()=>{},
  parseUsDate:value=>value==="2026-11-17"?value:null};
Module._load=function(name,parent,main){
  if(name==="server-only")return {};
  if(name==="lucide-react")return new Proxy({},{get:()=>()=>null});
  if(name==="next/server")return {NextResponse:Response};
  if(name.endsWith("/pvas-canonical")||name==="./pvas-canonical")return canonical;
  if(name==="react"&&parent.filename.endsWith("/components/pvas-data-crm.tsx"))return {...React,
    useContext:()=>context,useEffect:()=>{},useState:initial=>{
      if(!hookMode)return React.useState(initial);
      const i=hookIndex++;if(!(i in hookValues))hookValues[i]=typeof initial==="function"?initial():initial;
      return [hookValues[i],value=>{hookValues[i]=typeof value==="function"?value(hookValues[i]):value;}];
    }};
  if(name==="@/lib/portal-v2/pvas-action.client")return {pvasActionFetch:async(_client,_url,init)=>{
    payload=JSON.parse(init.body);
    return route.POST(new Request("https://fixture.invalid",{method:"POST",body:JSON.stringify({
      ...payload,requestId:"1".repeat(32),actionAt:"2026-11-17T20:00:00.000Z",
    })}));
  }};
  if(name==="@/components/dashboard-shared")return shared;
  if(name.startsWith("@/components/"))return new Proxy({},{get:()=>()=>null});
  if(name==="./pvas-tracking.legacy")return {getPvasTracking:async()=>({legacy:true}),savePvasTracking:async()=>{}};
  if(["./portal-v2/server","@/lib/portal-v2/server"].includes(name))return gateway;
  if(name==="@/lib/portal-v2/direct-source-state.server")return {
    currentTracking:async(_client,get)=>get(),directTrackingView:async(_client,value)=>value,
  };
  if(name.startsWith("@/"))name=path.join(root,name.slice(2));
  return original.call(this,name,parent,main);
};
global.fetch=async()=>{throw Error("No external network");};
global.localStorage={getItem:()=>null,setItem:()=>{}};
const load=name=>require(path.join(root,name));
const plain=value=>JSON.parse(JSON.stringify(value));
function compile(source,require){
  const exports={},context=vm.createContext({exports,require,console,Buffer,process});
  vm.runInContext(transpile(source,"pinned-owner.ts"),context);
  return exports;
}
function pinned(name,sha){
  const data=fs.readFileSync(path.join(root,"scripts/fixtures/pvas-tracking-presence",name));
  assert.equal(crypto.createHash("sha256").update(data).digest("hex"),sha);
  return data.toString("utf8");
}
function backendReader(){
  const owners=pinned("pvasCanonicalOwners.ts.txt","df201e9b66e9bc7a0c418dabb4fd01438f4a7b89d3fb3ab5d323bf2f6ce50a20");
  const ast=ts.createSourceFile("owners.ts",owners,ts.ScriptTarget.Latest,true);
  // Exact complete declarations, not a second projection/presence implementation.
  const names=new Set(["pvasCampaignPresence","PVAS_TRACKING_STATUSES"]);
  const declarations=ast.statements.filter(node=>node.name&&names.has(node.name.text)||
    ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>names.has(d.name.text)));
  assert.equal(declarations.length,2);
  const pure=compile(declarations.map(node=>node.getFullText(ast)).join("\n"),()=>{throw Error("Pure owner imports none");});
  const source=pinned("pvasCanonicalTracking.ts.txt","d9885cfd7287a134ba54011b490d118508295102862dffc3687ddd84c7ee2d92");
  return compile(source,name=>{
    if(name==="node:crypto")return crypto;
    if(name==="./pvasCanonicalOwners")return pure;
    // Write/note dependencies are inert: this slice executes only the complete
    // backend read owner with no notes. Any unintended writer call is fatal.
    return new Proxy({},{get:()=>()=>{throw Error("No backend writer invocation");}});
  });
}
const row=(cptid,status,objectPresent,statusPresent)=>({cptid,state_cptid:cptid,portfolio_cptid:null,
  status,tracking_object_present:objectPresent,tracking_status_present:statusPresent,
  level:null,reason:null,solicitor:"",solicitor2:"",updated_at:null,updated_by:null});
const treeNodes=(value,out=[])=>{
  if(Array.isArray(value)){for(const v of value)treeNodes(v,out);}
  else if(value&&typeof value==="object"){out.push(value);treeNodes(value.props?.children,out);}
  return out;
};
async function main(){
  const backend=backendReader(),read=backend.readPvasCanonicalTracking;
  validateBackend=backend.validatePvasTrackingCommand;
  const sourceRows=[
    row(1,null,false,false),row(2,null,true,false),row(3,null,true,true),
    row(4,"",false,false),row(5,"Source custom",false,false),row(6,"Assigned",false,false),
    {...row(7,null,false,false),solicitor:"Hidden source primary",solicitor2:"Hidden source secondary"},
  ];
  state=plain(await read(async query=>({rows:query.startsWith("SELECT c.cptid,")?sourceRows:[]})));
  const {getPvasTracking}=load("lib/pvas-tracking.ts"),presence=load("lib/portal-v2/pvas-tracking-presence.ts");
  const actual=await getPvasTracking();
  for(const [id,objectPresent,statusPresent,hasStatus,status] of [
    [1,false,false,false],[2,true,false,false],[3,true,true,true,null],
    [4,true,true,true,""],[5,true,true,true,"Source custom"],[6,true,true,true,"Assigned"],
  ]){
    const p=actual.prospects[id];assert.deepEqual(p._canonicalTracking,{objectPresent,statusPresent});
    assert.equal(Object.hasOwn(p,"status"),hasStatus);if(hasStatus)assert.equal(p.status,status);
    assert.equal(presence.trackingObjectPresent("pvas",p),objectPresent);
    assert.equal(presence.trackingFormStatus("pvas",p),status??"Active");
  }
  for(const change of [
    p=>delete p._canonicalTracking,p=>p._canonicalTracking.extra=true,
    p=>p._canonicalTracking.objectPresent="false",p=>p._canonicalTracking.statusPresent=true,
    p=>p.status="Active",p=>delete p.solicitor,p=>delete p.solicitor2,
  ]){
    state=structuredClone(actual);change(state.prospects[1]);await assert.rejects(getPvasTracking);
  }
  state=structuredClone(actual);
  const {assignmentResolver}=load("lib/portal-v2/effective-assignment.ts");
  const overlay={mergedInto:new Map([[7,1]]),deleted:new Map()};
  assert.deepEqual(assignmentResolver({"7":{portfolio:{solicitor:"Source SQL",secondary:"Source SQL secondary"}}},
    actual,[],overlay)(1),{solicitor:"",solicitor2:""},"real merged resolver respects own blank carrier keys");
  const {TrackingPanel,TrackingStatusBadge}=load("components/pvas-data-crm.tsx");
  assert.equal(renderToStaticMarkup(React.createElement(TrackingStatusBadge,{prospect:actual.prospects[1]})),"");
  assert.ok(renderToStaticMarkup(React.createElement(TrackingStatusBadge,{prospect:actual.prospects[2]})).includes("<span"));
  assert.ok(renderToStaticMarkup(React.createElement(TrackingStatusBadge,{prospect:actual.prospects[5]})).includes("Source custom"));
  const exports=load("lib/portal-v2/pvas-export-model.ts");
  const donor={cptid:1,name:"Fictional",ask:500000,rating:500000,lifetime:0,gifts:0,largest:0,years:0,first:"",last:"",ds:"",capacity:"",capMin:0,qs:"",basis:"",solicitor:"",donorType:""};
  const table=exports.pvasExportTable("GiftChartTab.1",{snapshot:{pool:[donor]},index:[],tracking:actual,
    parameters:{goal:9000000,level:500000}});
  assert.equal(table.rows[0].status,"","GC2P nullish status is blank, not Unassigned");
  const record={...donor,summary:{lifetime:0,gifts:0,largest:0,years:0,band:""},nativeGiftHistory:{v:2,lane:"history",view:"current",records:[]}};
  assert.equal(exports.recordPayload(record,actual).sections.some(section=>section.heading?.startsWith("Campaign tracking")),false);
  assert.ok(exports.recordPayload({...record,cptid:3},actual).sections.some(section=>section.heading==="Campaign tracking: "));
  console.log("PASS pinned actual backend read -> strict website carrier -> merged resolver -> badge/record/GC2P; absence/null/blank/custom and malformed guards");

  const {trackingRoute}=load("lib/tracking-route.ts"),{savePvasTracking}=load("lib/pvas-tracking.ts");
  route=trackingRoute("pvas",async()=>true,getPvasTracking,savePvasTracking);
  const post=body=>route.POST(new Request("https://fixture.invalid",{method:"POST",body:JSON.stringify({
    cptid:1,by:"Fictional staff",requestId:"1".repeat(32),revision:actual.revision,
    actionAt:"2026-11-17T20:00:00.000Z",...body,
  })}));
  for(const id of [1,2,3,4,5,6]){
    for(const body of [{type:"status",solicitor:"Edited primary"},{type:"status",solicitor2:""},
      {type:"status",level:"500000",reason:"Fictional reason"},{type:"activity",date:"2026-11-17",note:"Fictional note",kind:"Note"}]){
      state=structuredClone(actual);saved=null;
      assert.equal((await post({...body,cptid:id})).status,200);
      const prev=actual.prospects[id],next=saved.prospects[id];
      assert.equal(Object.hasOwn(next,"status"),Object.hasOwn(prev,"status"));
      assert.equal(next.status,prev.status);assert.deepEqual(next._canonicalTracking,prev._canonicalTracking);
      if(body.type==="status")assert.equal(saved.activity.at(-1).note.includes("Status:"),false);
    }
  }
  for(const body of [{type:"status",status:null},{type:"status",status:"New custom"},
    {type:"status",_canonicalTracking:{objectPresent:true,statusPresent:true}}]){
    state=structuredClone(actual);saved=null;assert.equal((await post(body)).status,400);assert.equal(saved,null);
  }
  for(const id of [3,4,5]){
    state=structuredClone(actual);saved=null;
    assert.equal((await post({type:"status",cptid:id,status:actual.prospects[id].status})).status,200);
    assert.equal(saved.prospects[id].status,actual.prospects[id].status);
    assert.deepEqual(saved.prospects[id]._canonicalTracking,actual.prospects[id]._canonicalTracking);
    assert.equal(saved.activity.at(-1).note.includes("Status:"),false,"unchanged nullable/custom/blank explicit roundtrip is not intent");
  }
  state=structuredClone(actual);delete state.prospects[1]._canonicalTracking;saved=null;
  assert.equal((await post({type:"status",solicitor:"Edit"})).status,503);assert.equal(saved,null);
  state=structuredClone(actual);assert.equal((await post({type:"status",status:"Assigned"})).status,200);
  assert.equal(saved.prospects[1].status,"Assigned");assert.deepEqual(saved.prospects[1]._canonicalTracking,{objectPresent:false,statusPresent:false},
    "website preserves current readonly marker; backend alone owns recomputation");
  // Actual component callback traversal with a bounded hook store. Transport
  // injects only the normal action identity and reaches the actual route above.
  for(const id of [1,3,4,5]){
    state=structuredClone(actual);hookValues=[];hookMode=true;
    context={index:[],tracking:structuredClone(actual),setTracking:value=>{context.tracking=value;}};
    const render=()=>{hookIndex=0;return treeNodes(TrackingPanel({cptid:id}));};
    let nodes=render();
    const select=nodes.find(n=>n.type==="select"&&Object.hasOwn(n.props,"value"));
    assert.equal(select.props.value,actual.prospects[id].status??"Active");
    const name=nodes.find(n=>n.type==="input"&&n.props.placeholder==="Required to save");
    name.props.onChange({target:{value:"Fictional staff"}});
    nodes=render();await nodes.find(n=>n.type==="button"&&n.props.children==="Save update").props.onClick();
    assert.equal(Object.hasOwn(payload,"status"),false);assert.equal(saved.prospects[id].status,actual.prospects[id].status);
    nodes=render();nodes.find(n=>n.type==="select").props.onChange({target:{value:"Hold"}});
    nodes=render();await nodes.find(n=>n.type==="button"&&n.props.children==="Save update").props.onClick();
    assert.equal(payload.status,"Hold");assert.equal(saved.prospects[id].status,"Hold");
  }
  hookMode=false;
  gate=false;assert.equal(presence.trackingObjectPresent("pvas",{}),true);
  assert.deepEqual(presence.trackingStatusPatch("pvas","Active",false),{status:"Active"});
  assert.deepEqual(await getPvasTracking(),{legacy:true});
  gate=true;
  for(const client of ["csnf","jag","wcbhc","baq"]){
    assert.equal(presence.trackingObjectPresent(client,{}),true);
    assert.deepEqual(presence.trackingStatusPatch(client,"Active",false),{status:"Active"});
    const legacy=trackingRoute(client,async()=>true,async()=>({prospects:{},activity:[],pirs:{}}),async()=>{});
    assert.equal((await legacy.POST(new Request("https://fixture.invalid",{method:"POST",body:JSON.stringify({
      cptid:1,by:"Fictional",type:"status",status:"custom",
    })}))).status,400,"legacy enum policy unchanged");
  }
  console.log("PASS actual form callbacks -> partial intent -> shared route -> full state save; readonly markers, all source statuses, explicit enum, legacy paths unchanged");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
