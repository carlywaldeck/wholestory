/** Demo-only seed replay. Never alter prediction math or existing personal profiles. */
import {readFileSync,writeFileSync} from 'node:fs';
import {issuePersonalOutlook} from '../lib/personal-learning';
import {shiftDate} from '../lib/forecast-time';
import {validateEntry,type Entry,type Fact} from '../lib/model';
const seed=JSON.parse(readFileSync('research/fixtures/maya-demo-persona.json','utf8'));
const input=structuredClone(seed.forecastInput);
// Explicitly fictional short irregular cycle, not a representative clinical pattern.
// The next onset (Nov 15) is scenario context only, never passed to the learner.
input.cycle.periodStarts=input.cycle.periodStarts.filter((s:any)=>s.date!=='2026-10-20');
input.cycle.periodStarts.push({date:'2026-10-31',availableAt:'2026-10-31T12:00:00Z'});
const pain=new Set([1,2,3,12,13]),fatigue=new Set([1,10,11,12,13,14]),bloating=new Set([2,10,11,12,13,14]);
const impacts:Record<number,string>={2:'Missed activities',12:'Slowed me down',13:'Missed activities'};
for(const d of input.days.filter((d:any)=>d.date>='2026-11-01')){
 const n=Number(d.date.slice(-2));Object.assign(d.symptoms,{pelvicPain:pain.has(n),fatigue:fatigue.has(n),bloating:bloating.has(n),bowelSymptoms:false,dailyLifeImpact:n===14?null:!!impacts[n]});
}
let state=structuredClone(seed.learnerState);state.profileId='demo-maya';state.records=state.records.filter((r:any)=>r.targetDate<'2026-10-20').map((r:any)=>({...r,outcomes:r.outcomes.filter((o:any)=>o.reportedAt<='2026-10-19T23:00:00Z')}));
let result:any;
for(let date='2026-10-20';date<='2026-11-15';date=shiftDate(date,1)){
 const replay={...input,targetDate:date,asOf:shiftDate(date,-1)+'T23:00:00Z',days:input.days.filter((d:any)=>d.date<date)};
 result=issuePersonalOutlook(state,replay,seed.physiology);state=result.state;
 console.log('Replayed',date);
}
const entries:Entry[]=input.days.map((day:any)=>{
 const n=Number(day.date.slice(-2)),nov=day.date>='2026-11-01';
 const symptoms=[['pelvicPain','Pelvic pain','Pelvic cramps'],['fatigue','Fatigue','Fatigue'],['bloating','Bloating','Bloating'],['bowelSymptoms','Bowel discomfort','Bowel discomfort']] as const;
 const present=symptoms.filter(([k])=>day.symptoms[k]===true);
 const original=day.date==='2026-11-14'?'Tired and bloated today, before my period started.':present.length?present.map(([, ,name])=>name).join(' and ')+(nov&&n<=3?' around the start of my period.':nov&&n>=10?' before my period.':' today.'):'A quiet day with no symptoms.';
 const impact=nov?(n===14?null:impacts[n]??'No change'):(day.symptoms.dailyLifeImpact?'Slowed me down':'No change');
 const text=[original,impact?`Daily activities: ${impact}.`:''].filter(Boolean).join('\n');
 const facts:Fact[]=symptoms.filter(([k])=>day.symptoms[k]!==null).map(([k,kind])=>({kind,value:day.symptoms[k]?kind:'No',quote:original}));
 if(impact)facts.push({kind:'Daily-life impact',value:impact==='No change'?'No':impact,quote:`Daily activities: ${impact}.`});
 if(nov&&(n<=3||n>=10))facts.push({kind:'Menstrual context',value:n<=3?'Around period start':'Before period',quote:original});
 return validateEntry({id:`forecast-demo-maya-${day.date}`,date:day.date,text,facts,symptomFree:symptoms.every(([k])=>day.symptoms[k]===false),demo:true,persona:'maya',journal:{originalText:original,createdAt:day.availableAt,updatedAt:day.availableAt,bankVersion:'fictional-seed-3',policyVersion:'fictional-seed-3',provenance:facts.map(f=>({quote:f.quote,source:'user-confirmed-extraction' as const})),selection:[]}});
});
const bundle={result,input,physiology:seed.physiology,entries,persona:'maya',label:'Fictional irregular-cycle story',demoSeedVersion:'sophie-irregular-3',disclosure:'Fictional demo history with an intentionally short irregular cycle. Illustrates a workflow, not a typical endometriosis pattern or clinical accuracy.'};
writeFileSync('public/demos/maya-learning-v3.json',JSON.stringify(bundle));
console.log('Nov 14',state.records.filter((r:any)=>r.targetDate==='2026-11-14').map((r:any)=>[r.symptom,r.estimate,r.usedWearables]));
console.log('Nov 15',result.outlook.map((s:any)=>[s.symptom,s.label]));
