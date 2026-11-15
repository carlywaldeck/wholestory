"use client";
import type {LearningOutlook} from "../lib/learning-types";
import {checkinSymptoms} from "../lib/experience-checkins";
export function PersonalLearningOutlook({result}:{result:LearningOutlook|null}){
 return <><h2 className="outlook-forecast-title">Tomorrow’s outlook</h2><ul className="personal-learning-cards">{checkinSymptoms.map(({key,label})=>{
  const outlook=result?.outlook.find(s=>s.symptom===key),progress=result?.symptoms.find(s=>s.symptom===key);
  const mark=outlook?.band==="high"?"●":outlook?.band==="medium"?"◐":"○";
  return <li key={key}><div className="learning-card-heading"><h3>{label}</h3><span className={`learning-band ${outlook?.band??"learning"}`}>{mark} {outlook?.label??"Still learning your pattern"}</span></div>
   <p className="learning-pairs">{progress?.trainingPairs??0} paired observations</p>
   {progress&&<details><summary>Learning progress</summary><p>{progress.positivePairs} reported-present pairs · {progress.negativePairs} explicitly absent pairs.</p><p>{progress.matchedWearablePairs} matched wearable pairs. {progress.usedWearables?"Wearables selected by an earlier personal comparison.":"Still learning the wearable relationship. This outlook does not use wearable inputs."}</p><p>Initial support requires at least {progress.minimumHistory.pairs} usable pairs, including {progress.minimumHistory.positive} present and {progress.minimumHistory.negative} absent outcomes, and a known previous-day answer. More observations do not guarantee improvement.</p><p>{progress.prospectivePerformance.all.n} earlier frozen estimates have later reported outcomes. This is personal feedback, not clinical validation.</p><p>Issued {new Date(progress.issuedAt).toLocaleString()}. This issued forecast is preserved.</p></details>}
  </li>;
 })}</ul><p className="outlook-context-note">Experimental symptom occurrence estimates, not severity or a diagnosis. Risk bands are provisional; percentages are withheld. More observations do not guarantee improvement.</p></>;
}
