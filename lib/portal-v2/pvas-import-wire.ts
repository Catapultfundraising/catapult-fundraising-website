const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==="object"&&!Array.isArray(x);
const hex=(x:unknown):x is string=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const id=(x:unknown):x is number=>typeof x==="number"&&Number.isInteger(x)&&x>0&&x<=2147483647;
export type PvasImportPlan={v:1;status:"preview";requestId:string;payloadHash:string;planHash:string;batch:{requestId:string;newRows:unknown[];updates:unknown[];notes:unknown[];gifts:unknown[];[k:string]:unknown};held:{ordinal:number;reason:string}[];metadata:unknown[];links:unknown[]};
export type PvasImportReceipt={v:1;operation:"import-direct"|"import-monthly";requestId:string;payloadHash:string;batchId:number;assigned:number[];children:unknown[];replayed:boolean};
export function pvasImportPlan(raw:unknown,requestId:string):PvasImportPlan{
  if(!object(raw)||raw.v!==1||raw.status!=="preview"||raw.requestId!==requestId||!hex(raw.payloadHash)||!hex(raw.planHash)||
    !object(raw.batch)||raw.batch.requestId!==requestId||!["newRows","updates","notes","gifts"].every(k=>Array.isArray((raw.batch as Record<string,unknown>)[k]))||
    !Array.isArray(raw.held)||!raw.held.every(r=>object(r)&&Number.isInteger(r.ordinal)&&typeof r.reason==="string")||
    !Array.isArray(raw.metadata)||!Array.isArray(raw.links))throw new Error("Canonical import preview unavailable; no approval granted");
  return raw as unknown as PvasImportPlan;
}
export function pvasImportReceipt(raw:unknown,expected:{requestId:string;payloadHash:string;operation:"import-direct"|"import-monthly"}):PvasImportReceipt{
  if(!object(raw)||raw.v!==1||raw.operation!==expected.operation||raw.requestId!==expected.requestId||raw.payloadHash!==expected.payloadHash||
    !hex(raw.payloadHash)||!id(raw.batchId)||!Array.isArray(raw.assigned)||!raw.assigned.every(id)||!Array.isArray(raw.children)||
    typeof raw.replayed!=="boolean"||Object.hasOwn(raw,"private")||raw.error||raw.unconfirmed===true)
    throw new Error("Canonical receipt unconfirmed; keep original requestId");
  return raw as unknown as PvasImportReceipt;
}
export function pvasImportApproval(raw:unknown):boolean{
  return object(raw)&&Object.keys(raw).sort().join("|")==="confirm|payloadHash|planHash"&&raw.confirm===true&&hex(raw.payloadHash)&&hex(raw.planHash);
}
