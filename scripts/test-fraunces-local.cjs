// Exact deployed binary/provenance and actual Next local-loader contract.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const crypto=require("node:crypto"),ts=require("typescript");
const dir="public/fonts/fraunces",manifest=JSON.parse(fs.readFileSync(`${dir}/provenance.json`));
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
async function main(){
  const emitted=new Map(),rules=[];
  const loader=require("next/dist/compiled/@next/font/dist/local/loader").default;
  for(const a of manifest.assets){
    const body=fs.readFileSync(`${dir}/${a.filename}`);
    assert.equal(sha(body),a.sha256);assert.equal(body.length,a.bytes);
    assert.equal(body.subarray(0,4).toString(),"wOF2");
  }
  assert.equal(sha(fs.readFileSync(`${dir}/OFL.txt`)),manifest.license.sha256);
  assert.match(fs.readFileSync(`${dir}/OFL.txt`,"utf8"),/SIL OPEN FONT LICENSE Version 1.1/);
  for(const subset of ["latin","latin-ext","vietnamese"]){
    let options;
    const m={exports:{}};
    new Function("module","exports","require",ts.transpileModule(fs.readFileSync(`lib/fonts/fraunces-${subset}.ts`,"utf8"),{
      compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true},
    }).outputText)(m,m.exports,()=>({__esModule:true,default:o=>(options=o,{})}));
    assert.equal(options.variable,"--font-fraunces");assert.equal(options.display,"swap");
    assert.equal(options.preload,subset==="latin");assert.equal(options.adjustFontFallback,false);
    assert.deepEqual(options.fallback,['"Fraunces Fallback"']);
    assert.equal(options.declarations[0].value,manifest.assets.find(a=>a.subset===subset).unicodeRange);
    assert.deepEqual(options.src.map(s=>`${s.style}:${s.weight}`).sort(),
      ["normal","italic"].flatMap(s=>[300,400,500,600,700].map(w=>`${s}:${w}`)).sort());
    const result=await loader({functionName:"",variableName:"Fraunces",data:[options],
      resolve:async p=>path.resolve("lib/fonts",p),loaderContext:{fs},
      emitFontFile:(body,_ext,preload)=>{
        const digest=sha(body);emitted.set(digest,preload);return `/fictional/${digest}.woff2`;
      }});
    assert.equal(result.adjustFontFallback,undefined,"explicit deployed fallback replaces recalculation");
    rules.push(result.css);
    assert.equal((result.css.match(/font-family: Fraunces;/g)||[]).length,10);
  }
  assert.equal(emitted.size,6);assert.equal([...emitted.values()].filter(Boolean).length,2);
  const globals=fs.readFileSync("app/globals.css","utf8");
  for(const value of ["84.71%","22.09%","0.00%","115.45%",'local("Times New Roman")'])
    assert.ok(globals.includes(value));
  const layout=fs.readFileSync("app/layout.tsx","utf8");
  assert.match(layout,/import \{ Manrope \} from "next\/font\/google"/);
  assert.match(layout,/frauncesLatinExt.variable/);assert.match(layout,/frauncesVietnamese.variable/);
  if(process.argv.includes("--built")){
    const css=fs.readdirSync(".next/static/css").filter(p=>p.endsWith(".css"))
      .map(p=>fs.readFileSync(`.next/static/css/${p}`,"utf8")).join("\n");
    const faces=[...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(m=>m[1])
      .filter(s=>/font-family:(?:'|")?Fraunces(?:'|")?;/.test(s));
    assert.equal(faces.length,30,"compiled modules share exact Fraunces family for all subsets/weights/styles");
    for(const a of manifest.assets){
      const found=faces.filter(s=>s.includes(`unicode-range:${a.unicodeRange}`)&&s.includes(`font-style:${a.style}`));
      assert.equal(found.length,5);
      for(const face of found){
        const url=/src:url\(([^)]+)\)/.exec(face)[1].replace(/['"]/g,"");
        assert.equal(sha(fs.readFileSync(path.join(".next",url.replace(/^\/_next\//,"")))),a.sha256);
        assert.ok(face.includes("font-display:swap"));
      }
    }
    assert.match(css,/--font-fraunces:\s*["']?Fraunces["']?,\s*["']Fraunces Fallback["']/);
  }
  console.log("PASS exact deployed six Fraunces hashes/license,30faces across3subsets/5weights/2styles, Latin-only preload, shared family+variable and exact fallback metrics"+(process.argv.includes("--built")?", actual compiled CSS/bytes":""));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
