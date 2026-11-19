// Actual five report owners; fictional IO. No SQL, sessions or donor data.
const fs=require("node:fs"),path=require("node:path"),Module=require("node:module"),assert=require("node:assert/strict");
const ts=require("typescript");
const root=process.cwd(),load=Module._load;
for(const ext of [".ts",".tsx"])Module._extensions[ext]=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,"utf8"),{
  fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
}).outputText,file);
let pool=[],tracking,client,renderer;
const snap=()=>({client:"Fictional Pagination Foundation",builtAt:"2026-11-19 09:00",asOf:"2026-11-01",board:[],portfolio:[],pool});
const state={prospects:[],updates:[],gifts:[],batches:[]};
Module._load=function(id,parent,isMain){
  if(id==="@react-pdf/renderer")return renderer;
  if(id==="server-only")return {};
  if(id==="@/lib/portal-v2/server")return {portalStateSafe:async()=>state};
  if(id==="@/lib/portal-v2/pvas-canonical")return {pvasCanonicalEnabled:()=>false};
  if(id==="@/lib/portal-v2/direct-source-state.server")return {
    directData:async(_c,x)=>x,currentTracking:async(_c,fn)=>fn(),directTrackingView:async(_c,x)=>x,
    requireCurrentSql:()=>{},sourceNoteReport:()=>"",sourceAssignmentReport:(_t,_id,_key,fallback)=>fallback,
  };
  if(id==="@/lib/portal-v2/current-dashboard-snapshot")return {};
  if(id==="@/lib/portal-v2/records-route")return {};
  if(/^@\/lib\/\w+-data-auth$/.test(id))return new Proxy({},{get:()=>async()=>true});
  if(/^@\/lib\/\w+-data-store$/.test(id))return new Proxy({},{get:(_o,key)=>async()=>String(key).includes("Snapshot")?snap():{index:pool,records:{}}});
  if(/^@\/lib\/\w+-tracking$/.test(id))return new Proxy({},{get:()=>async()=>tracking});
  if(/^@\/lib\/\w+-brand-xlsx$/.test(id))return {};
  return load.call(this,id.startsWith("@/")?path.join(root,id.slice(2)):id,parent,isMain);
};
async function main(){
  renderer=await import(path.join(root,"node_modules/@react-pdf/renderer/lib/react-pdf.js"));
  const {NextRequest}=require("next/server"),out=process.argv[2]||"/workspace/gc2p-review/before";
  fs.mkdirSync(out,{recursive:true});
  const goals={pvas:9000000,csnf:10000000,jag:1750000,wcbhc:12000000,baq:12000000};
  const manifest=[];
  for(client of (process.env.FIXTURE_CLIENTS?.split(",")||Object.keys(goals))){
    const seat=require(path.join(root,`lib/${client}-gc2p.ts`)).seatGc2p;
    const levels=seat(goals[client],[],null,[]).seated.map(x=>x.level);
    pool=levels.flatMap((ask,j)=>Array.from({length:j===0?5:2},(_v,i)=>({
      cptid:1000+j*10+i,name:`Fictional${client.toUpperCase()}Donor${1000+j*10+i}`,
      lifetime:1200,gifts:4,first:"2020-01-01",last:"2026-11-01",largest:500,years:4,
      ds:"DS2",capacity:"$1M+",capMin:ask,qs:"",rating:ask,ask,solicitor:"Fictional Volunteer",
      solicitor2:"",donorType:"Individual",basis:"Committee",status:"Assigned",
    })));
    pool.push({...pool[0],cptid:2000,name:`Fictional${client.toUpperCase()}BelowDonor`,ask:1000,rating:1000});
    for(const variant of ["ordinary","boundary-note","long-note"]){
      tracking={prospects:Object.fromEntries(pool.map(p=>[p.cptid,{status:"Assigned",level:p.ask,updatedAt:"2026-11-19",by:"Fictional QA"}])),activity:[],pirs:{}};
      pool.filter(p=>p.cptid<1005).forEach((p,i)=>{
        p.name=`Fictional${client.toUpperCase()}Donor${p.cptid}`+(variant==="boundary-note"&&(i===2||i===4)?" Longer Prospect Name":"");
        p.basis=variant==="boundary-note"?"":"Committee";
      });
      const boundaryTokens=[];
      if(variant==="boundary-note")
        [18,0,0,3,6].forEach((count,i)=>{tracking.prospects[1000+i].reason=Array.from({length:count},(_v,j)=>{
          const token=`BoundaryNote${1000+i}Line${String(j).padStart(2,"0")}`;boundaryTokens.push(token);return token;
        }).join("\n");});
      const tokens=Array.from({length:110},(_v,i)=>`Segment${String(i).padStart(3,"0")} Fictional narrative retained in full.`);
      const note=tokens.join(" ")+" ENDNOTE5000";
      if(variant==="long-note")tracking.activity.push({id:"fictional-note",cptid:1000,date:"2026-11-19",at:"2026-11-19",kind:"Note",note,by:"Fictional QA"});
      const route=require(path.join(root,`app/api/${client}-data-reports/route.tsx`));
      const response=await route.GET(new NextRequest(`https://fixture.invalid/api/${client}-data-reports?report=gc2p&goal=${goals[client]}&format=pdf`));
      assert.equal(response.status,200,`${client}/${variant}: ${response.status}`);
      const filename=`${client}-${variant}.pdf`;
      fs.writeFileSync(path.join(out,filename),Buffer.from(await response.arrayBuffer()));
      manifest.push({client,variant,filename,goal:goals[client],names:pool.map(p=>p.name.split(" ")[0]),tokens:variant==="boundary-note"?boundaryTokens:variant==="long-note"?tokens.map(t=>t.split(" ")[0]).concat("ENDNOTE5000"):[]});
      console.log(`${client}/${variant}: rendered`);
    }
  }
  fs.writeFileSync(path.join(out,"manifest.json"),JSON.stringify(manifest,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
