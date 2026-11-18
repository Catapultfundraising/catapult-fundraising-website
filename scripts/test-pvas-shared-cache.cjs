// Fake in-memory blob store and clock only: no SQL, network or donor data.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),ts=require("typescript");
const src=path.join(process.cwd(),"lib/pvas-shared-cache.server.ts");
const m={exports:{}};
new Function("module","exports","require",ts.transpileModule(fs.readFileSync(src,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(m,m.exports,require);
const {createPvasSharedCache,cacheTtlMs}=m.exports;
async function main(){
 assert.equal(cacheTtlMs(undefined),120000);assert.equal(cacheTtlMs("0"),0);assert.equal(cacheTtlMs("bad"),0);
 const blobs=new Map();let t=1000,builds=0,bg=[];
 const store={read:async p=>blobs.get(p)??null,write:async(p,b)=>{blobs.set(p,b);}};
 const mk=()=>createPvasSharedCache({build:async()=>({n:++builds,u:undefined,mp:new Map([[1,"a"]])}),store,now:()=>t,ttlMs:120000,deployment:"d1",background:p=>bg.push(p)});
 const a=mk(),b=mk();
 const r1=await a.get();assert.equal(r1.n,1);await Promise.all(bg);
 t+=1000;assert.equal((await a.get()).n,1,"same instance reuses");
 const r2=await b.get();assert.equal(r2.n,1,"other instance reads shared copy");
 assert.ok(Object.hasOwn(r2,"u")&&r2.mp.get(1)==="a","exact structured round trip");
 t+=1000;await b.invalidate();t+=1;
 assert.equal((await a.get()).n,2,"edit on another instance forces fresh SQL");await Promise.all(bg);
 assert.equal((await b.get()).n,2);
 t+=121000;assert.equal((await b.get()).n,3,"expires after 2 minutes");await Promise.all(bg);
 // invalidation during a build: that build is never served afterwards
 let release;const slow=createPvasSharedCache({build:()=>new Promise(r=>{release=r;}),store,now:()=>t,ttlMs:120000,deployment:"d1",background:p=>bg.push(p)});
 t+=121000;const p=slow.get();await new Promise(r=>setImmediate(r));t+=10;await a.invalidate();release({n:99});await p;await Promise.all(bg);
 t+=10;assert.notEqual((await a.get()).n,99,"pre-edit build not reused");
 // broken store falls back to SQL
 const broken=createPvasSharedCache({build:async()=>({n:"fresh"}),store:{read:async()=>{throw Error("down")},write:async()=>{}},now:()=>t,ttlMs:120000});
 assert.equal((await broken.get()).n,"fresh");
 // other deployment's copy is ignored
 const other=createPvasSharedCache({build:async()=>({n:"d2"}),store,now:()=>t,ttlMs:120000,deployment:"d2",background:()=>{}});
 assert.equal((await other.get()).n,"d2");
 // per-client paths: another dashboard's cache and marker never touch PVAS's
 const pv=new Map(),ps={read:async p=>pv.get(p)??null,write:async(p,b)=>{pv.set(p,b);}};
 let nb=0;const baq=createPvasSharedCache({build:async()=>({n:++nb}),store:ps,now:()=>t,ttlMs:120000,deployment:"d1",background:p=>bg.push(p),paths:{data:"baq-cache/live-build-v1.bin.gz",marker:"baq-cache/invalidated-v1.json"}});
 assert.equal((await baq.get()).n,1);await Promise.all(bg);
 assert.ok(pv.has("baq-cache/live-build-v1.bin.gz")&&!pv.has("pvas-cache/canonical-build-v1.bin.gz"),"client data path");
 t+=10;await baq.invalidate();assert.ok(pv.has("baq-cache/invalidated-v1.json")&&!pv.has("pvas-cache/invalidated-v1.json"),"client marker path");
 t+=10;assert.equal((await baq.get()).n,2,"client Reload forces fresh SQL");
 console.log("pvas shared cache: PASS");
}
main().catch(e=>{console.error(e);process.exit(1);});
