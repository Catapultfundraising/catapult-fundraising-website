// Fictional rendered record-header fixtures only. No network, SQL, storage or live fixtures.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=process.cwd(),original=Module._load;
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
Module._load=function(name,parent,isMain){if(name.startsWith('@/'))name=path.join(root,name.slice(2));return original.call(this,name,parent,isMain);};
global.fetch=async()=>{throw new Error('Unexpected network request');};
const {assignmentResolver,viewAssignment}=require('../lib/portal-v2/effective-assignment.ts');
const {buildOverlay}=require('../lib/portal-v2/record-overlay.ts');
// Compile the real JSX tag row from each header, not a copied presentation. Unrelated
// links/download/merge controls are inert: their transports are tested separately.
function header(client){
 const file=`components/${client}-data-crm.tsx`,source=fs.readFileSync(file,'utf8'),sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let node;function visit(n){if(ts.isJsxElement(n)&&n.openingElement.attributes.properties.some(p=>p.name?.text==='className'&&p.initializer?.text==='mb-4 flex flex-wrap items-center gap-2'))node=n;ts.forEachChild(n,visit);}visit(sf);assert.ok(node,file);
 const code=`module.exports=function Header({r,index,tracking}){return (${node.getText(sf)});}`;
 const js=ts.transpileModule(code,{fileName:'fixture.tsx',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX}}).outputText,m={exports:{}};
 const noop=()=>null;
 const tag=fs.existsSync('components/campaign-prospect-tag.tsx')?require('../components/campaign-prospect-tag.tsx').CampaignProspectTag:noop;
 new Function('module','exports','require','viewAssignment','CampaignProspectTag','TrackingStatusBadge','MergeDeleteButtons','DownloadButtons','FileText','recordPayload','reload',js)(m,m.exports,require,viewAssignment,tag,({prospect})=>prospect?React.createElement('span',{},prospect.status):null,noop,noop,noop,noop,noop);
 return props=>renderToStaticMarkup(React.createElement(m.exports,props));
}
const clients=['jag','csnf','pvas','wcbhc','baq','imas'];
const track=(prospect)=>({prospects:prospect?{'101':prospect}:{},pirs:{},activity:[],removed:[]});
const record={cptid:101,name:'Fictional prospect',flags:[],board:[]};
const update=(id,cptid,field,new_value)=>({id,cptid,field,new_value,old_value:null});
const fixtures=[
 ['primary only',{solicitor:'Fictional Primary'},track(),[],true],
 ['secondary only',{secondary:'Fictional Secondary'},track(),[],true],
 ['both',{solicitor:'Fictional Primary',secondary:'Fictional Secondary'},track(),[],true],
 ['neither',{},track(),[],false],
 ['literal Unassigned',{solicitor:' Unassigned ',secondary:'unassigned'},track(),[],false],
 ['explicit primary clear',{solicitor:'Fictional Source'},track({solicitor:'',solicitorEdited:true}),[],false],
 ['legacy primary clear',{solicitor:'Fictional Source'},track({updatedAt:'fixture'}),[],false],
 ['SQL secondary clear',{secondary:'Fictional Source'},track(),[update(1,101,'solicitor2','')],false],
 ['both cleared',{solicitor:'Fictional Source',secondary:'Fictional Source'},track({solicitor:'',solicitor2:'',solicitorEdited:true}),[],false],
 ['primary clear keeps secondary',{solicitor:'Fictional Source',secondary:'Fictional Secondary'},track({solicitor:'',solicitorEdited:true}),[],true],
 ['status independent',{solicitor:'Fictional Primary'},track({status:'Disqualified',solicitorEdited:false}),[],true],
 ['status alone',{},track({status:'Active',solicitorEdited:false}),[],false],
];
for(const client of clients){const render=header(client);
 for(const [name,portfolio,tracking,updates,expected]of fixtures){
  const a=assignmentResolver({'101':{portfolio}},tracking,updates,buildOverlay(updates))(101),index=[{cptid:101,...a}];
  const html=render({r:{...record,assignment:a},index,tracking});
  assert.equal(html.includes('Campaign Prospect'),expected,`${client}: ${name}`);
  if(tracking.prospects['101']?.status)assert.ok(html.includes(tracking.prospects['101'].status),'status remains independent');
  if(expected)assert.equal((html.match(/Campaign Prospect/g)||[]).length,1,'one derived badge even with two assignments');
 }
 const updates=[update(1,102,'merged_into','101'),update(2,103,'merged_into','101')];
 const records={'101':{portfolio:{}},'102':{portfolio:{solicitor:'Fictional A'}},'103':{portfolio:{solicitor:'Fictional B'}}};
 let a=assignmentResolver(records,track(),updates,buildOverlay(updates))(101);assert.equal(a.assignmentConflict,true);
 assert.ok(!render({r:{...record,assignment:a},index:[{cptid:101,...a}],tracking:track()}).includes('Campaign Prospect'),'ambiguous merge invents no assignment');
 records['101'].portfolio.secondary='Fictional Secondary';a=assignmentResolver(records,track(),updates,buildOverlay(updates))(101);
 assert.ok(render({r:{...record,assignment:a},index:[{cptid:101,...a}],tracking:track()}).includes('Campaign Prospect'),'resolved secondary independently establishes assignment');
 const r={...record,assignment:{solicitor:'Fictional Detail',solicitor2:''}};
 assert.ok(!render({r,index:null,tracking:track()}).includes('Campaign Prospect'),'initial unavailable pair never invents tag');
 assert.ok(!render({r,index:[],tracking:track()}).includes('Campaign Prospect'),'missing canonical index row never falls back to detail');
 const retained=[{cptid:101,solicitor:'',solicitor2:''}];
 assert.ok(!render({r,index:retained,tracking:track()}).includes('Campaign Prospect'),'retained paired state owns tag, not stale detail');
 console.log(`PASS rendered ${client}: assignment matrix, independent status, merged conflict, paired-read absence/retention`);
}
console.log('PASS actual header JSX + actual shared tag + effective resolver; fictional only, no external reads/writes');
