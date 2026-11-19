// Fictional clock/CAS Blob store. No network, SQL, or donor values.
const fs=require("node:fs"),assert=require("node:assert/strict"),ts=require("typescript");
const m={exports:{}};
new Function("module","exports","require",ts.transpileModule(fs.readFileSync("lib/dashboard-ready-cache.server.ts","utf8"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017},
}).outputText)(m,m.exports,require);
const {createDashboardReadyCache,readyFailureStage}=m.exports;
assert.equal(readyFailureStage({readyStage:"raw-private-message"}),undefined);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture() {
  let time=1000,seq=0,builds=0,fp="initial",hashes=0,failBuild=false,failHash=false,failPath="",hook;
  const blobs=new Map(),background=[];
  const store={
    read:async path=>blobs.get(path)??null,
    put:async(path,body,expected)=>{
      if(hook)await hook(path);
      if(failPath&&path.endsWith(failPath))throw Error("fictional write failure");
      const previous=blobs.get(path);
      if(expected===null?!!previous:previous?.etag!==expected)throw Error("CAS conflict");
      const etag=String(++seq);blobs.set(path,{body:Buffer.from(body),etag});return etag;
    },
  };
  const options={compatibility:"test-v1",prefix:"ready/fictional",markerPath:"invalidated.json",store,
    now:()=>time,canPublish:true,leaseMs:100,
    fingerprint:async()=>{hashes++;if(failHash)throw Error("fictional hash failure");return fp;},
    build:async()=>{builds++;if(failBuild)throw Error("fictional build failure");return {n:builds,map:new Map([[1,"example"]])};},
    validate:value=>{assert.equal(typeof value.n,"number");assert.ok(value.map instanceof Map);},
    background:p=>background.push(p)};
  return {blobs,store,options,make:extra=>createDashboardReadyCache({...options,...extra}),
    advance:n=>{time+=n;},setFp:value=>{fp=value;},setBuildFailure:value=>{failBuild=value;},
    setHashFailure:value=>{failHash=value;},setWriteFailure:value=>{failPath=value;},setHook:value=>{hook=value;},
    get builds(){return builds;},get hashes(){return hashes;},
    drain:async()=>{while(background.length)await Promise.all(background.splice(0));}};
}
async function main(){
  const retry=fixture();let markerPuts=0;
  const retried=retry.make();await retried.inspect();
  retry.setHook(path=>{if(path==="invalidated.json"&&++markerPuts<3)throw Error("fictional CAS conflict");});
  await retried.invalidate();await retry.drain();assert.equal(markerPuts,3,"marker retries are bounded fresh CAS attempts");

  const f=fixture(),a=f.make();
  const first=await a.inspect();assert.equal(first.built.n,1);assert.equal(f.hashes,2,"pre/post full fingerprint");
  const identity=first.built,generation=first.freshness.generation;
  assert.equal((await a.inspect()).built,identity,"warm identity stable");
  const b=f.make();
  assert.equal((await b.inspect()).built.n,1,"cold compatible instance reads durable generation");
  assert.equal(f.builds,1,"idle/release instance never rebuilds unchanged ready data");
  await a.refresh();assert.equal(f.builds,1,"unchanged fingerprint rewrites only pointer metadata");
  f.advance(121000);f.setHashFailure(true);
  assert.equal((await a.inspect()).built,identity,"expired compatible last-good returns without SQL wait");
  await f.drain();
  const failed=await a.inspect();assert.equal(failed.freshness.stale,true);assert.ok(failed.freshness.failedAt);
  const calls=f.hashes;await b.inspect();await f.drain();assert.equal(f.hashes,calls,"durable failed-at throttles visitor retries");
  f.setHashFailure(false);f.setFp("changed");
  await a.refresh();const second=await a.inspect();
  assert.notEqual(second.freshness.generation,generation);assert.equal(second.built.n,2);
  assert.equal((await a.inspect(generation)).built.n,1,"record retains exact displayed generation across SQL-only swap");
  const oldPointer=f.blobs.get("ready/fictional/test-v1/ready.json").body.toString();
  f.advance(10);f.setFp("changed-again");f.setWriteFailure("ready.json");
  await assert.rejects(a.refresh());f.setWriteFailure("");
  assert.equal(f.blobs.get("ready/fictional/test-v1/ready.json").body.toString(),oldPointer,"failed publication keeps last good pointer");
  await a.invalidate();await f.drain();
  await assert.rejects(a.inspect(generation),/invalidated/,"confirmed edits forbid every pre-edit pinned generation");
  f.setWriteFailure("invalidated.json");await assert.rejects(a.invalidate(),/unconfirmed/);f.setWriteFailure("");
  assert.ok((await a.inspect()).built.n>2,"edit warms replacement");

  const incompatible=f.make({compatibility:"different-v2",canPublish:false});
  await assert.rejects(incompatible.inspect(),/not authorized/,"incompatible format cannot reuse production ready");
  const noStore=f.make({store:null});await noStore.inspect();await assert.rejects(noStore.inspect(generation),/disabled/);
  const disabled=f.make({enabled:false});await disabled.inspect();await assert.rejects(disabled.inspect(generation),/disabled/);
  const preview=f.make({canPublish:false});
  assert.ok((await preview.inspect()).built,"preview may read compatible validated ready");
  await assert.rejects(preview.refresh(),/not authorized/);
  await preview.refresh({allowPreview:true});

  // Two workers contend for one durable lease; only one full hash/build runs.
  const c=fixture();let release,started;
  const reached=new Promise(r=>{started=r;});
  const slow=c.make({build:async()=>{started();await new Promise(r=>{release=r;});return {n:1,map:new Map()};}});
  const job=slow.refresh();await reached;
  await assert.rejects(c.make().refresh(),/already running/);
  release();await job;

  // Expired holder cannot overwrite a successor after lease replacement.
  const d=fixture();let oldRelease,oldStarted;
  const oldReached=new Promise(r=>{oldStarted=r;});
  const old=d.make({build:async()=>{oldStarted();await new Promise(r=>{oldRelease=r;});return {n:99,map:new Map()};}});
  const stale=old.refresh();await oldReached;d.advance(101);
  const replacement=d.make();await replacement.refresh();oldRelease();
  await assert.rejects(stale,e=>e.readyStage==="publish-fence");
  assert.equal((await replacement.inspect()).built.n,1,"late expired worker never downgrades successor");

  // Concurrent SQL mutation inside build is not published as a mixed bundle.
  const e=fixture();
  const changing=e.make({build:async()=>{e.setFp("after-change");return {n:1,map:new Map()};}});
  await assert.rejects(changing.refresh(),e=>e.readyStage==="fingerprint-after");
  assert.equal(e.blobs.has("ready/fictional/test-v1/ready.json"),false);

  // Edit during generation write (after post-hash) wins at the final marker fence.
  const g=fixture();let marked=false;
  g.setHook(async path=>{
    if(!marked&&path.endsWith(".bin.gz")){
      marked=true;
      await g.store.put("invalidated.json",Buffer.from(JSON.stringify({at:1001})),null);
    }
  });
  await assert.rejects(g.make().refresh(),e=>e.readyStage==="publish-fence");
  assert.equal(g.blobs.has("ready/fictional/test-v1/ready.json"),false);

  // A pointer changed independently between read and CAS cannot be overwritten.
  const h=fixture();let interfered=false;
  h.setHook(async path=>{
    if(!interfered&&path.endsWith("/ready.json")){
      interfered=true;
      h.blobs.set(path,{etag:"other-writer",body:Buffer.from('{"compatibility":"other"}')});
    }
  });
  await assert.rejects(h.make().refresh(),e=>e.readyStage==="publish-pointer");
  assert.equal(h.blobs.get("ready/fictional/test-v1/ready.json").etag,"other-writer");
  console.log("PASS durable ready: compatibility/idle reuse, full fingerprint fence, last-good/failure warning, throttle, atomic CAS, leases/expiry, edit fencing, exact generations, preview and disabled guards");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
