import {writeFileSync} from 'node:fs';
import {forecastDemo} from '../lib/forecast-demo';
import {createPersonalLearner,issuePersonalOutlook} from '../lib/personal-learning';
import {shiftDate,calendarGap} from '../lib/forecast-time';
const d=forecastDemo('maya','2026-11-20');
const target='2026-11-15';
d.input.targetDate=target;d.input.asOf='2026-11-14T23:00:00Z';d.input.timeZone='UTC';
d.input.days=d.input.days.filter(x=>x.date<target);
d.physiology=d.physiology.filter(x=>x.date<target);
const starts=d.input.cycle!.periodStarts.map(x=>x.date);
for(const day of d.input.days){
 const near=starts.some(s=>{const gap=calendarGap(day.date,s);return gap>=-2&&gap<=2});
 day.symptoms.pelvicPain=near;day.symptoms.dailyLifeImpact=near&&day.symptoms.fatigue===true;
}
let state=createPersonalLearner('demo-maya-before-period','synthetic','UTC');
let final:any;const milestones:any[]=[];
for(const date of [...d.input.days.map(x=>x.date),target]){
 final=issuePersonalOutlook(state,{...d.input,targetDate:date,asOf:shiftDate(date,-1)+'T23:00:00Z',days:d.input.days.filter(x=>x.date<date)},d.physiology);
 state=final.state;
 if(milestones.length===0||state.records.length%112===0||date===target)milestones.push({date,outlook:final.outlook,progress:final.symptoms.map((s:any)=>({symptom:s.symptom,pairs:s.trainingPairs,usedWearables:s.usedWearables}))});
}
d.input.cycle!.periodStarts=d.input.cycle!.periodStarts.filter(x=>x.date<target);
const p={schemaVersion:'1',kind:'synthetic',demoOnly:true,disclosure:'Fictional person and engineered data. Demonstrates computation and learning, not medical accuracy.',person:{name:'Maya',age:24,context:'A fictional graduate student with recurring pelvic symptoms. Her pain often starts before bleeding.',scenario:'It is November 14. Maya has class tomorrow. Her next fictional bleeding onset is November 17; the live forecast must not receive that future onset as known history.'},forecastInput:d.input,physiology:d.physiology,learnerState:state,outlook:final.outlook,milestones,limitations:['Synthetic engineering demo, not medical accuracy.','Pelvic-pain outlook is low despite an engineered upcoming pain episode.','Future bleeding onset is scenario context only, not forecast input.'],pricing:{freeToUse:true,monetization:'No paid subscription assumed.'}};
writeFileSync('research/fixtures/maya-demo-persona.json',JSON.stringify(p,null,2)+'\n');
console.log(JSON.stringify(final.outlook.map((x:any)=>({symptom:x.symptom,label:x.label}))));
