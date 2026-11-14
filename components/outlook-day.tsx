"use client";
import {useEffect,useState} from "react";
import type {Entry} from "../lib/model";
import {isPresentFact,categories} from "../lib/model";
import {loadWearables,type WearableRecord} from "../lib/wearables";
import {shiftDate} from "../lib/forecast-time";
import {checkinSymptoms} from "../lib/experience-checkins";
import type {ForecastResult} from "./forecast-outlook";
export type DayMeasurement={date:string;sleepHours:number|null;steps:number|null;temperatureDeviationC?:number|null;nightHeartRateBpm?:number|null;hrvRmssdMs?:number|null;respiratoryRateBpm?:number|null};
export function OutlookDay({date,today,entries,forecast,onDate,onCalendar,onEdit,onSettings,demoDays}: {
 date:string;today:string;entries:Entry[];forecast:ForecastResult|null;onDate:(date:string)=>void;onCalendar:()=>void;onEdit:()=>void;onSettings:()=>void;demoDays?:DayMeasurement[];
}){
 const [imported,setImported]=useState<WearableRecord|null>(null);const [connected,setConnected]=useState<boolean|null>(null);const [loading,setLoading]=useState(true);
 const future=date>today;const records=entries.filter(e=>e.date===date);
 useEffect(()=>{let active=true;if(future||demoDays!==undefined){setLoading(false);return;}
  setLoading(true);Promise.allSettled([loadWearables(),fetch("/api/wearables/oura/status").then(r=>r.ok?r.json():null)]).then(([saved,status])=>{if(!active)return;if(saved.status==="fulfilled")setImported(saved.value);if(status.status==="fulfilled"&&typeof status.value?.connected==="boolean")setConnected(status.value.connected);setLoading(false);});return()=>{active=false;};
 },[demoDays,future]);
 const measurement=demoDays!==undefined?demoDays.find(d=>d.date===date):imported?.days.find(d=>d.date===date);
 const data=measurement as DayMeasurement|undefined;
 const estimates=forecast?.targetDate===date?checkinSymptoms.flatMap(({key,label})=>{const s=forecast.symptoms.find(s=>s.symptom===key&&s.state==="experimental-estimate"&&s.probability!==null);return s?[{...s,label}]:[];}):[];
 const dateText=new Date(date+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
 return <div className="outlook-daily-view">
  <button className="day-back-link" aria-label="Month calendar" onClick={onCalendar}>← Month calendar</button>
  <div className="day-date-navigation"><button className="button" aria-label="Previous day" onClick={()=>onDate(shiftDate(date,-1))}>←</button><h1>{dateText}</h1><button className="button" aria-label="Next day" onClick={()=>onDate(shiftDate(date,1))}>→</button></div>
  {future?<section className="linen-panel future-day-panel"><h2>Symptoms you may experience</h2>{estimates.length?<><div className="day-symptom-chips">{estimates.map(s=><span key={s.symptom}>{s.label}</span>)}</div><span className="day-estimate-label">Estimate · experimental</span>{estimates.map(s=><section className="future-symptom-detail" key={s.symptom}><h3>{s.label}</h3><p>Estimated likelihood: {Math.round(s.probability!*100)}%</p>{s.factors.length>0&&<p className="muted">Based on confirmed symptom history{s.cycle.probability!==null?" and reported cycle timing":""}.</p>}</section>)}<p className="day-context-note">Likelihood describes the chance of reporting a symptom, not severity, urgency, or diagnosis. Lower estimates do not rule out pain.</p></>:<p>No symptom outlook available for this date.</p>}</section>:<div className="daily-sibling-panels">
   <section className="linen-panel daily-journal-panel"><h2>Your Journal</h2>{records.length?records.map(e=><article key={e.id}><p className="day-entry-words">{e.text}</p><div className="day-symptom-chips">{e.symptomFree?<span>None reported · No symptoms</span>:e.facts.filter(f=>categories.includes(f.kind as typeof categories[number])&&isPresentFact(f)).map((f,i)=><span key={i}>{f.value}</span>)}</div></article>):<p>No entry for this day.</p>}<button className="button" onClick={onEdit}>{records.length?"Edit entry":"Open Journal"}</button></section>
   <section className="linen-panel daily-wearable-panel"><h2>Wearable data</h2>{loading?<p role="status">Loading saved measurements…</p>:<>
    {demoDays!==undefined?<p className="demo-chip">Fictional demo history</p>:<><p>{connected===true?"Oura connected":connected===false?"No wearable connected":"Connection status unavailable"}</p><button className="day-back-link" onClick={onSettings}>Settings</button></>}
    {data?<><p className="day-context-note">{demoDays!==undefined?"Matching fictional measurements":`Saved import: ${imported?.source??"Unknown provider"}`}</p><dl className="day-measurements"><div><dt>Sleep</dt><dd>{data.sleepHours===null?"Not available":`${data.sleepHours.toFixed(1)} hours`}</dd></div><div><dt>Temperature deviation</dt><dd>{data.temperatureDeviationC==null?"Not available":`${data.temperatureDeviationC>0?"+":""}${data.temperatureDeviationC.toFixed(2)} °C from baseline`}</dd></div><div><dt>Steps</dt><dd>{data.steps===null?"Not available":data.steps.toLocaleString()}</dd></div>{data.nightHeartRateBpm!=null&&<div><dt>Night heart rate</dt><dd>{data.nightHeartRateBpm.toFixed(0)} bpm</dd></div>}{data.hrvRmssdMs!=null&&<div><dt>HRV (RMSSD)</dt><dd>{data.hrvRmssdMs.toFixed(0)} ms</dd></div>}{data.respiratoryRateBpm!=null&&<div><dt>Respiratory rate</dt><dd>{data.respiratoryRateBpm.toFixed(1)} breaths/min</dd></div>}</dl><p className="day-context-note">Context only. These measurements do not influence symptom estimates. Sleep uses the recorded waking date.</p></>:<p>No measurements available for this day.</p>}
   </>}</section>
  </div>}
 </div>;
}
