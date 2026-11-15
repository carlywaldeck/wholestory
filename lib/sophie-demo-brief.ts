import {isPresentFact,type Entry} from './model';
import {monthlySections} from './monthly-brief';
/** Presentation of fictional Sophie reports only; no real-profile calculations. */
export function sophieDemoBrief(entries:Entry[],month:string){
 const days=new Set(entries.map(e=>e.date)).size;
 const sections=monthlySections(entries);
 const symptoms=sections.find(s=>s.heading==='Reported symptoms')?.statements??[];
 const count=(kind:string)=>new Set(entries.filter(e=>e.facts.some(f=>f.kind===kind&&isPresentFact(f)&&e.text.includes(f.quote))).map(e=>e.date)).size;
 const before=(kind:string)=>new Set(entries.filter(e=>e.facts.some(f=>f.kind===kind&&isPresentFact(f)&&e.text.includes(f.quote))&&e.facts.some(f=>f.kind==='Menstrual context'&&/before/i.test(f.value)&&e.text.includes(f.quote))).map(e=>e.date)).size;
 const impacted=new Set(entries.filter(e=>e.facts.some(f=>f.kind==='Daily-life impact'&&isPresentFact(f)&&!/^no change$/i.test(f.value)&&e.text.includes(f.quote))).map(e=>e.date)).size;
 const label=new Date(month+'-01T12:00:00').toLocaleDateString('en-US',{month:'long'});
 const summary=[`In ${label}, pelvic pain was reported on ${count('Pelvic pain')} of ${days} logged days.`,before('Fatigue')>count('Fatigue')/2&&before('Bloating')>count('Bloating')/2?'Fatigue and bloating were mostly recorded before a period.':`Fatigue was reported on ${count('Fatigue')} days and bloating on ${count('Bloating')} days.`,`Daily activities were affected on ${impacted} ${impacted===1?'day':'days'}.`].join(' ');
 return {summary,sections:sections.filter(s=>s.heading!=='Symptoms explicitly reported absent'&&s.heading!=='Explicitly symptom-free days').map(s=>s.heading==='Reported symptoms'?{...s,statements:symptoms.map(item=>({...item,text:`${item.text.split(':')[0]}: ${new Set(entries.filter(e=>item.sourceIds.includes(e.id)).map(e=>e.date)).size} of ${days} logged days`}))}:s),dates:sections};
}
