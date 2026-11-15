"use client";
import {useId,useRef,useState} from "react";
import {checkinSymptoms} from "../lib/experience-checkins";
import type {LearningOutlook} from "../lib/learning-types";
import {symptomRiskOutlook} from "../lib/symptom-risk-outlook";
import type {ForecastResult} from "./forecast-outlook";
import "./future-symptom-outlook.css";

function SymptomExplanation({label,risk,band,sentences}:{label:string;risk:string;band:string|null;sentences:string[]}){
 const id=useId();const trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[pinned,setPinned]=useState(false);
 return <li className="future-risk-row" onPointerEnter={event=>{if(event.pointerType==="mouse")setOpen(true);}} onPointerLeave={event=>{if(!pinned&&!event.currentTarget.contains(document.activeElement))setOpen(false);}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setOpen(false);setPinned(false);}}} onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();setOpen(false);setPinned(false);trigger.current?.focus();}}}>
  <button ref={trigger} id={id} type="button" className="future-risk-trigger" aria-expanded={open} aria-controls={id+"-explanation"} onClick={()=>{setOpen(!pinned);setPinned(!pinned);}}>
   <span className="future-risk-symptom">{label}</span>{" "}<span className={"future-risk-pill "+(band??"learning")}>{risk}</span><span className="future-risk-chevron" aria-hidden="true">{open?"−":"+"}</span>
  </button>
  <div id={id+"-explanation"} role="region" aria-labelledby={id} className="future-risk-explanation" hidden={!open}>{sentences.map(sentence=><p key={sentence}>{sentence}</p>)}</div>
 </li>;
}

export function FutureSymptomOutlook({date,learning,forecast}:{date:string;learning?:LearningOutlook|null;forecast:ForecastResult|null}){
 const saved=learning?.state.records.filter(row=>row.targetDate===date)??[];
 const hasPersonal=learning?.targetDate===date||saved.length>0;
 const hasLegacy=learning===undefined&&forecast?.targetDate===date;
 if(!hasPersonal&&!hasLegacy)return <p>No symptom outlook available for this date.</p>;
 return <>
  <p className="future-risk-hint">Hover over a symptom or tap it to see what the estimate means.</p>
  <p className="day-estimate-label">Experimental outlook · Symptom likelihood, not severity</p>
  <ul className="future-risk-list">{checkinSymptoms.map(({key,label})=>{
   const snapshot=saved.find(row=>row.symptom===key);
   const progress=learning?.targetDate===date?learning.symptoms.find(row=>row.symptom===key):undefined;
   const legacy=hasLegacy?forecast?.symptoms.find(row=>row.symptom===key):undefined;
   const estimate=hasPersonal?(snapshot?snapshot.estimate:progress?.candidateEstimate??null):legacy?.state==="experimental-estimate"?legacy.probability:null;
   const risk=symptomRiskOutlook([{symptom:key,candidateEstimate:estimate}],date)[0];
   const wearable=hasPersonal&&(snapshot?.usedWearables??progress?.usedWearables??false);
   const pairs=hasPersonal?(snapshot?.trainingPairs??progress?.trainingPairs):legacy?.trainingPairs;
   const sentences=risk.band?[
    `The experimental estimate places ${label.toLowerCase()} in the ${risk.band} risk band for this day.`,
    `It draws on ${pairs===undefined?"earlier confirmed symptom history":`${pairs} earlier paired observations from your symptom history`}${wearable?", with wearable patterns selected after earlier personal comparisons supported their use":"; wearable readings are not used in this estimate"}.`,
    "This describes whether you might report the symptom, not how severe it would be; symptoms can happen at any risk level, and clinical accuracy has not been established.",
   ]:[
    `There is no usable estimate for ${label.toLowerCase()} on this day.`,
    "The model needs enough usable symptom history to issue an estimate; unanswered reports stay unknown.",
    "No risk level is assigned, and missing information does not mean you will be symptom-free.",
   ];
   return <SymptomExplanation key={date+key} label={label} risk={risk.label} band={risk.band} sentences={sentences}/>;
  })}</ul>
  <p className="day-context-note">These experimental estimates do not diagnose endometriosis or replace medical care. Missing answers stay unknown.</p>
 </>;
}
