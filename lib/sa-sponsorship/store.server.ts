import 'server-only';
import { createHash } from 'node:crypto';
import { memberPresentation, validatePresentation, type Presentation } from './presentation.server';
import { redactSourceLabels } from './source-labels.server';
import { get, head, put, list, BlobNotFoundError, BlobError, BlobPreconditionFailedError, BlobAccessError, BlobServiceNotAvailable, BlobServiceRateLimited, BlobUnknownError } from '@vercel/blob';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { equal, hash, previewOnly, verifyToken } from './security.server';
import { ReviewError, validateOperation, validateRoster, type Member, type Operation, type Receipt, type Roster, UUID, object, keys } from './schema';
// Namespace is chosen by deployment, never by caller input. Production requires explicit launch enablement.
export const prefix=()=>`sa-sponsorship/v1/${process.env.VERCEL_ENV==='production'?'production':process.env.VERCEL_ENV==='preview'?'preview':'local'}/`;
function localDir() { const dir=process.env.SA_SPONSORSHIP_LOCAL_DIR; return !process.env.VERCEL && process.env.NODE_ENV!=='production' && dir && path.isAbsolute(dir) ? dir : null; }
function ready() { previewOnly(); if (!localDir() && !process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) throw new ReviewError('Private storage is not configured.',503); }
async function read<T>(key:string):Promise<T|null> { ready(); const dir=localDir(); if(dir){try{return JSON.parse(await fs.readFile(path.join(dir,key),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}
 try { const r=await get(key,{access:'private',useCache:false}); if(!r)return null; if(r.statusCode!==200||!r.stream)throw new Error('Storage unavailable');return JSON.parse(await new Response(r.stream).text()); }catch(e){if(e instanceof BlobNotFoundError)return null;throw e;}
}
async function create<T>(key:string,value:T,verify:(saved:T)=>void) { const old=await read<T>(key); if(old){verify(old);return old;} try { const dir=localDir(); if(dir){await fs.mkdir(path.dirname(path.join(dir,key)),{recursive:true});await fs.writeFile(path.join(dir,key),JSON.stringify(value),{flag:'wx',mode:0o600});}else{await put(key,JSON.stringify(value),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:false});}return value;}catch(e){const saved=await read<T>(key);if(!saved)throw e;verify(saved);return saved;} }
async function paths(base:string):Promise<string[]> { ready();const dir=localDir(); if(dir){async function walk(key:string):Promise<string[]> {try{const entries=await fs.readdir(path.join(dir!,key),{withFileTypes:true});const all=await Promise.all(entries.map(e=>e.isDirectory()?walk(`${key}${e.name}/`):Promise.resolve([`${key}${e.name}`])));return all.flat();}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}}return walk(base);}
 const out:string[]=[];let cursor:string|undefined; do{const page=await list({prefix:base,cursor,limit:1000});out.push(...page.blobs.map(b=>b.pathname));cursor=page.hasMore?page.cursor:undefined;if(out.length>100000)throw new ReviewError('Export too large.',503);}while(cursor);return out;
}
function same(a:unknown,b:unknown){if(!equal(JSON.stringify(a),JSON.stringify(b)))throw new ReviewError('Conflicting replay. Reload your saved answers before editing.',409);}
export async function importRoster(input:unknown) { const roster=validateRoster(redactSourceLabels(validateRoster(input)));
 await create(`${prefix()}rosters/${roster.version}.json`,roster,saved=>same(validateRoster(saved),roster));
 // One immutable active-version pointer for this preview; updates require a new isolated namespace/release.
 await create(`${prefix()}active.json`,{version:roster.version},saved=>same(saved,{version:roster.version})); return {rosterVersion:roster.version};
}
export async function getRoster() { const active=await read<{version:string}>(`${prefix()}active.json`);if(!active||!/^[a-zA-Z0-9_-]{1,80}$/.test(active.version))throw new ReviewError('The review roster is not available yet.',503);const roster=validateRoster(await read(`${prefix()}rosters/${active.version}.json`));if(roster.version!==active.version)throw new Error('Roster mismatch');return redactSourceLabels(roster); }
export async function saveMember(member:Member){await create(`${prefix()}members/${member.id}.json`,member,saved=>same(saved,member));return member;}
export async function memberFor(value:string|undefined){const session=verifyToken(value);if(!session)throw new ReviewError('Please enter the board access code to continue.',401);const member=await read<Member>(`${prefix()}members/${session.id}.json`);if(!member||member.id!==session.id||!equal(member.identityHash,session.identityHash)||!equal(member.identityHash,hash(JSON.stringify([member.name,member.email.toLowerCase()]))))throw new ReviewError('Session unavailable. Sign in again.',401);return member;}
const receiptPath=(m:string,p:string,r:number)=>`${prefix()}answers/${m}/${p}/revision-${String(r).padStart(7,'0')}.json`;
function operation(r:Receipt):Operation{return {operationId:r.operationId,rosterVersion:r.rosterVersion,prospectId:r.prospectId,revision:r.revision,choice:r.choice,comment:r.comment};}
export async function responses(memberId:string,roster:Roster,prospectId?:string) {
 if(prospectId!==undefined&&!roster.prospects.some(p=>p.id===prospectId))throw new ReviewError('Unknown prospect.');
 const base=`${prefix()}answers/${memberId}/${prospectId?`${prospectId}/`:''}`;
 const keys=await paths(base),result:Receipt[]=[];
 for(let i=0;i<keys.length;i+=10){
  const batch=await Promise.all(keys.slice(i,i+10).map(async key=>{
   const r=await read<Receipt>(key);
   if(!r||r.memberId!==memberId||key!==receiptPath(memberId,r.prospectId,r.revision)||(prospectId!==undefined&&r.prospectId!==prospectId)||!Number.isFinite(Date.parse(r.savedAt))||new Date(r.savedAt).toISOString()!==r.savedAt)throw new Error('Receipt invalid');
   validateOperation(operation(r),roster);return r;
  }));result.push(...batch);
 }
 return result.sort((a,b)=>a.revision-b.revision);
}
export async function saveAnswer(member:Member,input:unknown){const roster=await getRoster(),op=validateOperation(input,roster);const base=`${prefix()}operations/${member.id}/${op.operationId}.json`;
 if(op.revision===1&&!op.choice&&!op.comment.trim())throw new ReviewError('Choose a role or enter a note before saving.');
 // Claim operation ID immutably before the revision. Hash the actual canonical payload, not caller metadata.
 await create(base,op,saved=>same(saved,op));
 const key=receiptPath(member.id,op.prospectId,op.revision),old=await read<Receipt>(key);
 if(old){same(operation(old),op);return old;}
 const history=await responses(member.id,roster,op.prospectId),latest=history.filter(r=>r.prospectId===op.prospectId).pop();if(op.revision!==(latest?.revision||0)+1)throw new ReviewError('Your saved answer changed. Reload before editing.',409);
 return create<Receipt>(key,{...op,memberId:member.id,savedAt:new Date().toISOString()},saved=>{same(operation(saved),op);if(saved.memberId!==member.id)throw new Error('Receipt owner mismatch');});
}
export async function exportReview(snapshot?: Roster){const roster=snapshot||await getRoster();const members:Member[]=[],answers:Receipt[]=[];for(const key of await paths(`${prefix()}members/`)){const member=await read<Member>(key);if(!member||key!==`${prefix()}members/${member.id}.json`)throw new Error('Invalid member');members.push(member);answers.push(...await responses(member.id,roster));}return {schemaVersion:1,rosterVersion:roster.version,prospects:roster.prospects,members:members.map(({identityHash:_hash,...m})=>m),responses:answers};}
// Durable, create-only 15-minute buckets: bounded attempts across serverless instances.
// No raw IP is persisted. Failed races fail closed, rather than exceeding the limit.
export async function throttleLogin(clientKey:string) { const bucket=Math.floor(Date.now()/900000); const base=`${prefix()}login-limits/${clientKey}/${bucket}/`; const count=(await paths(base)).length; if(count>=64)throw new ReviewError('Too many access attempts. Please try again in 15 minutes.',429);const nonce=hash(`${Math.random()}-${Date.now()}`);await create(`${base}${count}.json`,{nonce},()=>{throw new ReviewError('Too many access attempts. Please try again in 15 minutes.',429);}); }

function conditionalDiagnostic(error:unknown,etag:string|undefined) {
 const classes=[['BlobPreconditionFailedError',BlobPreconditionFailedError],['BlobAccessError',BlobAccessError],['BlobServiceNotAvailable',BlobServiceNotAvailable],['BlobServiceRateLimited',BlobServiceRateLimited],['BlobUnknownError',BlobUnknownError],['BlobError',BlobError]] as const;
 const code=classes.find(([,kind])=>typeof kind==='function'&&error instanceof kind)?.[0]||'UnknownError';
 const raw=error&&typeof error==='object'?(error as {statusCode?:unknown;status?:unknown}):{};
 const numeric=raw.statusCode??raw.status;
 const httpStatus=typeof numeric==='number'&&Number.isInteger(numeric)&&numeric>=100&&numeric<=599?numeric:undefined;
 const etagFormat=!etag?'missing':etag.startsWith('W/')?'weak':etag.startsWith('"')?'quoted':'bare';
 return {stage:'conditional-put' as const,code,...(httpStatus!==undefined?{httpStatus}:{}),etagFormat} as const;
}
const rawHash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
async function activeRawRoster(requireCanonicalETag=false) {
 ready();const active=await read<{version:string}>(`${prefix()}active.json`);
 if(!active||!/^[a-zA-Z0-9_-]{1,80}$/.test(active.version))throw new ReviewError('The review roster is not available yet.',503);
 const key=`${prefix()}rosters/${active.version}.json`,dir=localDir();
 let bytes:Buffer,etag:string|undefined;
 if(dir){bytes=await fs.readFile(path.join(dir,key));}
 else{
  // CDN GET may carry a weak ETag that is not valid for a conditional write.
  // Bind the exact uncached bytes to stable provider-canonical metadata instead;
  // never strip/guess a weak validator or weaken the write precondition.
  const before=requireCanonicalETag?await head(key):null;
  const result=await get(key,{access:'private',useCache:false});
  if(!result||result.statusCode!==200||!result.stream)throw new ReviewError('Private roster unavailable.',503);
  bytes=Buffer.from(await new Response(result.stream).arrayBuffer());etag=result.blob.etag;
  if(requireCanonicalETag){
   const after=await head(key);
   if(!before||!before.etag||/^W\//i.test(before.etag)||before.etag!==after.etag||before.pathname!==key||after.pathname!==key||result.blob.pathname!==key||before.size!==bytes.byteLength||after.size!==bytes.byteLength)throw new ReviewError('Canonical roster identity changed or is unavailable. No conditional write attempted.',409);
   etag=before.etag;
  }
 }
 // Fatal UTF-8 decoding preserves an optional BOM instead of hashing reconstructed text.
 const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
 const roster=validateRoster(JSON.parse(raw.charCodeAt(0)===0xfeff?raw.slice(1):raw));if(roster.version!==active.version)throw new Error('Roster mismatch');
 return {key,version:active.version,bytes,etag,roster,digest:rawHash(bytes)};
}
export async function exportReviewWithDigest(){const raw=await activeRawRoster();return {data:await exportReview(redactSourceLabels(raw.roster)),digest:raw.digest};}
interface RedactionIntent {action:'redact-source-labels';operationId:string;rosterVersion:string;expectedRawDigest:string;targetDigest:string;backupKey:string;createdAt:string}
export async function redactActiveSourceLabels(input:unknown) {
 // This migration is intentionally unavailable in production and local-file mode.
 ready();if(process.env.VERCEL_ENV!=='preview'||localDir())throw new ReviewError('Source-label migration is preview-only.',403);
 const o=object(input);keys(o,['action','operationId','expectedRawDigest']);
 if(o.action!=='redact-source-labels'||typeof o.operationId!=='string'||!UUID.test(o.operationId)||typeof o.expectedRawDigest!=='string'||!/^[a-f0-9]{64}$/.test(o.expectedRawDigest))throw new ReviewError('Invalid source-label migration.');
 const base=`${prefix()}source-redactions/${o.operationId}/`,intentKey=`${base}intent.json`,receiptKey=`${base}receipt.json`;
 const oldIntent=await read<RedactionIntent>(intentKey);
 if(oldIntent&&(oldIntent.action!==o.action||oldIntent.expectedRawDigest!==o.expectedRawDigest||oldIntent.operationId!==o.operationId))throw new ReviewError('Conflicting migration replay.',409);
 let raw=await activeRawRoster(true);
 const cleaned=validateRoster(redactSourceLabels(raw.roster));
 const target=Buffer.from(JSON.stringify(cleaned),'utf8'),targetDigest=rawHash(target);
 // Exact replay after an acknowledged or lost successful conditional update.
 if(oldIntent&&raw.version===oldIntent.rosterVersion&&raw.digest===oldIntent.targetDigest){
  const receipt={action:oldIntent.action,operationId:oldIntent.operationId,rosterVersion:oldIntent.rosterVersion,originalRawDigest:oldIntent.expectedRawDigest,redactedRawDigest:oldIntent.targetDigest,authorizedAt:oldIntent.createdAt};
  return create(receiptKey,receipt,saved=>same(saved,receipt));
 }
 if(raw.digest!==o.expectedRawDigest)throw new ReviewError('Roster changed. Read the authenticated raw digest again before retrying.',409);
 if(!raw.etag)throw new ReviewError('Conditional private storage is unavailable.',503);
 const backupKey=`${base}original.json`;
 const backup={rosterVersion:raw.version,rawDigest:raw.digest,encoding:'base64',rawBytes:raw.bytes.toString('base64')};
 await create(backupKey,backup,saved=>same(saved,backup));
 const intent:RedactionIntent={action:'redact-source-labels',operationId:o.operationId,rosterVersion:raw.version,expectedRawDigest:raw.digest,targetDigest,backupKey,createdAt:oldIntent?.createdAt||new Date().toISOString()};
 await create(intentKey,intent,saved=>same(saved,intent));
 // Recheck the immutable active pointer immediately before the one allowed conditional overwrite.
 const pinned=await read<{version:string}>(`${prefix()}active.json`);if(pinned?.version!==raw.version)throw new ReviewError('Active roster changed.',409);
 try{await put(raw.key,target,{access:'private',contentType:'application/json',addRandomSuffix:false,ifMatch:raw.etag});}
 catch(error){
  const diagnostic=conditionalDiagnostic(error,raw.etag);
  // Resolve lost acknowledgements only by the exact target bytes; never blind overwrite.
  raw=await activeRawRoster();if(raw.version!==intent.rosterVersion||raw.digest!==targetDigest)throw new ReviewError('Conditional redaction was not confirmed. No blind overwrite was attempted.',409,diagnostic);
 }
 const verified=await activeRawRoster();if(verified.version!==intent.rosterVersion||verified.digest!==targetDigest)throw new ReviewError('Redaction could not be confirmed.',409);
 const receipt={action:intent.action,operationId:intent.operationId,rosterVersion:intent.rosterVersion,originalRawDigest:intent.expectedRawDigest,redactedRawDigest:targetDigest,authorizedAt:intent.createdAt};
 return create(receiptKey,receipt,saved=>same(saved,receipt));
}


// Presentation only: canonical roster, historical receipts and save allowlist stay intact.
export async function configurePresentation(input:unknown) {
 const roster=await getRoster(),config=validatePresentation(input,roster);
 await create(`${prefix()}presentation/${roster.version}.json`,config,saved=>same(validatePresentation(saved,roster),config));
 return {rosterVersion:roster.version,topProspectCount:config.topProspectIds.length,visibleProspectCount:memberPresentation(roster,config).prospects.length,canonicalProspectCount:roster.prospects.length};
}
export async function getPresentation(roster:Roster):Promise<Presentation|null>{
 const config=await read<Presentation>(`${prefix()}presentation/${roster.version}.json`);
 return config?validatePresentation(config,roster):null;
}
