// Actual private record modal render, fictional data only. No network or writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=process.cwd(),cache=new Map();
let context,inModal=false,slot=0;
const record={cptid:101,name:'Fictional donor',contact:{},summary:{lifetime:0,gifts:0,largest:0,years:0,band:''},
  nativeGiftHistory:{v:2,lane:'history',view:'current',records:[]},years:[]};
const canonical={pvasCanonicalEnabled:c=>c==='pvas'};
function load(file){
 const full=path.join(root,file);if(cache.has(full))return cache.get(full).exports;
 const m={exports:{}};cache.set(full,m);
 const req=name=>{
  if(name==='react')return {...React,useContext:()=>context,useEffect:()=>{},
   // eslint-disable-next-line react-hooks/rules-of-hooks -- Test-only injection for direct modal call; real child renders keep React state.
   useState:initial=>inModal?[slot++===0?record:initial,()=>{}]:React.useState(initial),useRef:initial=>({current:initial})};
  if(name==='lucide-react')return new Proxy({},{get:()=>()=>null});
  if(name.endsWith('/pvas-canonical')||name==='./pvas-canonical')return canonical;
  if(name==='@/components/dashboard-shared')return new Proxy({todayUs:()=> '11/18/2026',useSort:rows=>({sorted:rows})},{get:(o,k)=>o[k]??(()=>null)});
  if(name.startsWith('@/components/'))return new Proxy({},{get:()=>()=>null});
  if(name==='@/lib/portal-v2/pvas-export-model')return {};
  if(name==='@/lib/portal-v2/pvas-action.client')return {pvasActionFetch:()=>assert.fail('no writes')};
  const candidate=name.startsWith('@/')?path.join(root,name.slice(2)):name.startsWith('.')?path.resolve(path.dirname(full),name):null;
  if(candidate&&fs.existsSync(candidate+'.ts'))return load(path.relative(root,candidate+'.ts'));
  return require(name);
 };
 let source=fs.readFileSync(full,'utf8');
 if(file==='components/pvas-data-crm.tsx')source+='\nexport { RecordModal };\n';
 const js=ts.transpileModule(source,{fileName:full,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('module','exports','require',js)(m,m.exports,req);return m.exports;
}
global.fetch=()=>assert.fail('no network');
const {RecordModal}=load('components/pvas-data-crm.tsx');
function render(){
 slot=0;inModal=true;let tree;
 try{tree=RecordModal({cptid:101,onClose:()=>{}});}finally{inModal=false;}
 return renderToStaticMarkup(tree);
}
const empty={prospects:{},activity:[],pirs:{}};
context={index:null,loading:true,tracking:empty};
const early=render();
assert.match(early,/Loading record/,'early detail must wait for paired records/tracking');
assert.doesNotMatch(early,/Campaign tracking/);
context={...context,loading:false};
const failed=render();
assert.match(failed,/unavailable/i,'failed paired read stays explicitly unavailable');
assert.doesNotMatch(failed,/Campaign tracking/);
const carrier={_canonicalTracking:{objectPresent:false,statusPresent:false},solicitor:'',solicitor2:'',updatedAt:'',by:''};
context={index:[{cptid:101,name:record.name}],loading:false,tracking:{...empty,revision:'a'.repeat(64),prospects:{101:carrier}}};
const ready=render();
assert.match(ready,/Fictional donor/);assert.match(ready,/Campaign tracking/);assert.doesNotMatch(ready,/unavailable/);
context={...context,tracking:empty};
assert.throws(render,/Canonical tracking presence unavailable/,'ready-but-missing authoritative carrier must not become fabricated absence');
context={...context,tracking:{...empty,prospects:{101:{...carrier,_canonicalTracking:{objectPresent:'false',statusPresent:false}}}}};
assert.throws(render,/Canonical tracking presence unavailable/,'malformed loaded carrier remains fail-closed');
console.log('PASS actual record modal: early detail waits, paired failure unavailable, late canonical pair renders, missing/malformed carrier still rejects');
