// Synthetic actual all-six workbook buffers; never uses donor/provider data.
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), Module=require('node:module'), ts=require('typescript');
for(const ext of ['.ts','.tsx']) require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const load=Module._load;Module._load=function(n,p,m){return load.call(this,n.startsWith('@/')?path.join(process.cwd(),n.slice(2)):n,p,m)};
global.fetch=async()=>{throw Error('Synthetic only: no network')};
const ExcelJS=require('exceljs');
const {PROSPECT_NOTES_LABEL,REPORT_FIELDS,reportExportFields}=require('../lib/portal-v2/report-fields.ts');
const out=process.env.EXCEL_READABILITY_PROOF_DIR||fs.mkdtempSync('/tmp/excel-readability-');fs.mkdirSync(out,{recursive:true});
const ordinary='Campaign history\r\n2026-11-20 — Alex Example: Met with the family to review the library expansion. They would like a follow-up after the December board meeting.\r\n\r\nSource notes\r\nInterested in a multi-year commitment. Please include the project overview and accessible entrance plans.\r\n\r\nDashboard activity\r\n2026-11-24 — Riley Example: Requested a call next Thursday.\r\nKeep both solicitors informed.\r\nORDINARY_END';
const beyondRow=Array.from({length:48},(_,i)=>`Activity ${i+1}: José — 中文 🌱 discussed next steps with the family.\r\n`).join('')+'ROW_END';
const beyondCell='x'.repeat(32766)+'🌱\r\nJosé — 中文\n'+'Full note\n'.repeat(4200)+'FINAL_SENTINEL';
const notes=[ordinary,beyondRow,beyondCell,'One short note.', 'W'.repeat(4000)+'UNBROKEN_END'];
function originalText(wb,ws,cell){
 const details=[];for(const sh of wb.worksheets) if(sh.getCell('A1').value==='Report sheet') sh.eachRow((r,n)=>{if(n>1&&r.getCell(1).value===ws.name&&r.getCell(2).value===cell.address)details.push(r)});
 if(details.length){details.forEach((r,i)=>{assert.equal(r.getCell(5).value,i+1);assert.equal(r.getCell(6).value,details.length);assert.equal(r.getCell(7).alignment.wrapText,true);assert.equal(r.getCell(7).alignment.vertical,'top');assert.ok(r.height>=20&&r.height<=300)});return details.map(r=>r.getCell(7).value).join('')}
 return cell.value;
}
(async()=>{
 for(const client of ['jag','csnf','pvas','wcbhc','baq','imas']){
  const {buildBrandedXlsx}=require(`../lib/${client}-brand-xlsx.ts`);
  // Exact canonical label shared by selected/default/saved-list omitted Notes.
  for(const fields of [['cptid','name'],['cptid','name','notes']]) assert.equal(reportExportFields(fields).filter(x=>x==='notes').length,1);
  assert.equal(REPORT_FIELDS.find(x=>x.id==='notes').label,PROSPECT_NOTES_LABEL);
  const opts={title:'Synthetic prospect roster',subtitle:'Fictional records — spreadsheet readability proof',client:'Synthetic',cols:[{label:'CPTID'},{label:'Name'},{label:PROSPECT_NOTES_LABEL},{label:'Campaign Ask',kind:'usd'}],sections:[{rows:notes.map((n,i)=>[990001+i,'Fictional Family '+(i+1),n,25000])}]};
  const before=JSON.stringify(opts),buf=await buildBrandedXlsx(opts);assert.equal(JSON.stringify(opts),before,'no mutation');fs.writeFileSync(path.join(out,client+'.xlsx'),buf);
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(buf);const ws=wb.worksheets[0];
  if(!process.env.CAPTURE_BASE_ONLY){
   assert.equal(ws.getCell('C6').alignment?.wrapText,true,client+': ordinary prospect note must wrap');assert.equal(ws.getCell('C6').alignment.vertical,'top');assert.ok(ws.getColumn(3).width>=60);assert.ok(ws.getRow(6).height>=150&&ws.getRow(6).height<=409);
   notes.forEach((note,i)=>assert.equal(originalText(wb,ws,ws.getCell(i+6,3)),note,client+': exact notes incl CRLF'));
   for(const i of [1,2,4])assert.match(ws.getCell(i+6,3).value,/Readable notes: Prospect notes/);
   assert.equal(ws.getCell('C9').value,notes[3]);assert.ok(ws.getRow(9).height>=20&&ws.getRow(9).height<60);
   assert.match(ws.getCell('C8').value,/Text continuation/,'existing lossless cell-limit owner retained');
   const continuations=[];for(const sh of wb.worksheets) if(sh.getCell('A1').value==='Source sheet') sh.eachRow((r,n)=>{if(n>1&&r.getCell(1).value===ws.name&&r.getCell(2).value==='C8')continuations.push(r.getCell(8).value)});assert.equal(continuations.join(''),beyondCell);
   for(const sh of wb.worksheets)sh.eachRow(r=>{assert.ok(!r.height||r.height<=409);r.eachCell(c=>{if(typeof c.value==='string')assert.ok(c.value.length<=32767)})});
   assert.equal(ws.getCell('D6').numFmt,'"$"#,##0');assert.equal(ws.views[0].ySplit,5);
   // Actual15-column roster, not just reduced visual proof.
   const wide={...opts,cols:[...opts.cols.slice(0,2),...Array.from({length:12},(_,i)=>({label:'Context '+i})),opts.cols[2]],sections:[{rows:[[990007,'Fictional Wide Family',...Array(12).fill('Context'),ordinary]]}]};
   const w=new ExcelJS.Workbook();await w.xlsx.load(await buildBrandedXlsx(wide));assert.equal(w.worksheets[0].getCell('O6').alignment.wrapText,true);assert.ok(w.worksheets[0].getRow(6).height>=150);
   console.log(`PASS ${client}: ordinary multiline inline; row/cell-limit and unbroken notes readable; exact Unicode/CRLF;15 columns; no mutation`);
  }
 }
 if(!process.env.CAPTURE_BASE_ONLY){
  const {buildBrandedXlsx}=require('../lib/jag-brand-xlsx.ts');
  const opts={title:'Prospect notes',subtitle:'Synthetic',client:'Synthetic',cols:[{label:'CPTID'},{label:'Name'},{label:'Notes'}],sections:[{rows:[[991001,'GC2P Fictional',ordinary]]}],extraSheets:[{name:'Below threshold',cols:[{label:'CPTID'},{label:'Name'},{label:PROSPECT_NOTES_LABEL}],rows:[[991002,'Extra Fictional',beyondRow]]}]};
  const w=new ExcelJS.Workbook();await w.xlsx.load(await buildBrandedXlsx(opts));assert.equal(w.worksheets[0].getCell('C6').alignment.wrapText,true);assert.equal(originalText(w,w.worksheets[1],w.worksheets[1].getCell('C2')),beyondRow);assert.match(w.worksheets[1].getCell('C2').value,/Prospect notes 2/);fs.writeFileSync(path.join(out,'jag-extra.xlsx'),await buildBrandedXlsx(opts));
  console.log('PASS Notes legacy/GC2P label; JAG extra sheet; safe detail-sheet name collision');
 }
 fs.writeFileSync(path.join(out,'expected-notes.json'),JSON.stringify(notes));console.log('Synthetic artifacts: '+out);
})().catch(e=>{console.error(e);process.exitCode=1});

