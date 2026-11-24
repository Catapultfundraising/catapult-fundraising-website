import 'server-only';
import type { Roster } from './schema';
// Source/provenance only: never transform organization, contact identity, email,
// actual direct numbers, answers or member records. No replacement citations.
export function sourceURL(value:string):string {
 if(!value)return value;try{const host=new URL(value).hostname.toLowerCase();return host==='apollo.io'||host.endsWith('.apollo.io')?'':value;}catch{return value;}
}
export function sourceLabel(value:string):string {
 if(!/apollo/i.test(value))return value;
 const links:string[]=[];
 const withoutLinks=value.replace(/https?:\/\/[^\s<>"'\])]+/gi,raw=>{
  const allowed=sourceURL(raw);if(!allowed)return '';const index=links.push(allowed)-1;return `\uE000${index}\uE001`;
 }).replace(/\b(?:[a-z0-9-]+\.)*apollo\.io(?:\/[^\s<>"'\])]+)?/gi,'');
 return withoutLinks
  .replace(/Apollo enrichment not run:\s*no approved suitable candidate selected/gi,'no suitable named contact verified')
  .replace(/no Apollo person match/gi,'no matching contact found')
  .replace(/Apollo organization record/gi,'company record')
  .replace(/Apollo\/provider-reported/gi,'research-provider-reported')
  .replace(/Apollo-reported/gi,'research-reported')
  .replace(/Apollo[- ]verified/gi,'verified')
  .replace(/\(\s*Apollo\s*\)/gi,'')
  .replace(/submitted to Apollo/gi,'submitted for contact verification')
  .replace(/Apollo enrichment/gi,'contact enrichment')
  .replace(/Apollo verification/gi,'Contact verification')
  .replace(/Apollo employer search/gi,'employer search')
  .replace(/verified Apollo or published work emails/gi,'verified or published work emails')
  .replace(/Apollo/gi,'research provider')
  .replace(/\(\s*\)/g,'').replace(/[ \t]{2,}/g,' ').replace(/[ \t]+([.,;:])/g,'$1').trim().replace(/\uE000(\d+)\uE001/g,(_match,index)=>links[Number(index)]);
}
export function redactSourceLabels(roster:Roster):Roster {
 return {...roster,prospects:roster.prospects.map(p=>({...p,
  emailStatus:sourceLabel(p.emailStatus),phoneStatus:sourceLabel(p.phoneStatus),
  officePhone:sourceLabel(p.officePhone),contactFit:sourceLabel(p.contactFit),contactSource:sourceLabel(p.contactSource),
  portals:p.portals.map(q=>({...q,url:sourceURL(q.url),deadline:sourceLabel(q.deadline),status:sourceLabel(q.status),eligibility:sourceLabel(q.eligibility),source:sourceLabel(q.source)}))
 }))};
}
