/** Pure paired transport only. No SQL, Node imports, defaults for real state,
 * new authority or changed revision/hash semantics. Shared verbatim with web. */
export const PVAS_TRACKING_COMPACT_MAX_CARRIERS=50_000;
export const PVAS_TRACKING_COMPACT_MAX_EXPANDED=12_000_000;
const MAX_WIRE=4_000_000; // existing outer request cap still applies separately
type Obj=Record<string,unknown>;
export interface ExpandedTracking{
 prospects:Record<string,Obj>;activity:unknown[];removed:unknown[];pirs:Obj;revision:string;
}
export interface CompactTrackingV1 extends ExpandedTracking{
 v:1;emptyProspectIds:number[];
}
export class PvasTrackingCompactError extends Error{
 constructor(readonly code:"pvas-tracking-compact-invalid"|"pvas-tracking-compact-resource"){
  super(code);
 }
}
function fail(resource=false):never{
 throw new PvasTrackingCompactError(resource?"pvas-tracking-compact-resource":"pvas-tracking-compact-invalid");
}
const obj=(x:unknown):x is Obj=>!!x&&typeof x==="object"&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const exact=(x:object,keys:string[])=>Object.keys(x).sort().join("|")===[...keys].sort().join("|");
const id=(x:unknown):x is number=>typeof x==="number"&&Number.isInteger(x)&&x>0&&x<=2147483647;
const key=(x:string)=>id(Number(x))&&String(Number(x))===x;
/** Reject lossy JSON transformations, cycles and pathological nesting. */
function json(x:unknown,max:number):string{
 const seen=new Set<object>();
 function visit(v:unknown,depth:number){
  if(depth>64)fail(true);
  if(v===null||typeof v==="string"||typeof v==="boolean")return;
  if(typeof v==="number"){if(!Number.isFinite(v))fail();return;}
  if(!Array.isArray(v)&&!obj(v))fail();
  const o=v as object;if(seen.has(o))fail();seen.add(o);
  if(Array.isArray(v)){for(let i=0;i<v.length;i++){if(!Object.hasOwn(v,i))fail();visit(v[i],depth+1);}}
  else for(const value of Object.values(v as Obj))visit(value,depth+1);
  seen.delete(o);
 }
 visit(x,0);
 const s=JSON.stringify(x);if(s.length>max)fail(true);return s;
}
function header(x:Obj){
 if(!obj(x.prospects)||!Array.isArray(x.activity)||!Array.isArray(x.removed)||
  !obj(x.pirs)||typeof x.revision!=="string"||!/^[a-f0-9]{64}$/.test(x.revision))fail();
 const keys=Object.keys(x.prospects);
 if(keys.length>PVAS_TRACKING_COMPACT_MAX_CARRIERS)fail(true);
 for(const k of keys)if(!key(k)||!obj(x.prospects[k]))fail();
}
function emptyCarrier():Obj{
 return{_canonicalTracking:{objectPresent:false,statusPresent:false},
  solicitor:"",solicitor2:"",updatedAt:"",by:""};
}
function isEmpty(x:Obj){
 return exact(x,["_canonicalTracking","solicitor","solicitor2","updatedAt","by"])&&
  obj(x._canonicalTracking)&&exact(x._canonicalTracking,["objectPresent","statusPresent"])&&
  x._canonicalTracking.objectPresent===false&&x._canonicalTracking.statusPresent===false&&
  x.solicitor===""&&x.solicitor2===""&&x.updatedAt===""&&x.by==="";
}
export function encodePvasTrackingCompact(input:unknown):CompactTrackingV1{
 if(!obj(input)||!exact(input,["prospects","activity","removed","pirs","revision"]))fail();
 header(input);json(input,PVAS_TRACKING_COMPACT_MAX_EXPANDED);
 const prospects:Record<string,Obj>={},emptyProspectIds:number[]=[];
 for(const [k,value] of Object.entries(input.prospects as Obj)){
  const p=value as Obj;if(isEmpty(p))emptyProspectIds.push(Number(k));else prospects[k]=p;
 }
 const result={v:1 as const,emptyProspectIds,prospects,activity:input.activity as unknown[],
  removed:input.removed as unknown[],pirs:input.pirs as Obj,revision:input.revision as string};
 return JSON.parse(json(result,MAX_WIRE)) as CompactTrackingV1;
}
export function decodePvasTrackingCompact(input:unknown):ExpandedTracking{
 if(!obj(input)||!exact(input,["v","emptyProspectIds","prospects","activity","removed","pirs","revision"])||
  input.v!==1||!Array.isArray(input.emptyProspectIds))fail();
 if(input.emptyProspectIds.length>PVAS_TRACKING_COMPACT_MAX_CARRIERS)fail(true);
 header(input);json(input,MAX_WIRE);
 const ids=input.emptyProspectIds,prospects={...input.prospects as Record<string,Obj>};
 if(ids.length+Object.keys(prospects).length>PVAS_TRACKING_COMPACT_MAX_CARRIERS)fail(true);
 const seen=new Set<number>();
 for(const n of ids){
  if(!id(n)||seen.has(n)||Object.hasOwn(prospects,String(n)))fail();
  seen.add(n);prospects[String(n)]=emptyCarrier();
 }
 const result={prospects,activity:input.activity as unknown[],removed:input.removed as unknown[],
  pirs:input.pirs as Obj,revision:input.revision as string};
 return JSON.parse(json(result,PVAS_TRACKING_COMPACT_MAX_EXPANDED)) as ExpandedTracking;
}
