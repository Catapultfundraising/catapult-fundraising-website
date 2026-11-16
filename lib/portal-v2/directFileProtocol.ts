/** Shared SERVER-ONLY wire contract. No environment, auth/session, SQL or HTTP issuer. */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export const DIRECT_FILE_PROTOCOL="direct-file-v1" as const;
export const DIRECT_MANUAL_DOMAIN="catapult/direct-manual/v1\n";
export const DIRECT_FILE_MAX_BYTES=2_000_000;
export const DIRECT_FILE_MAX_ROWS=500;
export const DIRECT_FILE_MAX_CELLS=50;
export const DIRECT_STATE_MAX_IDS=100;
export const DIRECT_STATE_MAX_NOTES=100;
export const DIRECT_MANUAL_TTL_SECONDS=120;
export type DirectFileField="ask"|"primarySolicitor"|"secondarySolicitor";
export interface DirectFileContext {
  v:1;format:"csv"|"xlsx";sheet:string|null;headerRow:number;delimiter:","|"\t"|";"|null;
  clientIdFormat:"text"|"declared-integer";verifyCptidColumn:string|null;
  fileBytes:number;dataRows:number;reviewCells:number;
}
export type DirectNoteCoverage="complete"|"tracking-only"|"unavailable";
export interface DirectManualObservation {
  cptid:number;revision:string;historicalRevision:string|null;
  fields:{ask:{present:boolean};primarySolicitor:{present:boolean};secondarySolicitor:{present:boolean}};
  notesCoverage:DirectNoteCoverage;notes:{date:string;body:string}[];
}
/** Construct in THIS key order. Observation, fields, presence and note keys likewise follow their type declaration. */
export interface DirectManualPayload {
  v:1;phase:"preview"|"commit";requestId:string;client:string;template:string;registrationRevision:string;
  batchHash:string;fileContextHash:string;issuedAt:number;expiresAt:number;observations:DirectManualObservation[];
}
export interface SignedDirectManualContext {payload:DirectManualPayload;signature:string}
export interface DirectResolveId {clientId:string;verifyCptid:number|null}
export interface DirectResolveRequest {
  op:"directFileResolve";client:string;template:string;sourceDate:string;ids:DirectResolveId[];
}
export interface DirectResolveResult {
  protocol:typeof DIRECT_FILE_PROTOCOL;status:"known";client:string;template:string;registrationRevision:string;
  matches:{clientId:string;verifyCptid:number|null;cptid:number|null;reason:null|"unknown-id"|"ambiguous-id"|"id-collision"|"cptid-conflict"|"missing-master"}[];
}
export const DIRECT_MANUAL_KEYS=["v","phase","requestId","client","template","registrationRevision","batchHash","fileContextHash","issuedAt","expiresAt","observations"] as const;
export class DirectContextError extends Error {
  constructor(public code:string,public status=400){super(code);}
}
export function directFileHash(v:unknown):string{
  const canonical=(x:unknown):unknown=>{
    if(Array.isArray(x))return x.map(canonical);
    if(x&&typeof x==="object")return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical((x as Record<string,unknown>)[k])]));
    return x;
  };
  return createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex");
}
/** Call only after strict gateway reads; this is NOT an endpoint accepting browser observations. */
export function signDirectManualContext(payload:DirectManualPayload,secret:string):SignedDirectManualContext{
  if(typeof secret!=="string"||secret.length<24)throw new DirectContextError("manual-proof-unavailable",503);
  return {payload,signature:createHmac("sha256",secret).update(DIRECT_MANUAL_DOMAIN+JSON.stringify(payload)).digest("hex")};
}
export function directSignatureEqual(a:string,b:string){
  const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);
}
