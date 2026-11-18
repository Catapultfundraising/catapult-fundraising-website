// Pure memo behaviour only: no SQL, network or donor data.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),ts=require("typescript");
const m={exports:{}};
new Function("module","exports","require",ts.transpileModule(fs.readFileSync(path.join(process.cwd(),"lib/portal-v2/records-memo.ts"),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(m,m.exports,require);
const {createViewMemo}=m.exports;
async function main(){
 const memo=createViewMemo();let n=0;const make=async()=>({n:++n});
 const k1={},k2={};
 assert.equal((await memo(k1,make)).n,1);assert.equal((await memo(k1,make)).n,1,"same build reuses the view");
 assert.equal((await memo(k2,make)).n,2,"new build (edit, Reload, expiry) gets a fresh SQL view");
 assert.equal((await memo(null,make)).n,3);assert.equal((await memo(null,make)).n,4,"cache disabled: never reused");
 const [a,b]=await Promise.all([memo({},make),memo(k1,make)]);assert.equal(a.n,5);assert.equal(b.n,1);
 let fail=true;const flaky=async()=>{if(fail){fail=false;throw Error("sql down");}return {n:"ok"};};const k3={};
 await assert.rejects(memo(k3,flaky));assert.equal((await memo(k3,flaky)).n,"ok","failed read is not cached");
 console.log("pvas record view memo: PASS");
}
main().catch(e=>{console.error(e);process.exit(1);});
