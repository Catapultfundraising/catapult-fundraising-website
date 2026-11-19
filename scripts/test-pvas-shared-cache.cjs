// Fake in-memory blob store and clock only: no SQL, network or donor data.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),ts=require("typescript");
const m={exports:{}};
new Function("module","exports","require",ts.transpileModule(fs.readFileSync(path.join(process.cwd(),"lib/pvas-shared-cache.server.ts"),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(m,m.exports,require);
const {createPvasSharedCache,cacheTtlMs}=m.exports;
async function main(){
 assert.equal(cacheTtlMs(undefined),120000);assert.equal(cacheTtlMs("0"),0);assert.equal(cacheTtlMs("bad"),0);
 const blobs=new Map();let t=1000,builds=0,bg=[],fp="a",fingerprints=0,fail=false,writes=[];
 const store={read:async p=>blobs.get(p)??null,write:async(p,b)=>{writes.push(p);blobs.set(p,b);}};
 const drain=async()=>{while(bg.length)await Promise.all(bg.splice(0));};
 const deps={build:async()=>({n:++builds,u:undefined,mp:new Map([[1,"a"]])}),store,now:()=>t,ttlMs:120000,deployment:"d1",background:p=>bg.push(p)};
 const fingerprint=async()=>{fingerprints++;if(fail)throw Error("unavailable");return fp;};
 const mk=()=>createPvasSharedCache({...deps,fingerprint});
 const a=mk(),b=mk();
 const r1=await a.get();assert.equal(r1.n,1);assert.equal(fingerprints,1,"fingerprint taken before build");await drain();
 t+=1000;assert.equal(await a.get(),r1,"same instance reuses identity");
 const r2=await b.get();assert.equal(r2.n,1,"other instance reads shared copy");
 assert.ok(Object.hasOwn(r2,"u")&&r2.mp.get(1)==="a","exact structured round trip");
 t+=121000;const before=writes.filter(p=>p.endsWith("bin.gz")).length;
 assert.equal(await a.get(),r1,"unchanged fingerprint serves without rebuild");
 assert.equal(writes.filter(p=>p.endsWith("bin.gz")).length,before,"verification does not rewrite big blob");
 assert.ok(blobs.has("pvas-cache/verified-v1.json"));
 const count=fingerprints;assert.equal((await b.get()).n,1,"another instance accepts sidecar");assert.equal(fingerprints,count);
 t+=121000;fp="b";assert.equal((await a.get()).n,2,"changed fingerprint rebuilds");await drain();
 t+=121000;fail=true;assert.equal((await a.get()).n,3,"fingerprint error rebuilds");await drain();fail=false;
 t+=121000;assert.equal((await a.get()).n,4,"failed prebuild fingerprint cannot verify an old build");await drain();
 t+=10;await a.invalidate();await drain();assert.equal(builds,5,"background warm after invalidate");
 assert.equal((await b.get()).n,5,"invalidation overrides still-fresh verified build");
 const warm=await a.get();assert.equal(warm.n,5,"visitor finds background result warm");
 await b.invalidate();await drain();assert.equal(builds,6,"another edit in same millisecond still rebuilds");
 // Invalidation during one in-flight build waits for it, then warms exactly once.
 let release,slowBuilds=0;const slow=createPvasSharedCache({...deps,store:{read:async()=>null,write:async()=>{}},
  build:async()=>{if(++slowBuilds===1)await new Promise(r=>{release=r;});return {n:slowBuilds};}});
 t+=10;const p=slow.get();await new Promise(r=>setImmediate(r));t+=10;await slow.invalidate();
 const visitors=Promise.all([slow.get(),slow.get()]);release();
 assert.equal((await p).n,2,"pre-edit result is not served");await visitors;await drain();assert.equal(slowBuilds,2,"one in-flight build, then one replacement");
 // Disabled / no store never retain a build or use fingerprints.
 for(const opts of [{ttlMs:0},{store:null}]){
  let n=0;const c=createPvasSharedCache({...deps,...opts,build:async()=>++n,fingerprint:async()=>{throw Error("must not fingerprint");}});
  assert.equal(await c.get(),1);assert.equal(await c.get(),2);await c.invalidate();await drain();assert.equal(n,2,"kill switch prevents background warm");
 }
 const broken=createPvasSharedCache({...deps,build:async()=>({n:"fresh"}),store:{read:async()=>{throw Error("down")},write:async()=>{}}});
 assert.equal((await broken.get()).n,"fresh");
 const other=createPvasSharedCache({...deps,build:async()=>({n:"d2"}),deployment:"d2"});
 assert.equal((await other.get()).n,"d2","other deployment ignored");await drain();
 // Legacy caller without fingerprint still rebuilds at TTL.
 const plain=createPvasSharedCache({...deps,build:async()=>({n:++builds}),deployment:"plain"});
 const old=await plain.get();await drain();t+=121000;assert.notEqual((await plain.get()).n,old.n);await drain();
 // Per-client sidecar, cache and marker paths are isolated.
 const pv=new Map(),ps={read:async p=>pv.get(p)??null,write:async(p,b)=>{pv.set(p,b);}};
 const baq=createPvasSharedCache({...deps,store:ps,fingerprint,paths:{data:"baq-cache/live-build-v1.bin.gz",marker:"baq-cache/invalidated-v1.json"}});
 await baq.get();await drain();t+=121000;await baq.get();t+=10;await baq.invalidate();await drain();
 assert.ok(pv.has("baq-cache/live-build-v1.bin.gz")&&pv.has("baq-cache/verified-v1.json")&&pv.has("baq-cache/invalidated-v1.json"));
 assert.ok(![...pv.keys()].some(p=>p.startsWith("pvas-cache/")));
 console.log("pvas shared cache: PASS (fingerprints, sidecar, invalidation/warm, concurrency, kill switch, deployment, client isolation)");
}
main().catch(e=>{console.error(e);process.exit(1);});
