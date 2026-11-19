// Installed @vercel/blob transport with fictional HTTP only. No network/SQL.
const fs=require("node:fs"),assert=require("node:assert/strict"),ts=require("typescript");
const undici=require("undici");
const originalFetch=undici.fetch;
process.env.BLOB_READ_WRITE_TOKEN="vercel_blob_rw_fictional_fictional";
const blobs=new Map();let seq=0,forceEncoding=false,puts=0;
undici.fetch=async(input,init={})=>{
  const url=new URL(input),headers=new Headers(init.headers);
  if((init.method??"GET")==="GET"){
    assert.equal(url.searchParams.get("cache"),"0");
    const b=blobs.get(url.pathname.slice(1));
    if(!b)return new Response(null,{status:404});
    const encoded=forceEncoding||(b.body.length>1024&&headers.get("accept-encoding")!=="identity");
    return new Response(b.body,{headers:{etag:encoded?`W/${b.etag}`:b.etag,
      ...(encoded?{"content-encoding":"gzip"}:{})}});
  }
  assert.equal(init.method,"PUT");
  puts++;
  const path=url.searchParams.get("pathname"),old=blobs.get(path),expected=headers.get("x-if-match");
  if(expected?old?.etag!==expected:!!old&&headers.get("x-allow-overwrite")!=="1")
    return Response.json({error:{code:"precondition_failed",message:"fictional-private-error"}},{status:412});
  if(expected)assert.equal(headers.get("x-allow-overwrite"),"1");
  const body=Buffer.from(await new Response(init.body).arrayBuffer()),etag=`"opaque-${++seq}"`;
  blobs.set(path,{body,etag});
  return Response.json({etag,url:`https://fictional.private.blob.vercel-storage.com/${path}`,pathname:path});
};
const sdk=require("@vercel/blob");
function compile(file,deps={}){
  const m={exports:{}};
  new Function("module","exports","require",ts.transpileModule(fs.readFileSync(file,"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,esModuleInterop:true},
  }).outputText)(m,m.exports,n=>n==="server-only"?{}:Object.hasOwn(deps,n)?deps[n]:require(n));
  return m.exports;
}
async function main(){
  assert.equal(JSON.parse(fs.readFileSync("node_modules/@vercel/blob/package.json","utf8")).version,"2.9.0");
  const large=Buffer.from(JSON.stringify({fictional:"x".repeat(9000)}));
  const created=await sdk.put("fictional-probe.json",large,{access:"private",addRandomSuffix:false});
  const defaultRead=await sdk.get("fictional-probe.json",{access:"private",useCache:false});
  assert.ok(defaultRead.blob.etag.startsWith("W/"),"SDK exposes HTTP representation ETag unchanged");
  await assert.rejects(sdk.put("fictional-probe.json",large,{access:"private",allowOverwrite:true,
    ifMatch:defaultRead.blob.etag}),sdk.BlobPreconditionFailedError);
  const cache=compile("lib/dashboard-ready-cache.server.ts");
  const store=compile("lib/dashboard-ready-blob.server.ts").readyBlobStore;
  const read=await store.read("fictional-probe.json");
  assert.equal(read.etag,created.etag,"identity HTTP ETag retains opaque quotes exactly");
  await store.put("fictional-probe.json",large,read.etag);
  await assert.rejects(store.put("fictional-probe.json",large,'"mutated"'),e=>{
    assert.deepEqual(cache.readyFailureDetails(e),{operation:"write",providerError:"precondition",
      etagQuoted:true,etagWeak:false,contentEncoded:false});return true;
  });
  const before=puts;
  await assert.rejects(store.put("fictional-probe.json",large,'W/"weak"'));
  assert.equal(puts,before,"weak validators are never stripped into an unsafe CAS");
  forceEncoding=true;
  await assert.rejects(store.read("fictional-probe.json"),e=>{
    assert.equal(cache.readyFailureDetails(e).providerError,"representation");return true;
  });
  forceEncoding=false;
  let builds=0,clock=1000;
  const options={store,compatibility:"test-v1",prefix:"fictional-ready",markerPath:"fictional-marker.json",
    now:()=>clock,canPublish:true,background:()=>{},fingerprint:async()=>"f".repeat(9000),
    build:async()=>({fictional:++builds}),validate:v=>assert.equal(typeof v.fictional,"number")};
  const a=cache.createDashboardReadyCache(options);
  const first=await a.inspect();
  clock+=1000;
  await a.refresh();
  const b=cache.createDashboardReadyCache(options);
  clock+=1000;
  await b.refresh();
  const latest=await b.inspect();
  assert.equal(builds,1,"two unchanged checks reuse immutable generation across instances");
  assert.equal(first.freshness.generation,latest.freshness.generation);
  assert.equal(latest.freshness.verifiedAt,clock);
  const pointerPath="fictional-ready/test-v1/ready.json",saved=blobs.get(pointerPath);
  undici.fetch=async(input,init={})=>{
    const url=new URL(input);
    if(init.method==="PUT"&&url.searchParams.get("pathname")===pointerPath)
      return Response.json({error:{code:"precondition_failed",message:"fictional-private-error"}},{status:412});
    return transport(input,init);
  };
  let publicationError;
  await assert.rejects(b.refresh(),e=>{
    publicationError=e;
    assert.equal(cache.readyFailureStage(e),"publish-pointer");
    assert.equal(cache.readyFailureDetails(e).providerError,"precondition");
    assert.doesNotMatch(JSON.stringify(cache.readyFailureDetails(e)),/opaque-|fictional-private-error/);
    return true;
  });
  assert.equal(blobs.get(pointerPath),saved,"failed CAS retains prior good pointer");
  assert.equal(cache.readyFailureDetails({readyBlobFailure:{operation:"raw-secret"}}),undefined);
  process.env.CRON_SECRET="fictional";process.env.VERCEL_ENV="production";
  const route=compile("app/api/dashboard-ready-refresh/route.ts",{
    "@/lib/portal-v2/pvas-canonical":{pvasCanonicalEnabled:()=>true},
    "@/lib/dashboard-ready-cache.server":cache,
    "@/lib/pvas-shared-cache.server":{cacheTtlMs:()=>120000},
    "next/server":{NextResponse:Response},
    "@/lib/dashboard-ready.server":{READY_CLIENTS:["pvas"],readyClient:c=>c==="pvas",
      refreshDashboardReady:async()=>{throw publicationError;}},
  });
  const request={nextUrl:new URL("https://fictional.invalid/api/dashboard-ready-refresh?client=pvas"),headers:new Headers()};
  const denied=await route.POST(request);
  assert.equal(denied.status,401);
  assert.equal((await denied.json()).outcomes,undefined,"diagnostics are not public");
  request.headers.set("authorization","Bearer fictional");
  const response=await route.POST(request),payload=await response.json();
  assert.equal(response.status,503);
  assert.equal(payload.outcomes[0].stage,"publish-pointer");
  assert.equal(payload.outcomes[0].details.providerError,"precondition");
  assert.doesNotMatch(JSON.stringify(payload),/opaque-|fictional-private-error/);
  console.log("PASS installed SDK2.9.0 identity GET/opaque quoted CAS, weak/encoded rejection, actual adapter unchanged reuse across instances, safe diagnostics and failed-CAS last-good retention");
}
const transport=undici.fetch;
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{undici.fetch=originalFetch;});
