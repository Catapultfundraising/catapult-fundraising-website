// Paired website boundary fixture. Actual shared codec; no network/SQL/data.
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),Module=require("node:module");
const ts=require(process.cwd()+"/node_modules/typescript");
const code=file=>ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,esModuleInterop:true}}).outputText;
const codecFile=process.cwd()+"/lib/portal-v2/pvasTrackingCompact.ts",codecModule=new Module(codecFile);
codecModule._compile(code("lib/portal-v2/pvasTrackingCompact.ts"),codecFile);
const codec=codecModule.exports;
let enabled=true;
const gate={pvasCanonicalEnabled:c=>enabled&&c==="pvas"};
function compile(file,deps={},extra={}){
 const exports={};
 vm.runInNewContext(code(file),{exports,console,Buffer,Response,Request,AbortSignal,
  TextEncoder,TextDecoder,structuredClone,setTimeout,clearTimeout,
  process:{env:{PORTAL_WRITE_SECRET:"fictional",ENGAGE_PORTAL_URL:"https://fictional.invalid/api"}},
  ...extra,require:name=>{
   if(name==="server-only")return {};
   if(name==="node:async_hooks")return require(name);
   if(["./pvas-canonical","./portal-v2/pvas-canonical"].includes(name))return gate;
   if(name==="next/server")return {NextResponse:Response};
   if(name.endsWith("-auth"))return new Proxy({},{get:()=>async()=>true});
   return deps[name]??{};
  }});
 return exports;
}
const empty=()=>({_canonicalTracking:{objectPresent:false,statusPresent:false},solicitor:"",solicitor2:"",updatedAt:"",by:""});
const present=status=>({...empty(),_canonicalTracking:{objectPresent:true,statusPresent:true},status});
const note=(id,deleted)=>({id:`sql:${id}`,cptid:2,date:"2020-01-02",kind:"Note",note:"Fictional",
 by:"Fictional",at:"2026-11-17T18:52:00.1234567Z",
 _canonical:{noteId:id,rowId:id,cptid:2,version:0,text:"Fictional",date:"1/2/2020",source:null,order:null,deleted}});
const full={prospects:{"1":empty(),"2":present(null),"3":present(""),
 "4":{...present("Unlisted source status"),reason:"",level:0},
 "5":{...empty(),_canonicalTracking:{objectPresent:true,statusPresent:false}}},
 activity:[note(1,false)],removed:[note(2,true)],pirs:{"2":{name:"Fictional",url:"https://example.invalid"}},
 revision:"a".repeat(64)};
let readWire=codec.encodePvasTrackingCompact(full),calls=[],decodedSave,invalidations=0;
const action=compile("lib/portal-v2/pvas-action.server.ts");
const policy=compile("lib/portal-v2/pvas-existing-only.ts");
const gateway=compile("lib/portal-v2/server.ts",{
 "./pvas-action.server":action,"./pvas-existing-only":policy,
 "@/lib/portal-v2/clients":{PORTAL_V2:{pvas:{goal:1000}}},
 "@/lib/pvas-data-store":{invalidatePvasDataCache:()=>invalidations++}
},{fetch:async(_url,init)=>{
 const b=JSON.parse(init.body);calls.push(b);assert.equal(init.cache,"no-store");
 if(b.op==="getTrackingCompactV1")return Response.json({configured:true,state:readWire});
 assert.equal(b.op,"setTrackingCompactV1");
 decodedSave=codec.decodePvasTrackingCompact(b.data);
 return Response.json({ok:true,requestId:b.requestId,revision:full.revision});
}});
const presence=compile("lib/portal-v2/pvas-tracking-presence.ts");
let legacyReads=0,legacySaves=0;
const tracking=compile("lib/pvas-tracking.ts",{
 "./portal-v2/server":gateway,"./portal-v2/pvasTrackingCompact":codec,
 "./portal-v2/pvas-tracking-presence":presence,
 "./pvas-tracking.legacy":{getPvasTracking:async()=>{legacyReads++;return{legacy:true};},savePvasTracking:async()=>{legacySaves++;}}
});
(async()=>{
 const received=await tracking.getPvasTracking();
 assert.deepEqual(received,full);
 assert.deepEqual(calls[0],{op:"getTrackingCompactV1",client:"pvas"});
 assert.deepEqual(readWire.emptyProspectIds,[1]);
 assert.equal(Object.hasOwn(received.prospects["1"],"status"),false);
 assert.equal(Object.hasOwn(received.prospects["1"],"solicitor2"),true);
 assert.equal(received.activity[0].at,full.activity[0].at);
 const requestId="b".repeat(32),by="Fictional editor";
 received.prospects["2"].solicitor="Fictional assigned";
 await tracking.savePvasTracking(received,{requestId,by});
 assert.deepEqual(decodedSave,received);
 assert.equal(invalidations,1);
 assert.deepEqual(Object.keys(calls[1]).sort(),["op","client","data","requestId","by"].sort());
 assert.equal(calls[1].requestId,requestId);assert.equal(calls[1].by,by);
 assert.deepEqual(calls[1].data.emptyProspectIds,[1]);
 assert.equal(calls[1].data.prospects["2"].status,null);
 console.log("PASS actual compact read→gateway/identity→shared decode→existing validators and save→shared encode; absent/null/blank/custom, assignments, notes/raw dates/7digitUTC/revision preserved");

 readWire={...codec.encodePvasTrackingCompact(full),emptyProspectIds:[1,1]};
 await assert.rejects(()=>tracking.getPvasTracking(),/pvas-tracking-compact-invalid/);
 const malformed=structuredClone(full);delete malformed.prospects["2"].solicitor2;
 readWire=codec.encodePvasTrackingCompact(malformed);
 await assert.rejects(()=>tracking.getPvasTracking(),/Invalid PVAS SQL tracking/);
 const before=calls.length;enabled=false;
 assert.deepEqual(await tracking.getPvasTracking(),{legacy:true});
 await tracking.savePvasTracking(received);
 assert.equal(legacyReads,1);assert.equal(legacySaves,1);assert.equal(calls.length,before);
 for(const c of ["csnf","jag","wcbhc","baq"])assert.equal(gate.pvasCanonicalEnabled(c),false);
 console.log("PASS malformed compact duplicates and invalid carrier fail closed; gate-OFF uses untouched legacy owner, other4 remain offgate");
})().catch(e=>{console.error(e);process.exitCode=1;});
