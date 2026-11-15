import type {Entry} from "./model";
import {isPresentFact} from "./model";
import {riskSymptoms,type RiskInput,type RiskSymptom} from "./symptom-risk";
/** Structured confirmed fields only. Free text omissions never become absence. */
export function confirmedJournalDays(entries:Entry[],saved:RiskInput["days"],asOf:string,receipts:Record<string,{signature:string;availableAt:string}>){
 const mapping:Record<RiskSymptom,string[]>={pelvicPain:["Pelvic pain"],fatigue:["Fatigue"],bloating:["Bloating"],headache:["Pain"],bowelSymptoms:["Bowel discomfort","Gastrointestinal symptoms"],urinarySymptoms:["Urinary symptoms"],nausea:[],dailyLifeImpact:["Daily-life impact"]};
 const byDate=new Map(saved.map(d=>[d.date,d]));const next={...receipts};
 for(const date of new Set(entries.filter(e=>!e.demo).map(e=>e.date))){
  const records=entries.filter(e=>!e.demo&&e.date===date);const facts=records.flatMap(e=>e.facts.filter(f=>e.text.includes(f.quote)));
  const symptoms=Object.fromEntries(riskSymptoms.map(key=>{
   const relevant=facts.filter(f=>mapping[key].includes(f.kind)&&(key!=="headache"||/headache/i.test(f.value+" "+f.quote)));
   const answer=relevant.some(isPresentFact)?true:records.some(e=>e.symptomFree)||relevant.some(f=>/^(no|none|absent|not present|false|0)\b/i.test(f.value))?false:null;
   return [key,answer];
  }));
  const signature=JSON.stringify(symptoms),old=byDate.get(date),previous=receipts[date];
  const sameSaved=old&&JSON.stringify(old.symptoms)===signature;
  const availableAt=previous?.signature===signature?previous.availableAt:sameSaved?old.availableAt:asOf;
  next[date]={signature,availableAt};
  byDate.set(date,{date,availableAt,symptoms} as RiskInput["days"][number]);
 }
 return {days:[...byDate.values()],receipts:next};
}
