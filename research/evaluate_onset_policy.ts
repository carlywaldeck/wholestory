// Pooled retrospective research; no restricted participant records or policies exported.
import {readFileSync,writeFileSync} from "node:fs";
import {combinedSymptomCandidate,onsetPolicyProtocol} from "../lib/combined-forecast-candidate";
import type {RiskInput} from "../lib/symptom-risk";
type E=NonNullable<ReturnType<typeof combinedSymptomCandidate>["symptoms"][number]["evaluation"]>;
type M=E["journalAndCycle"]["all"];
const source=JSON.parse(readFileSync(process.argv[2],"utf8")) as {archiveSha256:string;participants:number;people:{task:string;input:RiskInput}[]};
const grouped=new Map<string,E[]>();
for(const person of source.people)for(const row of combinedSymptomCandidate(person.input,[]).symptoms){
  if(!row.evaluation)continue;
  const key=`${person.task}:${row.symptom}`,values=grouped.get(key)??[];
  values.push(row.evaluation);grouped.set(key,values);
}
function pool(rows:M[]){
  const sum=(k:"n"|"events"|"hits"|"falseAlerts")=>rows.reduce((s,r)=>s+r[k],0);
  const n=sum("n"),events=sum("events"),hits=sum("hits"),falseAlerts=sum("falseAlerts");
  return {n,events,hits,falseAlerts,missed:events-hits,recall:events?hits/events:null,
    precision:hits+falseAlerts?hits/(hits+falseAlerts):null,falseAlertsPer30EvaluatedOpportunities:n?30*falseAlerts/n:null};
}
const outcomes=[...grouped].map(([key,rows])=>{
  const ready=rows.filter(r=>r.onsetWarningPolicy.evaluated!==null&&r.onsetWarningPolicy.evaluated.selectedThreshold.n>0);
  return {task:key.split(":")[0],symptom:key.split(":")[1],eligibleParticipants:rows.length,
    policySupportedParticipants:ready.length,
    allEligibleOnsetOpportunities:rows.reduce((s,r)=>s+r.adaptiveSelection.metrics.newOnset.n,0),
    coveredOnsetOpportunities:ready.reduce((s,r)=>s+r.onsetWarningPolicy.evaluated!.selectedThreshold.n,0),
    status:ready.length>=5?"exploratory-only":"insufficient-participants-metrics-withheld",
    reasons:Object.fromEntries([...new Set(rows.map(r=>r.onsetWarningPolicy.policy.reason))].map(reason=>[reason,rows.filter(r=>r.onsetWarningPolicy.policy.reason===reason).length])),
    pairedMetrics:ready.length<5?null:{
      validationSelectedThreshold:pool(ready.map(r=>r.onsetWarningPolicy.evaluated!.selectedThreshold)),
      fixedHalfThreshold:pool(ready.map(r=>r.onsetWarningPolicy.evaluated!.fixedThreshold)),
    },
    fixedHalfThresholdAllSupportedParticipants:rows.length<5?null:pool(rows.map(r=>r.adaptiveSelection.metrics.newOnset)),
  };
});
const report={source:"KI EndoLIST v1.0.0",sourceArchiveSha256:source.archiveSha256,participants:source.participants,
  clinicalValidation:false,activeInPublicApp:false,protocol:onsetPolicyProtocol,
  method:"Optimize new-onset validation recall subject to empirical precision >=0.5 and <=3 false alerts per 30 evaluated onset opportunities. All settings fixed before this run. Inner 70/30 split within outer first-70% training; final 30% evaluation unchanged. Feature selection and threshold use earlier data only; chosen model refit on outer training. Thresholds below 0.5 are research policies, not calibrated risk categories.",
  limitations:["Budget applies to earlier validation observations only and is not guaranteed on later data.",
    "Per 30 evaluated onset opportunities is not per calendar month. Different symptom alerts may overlap; no app-level combined notification budget tested.",
    "No policy is issued if support/budget requirements fail. Withheld opportunities are not counted as successful negative predictions.",
    "Do not compare paired-subset metrics directly to all-participant metrics; covered participants differ.",
    "Selected policy and model refit can change score distributions. Small validation samples can overfit the threshold grid.",
    "Already inspected cohort, exploratory unadjusted comparisons; no independent confirmation, prospective receipt timing or clinical calibration.",
    "No wearable data. Individual records, predictions, thresholds and model coefficients are not exported."],outcomes};
writeFileSync(process.argv[3],JSON.stringify(report,null,2)+"\n");
for(const o of outcomes)if(o.task==="presence")console.log(JSON.stringify(o));
