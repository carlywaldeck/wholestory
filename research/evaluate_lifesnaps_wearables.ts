// Same late dates for all models; publish only pooled metrics.
import {readFileSync,writeFileSync} from "node:fs";
import {candidateMetrics,fitPersonalLogistic,type LearningRow} from "../lib/combined-forecast-candidate";
type Row=LearningRow&{featureDate:string;coreSensorsComplete:boolean};
const source=JSON.parse(readFileSync(process.argv[2],"utf8")) as {sourceCsvSha256:string;features:string[];participantsInSource:number;pairedExamples:number;participantsWithPairs:number;people:{rows:Row[]}[];quality:Record<string,number>};
const history=[0,1,2,3],wearable=Array.from({length:10},(_,i)=>i+4),all=[...history,...wearable];
type ModelMetrics=Record<string,ReturnType<typeof candidateMetrics>>;
const outcomes:{all:ModelMetrics;complete:ModelMetrics|null}[]=[];
let excludedSupport=0;
for(const person of source.people){
  const split=Math.floor(person.rows.length*.7),train=person.rows.slice(0,split),test=person.rows.slice(split);
  const events=train.reduce((s,r)=>s+r.y,0);
  if(train.length<30||events<5||train.length-events<5||test.length<10){excludedSupport++;continue;}
  if(train.at(-1)!.date>=test[0].date||test.some(r=>r.featureDate>=r.date))throw Error("Nonchronological evaluation");
  const journal=fitPersonalLogistic(train,history),sensors=fitPersonalLogistic(train,wearable),combined=fitPersonalLogistic(train,all);
  const prevalence=(events+1)/(train.length+2);
  const estimates=test.map(r=>({...r,predictions:{history:journal.predict(r.x),wearables:sensors.predict(r.x),combined:combined.predict(r.x),
    historicalRate:prevalence,persistence:Number(r.previous)}}));
  const metrics=(rows:typeof estimates)=>Object.fromEntries(["history","wearables","combined","historicalRate","persistence"].map(model=>
    [model,candidateMetrics(rows.map(r=>({...r,p:r.predictions[model as "history"]})))]));
  const complete=estimates.filter(r=>r.coreSensorsComplete);
  outcomes.push({all:metrics(estimates),complete:complete.length>=10?metrics(complete):null});
}
type Metric=ReturnType<typeof candidateMetrics>["all"];
function pool(rows:Metric[]){
  const sum=(k:"n"|"events"|"hits"|"falseAlerts")=>rows.reduce((s,r)=>s+r[k],0);
  const n=sum("n"),events=sum("events"),hits=sum("hits"),falseAlerts=sum("falseAlerts");
  return {n,events,hits,falseAlerts,missed:events-hits,recall:events?hits/events:null,
    precision:hits+falseAlerts?hits/(hits+falseAlerts):null,brier:n?rows.reduce((s,r)=>s+(r.brier??0)*r.n,0)/n:null};
}
function summarize(rows:typeof outcomes,complete=false){
  const data=rows.flatMap(r=>{const x=complete?r.complete:r.all;return x?[x]:[];});
  if(data.length<5)return {participants:data.length,status:"insufficient-participants",models:null,uncertainty:null};
  let seed=14112026;const deltas:number[]=[];
  for(let i=0;i<2000;i++){
    const sample=data.map(()=>{seed=(seed*1664525+1013904223)>>>0;return data[Math.floor(seed/2**32*data.length)];});
    deltas.push(pool(sample.map(r=>r.combined.all)).brier!-pool(sample.map(r=>r.history.all)).brier!);
  }
  deltas.sort((a,b)=>a-b);const q=(p:number)=>{const i=(deltas.length-1)*p,l=Math.floor(i);return deltas[l]+(deltas[Math.ceil(i)]-deltas[l])*(i-l);};
  return {participants:data.length,status:"exploratory-only",models:Object.fromEntries(["history","wearables","combined","historicalRate","persistence"].map(model=>
    [model,Object.fromEntries(["all","newOnset","continuation"].map(group=>[group,pool(data.map(r=>r[model][group as "all"]))]))])),
    uncertainty:{unit:"participant",replicates:2000,seed:14112026,brierDeltaCombinedMinusHistory95:[q(.025),q(.975)],
      limitation:"Small selected cohorts; unadjusted exploratory interval, not prospective confirmation."}};
}
const report={source:"LifeSnaps official open v4",sourceUrl:"https://zenodo.org/records/7229547",sourceCsvSha256:source.sourceCsvSha256,
  dataKind:"real",endometriosisValidated:false,clinicalValidation:false,activeInPublicApp:false,
  participantsInSource:source.participantsInSource,participantsWithPairs:source.participantsWithPairs,pairedExamples:source.pairedExamples,
  excludedForSupport:excludedSupport,features:source.features,quality:source.quality,
  protocol:"Per-person first 70% paired dates train, final 30% test. >=30 train, >=5 train per class, >=10 test. Fixed L2 logistic solver (250 steps, penalty 0.05), training-only preprocessing, fixed 0.5 alert threshold. Compare journal-only, wearable-only and combined on identical test dates. No tuning on results. Secondary same-model comparison on dates with sleep/resting-HR/HRV present, >=10 complete dates per person.",
  primary:summarize(outcomes),completeCoreSensorSensitivity:summarize(outcomes,true),
  limitations:["TIRED is any daily aggregated EMA tired selection versus nonselection among answered mood surveys, not clinical fatigue or confirmed absence of tiredness throughout the day.",
    "No endometriosis diagnoses, menstrual-cycle starts, pelvic-pain or bowel-symptom targets. Cannot establish endometriosis-specific wearable benefit.",
    "Only preceding calendar-day sensors and journal labels. Assuming those exports were available by the next midnight; actual receipt timestamps are absent. Retrospective, not demonstrated real-time lead time.",
    "Personal missing-feature indicators may encode observation behavior rather than physiology; complete-sensor sensitivity is a selected subgroup.",
    "Fixed personal temporal holdout tests later days of existing users, not generalization to new people. Small selected support cohorts and no prospective calibration or clinical utility evaluation.",
    "Daily sleep uses minutesAsleep/60, not milliseconds of time in bed. Nightly temperature is absolute Celsius; its median change is computed from at least seven earlier readings. Device/source changes cannot be identified in the anonymized export.",
    "No raw participant records, fitted coefficients or personal predictions are included in this report."],};
writeFileSync(process.argv[3],JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({primary:report.primary,sensitivity:report.completeCoreSensorSensitivity,excludedSupport},null,2));
