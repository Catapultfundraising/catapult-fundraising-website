import 'server-only';
import { ReviewError, keys, object, type Roster } from './schema';
export interface Presentation { rosterVersion:string; topProspectIds:string[] }
export function validatePresentation(input:unknown,roster:Roster):Presentation {
 const o=object(input);keys(o,['rosterVersion','topProspectIds']);
 if(o.rosterVersion!==roster.version||!Array.isArray(o.topProspectIds)||o.topProspectIds.length!==20||o.topProspectIds.some(id=>typeof id!=='string'||!roster.prospects.some(p=>p.id===id))||new Set(o.topProspectIds).size!==20)throw new ReviewError('Choose exactly twenty unique prospects from the active roster.');
 return {rosterVersion:roster.version,topProspectIds:o.topProspectIds as string[]};
}

/** Strip source annotations, not arbitrary text/digits. Numeric area codes survive. */
export function usablePhone(value:string):boolean {
 // Remove the final provenance annotation before splitting, because its text can
 // contain a semicolon ("original file; not reverified"), not a second phone.
 const withoutNote=value.replace(/\s*\([^)]*[a-z][^)]*\)\s*$/i,'').trim();
 return withoutNote.split(';').some(part=>{
  const number=part.replace(/\s*\([^)]*[a-z][^)]*\)\s*$/i,'').trim();
  if(/^\d{4}-\d{1,2}-\d{1,2}$/.test(number))return false;
  const digits=number.replace(/\D/g,'');
  return /^\+?[0-9 ()-]+$/.test(number)&&digits.length>=7&&digits.length<=15;
 });
}
const usableEmail=(value:string)=>value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function memberPresentation(roster:Roster,config:Presentation|null):Roster {
 if(!config)return roster; // Approved metadata is installed separately; no accidental launch filter.
 const priority=new Set(config.topProspectIds);
 const namedContact=(name:string)=>Boolean(name.trim())&&!/^(?:not (?:verified|available)|unknown|n\/?a|none|-)$/i.test(name.trim());
 return {...roster,prospects:roster.prospects.filter(p=>priority.has(p.id)||(namedContact(p.contactName)&&usableEmail(p.email)&&usablePhone(p.directPhone)))};
}
