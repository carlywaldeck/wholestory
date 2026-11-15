import type {Entry} from './model';
import {monthlySections,type BriefStatement} from './monthly-brief';
export function appointmentOverview(entries:Entry[],month:string){
 const chosen=entries.filter(e=>e.date.startsWith(month+'-'));
 const days=new Set(chosen.map(e=>e.date)).size;
 const symptoms=monthlySections(chosen).find(s=>s.heading==='Reported symptoms')?.statements??[];
 return `${days} ${days===1?'day was':'days were'} logged. `+(symptoms.length?symptoms.map(s=>s.text.replace(/\.$/,'')).join('; ')+'.':'No confirmed symptom details are available.')+' Days without an entry are unknown.';
}
/** Extractive AI summaries must match the confirmed source statements exactly. */
export function verifiedHighlights(entries:Entry[],month:string,items:BriefStatement[]=[]){
 const claims=monthlySections(entries.filter(e=>e.date.startsWith(month+'-'))).flatMap(s=>s.statements);
 if(items.length>4||items.some(s=>!claims.some(c=>c.text===s.text&&JSON.stringify(c.sourceIds)===JSON.stringify(s.sourceIds))))throw Error('The AI overview no longer matches these entries.');
 return items;
}
