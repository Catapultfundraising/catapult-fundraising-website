import { moneyCents } from "./pvas-financials";
export type PvasGiftValue = {amount:string;currency:string;date:string|null;year:number|null;kind:"gift"|"pledge";status:"received"|"pledged"|"void";scope:"historical"|"campaign";credit:"hard"|"soft";campaign:string|null;fund:string|null;type:string|null;note:string|null;donorName:string|null};
export type PvasRawGift=PvasGiftValue&{giftId:number;cptid:number;version:number;voidReason:string|null};
export type PvasGiftMetadata={gift:PvasRawGift;source:{system:string;key:string}};
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==="object"&&!Array.isArray(x);
const id=(x:unknown):x is number=>typeof x==="number"&&Number.isInteger(x)&&x>0&&x<=2147483647;
const text=(x:unknown)=>x===null||typeof x==="string";
export function pvasGiftMetadata(raw:unknown):PvasGiftMetadata {
  if(!object(raw)||!object(raw.gift)||!object(raw.source))throw new Error("Original canonical gift source metadata unavailable");
  const g=raw.gift,s=raw.source;
  moneyCents(g.amount);
  const date=g.date===null||typeof g.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(g.date)&&Number.isFinite(Date.parse(g.date))&&new Date(g.date).toISOString().slice(0,10)===g.date;
  if(!id(g.giftId)||!id(g.cptid)||!id(g.version)||!date||!(g.year===null||typeof g.year==="number"&&Number.isInteger(g.year)&&g.year>=1&&g.year<=9999)||
    typeof g.currency!=="string"||!/^[A-Z]{3}$/.test(g.currency)||!["gift","pledge"].includes(String(g.kind))||!["received","pledged","void"].includes(String(g.status))||
    !["historical","campaign"].includes(String(g.scope))||!["hard","soft"].includes(String(g.credit))||!["campaign","fund","type","note","donorName","voidReason"].every(k=>text(g[k]))||
    !["portal_gifts","client_gift_history","website_db","manual","caller","monthly_import"].includes(String(s.system))||typeof s.key!=="string"||!s.key)
    throw new Error("Invalid original canonical gift metadata");
  return raw as unknown as PvasGiftMetadata;
}
export function pvasGiftTarget(meta:PvasGiftMetadata){return {giftId:meta.gift.giftId,expectedVersion:meta.gift.version,source:{...meta.source}};}
export function pvasGiftValues(meta:PvasGiftMetadata):PvasGiftValue {
  const {giftId:_id,cptid:_cptid,version:_v,voidReason:_reason,...values}=meta.gift;return values;
}
export const countedReceived=(g:PvasRawGift)=>g.currency==="USD"&&g.credit==="hard"&&g.kind==="gift"&&g.status==="received";
export const countedCampaign=(g:PvasRawGift)=>g.scope==="campaign"&&g.currency==="USD"&&g.credit==="hard"&&(g.kind==="gift"&&g.status==="received"||g.kind==="pledge"&&g.status==="pledged");
