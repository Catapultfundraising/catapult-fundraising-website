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
export interface DirectFileCell {
  ordinal:number;clientId:string;cptid:number;field:DirectFileField|"note";value:string;
  eventId:string|null;noteDate:string|null;noteResolution:"new-event"|"hold"|null;
}
export interface DirectFileBatch {
  requestId:string;client:string;template:string;fileDigest:string;mappingDigest:string;
  fileName:string;sourceDate:string;actor:string;cells:DirectFileCell[];
  parse:{format:"csv"|"xlsx";sheet:string|null;headerRow:number;delimiter:","|"\t"|";"|null};
  mapping:{source:string;target:DirectFileField|"note"|"clientId"|"noteDate"|"eventId"}[];
  fileContextHash:string;
}
export interface DirectFileDecision {
  ordinal:number;cptid:number;field:DirectFileField|"note";before:string|null;after:string;
  action:"set"|"advance"|"append"|"unchanged"|"held";reason:string|null;eventKey:string|null;
}
export interface DirectFileApproval {previewHash:string;expiresAt:number;proof:string}
export interface DirectFilePlan extends DirectFileApproval {payloadHash:string;decisions:DirectFileDecision[]}
export interface DirectFilePreviewRequest {
  op:"directFilePreview";batch:DirectFileBatch;fileContext:DirectFileContext;manualContext:SignedDirectManualContext;
}
export interface DirectFileCommitRequest {
  op:"directFileCommit";batch:DirectFileBatch;fileContext:DirectFileContext;manualContext:SignedDirectManualContext;approval:DirectFileApproval;
}
export interface DirectFilePreviewResponse {protocol:typeof DIRECT_FILE_PROTOCOL;status:"previewed";plan:DirectFilePlan}
export interface DirectFileReceipt {
  protocol:typeof DIRECT_FILE_PROTOCOL;requestId:string;client:string;status:"committed";saved:number;held:number;unchanged:number;
  payloadHash:string;previewHash:string;effect:"source-state-only";effectiveChanges:"not-asserted";publication:"not-requested";replay?:boolean;
}
export interface DirectFileStatusRequest {op:"directFileStatus";client:string;requestId:string}
export type DirectFileStatusResponse=DirectFileReceipt|{
  protocol:typeof DIRECT_FILE_PROTOCOL;requestId:string;client:string;status:"not-found";note:string;
};
export interface DirectFileStateValue {
  cptid:number;field:DirectFileField;value:string;template:string;authority_rev:string;request_id:string;
  source_date:string;committed_at:string;
}
export interface DirectFileStateNote {
  cptid:number;event_key:string;body:string;note_date:string;template:string;request_id:string;source_date:string;
  committed_at:string;declared_actor:string;file_name:string;file_digest:string;authority_rev:string;
}
export interface DirectFileStateRequest {op:"directFileState";client:string}
export interface DirectFileStateResponse {
  protocol:typeof DIRECT_FILE_PROTOCOL;status:"known";scope:"whole-client";complete:true;client:string;
  revision:string;observedAt:string;values:DirectFileStateValue[];notes:DirectFileStateNote[];note:string;
}
/** Read-only metadata, never configuration supplied by the browser. Empty registry is UNAVAILABLE. */
export interface DirectFileCapabilitiesRequest {op:"directFileCapabilities";client:string}
export interface DirectFileCapabilities {
  protocol:typeof DIRECT_FILE_PROTOCOL;client:string;status:"known"|"unavailable";reason:string|null;applyEnabled:boolean;
  templates:{template:string;revision:string;fields:(DirectFileField|"note")[];cutovers:Partial<Record<DirectFileField|"note",string>>}[];
  solicitorAliases:{status:"unavailable";entries:never[]};
}
export interface DirectFileErrorResponse {error:string;code:string;requestId?:string;statusOp?:"directFileStatus"}
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
