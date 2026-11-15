import type {LearningOutlook} from './learning-types';
import {checkinSymptoms} from './experience-checkins';
/** Grounded readout of model outputs. Never invents attribution, advice or a diagnosis. */
export function outlookSummary(result:LearningOutlook|null){
 const available=checkinSymptoms.flatMap(({key,label})=>{const o=result?.outlook.find(x=>x.symptom===key);return o?.status==='experimental'?[{label:label==='Pelvic pain / cramps'?'pelvic pain':label.toLowerCase(),band:o.band}]:[];});
 if(!available.length)return 'Your outlook will appear as you record symptoms and symptom-free days. Your journal is useful from day one.';
 const list=(a:string[])=>a.length<2?a[0]:a.length===2?a.join(' and '):a.slice(0,-1).join(', ')+', and '+a.at(-1);
 const high=available.filter(x=>x.band==='high').map(x=>x.label),medium=available.filter(x=>x.band==='medium').map(x=>x.label);
 if(high.length)return `The model estimates higher risk of ${list(high)} tomorrow. These are possibilities, not a certainty.`;
 if(medium.length)return `The model estimates medium risk of ${list(medium)} tomorrow. Other available estimates are lower.`;
 return 'The available symptom estimates are low for tomorrow. Symptoms can still happen; keep recording how you feel.';
}
