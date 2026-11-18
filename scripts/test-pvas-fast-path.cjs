// Fictional first-release fixtures only: no SQL, network, donors or capabilities.
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const Module=require("node:module"),ts=require("typescript"),React=require("react"),{renderToStaticMarkup:html}=require("react-dom/server");
const root=process.cwd(),original=Module._load,env=process.env.PVAS_SQL_EXISTING_RECORDS_ENABLED;
const file=p=>path.join(root,p);
for(const ext of [".ts",".tsx"])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{
 fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
let context;
Module._load=function(name,parent,main){
 if(name==="server-only")return {};
 if(name==="lucide-react")return new Proxy({},{get:()=>()=>null});
 if(name==="react"&&parent?.filename===file("components/portal-v2.tsx"))return {...React,useContext:()=>context};
 if(name==="@/components/dashboard-shared")return {useSort:rows=>({sorted:rows}),useRecordNav:()=>null,SortTh:()=>null,NameLink:p=>p.name};
 if(name==="@/components/direct-dashboard-upload")return {DirectDashboardUpload:()=>React.createElement("div",null,"DIRECT UPLOAD")};
 if(name==="@/components/monthly-gift-upload")return {MonthlyGiftUpload:()=>React.createElement("div",null,"MONTHLY UPLOAD")};
 if(name==="@/components/record-tools")return {DuplicatesPanel:()=>React.createElement("div",null,"DUPLICATES"),refreshCrmIndex:()=>{}};
 if(name.startsWith("@/"))name=file(name.slice(2));
 return original.call(this,name,parent,main);
};
const load=p=>require(file(p)),gate=load("lib/portal-v2/pvas-canonical.ts"),policy=load("lib/portal-v2/pvas-existing-only.ts");
const action=load("lib/portal-v2/pvas-action.server.ts"),write=load("lib/portal-v2/pvas-native-write-acceptance.server.ts");
const unused=new Proxy({},{get:()=>()=>{throw Error("Unrelated owner called");}});
function compile(p,dependencies={},extra={}){
 const exports={},ctx=vm.createContext({exports,process,console,Buffer,Request,Response,AbortSignal,structuredClone,
  TextEncoder,TextDecoder,setTimeout,clearTimeout,...extra,require:name=>{
   if(name in dependencies)return dependencies[name];
   if(name==="server-only")return {};
   if(name==="./pvas-canonical"||name==="@/lib/portal-v2/pvas-canonical")return gate;
   if(name==="./pvas-existing-only")return policy;
   if(name==="next/server")return {NextResponse:Response};
   if(name.endsWith("-auth"))return new Proxy({},{get:()=>async()=>true});
   return unused;
  }});
 vm.runInContext(ts.transpileModule(fs.readFileSync(file(p),"utf8"),{fileName:p,compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,ctx);
 return exports;
}
async function main(){
 delete global.window;delete global.document;
 for(const value of [undefined,"","0","true","yes"," 1","1 "]){
  if(value===undefined)delete process.env.PVAS_SQL_EXISTING_RECORDS_ENABLED;else process.env.PVAS_SQL_EXISTING_RECORDS_ENABLED=value;
  assert.equal(gate.pvasCanonicalEnabled("pvas"),false);assert.equal(write.pvasNativeWriteAccepted(),false);
 }
 process.env.PVAS_SQL_EXISTING_RECORDS_ENABLED="1";
 assert.equal(gate.pvasCanonicalEnabled("pvas"),true);assert.equal(write.pvasNativeWriteAccepted(),true);
 for(const c of ["csnf","jag","wcbhc","baq"])assert.equal(gate.pvasCanonicalEnabled(c),false);
 // Server page projects only the route bit. Use its actual rendered marker.
 const page=compile("app/research/pvas-data/page.tsx",{
  "@/lib/pvas-data-store":{getPvasSnapshot:async()=>null},
  "@/components/pvas-data-dashboard":{},
  "react/jsx-runtime":require("react/jsx-runtime"),
 });
 const rendered=html(await page.default());
 assert.match(rendered,/name="pvas-sql-existing-records" content="1"/);
 global.window={};global.document={querySelector:selector=>{
  assert.equal(selector,'meta[name="pvas-sql-existing-records"]');
  return {getAttribute:()=>/content="1"/.test(rendered)?"1":"0"};
 }};
 assert.equal(gate.pvasCanonicalEnabled("pvas"),true);
 global.document.querySelector=()=>null;assert.equal(gate.pvasCanonicalEnabled("pvas"),false,"missing marker fails closed");
 global.document.querySelector=()=>({getAttribute:()=>"true"});assert.equal(gate.pvasCanonicalEnabled("pvas"),false);
 delete global.window;delete global.document;delete process.env.PVAS_SQL_EXISTING_RECORDS_ENABLED;
 assert.equal(gate.pvasCanonicalEnabled("pvas"),false,"browser marker cannot change server flag");
 process.env.PVAS_SQL_EXISTING_RECORDS_ENABLED="1";
 console.log("PASS exact default-OFF per-request server switch, native acceptance, rendered browser route projection and other-client isolation");

 const blocked=["addGift","editGift","voidGift","addProspect","applyBatch","pvasGift","pvasBatch","pvasBatchUndo",
  "undoBatch","monthlyPreview","monthlyCommit","directFileCommit","requestScreening","mergeRecords","deleteRecord","restoreRecord","unmerge","unknown"];
 for(const op of blocked)assert.equal(policy.pvasExistingOperationAllowed(op,{}),false,op);
 for(const operation of ["contact-create","contact-state","contact-notdup",null,["contact-edit"]])
  assert.equal(policy.pvasExistingOperationAllowed("pvasContact",{command:{operation}}),false);
 for(const operation of ["contact-edit","contact-prospect-edit"])
  assert.equal(policy.pvasExistingOperationAllowed("pvasContact",{command:{operation}}),true);
 for(const op of ["listDocuments","getDocument","documentByPath","addDocument","deleteDocument",
  "listReportLists","createReportList","updateReportList","deleteReportList"])
  assert.equal(policy.pvasExistingOperationAllowed(op,{}),true,op);
 let calls=[],invalidations=0;
 const gateway=compile("lib/portal-v2/server.ts",{
  "./pvas-action.server":action,"./pvas-native-write-acceptance.server":write,
  "./pvas-upload-history":load("lib/portal-v2/pvas-upload-history.ts"),
  "@/lib/portal-v2/clients":{PORTAL_V2:{pvas:{goal:1000},csnf:{goal:1000}}},
  "@/lib/pvas-data-store":{invalidatePvasDataCache:()=>invalidations++},
 },{fetch:async(_url,init)=>{
  const body=JSON.parse(init.body);calls.push(body);assert.equal(init.cache,"no-store");
  return Response.json({ok:true,requestId:body.command?.requestId??body.requestId});
 }});
 process.env.ENGAGE_PORTAL_URL="https://offline.invalid/api";process.env.PORTAL_WRITE_SECRET="fictional-only";
 for(const op of blocked){assert.equal((await gateway.engageCall("pvas",op)).status,403);assert.equal(calls.length,0);}
 const requestId="a".repeat(32),by="Fictional editor";
 for(const operation of ["contact-create","contact-state","contact-notdup"])
  assert.equal((await gateway.engageCall("pvas","pvasContact",{command:{operation,requestId,actor:by}})).status,403);
 const http=body=>gateway.portalV2Route("pvas").POST(new Request("https://offline.invalid/api",{method:"POST",
  headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
 const refused=await http({op:"pvasContact",by,requestId,command:{operation:"contact-create",actor:by}});
 assert.equal(refused.status,403);assert.deepEqual(await refused.json(),{...policy.PVAS_EXISTING_ONLY,requestId,unconfirmed:false});
 assert.equal(calls.length,0,"HTTP creation rejected before backend fetch");
 assert.equal((await http({op:"pvasBatch",by,requestId,command:{actor:by,newRows:[],contactStates:[{}]}})).status,403);
 for(const op of ["addGift","addProspect","requestScreening","mergeRecords","deleteRecord","restoreRecord","unmerge"]){
  const response=await http({op});assert.equal(response.status,403);assert.equal((await response.json()).code,policy.PVAS_EXISTING_ONLY.code);
 }
 const command={operation:"contact-edit",actor:by,cptid:9,changes:[{field:"city",expected:"Old",value:""}]};
 assert.equal((await http({op:"pvasContact",by,requestId,command})).status,200);
 assert.deepEqual(calls.at(-1),{op:"pvasContact",client:"pvas",command:{...command,requestId}});
 for(const op of ["pvasFields","pvasNote"]){
  assert.equal((await http({op,by,requestId,command:{actor:by,cptid:9}})).status,200);
 }
 await gateway.engageCall("pvas","setTracking",{data:{},requestId,by});
 assert.equal(invalidations,4,"successful existing contact/field/note/tracking saves invalidate old in-flight reads");
 await gateway.engageCall("csnf","addProspect",{});
 assert.equal(calls.at(-1).op,"addProspect","other-client operation is not restricted");
 delete process.env.PVAS_SQL_EXISTING_RECORDS_ENABLED;
 await gateway.engageCall("pvas","addProspect",{});
 assert.equal(calls.at(-1).op,"addProspect","OFF retains prior PVAS path");
 process.env.PVAS_SQL_EXISTING_RECORDS_ENABLED="1";
 console.log("PASS actual HTTP -> command identity -> gateway existing-only rejection, unchanged exact contact envelope and successful write invalidation");

 const auth=new Proxy({},{get:()=>async()=>true});
 const direct=compile("lib/portal-v2/direct-file-gateway.server.ts");
 const monthly=compile("lib/portal-v2/monthly-gateway.server.ts",{"./direct-file-gateway.server":{dashboardDataAuthed:async()=>true}});
 const req=()=>Object.assign(new Request("https://offline.invalid/api",{method:"POST",body:"must-not-be-read"}),{nextUrl:new URL("https://offline.invalid/api")});
 for(const handler of [direct.directFileGateway("pvas"),monthly.monthlyGiftGateway("pvas")]){
  const response=await handler(req());assert.equal(response.status,403);assert.equal((await response.json()).code,"pvas-existing-records-only");
 }
 const legacy=await direct.directFileGateway("csnf")(req());
 assert.equal((await legacy.json()).code,"same-origin-required","other client reaches original guard, not PVAS restriction");
 console.log("PASS dedicated direct/monthly upload HTTP rejects before body parsing, inventory, SQL or transport; other client guard unchanged");

 const UI=load("components/portal-v2.tsx"),tools=load("components/record-tools.tsx");
 const state={prospects:[],gifts:[],updates:[],batches:[{id:"9007199254740993",kind:"upload",file_name:"Fictional old upload",
  created_at:"2020-01-02",created_by:"Fictional",new_rows:0,changed_rows:1,gift_rows:0,undone_at:null,
  _undo:{kind:"pre-cutover",namespace:"legacy-engage"}}]};
 context={client:"pvas",state,loading:false,reload:async()=>{}};
 const view=html(React.createElement(UI.AddAndUpload));
 assert.match(view,/Fictional old upload/);assert.match(view,/disabled=""[^>]*>Undo/);
 assert.doesNotMatch(view,/DIRECT UPLOAD|MONTHLY UPLOAD|DUPLICATES|Add prospect<\/h3>/);
 for(const component of [UI.AddProspect,UI.UploadClientFile])assert.doesNotMatch(html(React.createElement(component)),/<input|<button/);
 const campaign=html(React.createElement(UI.CampaignDonors));
 assert.match(campaign,/New gift entry is unavailable/);
 assert.doesNotMatch(campaign,/Record a gift or pledge|Donor name \*|Amount \*/);
 assert.equal(html(React.createElement(tools.MergeDeleteButtons,{client:"pvas",r:{cptid:9,name:"Fictional"},index:[],onChanged:()=>{}})),"");
 const banners=html(React.createElement(tools.RecordBanners,{client:"pvas",r:{cptid:9,name:"Fictional",deleted:{by:"Fictional",at:"",reason:"Old"},
  mergedFrom:[{cptid:8,name:"Other",contact:{},lifetime:0}]},onChanged:()=>{}}));
 assert.match(banners,/<button disabled=""[^>]*>.*Restore record/);
 assert.match(banners,/<button disabled=""[^>]*>Unmerge/);
 for(const c of ["csnf","jag","wcbhc","baq"]){
  context={...context,client:c,state:{...state,batches:[]}};
  const prior=html(React.createElement(UI.AddAndUpload));
  assert.match(prior,/DIRECT UPLOAD/);assert.match(prior,/MONTHLY UPLOAD/);assert.match(prior,/Add prospect<\/h3>/);
  assert.match(html(React.createElement(tools.MergeDeleteButtons,{client:c,r:{cptid:9,name:"Fictional"},index:[],onChanged:()=>{}})),/Merge duplicate/);
 }
 console.log("PASS real component renders: PVAS creation/upload/identity controls unavailable, readable archive retained, all four clients unchanged");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{
 if(env===undefined)delete process.env.PVAS_SQL_EXISTING_RECORDS_ENABLED;else process.env.PVAS_SQL_EXISTING_RECORDS_ENABLED=env;
 delete global.window;delete global.document;Module._load=original;
});
