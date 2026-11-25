// Public types/validators only. Contact records are never imported into source.
export interface Portal { type: string; url: string; email: string; deadline: string; status: string; eligibility: string; source: string; checkedAt: string }
export interface Prospect { id: string; organization: string; contactName: string; title: string; email: string; emailStatus: string; directPhone: string; phoneStatus: string; officePhone: string; website: string; contactSource: string; contactFit: string; portals: Portal[] }
export interface Roster { schemaVersion: 1; version: string; checkedAt: string; prospects: Prospect[] }
export interface Member { id: string; name: string; email: string; identityHash: string; createdAt: string }
export interface Operation { operationId: string; rosterVersion: string; prospectId: string; revision: number; choice: ''|'A'|'B'|'C'|'D'|'O'; comment: string; choiceVersion?: 'kirk-v1'|'suggestions-v1' }
export interface Receipt extends Operation { memberId: string; savedAt: string }
export class ReviewError extends Error { constructor(message: string, public status = 400, public diagnostic?: {stage:'conditional-put';code:string;httpStatus?:number;etagFormat:'quoted'|'weak'|'bare'|'missing'}) { super(message); } }
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function object(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ReviewError('Invalid object.'); return v as Record<string, unknown>; }
export function keys(o: Record<string, unknown>, expected: string[]) { if (Object.keys(o).sort().join('|') !== expected.slice().sort().join('|')) throw new ReviewError('Unexpected fields.'); }
export function text(v: unknown, max = 2000, required = false): string { if (typeof v !== 'string' || v.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v) || (required && !v.trim())) throw new ReviewError('Invalid text.'); return v; }
export function email(v: unknown, required = false) { const s = text(v, 254, required); if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new ReviewError('Enter a valid email address.'); return s; }
function url(v: unknown) { const s = text(v); if (s) { let u: URL; try { u = new URL(s); } catch { throw new ReviewError('Invalid link.'); } if (u.protocol !== 'https:' || u.username || u.password) throw new ReviewError('Only secure web links are supported.'); } return s; }
function date(v: unknown) { const s = text(v, 10, true); if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString().slice(0,10) !== s) throw new ReviewError('Invalid checked date.'); return s; }
export function validateRoster(input: unknown): Roster {
 const o = object(input); keys(o, ['schemaVersion','version','checkedAt','prospects']);
 if (o.schemaVersion !== 1 || typeof o.version !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(o.version) || !Array.isArray(o.prospects) || !o.prospects.length || o.prospects.length > 1000) throw new ReviewError('Invalid roster.');
 const seen = new Set<string>();
 const prospects = o.prospects.map(raw => { const p = object(raw); keys(p,['id','organization','contactName','title','email','emailStatus','directPhone','phoneStatus','officePhone','website','contactSource','contactFit','portals']);
 const id = text(p.id,80,true); if (id === 'other-companies' || !/^[a-zA-Z0-9_-]+$/.test(id) || seen.has(id)) throw new ReviewError('Invalid or duplicate prospect ID.'); seen.add(id);
 if (!Array.isArray(p.portals) || p.portals.length > 20) throw new ReviewError('Invalid portals.');
 return { id, organization:text(p.organization,250,true), contactName:text(p.contactName,250), title:text(p.title,500), email:email(p.email), emailStatus:text(p.emailStatus), directPhone:text(p.directPhone,100), phoneStatus:text(p.phoneStatus), officePhone:text(p.officePhone,100), website:url(p.website), contactSource:text(p.contactSource), contactFit:text(p.contactFit), portals:p.portals.map(rawPortal => { const q=object(rawPortal); keys(q,['type','url','email','deadline','status','eligibility','source','checkedAt']); return { type:text(q.type,150,true), url:url(q.url), email:email(q.email), deadline:text(q.deadline), status:text(q.status), eligibility:text(q.eligibility), source:text(q.source), checkedAt:date(q.checkedAt) }; }) };
 });
 return {schemaVersion:1,version:o.version,checkedAt:date(o.checkedAt),prospects};
}
export function validateOperation(input: unknown, roster: Roster): Operation {
 const o=object(input); keys(o,['operationId','rosterVersion','prospectId','revision','choice','comment',...(Object.prototype.hasOwnProperty.call(o,'choiceVersion')?['choiceVersion']:[])]);
 const suggestions=o.choiceVersion==='suggestions-v1'&&o.prospectId==='other-companies'&&o.choice==='';
 if(Object.prototype.hasOwnProperty.call(o,'choiceVersion')&&o.choiceVersion!=='kirk-v1'&&o.choiceVersion!=='suggestions-v1')throw new ReviewError('Invalid answer wording version.');
 if((o.choiceVersion==='suggestions-v1'||o.prospectId==='other-companies')&&!suggestions)throw new ReviewError('Invalid final question.');
 if(o.choiceVersion==='kirk-v1'&&o.choice==='O')throw new ReviewError('Invalid answer choice.');
 if (typeof o.operationId !== 'string' || !UUID.test(o.operationId) || o.rosterVersion !== roster.version || typeof o.prospectId !== 'string' || (!suggestions&&!roster.prospects.some(p=>p.id===o.prospectId)) || !Number.isSafeInteger(o.revision) || Number(o.revision)<1 || Number(o.revision)>1000000 || (typeof o.choice!=='string'||!['','A','B','C','D','O'].includes(o.choice))) throw new ReviewError('Invalid answer or roster version. Reload and try again.');
 return {operationId:o.operationId,rosterVersion:roster.version,prospectId:o.prospectId,revision:Number(o.revision),choice:o.choice as Operation['choice'],comment:text(o.comment,2000),...(o.choiceVersion?{choiceVersion:o.choiceVersion as Operation['choiceVersion']}: {})};
}
