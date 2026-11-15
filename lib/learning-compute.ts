/** Worker-side adapter only. Carly's prediction logic is unchanged. */
import {issuePersonalOutlook,recordPersonalOutcome} from "./personal-learning";
import {personalLearningDemo} from "./personal-learning-demo";
import {forecastDemo} from "./forecast-demo";
import {forecastDemoJournal} from "./forecast-demo-journal";
import {shiftDate} from "./forecast-time";
import {previewLearningWearableForecast} from "./local-wearable-forecast";
import {importWearableCSV} from "./wearable-csv-import";
import type {LearningBundle,LearningTask} from "./learning-types";
export function computeLearning(task:LearningTask):LearningBundle{
 if(task.op==="demo"){
  const replay=personalLearningDemo(task.persona,task.targetDate);const source=forecastDemo(task.persona,task.targetDate);
  return {result:replay.latest,input:{...source.input,asOf:replay.latest.state.records.at(-1)!.issuedAt},physiology:source.physiology,entries:forecastDemoJournal(source),persona:task.persona,label:source.label,disclosure:replay.disclosure};
 }
 if(task.op==="advance"){
  const old=task.bundle;if(!old.persona||old.result.state.kind!=="synthetic")throw Error("Only fictional profiles can advance demo time.");
  const targetDate=shiftDate(old.input.targetDate,1),outcomeDate=old.input.targetDate;
  const source=forecastDemo(old.persona,targetDate);
  const outcome={...source.input.days.find(d=>d.date===outcomeDate)!,availableAt:outcomeDate+"T23:30:00Z"};
  const input={...old.input,targetDate,asOf:outcomeDate+"T23:45:00Z",days:[...old.input.days.filter(d=>d.date!==outcomeDate),outcome]};
  const originalEntry=forecastDemoJournal(source).find(e=>e.date===outcomeDate)!;
  // Advance only the newly reported outcomes; do not rewrite the earlier cycle history.
  const reportedFacts=originalEntry.facts.filter(f=>f.kind!=="Cycle start"&&f.kind!=="Cycle day");
  const addedEntry={...originalEntry,text:reportedFacts.map(f=>f.quote).join(" "),facts:reportedFacts};
  const addedReading=source.physiology.find(d=>d.date===outcomeDate)!;
  const physiology=[...old.physiology.filter(d=>d.date!==outcomeDate),addedReading];
  return {...old,result:issuePersonalOutlook(old.result.state,input,physiology),input,physiology,entries:[...(old.entries??[]).filter(e=>e.date!==outcomeDate),addedEntry]};
 }
 if(task.op==="csv"){
  const preview=previewLearningWearableForecast(task.state,task.input,task.csv,task.options,{experimentalPreview:true});
  const imported=importWearableCSV(task.csv,task.options);
  return {result:preview.personal,input:task.input,physiology:imported.candidateDays};
 }
 let state=task.state;
 if(task.withdraw)for(const symptom of task.withdraw.symptoms){
  const record=state.records.find(r=>r.symptom===symptom&&r.targetDate===task.withdraw!.date);
  if(record?.outcomes.at(-1)?.occurred!=null)state=recordPersonalOutcome(state,{targetDate:task.withdraw.date,symptom,occurred:null,reportedAt:task.withdraw.reportedAt});
 }
 return {result:issuePersonalOutlook(state,task.input,task.physiology),input:task.input,physiology:task.physiology};
}
