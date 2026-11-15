"use client";
import {DemoWearable} from "./demo-wearable";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Entry } from "../lib/model";
import { factKinds, isPresentFact } from "../lib/model";
import { checkinSymptoms } from "../lib/experience-checkins";
import type { ForecastResult } from "./forecast-outlook";
import {PersonalLearningOutlook} from "./personal-learning-outlook";
import type {LearningOutlook} from "../lib/learning-types";
import {OutlookDay,type DayMeasurement} from "./outlook-day";
import {useAppNavigation} from "./app-navigation";

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const displayDate = (date: string) => new Date(date+"T12:00:00").toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"});
const symptomKinds = new Set<string>(factKinds.filter(k=>!["Location","Severity","Timing","Menstrual context","Cycle day","Cycle start","Bleeding level","Fatigue score","Daily-life impact","Intervention","Medication effect","What helped","Uncertainty"].includes(k)));
export function loggedLabels(entries: Entry[]) {
  return [...new Set(entries.flatMap(e=>e.symptomFree?["No symptoms"]:e.facts.filter(f=>symptomKinds.has(f.kind)&&isPresentFact(f)).map(f=>f.value)))];
}

export function LinenOutlook({today,selected,onSelect,onEdit,entries,forecast,loading,error,onRetry,demoControls,demoDays,onSettings,learning,onCheckin}: {
  today:string;selected:string;onSelect:(date:string)=>void;onEdit:(date:string)=>void;
  entries:Entry[];forecast:ForecastResult|null;loading:boolean;error:string;onRetry:()=>void;
  demoControls?:ReactNode;onCheckin?:()=>void;
  demoDays?:DayMeasurement[];onSettings?:()=>void;learning?:LearningOutlook|null;
}) {
  const navigation=useAppNavigation();
  const [detailDate,setDetailDate]=useState<string|null>(null);
  function openDay(day:string){onSelect(day);setDetailDate(day);navigation?.setView("Outlook");window.history.pushState(null,"","/outlook?day="+day);window.scrollTo(0,0);}
  useEffect(()=>{const sync=()=>{const day=new URLSearchParams(window.location.search).get("day");const valid=day&&/^\d{4}-\d{2}-\d{2}$/.test(day)?day:null;setDetailDate(valid);if(valid)onSelect(valid);};sync();window.addEventListener("popstate",sync);window.addEventListener("elya-route-change",sync);return()=>{window.removeEventListener("popstate",sync);window.removeEventListener("elya-route-change",sync);};},[]);
  const [month,setMonth]=useState(selected.slice(0,7));
  useEffect(()=>setMonth(selected.slice(0,7)),[selected]);
  const first=new Date(month+"-01T12:00:00");
  const count=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
  const length=Math.ceil((first.getDay()+count)/7)*7;
  const cells=Array.from({length},(_,i)=>i<first.getDay()||i>=first.getDay()+count?null:`${month}-${String(i-first.getDay()+1).padStart(2,"0")}`);
  const predictions=(date:string)=>learning?.targetDate===date?learning.outlook.filter(s=>s.status==="experimental"&&checkinSymptoms.some(c=>c.key===s.symptom)).map(s=>({label:checkinSymptoms.find(c=>c.key===s.symptom)!.label,riskLabel:s.label,probability:learning.symptoms.find(p=>p.symptom===s.symptom)?.candidateEstimate??0,higher:s.band==="high"})):forecast?.targetDate===date?checkinSymptoms.flatMap(({key,label})=>{
    const s=forecast.symptoms.find(s=>s.symptom===key);
    return s?.state==="experimental-estimate"&&s.probability!==null?[{label,riskLabel:undefined as string|undefined,probability:s.probability,higher:s.outlook==="higher-estimated-likelihood"}]:[];
  }):[];
  const available=learning?predictions(learning.targetDate):forecast?predictions(forecast.targetDate):[];
  const higher=available.filter(s=>s.higher).sort((a,b)=>b.probability-a.probability);
  const target=learning?.targetDate??forecast?.targetDate;
  const targetLabel=target===today?"today":target?displayDate(target):"";
  const dayEntries=entries.filter(e=>e.date===selected);
  const dayPredictions=predictions(selected);
  function moveMonth(by:number){setMonth(monthKey(new Date(first.getFullYear(),first.getMonth()+by,1,12)));}
  if(detailDate)return <OutlookDay learning={learning} date={detailDate} today={today} entries={entries} forecast={forecast} demoDays={demoDays} onDate={openDay} onCalendar={()=>{setDetailDate(null);window.history.pushState(null,"","/outlook");}} onEdit={()=>onEdit(detailDate)} onSettings={onSettings??(()=>{window.location.href="/settings";})}/>;
  return <div className="outlook-composition">
    <section className="linen-panel outlook-summary" aria-labelledby="outlook-summary-heading">
      <div className="outlook-summary-top"><h1 id="outlook-summary-heading">Tomorrow’s outlook</h1><span>{displayDate(target??today)}</span></div>
      {demoControls}
      {loading?<p role="status">Loading outlook…</p>:error?<div role="alert"><p>{error}</p><button className="button" onClick={onRetry}>Try again</button></div>:available.length?<>
        {!learning&&<p className="outlook-summary-line">{higher.length?`${higher[0].label} may be more likely ${target===today?"today":"on "+targetLabel}.`:`No elevated likelihood in the available estimates for ${targetLabel}.`}</p>}
        {!learning&&<span className="outlook-estimate-tag">◇ Estimate · experimental</span>}
      </>:<p className="outlook-summary-line">{target?`No estimate available for ${targetLabel} yet.`:"No outlook available yet."}</p>}
      {!loading&&!error&&(learning!==undefined?<PersonalLearningOutlook result={learning} sampleDays={demoDays?.length}/>:<><ul className="outlook-forecast-rows">{checkinSymptoms.map(({key,label})=>{const s=forecast?.symptoms.find(s=>s.symptom===key);const available=s?.state==="experimental-estimate"&&s.probability!==null;return <li key={key}><span>{label}</span><span className={!available?"forecast-learning":s.outlook==="higher-estimated-likelihood"?"forecast-elevated":"forecast-usual"}>{!available?"○ Still learning":s.outlook==="higher-estimated-likelihood"?"● Elevated likelihood":"◐ Usual pattern"}{available&&<small>Estimate · experimental</small>}</span></li>;})}</ul><p className="outlook-context-note">Based on confirmed symptom history when available. Wearable readings are context only. Lower likelihood does not rule out pain.</p></>)}
      <div className="outlook-checkin-action"><button className="button primary" onClick={()=>onCheckin?onCheckin():onEdit(today)}>{demoDays!==undefined?"Start voice conversation":"Check in today"}</button>{demoDays!==undefined&&<p className="conversation-start-note">Ellie asks aloud, then listens for your answer. You can pause at any time.</p>}</div>
    </section>
    {demoDays!==undefined&&<DemoWearable days={demoDays} onView={()=>openDay(today)}/>}
    <section className="linen-panel outlook-calendar-panel" aria-labelledby="calendar-month">
      <div className="outlook-calendar-heading"><h2 id="calendar-month" aria-live="polite">{first.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</h2><div className="outlook-month-controls"><button onClick={()=>{setMonth(today.slice(0,7));onSelect(today);}}>Today</button><button aria-label="Previous month" onClick={()=>moveMonth(-1)}>←</button><button aria-label="Next month" onClick={()=>moveMonth(1)}>→</button></div></div>
      <div className="outlook-calendar-key"><span><b aria-hidden="true">●</b> Logged</span><span><b aria-hidden="true">◇</b> Estimate</span><span>Unanswered days are unknown</span></div>
      <div className="outlook-month-grid">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day=><span className="outlook-weekday" key={day}>{day}</span>)}
        {cells.map((day,i)=>{
          if(!day)return <span className="outlook-blank" key={i}/>;
          const logs=entries.filter(e=>e.date===day);const symptoms=loggedLabels(logs);const estimated=predictions(day);
          const more=Math.max(0,symptoms.length-2)+Math.max(0,estimated.length-1);
          return <button key={day} className={`outlook-date${selected===day?" is-selected":""}${today===day?" is-today":""}`} aria-pressed={selected===day} aria-current={today===day?"date":undefined} aria-label={`${displayDate(day)}${today===day?", today":""}${logs.length?", Logged: "+(symptoms.join(", ")||"entry") :""}${estimated.length?", Estimate: "+estimated.map(s=>s.label).join(", "):""}`} onClick={()=>openDay(day)}>
            <span className="outlook-date-number">{Number(day.slice(-2))}{today===day&&<span className="outlook-today-label">Today</span>}</span>
            {logs.length>0&&<div className="outlook-cell-log"><span className="outlook-cell-label">● Logged</span>{symptoms.length?symptoms.slice(0,2).map(s=><span className="outlook-cell-symptom" key={s}>{s}</span>):<span className="outlook-cell-symptom">Journal entry</span>}</div>}
            {estimated.length>0&&<div className="outlook-cell-estimate"><span className="outlook-cell-label">◇ Estimate</span><span className="outlook-cell-symptom">{estimated[0].label}</span></div>}
            {more>0&&<span className="outlook-more">+{more} more</span>}
          </button>;
        })}
      </div>
      <div className="outlook-day-detail" aria-labelledby="selected-day-heading">
        <div className="outlook-detail-heading"><h3 id="selected-day-heading">{displayDate(selected)}</h3>{selected<=today&&<button className="button" onClick={()=>onEdit(selected)}>{dayEntries.length?"Edit entry":"Add entry"}</button>}</div>
        {dayEntries.length>0&&<div className="outlook-logged-detail"><span className="outlook-detail-label">● Logged</span>{dayEntries.map(e=><div key={e.id}>{e.symptomFree&&<p>None reported · No symptoms</p>}<p className="outlook-entry-words">{e.text}</p></div>)}</div>}
        {dayPredictions.length>0&&<div className="outlook-prediction-detail"><span className="outlook-detail-label">◇ Estimate · experimental</span><ul>{dayPredictions.map(s=><li key={s.label}><strong>{s.label}</strong><span>{s.riskLabel??(s.higher?"Elevated likelihood":"Usual pattern")}</span></li>)}</ul></div>}
        {!dayEntries.length&&!dayPredictions.length&&<p className="outlook-no-entry">{selected>today?"No outlook available for this day.":"Unknown · No entry recorded."}</p>}
      </div>
    </section>
  </div>;
}
