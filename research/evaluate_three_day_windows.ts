// Pooled metrics only; restricted normalized inputs stay local.
import {readFileSync,writeFileSync} from "node:fs";
import {threeDayForecastCandidate} from "../lib/three-day-forecast-candidate";
import type {RiskInput} from "../lib/symptom-risk";
type E=NonNullable<ReturnType<typeof threeDayForecastCandidate>["symptoms"][number]["evaluation"]>;
type M=E["history"]["all"];
const source=JSON.parse(readFileSync(process.argv[2],"utf8")) as {archiveSha256:string;participants:number;people:{task:string;input:RiskInput}[]};
const grouped=new Map<string,E[]>();
for(const person of source.people)for(const row of threeDayForecastCandidate(person.input).symptoms){
  if(!row.evaluation)continue;
  if(row.evaluation.lastTrainingWindowEnd>=row.evaluation.firstTestTarget)throw Error("Overlapping train/test target windows");
  const key=`${person.task}:${row.symptom}`,values=grouped.get(key)??[];
  values.push(row.evaluation);grouped.set(key,values);
}
function pool(rows:M[]){
  const sum=(k:"n"|"events"|"hits"|"falseAlerts")=>rows.reduce((s,r)=>s+r[k],0);
  const n=sum("n"),events=sum("events"),hits=sum("hits"),falseAlerts=sum("falseAlerts");
  return {n,events,hits,falseAlerts,missed:events-hits,recall:events?hits/events:null,
    precision:hits+falseAlerts?hits/(hits+falseAlerts):null,
    brier:n?rows.reduce((s,r)=>s+(r.brier??0)*r.n,0)/n:null,
    falseAlertsPer30EvaluatedWindows:n?30*falseAlerts/n:null};
}
function uncertainty(rows:E[]){
  let seed=14112026;const delta:number[]=[];
  for(let i=0;i<2000;i++){
    const sample=rows.map(()=>{seed=(seed*1664525+1013904223)>>>0;return rows[Math.floor(seed/2**32*rows.length)];});
    delta.push(pool(sample.map(r=>r.history.all)).brier!-pool(sample.map(r=>r.transition.all)).brier!);
  }
  delta.sort((a,b)=>a-b);
  const q=(p:number)=>{const i=(delta.length-1)*p,l=Math.floor(i);return delta[l]+(delta[Math.ceil(i)]-delta[l])*(i-l);};
  return {unit:"participant",replicates:2000,seed:14112026,brierDeltaHistoryMinusTransition95:[q(.025),q(.975)],
    limitation:"Exploratory unadjusted resampling on an already inspected cohort, not independent confirmation."};
}
const outcomes=[...grouped].map(([key,rows])=>{
  const ready=rows.filter(r=>r.policyComparison!==null&&r.policyComparison.selected.n>0);
  return {task:key.split(":")[0],symptom:key.split(":")[1],participants:rows.length,
    excludedParticipants:source.participants-rows.length,
    models:rows.length<5?null:Object.fromEntries(["history","transition","prevalence","persistence"].map(model=>[model,Object.fromEntries(
      ["all","newOnset","continuation"].map(group=>[group,pool(rows.map(r=>r[model as "history"][group as "all"]))]))])),
    uncertainty:rows.length<5?null:uncertainty(rows),
    warningPolicy:{supportedParticipants:ready.length,
      coveredWindows:ready.reduce((s,r)=>s+r.policyComparison!.selected.n,0),
      eligibleWindows:rows.reduce((s,r)=>s+r.history.newOnset.n,0),
      pairedMetrics:ready.length<5?null:{selected:pool(ready.map(r=>r.policyComparison!.selected)),fixed:pool(ready.map(r=>r.policyComparison!.fixed))}},
  };
});
const report={source:"KI EndoLIST v1.0.0",sourceArchiveSha256:source.archiveSha256,participants:source.participants,
  horizonDays:3,clinicalValidation:false,activeInPublicApp:false,
  protocol:"Three-day any-positive windows; negative only when all three daily labels explicitly false. Immature windows excluded. History-only fixed logistic settings. Outer first 70% origins train, final 30% test. Purge training windows ending on/after first test day or arriving later. Score only fixed study-anchor dates every three calendar days. Earlier prequential validation starts after 45 days, updates fits every 21 calendar days using only matured labels and >=30 examples/5 per class; validation origins nonoverlapping and prior-label absent. Unchanged threshold grid and empirical alert budget from prior policy experiment. No test tuning.",
  limitations:["Positive test windows are not counts of distinct episodes and cannot be compared directly to next-day onset counts.",
    "newOnset means a positive three-day window after prior explicit absence (or prior below-threshold for higher burden); exact onset date is not predicted.",
    "Positive mature windows may have other days missing; negative windows require complete absence, which selects the evaluated population.",
    "Training windows overlap; validation and test scoring windows do not. Earlier validation/test label windows are separated by maturity checks.",
    "Per 30 evaluated windows is not per month. Separate symptoms may produce overlapping notifications; no app-level notification policy tested.",
    "Unchanged individualized instruments, receipt-time assumptions and selected diagnosed cohort; no prospective or independent confirmation.",
    "No wearable inputs or incremental cycle benefit evaluated. Restricted data and patient-level outputs are not exported."],outcomes};
writeFileSync(process.argv[3],JSON.stringify(report,null,2)+"\n");
for(const o of outcomes)if(o.task==="presence")console.log(JSON.stringify(o));
