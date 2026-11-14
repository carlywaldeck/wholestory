// Pooled model and person/time-separated scoring. Aggregate output only.
import {readFileSync,writeFileSync} from "node:fs";
import {candidateMetrics} from "../lib/combined-forecast-candidate";
import {fitSharedWearableModels,groupedTemporalFolds,sharedWearableFeatures,type SharedResearchRow} from "../lib/shared-wearable-research";
const source=JSON.parse(readFileSync(process.argv[2],"utf8")) as {sourceCsvSha256:string;features:string[];participantsInSource:number;people:{rows:SharedResearchRow[]}[]};
const protocol=groupedTemporalFolds(source.people);
const modelNames=["history","wearable","combined","prevalence","transition","persistence"] as const;
type ModelName=typeof modelNames[number];
type MetricSet=ReturnType<typeof candidateMetrics>;
type PerPerson={all:Record<ModelName,MetricSet>;complete:Record<ModelName,MetricSet>|null};
const people:PerPerson[]=[];const foldCounts=[];let shortTests=0,unsupportedFolds=0;
for(const fold of protocol.folds){
  const trainingIds=new Set(fold.training.map(r=>r.personIndex));
  if(fold.testing.some(p=>trainingIds.has(p.personIndex)))throw Error("Train/test participant overlap");
  const fit=fitSharedWearableModels(fold.training.map(r=>r.row));
  if(!fit){unsupportedFolds++;continue;}
  let testDays=0,testPeople=0;
  for(const person of fold.testing){
    if(person.rows.length<5){shortTests++;continue;}
    const predicted=person.rows.map(row=>({...row,predictions:fit.predict(row)}));
    const metrics=(rows:typeof predicted)=>Object.fromEntries(modelNames.map(model=>[model,
      candidateMetrics(rows.map(r=>({...r,p:r.predictions[model]})))])) as Record<ModelName,MetricSet>;
    const complete=predicted.filter(r=>sharedWearableFeatures.wearable.every(col=>r.x[col]!==null));
    people.push({all:metrics(predicted),complete:complete.length>=5?metrics(complete):null});
    testPeople++;testDays+=predicted.length;
  }
  foldCounts.push({fold:fold.fold,trainingPeople:trainingIds.size,trainingDays:fold.training.length,testPeople,testDays});
}
type Metric=MetricSet["all"];
function pool(rows:Metric[]){
  const sum=(k:"n"|"events"|"hits"|"falseAlerts")=>rows.reduce((s,r)=>s+r[k],0);
  const n=sum("n"),events=sum("events"),hits=sum("hits"),falseAlerts=sum("falseAlerts");
  return {n,events,hits,falseAlerts,missed:events-hits,recall:events?hits/events:null,
    precision:hits+falseAlerts?hits/(hits+falseAlerts):null,brier:n?rows.reduce((s,r)=>s+(r.brier??0)*r.n,0)/n:null};
}
function summarize(complete=false){
  const data=people.flatMap(r=>{const metrics=complete?r.complete:r.all;return metrics?[metrics]:[];});
  if(data.length<5)return {participants:data.length,models:null,uncertainty:null};
  let seed=14112026;const deltas:number[]=[];
  for(let i=0;i<2000;i++){
    const sample=data.map(()=>{seed=(seed*1664525+1013904223)>>>0;return data[Math.floor(seed/2**32*data.length)];});
    deltas.push(pool(sample.map(r=>r.combined.all)).brier!-pool(sample.map(r=>r.history.all)).brier!);
  }
  deltas.sort((a,b)=>a-b);const q=(p:number)=>{const i=(deltas.length-1)*p,l=Math.floor(i);return deltas[l]+(deltas[Math.ceil(i)]-deltas[l])*(i-l);};
  return {participants:data.length,models:Object.fromEntries(modelNames.map(model=>[model,Object.fromEntries(
    ["all","newOnset","continuation"].map(group=>[group,pool(data.map(r=>r[model][group as "all"]))]))])),
    uncertainty:{unit:"participant",replicates:2000,seed:14112026,brierDeltaCombinedMinusHistory95:[q(.025),q(.975)],
      limitation:"Exploratory interval; fixed fitted folds, overlapping training sets, already examined source cohort; no independent confirmation."}};
}
const report={source:"LifeSnaps official v4",sourceCsvSha256:source.sourceCsvSha256,clinicalValidation:false,endometriosisValidated:false,activeInPublicApp:false,
  sourceParticipants:source.participantsInSource,pairedParticipants:source.people.length,cutoffDate:protocol.cutoffDate,foldCounts,shortTests,unsupportedFolds,
  features:{history:sharedWearableFeatures.history.map(i=>source.features[i]),wearable:sharedWearableFeatures.wearable.map(i=>source.features[i])},
  protocol:"Five participant groups fixed by input order modulo five. For each held-out group, fit only other people's rows before the global 70% unique-date cutoff; score the held-out people's later rows. Minimum 200 training labels/20 per class; >=5 later dates per test person. Fixed 250-step L2 logistic solver, penalty 0.05, training-only standardization, 0.5 alert threshold; no tuning. Sensor feature set fixed before this experiment: sleep level plus five personal prior-median changes. No participant ID predictor or supervised fitting to test people.",
  primary:summarize(),completePersonalBaselineSensitivity:summarize(true),
  limitations:["Held-out people may contribute their own earlier diary and physiological history as available forecast inputs/baselines, but no labels from them fit the shared model. This is not a zero-history cold-start test.",
    "TIRED is daily EMA selection, not clinical fatigue. No cycle dates or endometriosis symptom targets.",
    "Unknown response days are excluded; prior-day feature availability is assumed by next midnight, not demonstrated by receipt timestamps.",
    "Already inspected cohort and changed test population/horizon relative to earlier personal fits. Cannot compare absolute scores as a controlled shared-versus-personal improvement claim.",
    "Temporal cutoff may select collection periods/populations. Deterministic groups need not be representative random samples; day-weighted fits/metrics can favor prolific reporters.",
    "Complete-sensor analysis is a selected subgroup; missing-feature indicators may reflect observation behavior rather than physiology.",
    "No raw records, individual predictions or model coefficients exported; model not activated in the live app."],};
writeFileSync(process.argv[3],JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({foldCounts,primary:report.primary,sensitivity:report.completePersonalBaselineSensitivity},null,2));
