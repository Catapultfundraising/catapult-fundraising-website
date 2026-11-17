// OFFLINE CLI. No SQL/HTTP/Blob extraction. Inputs are already frozen private
// files and an explicit mapping/crosswalk manifest from the migration producer.
const fs=require("node:fs"),path=require("node:path"),Module=require("node:module"),ts=require("typescript");
const original=Module._load,root=process.cwd();
for(const ext of [".ts",".tsx"])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
Module._load=function(name,parent,main){if(name==="server-only")return {};if(name.startsWith("@/"))name=path.join(root,name.slice(2));return original.call(this,name,parent,main);};
global.fetch=async()=>{throw Error("Offline capture forbids network");};
async function main(){
  const [configFile,out]=process.argv.slice(2);
  if(!configFile||!out||process.argv.length!==4)throw Error("Usage: node scripts/capture-pvas-precutover.cjs <private-config.json> <NEW-private-output-dir>");
  const config=JSON.parse(fs.readFileSync(configFile,"utf8"));
  const parts={};
  for(const name of ["snapshot","records","tracking","pirs","ids","portalState","directState"]){
    if(typeof config.parts?.[name]!=="string")throw Error("Missing frozen byte input");
    parts[name]=fs.readFileSync(config.parts[name]);
  }
  const manifest=JSON.parse(fs.readFileSync(config.manifest,"utf8"));
  const {captureFrozenPvas}=require("../lib/portal-v2/pvas-precutover-capture.server.ts");
  const result=await captureFrozenPvas(root,{manifest,parts});
  // Output may contain private donor data. Never overwrite any prior capture.
  fs.mkdirSync(out,{mode:0o700});
  const write=(name,bytes)=>fs.writeFileSync(path.join(out,name),bytes,{flag:"wx",mode:0o600});
  write("manifest.json",result.manifestBytes);
  for(const [name,bytes]of Object.entries(parts))write(`${name}.original`,bytes);
  write("effective-view.json",JSON.stringify(result.effectiveView));
  write("capture-proof.json",JSON.stringify({...result.proof,manifestSha256:result.sha256,held:true,attachments:Object.fromEntries(Object.entries(result.attachments).map(([k,v])=>[k,v.sha256]))}));
  console.log(JSON.stringify({held:true,manifestSha256:result.sha256,donorCount:result.proof.donorCount}));
}
main().catch(()=>{console.error("PVAS offline capture HOLD: invalid/incomplete frozen inputs or precedence drift. No success asserted.");process.exitCode=1;});
