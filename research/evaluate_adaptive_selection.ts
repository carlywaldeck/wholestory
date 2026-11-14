// Local restricted-data experiment: export aggregate metrics only.
import { readFileSync, writeFileSync } from "node:fs";
import { combinedSymptomCandidate } from "../lib/combined-forecast-candidate";
import type { RiskInput } from "../lib/symptom-risk";
type E = NonNullable<ReturnType<typeof combinedSymptomCandidate>["symptoms"][number]["evaluation"]>;
type M = E["journalAndCycle"]["all"];
const source = JSON.parse(readFileSync(process.argv[2], "utf8")) as {archiveSha256:string; participants:number; people:{task:string;input:RiskInput}[]};
const grouped = new Map<string, E[]>();
for (const person of source.people) for (const row of combinedSymptomCandidate(person.input, []).symptoms) {
  if (!row.evaluation) continue;
  const key = `${person.task}:${row.symptom}`, rows = grouped.get(key) ?? [];
  rows.push(row.evaluation); grouped.set(key, rows);
}
function pool(rows:M[]) {
  const sum = (k:"n"|"events"|"hits"|"falseAlerts") => rows.reduce((s,r)=>s+r[k],0);
  const n=sum("n"),events=sum("events"),hits=sum("hits"),falseAlerts=sum("falseAlerts");
  return {n,events,hits,falseAlerts,missed:events-hits,recall:events?hits/events:null,
    precision:hits+falseAlerts?hits/(hits+falseAlerts):null,
    brier:n?rows.reduce((s,r)=>s+(r.brier??0)*r.n,0)/n:null};
}
function interval(rows:E[]) {
  let seed=14112026;
  const deltas:number[]=[];
  for(let i=0;i<2000;i++) {
    const sample=rows.map(()=>{seed=(seed*1664525+1013904223)>>>0;return rows[Math.floor(seed/2**32*rows.length)];});
    deltas.push(pool(sample.map(r=>r.adaptiveSelection.metrics.all)).brier!-pool(sample.map(r=>r.cycleAblation.journalOnly.all)).brier!);
  }
  deltas.sort((a,b)=>a-b);
  const q=(p:number)=>{const i=(deltas.length-1)*p,l=Math.floor(i);return deltas[l]+(deltas[Math.ceil(i)]-deltas[l])*(i-l);};
  return {unit:"participant",replicates:2000,seed:14112026,brierDeltaAdaptiveMinusHistory95:[q(.025),q(.975)],
    limitation:"Exploratory unadjusted interval on an already examined cohort; not independent confirmation."};
}
const outcomes=[...grouped].map(([key,rows])=>({
  task:key.split(":")[0],symptom:key.split(":")[1],participants:rows.length,
  selectedCycle:rows.filter(r=>r.adaptiveSelection.selection.selected==="cycle").length,
  cycleUsedTestDays:rows.reduce((s,r)=>s+r.adaptiveSelection.cycleUsedTestDays,0),
  reasons:Object.fromEntries([...new Set(rows.map(r=>r.adaptiveSelection.selection.reason))].map(reason=>[reason,rows.filter(r=>r.adaptiveSelection.selection.reason===reason).length])),
  models:rows.length<5?null:Object.fromEntries(["history","cycle","adaptive"].map(model=>[model,Object.fromEntries(
    ["all","newOnset","continuation"].map(group=>[group,pool(rows.map(r=>
      (model==="history"?r.cycleAblation.journalOnly:model==="cycle"?r.journalAndCycle:r.adaptiveSelection.metrics)[group as "all"]))]))])),
  uncertainty:rows.length>=5?interval(rows):null,
}));
const report={source:"KI EndoLIST v1.0.0",sourceArchiveSha256:source.archiveSha256,participants:source.participants,
  clinicalValidation:false,activeInPublicApp:false,
  protocol:"Outer first 70% training / last 30% test unchanged. Within outer training, earliest 70% fit and latest 30% validate. Inner fit requires >=30 labels and >=5 per class; validation >=14 labels. Cycle requires >=14 inner training and >=7 validation cycle-feature dates. Choose cycle only for validation Brier improvement >=0.005; otherwise history. Refit chosen feature set on full outer training; use history if test cycle context unavailable. Fixed 0.5 alert threshold. All rules fixed before this run; engineering thresholds, not clinical adequacy criteria.",
  limitations:["Already inspected cohort; this selector experiment is exploratory, not independent validation.",
    "Zero-width delta intervals when no model choices change reflect identical predictions, not proven clinical equivalence or certainty.",
    "Selection optimizes probability error, not new-onset sensitivity or a clinically chosen false-alert budget.",
    "Same small selected cohorts, individualized instruments, missing-label rules and assumed retrospective receipt times as prior experiments.",
    "No wearable measurements or benefit tested. Patient-level records, predictions, choices and model weights are not exported."],outcomes};
writeFileSync(process.argv[3],JSON.stringify(report,null,2)+"\n");
for(const o of outcomes) if(o.task==="presence"&&o.models) console.log(JSON.stringify(o));
