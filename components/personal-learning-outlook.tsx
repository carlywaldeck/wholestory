'use client';
import type {LearningOutlook} from '../lib/learning-types';
import {checkinSymptoms} from '../lib/experience-checkins';
import {outlookSummary} from '../lib/outlook-summary';
export function PersonalLearningOutlook({result,sampleDays}:{result:LearningOutlook|null;sampleDays?:number}){
 const supported=result?.symptoms.filter(s=>s.usedWearables).map(s=>checkinSymptoms.find(c=>c.key===s.symptom)?.label).filter(Boolean)??[];
 return <div className="outlook-reading">
  <p className="outlook-narrative">{outlookSummary(result)}</p>
  
  <ul className="symptom-risk-list">{checkinSymptoms.map(({key,label})=>{const o=result?.outlook.find(s=>s.symptom===key);return <li key={key}><span>{label}</span><span className={`risk-pill ${o?.band??'learning'}`}>{o?.label??'Still learning your pattern'}</span></li>;})}</ul>
  <section className="wearable-learning-note" aria-labelledby="wearable-learning-heading">
   <h2 id="wearable-learning-heading">{sampleDays!==undefined?"Sophie’s wearable · Sample data loaded":"Your wearable connection"}</h2>
   <p>{supported.length?`Wearable patterns contribute to your ${supported.map(s=>String(s).toLowerCase()).join(" and ")} outlook. Other symptoms use history and cycle context, or are still learning.`:'We compare wearable patterns with your symptom history when enough paired observations are available. Your current outlook does not yet use wearable patterns.'}</p>
   <p className="wearable-learning-next">Check in tomorrow to help evaluate today’s forecast.</p>
  </section>
  <p className="outlook-caption">Experimental · Symptom likelihood, not severity or diagnosis.</p>
  <details className="outlook-method"><summary>How this was estimated</summary>
   <p>{supported.length?`Wearable readings were selected for ${supported.join(', ')} after comparison with symptom history and cycle context.`:'Available estimates use symptom history and supported cycle context. Wearables have not yet demonstrated enough added value for these estimates.'}</p>
   {checkinSymptoms.map(({key,label})=>{const progress=result?.symptoms.find(s=>s.symptom===key);return <p key={key}><strong>{label}:</strong> {progress?.trainingPairs??0} paired observations{progress?` · ${progress.positivePairs} present and ${progress.negativePairs} absent. ${progress.matchedWearablePairs} matched wearable pairs. ${progress.usedWearables?'Wearables included.':'Wearables not selected.'}`:'.'}</p>;})}
   <p>Missing answers stay unknown. Risk bands are provisional and percentages are withheld. More observations do not guarantee improvement. Issued forecasts are preserved so later reports can be compared fairly.</p>
  </details>
 </div>;
}
