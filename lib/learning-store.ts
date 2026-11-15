import {openDB} from "idb";
import {createPersonalLearner,loadPersonalLearner,savePersonalLearner} from "./personal-learning";
import {localDate,shiftDate} from "./forecast-time";
import type {RiskInput,RiskSymptom} from "./symptom-risk";
import type {CandidatePhysiologyDay} from "./combined-forecast-candidate";
import type {WearableImportOptions} from "./wearable-csv-import";
import type {ForecastPersona} from "./forecast-demo";
import type {LearningBundle,LearningTask} from "./learning-types";
import type {WearableRecord} from "./wearables";
import {runLearningTask} from "./learning-client";
import {confirmedJournalDays} from "./learning-journal";

const database=()=>openDB("elya-personal-learning-ui",1,{upgrade(db){db.createObjectStore("values");}});
export const learnerStorage={async getItem(key:string){return (await (await database()).get("values",key))??null;},async setItem(key:string,value:string){await (await database()).put("values",value,key);},async removeItem(key:string){await (await database()).delete("values",key);}};
export const REAL_PROFILE="personal-default";
let queue:Promise<unknown>=Promise.resolve();
export function serializeLearning<T>(action:()=>Promise<T>):Promise<T>{
 const run=()=>typeof navigator!=="undefined"&&navigator.locks?navigator.locks.request("elya-learning-state",action):action();
 const result=queue.then(run,run);queue=result.catch(()=>{});return result;
}
type Executor=(task:LearningTask)=>Promise<LearningBundle>;
const bundleKey=(id:string)=>"bundle:"+id;
async function persist(bundle:LearningBundle){const d=await database();const tx=d.transaction("values","readwrite");const port={getItem:async(key:string)=>(await tx.store.get(key))??null,setItem:async(key:string,value:string)=>{await tx.store.put(value,key);},removeItem:async(key:string)=>{await tx.store.delete(key);}};await savePersonalLearner(port,bundle.result.state);await tx.store.put(JSON.stringify(bundle),bundleKey(bundle.result.state.profileId));await tx.done;return bundle;}
export function currentPersonalOutlook(days:RiskInput["days"],timeZone:string,executor:Executor=runLearningTask,options?:{asOf?:string;entries?:import("./model").Entry[];withdraw?:{date:string;symptoms:RiskSymptom[]}}){return serializeLearning(async()=>{
 const state=await loadPersonalLearner(learnerStorage,REAL_PROFILE)??createPersonalLearner(REAL_PROFILE,"real",timeZone);
 const asOf=options?.asOf??new Date().toISOString();const targetDate=shiftDate(localDate(asOf,state.timeZone),1);
 const physiology=JSON.parse(await learnerStorage.getItem("readings:"+REAL_PROFILE)??"[]") as CandidatePhysiologyDay[];
 const receipts=JSON.parse(await learnerStorage.getItem("journal-receipts:"+REAL_PROFILE)??"{}");
 const normalized=confirmedJournalDays(options?.entries??[],days,asOf,receipts);
 await learnerStorage.setItem("journal-receipts:"+REAL_PROFILE,JSON.stringify(normalized.receipts));
 const input:RiskInput={kind:"real",timeZone:state.timeZone,targetDate,asOf,days:normalized.days};
 return persist(await executor({op:"issue",state,input,physiology,...(options?.withdraw?{withdraw:{...options.withdraw,reportedAt:asOf}}:{})}));
});}
export function loadLearningBundle(id:string){return serializeLearning(async()=>{const state=await loadPersonalLearner(learnerStorage,id);const raw=await learnerStorage.getItem(bundleKey(id));if(!raw||!state)return null;const bundle=JSON.parse(raw) as LearningBundle;if(bundle.result.state.profileId!==id)throw Error("Learning profile mismatch.");return {...bundle,result:{...bundle.result,state}};});}
export function loadFictionalLearning(persona:ForecastPersona,targetDate:string,executor:Executor=runLearningTask){return serializeLearning(async()=>{
 const id="demo-"+persona;const state=await loadPersonalLearner(learnerStorage,id);const cached=await learnerStorage.getItem(bundleKey(id));
 if(state&&cached){const bundle=JSON.parse(cached) as LearningBundle;if(bundle.persona!==persona||state.kind!=="synthetic")throw Error("Fictional profile mismatch.");if(persona!=="maya"||bundle.demoSeedVersion==="maya-prebleeding-2")return {...bundle,result:{...bundle.result,state}};
 // Preserve older fictional edits in the exportable archive before loading the new scenario.
 await learnerStorage.setItem("archived-demo-maya:"+Date.now(),cached);
 }
 return persist(await executor({op:"demo",persona,targetDate}));
});}
export function saveFictionalJournal(persona:ForecastPersona,entry:import("./model").Entry,day:RiskInput["days"][number],executor:Executor=runLearningTask){return serializeLearning(async()=>{
 const id="demo-"+persona;const raw=await learnerStorage.getItem(bundleKey(id));if(!raw)throw Error("Load this fictional profile first.");const old=JSON.parse(raw) as LearningBundle;
 const lastTime=Math.max(...old.result.state.records.map(r=>Date.parse(r.issuedAt)),Date.parse(old.input.asOf));
 // Fictional profiles use their explicitly simulated clock, never wall-clock receipts.
 const reportedAt=new Date(lastTime+1).toISOString();
 const updated={...day,availableAt:reportedAt};const asOf=new Date(Math.max(Date.parse(reportedAt),lastTime+2)).toISOString();
 const input={...old.input,asOf,days:[...old.input.days.filter(d=>d.date!==day.date),updated]};
 const symptoms=Object.entries(day.symptoms).filter(([,v])=>v===null).map(([k])=>k as RiskSymptom);
 const result=await executor({op:"issue",state:old.result.state,input,physiology:old.physiology,withdraw:{date:day.date,symptoms,reportedAt}});
 return persist({...old,...result,entries:[entry,...(old.entries??[]).filter(e=>e.id!==entry.id)]});
});}
export function advanceFictionalLearning(persona:ForecastPersona,executor:Executor=runLearningTask){return serializeLearning(async()=>{const raw=await learnerStorage.getItem(bundleKey("demo-"+persona));if(!raw)throw Error("Load a demo first.");return persist(await executor({op:"advance",bundle:JSON.parse(raw)}));});}
export function importLearningCSV(csv:string,options:WearableImportOptions,days:RiskInput["days"],executor:Executor=runLearningTask){return serializeLearning(async()=>{
 if(options.kind!=="real"||options.source==="synthetic")throw Error("Personal imports must be real observations, separate from demo profiles.");
 const state=await loadPersonalLearner(learnerStorage,REAL_PROFILE)??createPersonalLearner(REAL_PROFILE,"real",options.timeZone);
 const input:RiskInput={kind:"real",timeZone:state.timeZone,asOf:options.importedAt,targetDate:shiftDate(localDate(options.importedAt,state.timeZone),1),days};
 const bundle=await executor({op:"csv",state,input,csv,options:{...options,timeZone:state.timeZone}});
 const previous=JSON.parse(await learnerStorage.getItem("readings:"+REAL_PROFILE)??"[]") as CandidatePhysiologyDay[];
 bundle.physiology=bundle.physiology.map(row=>{const old=previous.find(p=>p.date===row.date&&p.source===row.source);if(!old)return row;const {availableAt:_,...oldValues}=old,{availableAt:__,...newValues}=row;return JSON.stringify(oldValues)===JSON.stringify(newValues)?{...row,availableAt:old.availableAt}:row;});
 await learnerStorage.setItem("readings:"+REAL_PROFILE,JSON.stringify(bundle.physiology));return persist(bundle);
});}
export function rememberLegacyWearables(record:WearableRecord,asOf=new Date().toISOString()){return serializeLearning(async()=>{
 if(/synthetic|fictional|demo|public|research|pmdata/i.test(record.source))return;
 const previous=JSON.parse(await learnerStorage.getItem("readings:"+REAL_PROFILE)??"[]") as CandidatePhysiologyDay[];
 const source=(/oura/i.test(record.source)?"oura":/fitbit/i.test(record.source)?"fitbit":/apple/i.test(record.source)?"apple-health":/garmin/i.test(record.source)?"garmin":"manual") as CandidatePhysiologyDay["source"];
 const rows:CandidatePhysiologyDay[]=record.days.map(day=>{const same=previous.find(p=>p.date===day.date&&p.source===source&&p.sleepHours===day.sleepHours&&p.steps===day.steps);return same??{...day,source,kind:"real",availableAt:asOf,nightHeartRateBpm:null,hrvRmssdMs:null,temperatureDeviationC:null,respiratoryRateBpm:null};});
 if(record.days.length)await learnerStorage.setItem("readings:"+REAL_PROFILE,JSON.stringify(rows));
});}
export function clearLearningData(profileId?:string){return serializeLearning(async()=>{const d=await database();if(!profileId){await d.clear("values");return;}await Promise.all([learnerStorage.removeItem("elya-personal-learning-v1:"+profileId),learnerStorage.removeItem(bundleKey(profileId)),learnerStorage.removeItem("readings:"+profileId),learnerStorage.removeItem("journal-receipts:"+profileId)]);});}
export function exportLearningData(){return serializeLearning(async()=>{const d=await database();const keys=await d.getAllKeys("values");const values=await d.getAll("values");return Object.fromEntries(keys.map((k,i)=>[String(k),JSON.parse(values[i])]));});}
