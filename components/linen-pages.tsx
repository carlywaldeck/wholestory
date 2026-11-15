"use client";
import {newEntryId} from "../lib/entry-id";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {JournalFollowups} from "./journal-followups";
import {useJournalDictation} from "../hooks/use-journal-dictation";
import { HeroBackground } from "./hero-background";
import type {LearningOutlook} from "../lib/learning-types";
import type {DayMeasurement} from "./outlook-day";
import { LinenOutlook } from "./linen-outlook";
import { LinenBrief } from "./linen-brief";
import { useAppNavigation } from "./app-navigation";
import { type Entry, type Fact, isPresentFact, validateEntry } from "../lib/model";
import type { ForecastResult } from "./forecast-outlook";
import { checkinSymptoms } from "../lib/experience-checkins";
import { shiftDate } from "../lib/forecast-time";

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const labels = ["Pelvic pain / cramps", "Fatigue", "Bloating", "Bowel symptoms", "Headache"];
const kindFor = (label: string): Fact["kind"] => label === "Pelvic pain / cramps" ? "Pelvic pain" : label === "Bowel symptoms" ? "Bowel discomfort" : label === "Headache" ? "Pain" : label as Fact["kind"];
const pretty = (date: string) => new Date(date+"T12:00:00").toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"});

export function LinenPages({view, entries, forecast, loading, forecastError, onSave, onSettings, onDelete, demo, onRetry, demoControls, wearableNote, continuous=false, demoDays, learning, demoToday}: {
  view:string; entries:Entry[]; forecast:ForecastResult|null; loading:boolean; forecastError:string;
  onSave:(entry:Entry)=>Promise<void>; onSettings:()=>void; onDelete:()=>Promise<void>; demo:boolean; onRetry:()=>void;
  demoControls?:ReactNode; wearableNote?:string; continuous?:boolean; demoDays?:DayMeasurement[]; learning?:LearningOutlook|null; demoToday?:string;
}) {
  const currentDay=demoToday??localToday();
  const nav = useAppNavigation()!;
  const [date,setDate]=useState(()=>currentDay);
  const [words,setWords]=useState(""); const [chips,setChips]=useState<string[]>([]); const [none,setNone]=useState(false);
  const [absent,setAbsent]=useState<string[]>([]);
  const [dirty,setDirty]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const [followupFacts,setFollowupFacts]=useState<Fact[]>([]);const [followupBusy,setFollowupBusy]=useState(false);
  const markFollowupActivity=useCallback((active:boolean)=>{setFollowupBusy(active);if(active)setDirty(true);},[]);
  const saving=useRef(false);const draftId=useRef<string|null>(null);
  const dictation=useJournalDictation(addition=>{setWords(current=>[current,addition].filter(Boolean).join(" "));setDirty(true);},view+":"+date+":"+(nav.settings?"settings":"journal"));
  const [confirmDelete,setConfirmDelete]=useState(false); const [copied,setCopied]=useState("");
  const existing=entries.find(e=>e.date===date);
  useEffect(()=>{const requested=new URLSearchParams(window.location.search).get("date");if(requested&&/^\d{4}-\d{2}-\d{2}$/.test(requested)&&requested<=currentDay&&!Number.isNaN(Date.parse(requested)))setDate(requested);},[]);
  useEffect(()=>{setWords(existing?.text??"");setNone(existing?.symptomFree??false);setChips(labels.filter(l=>existing?.facts.some(f=>f.kind===kindFor(l)&&isPresentFact(f)&&(l!=="Headache"||f.value.toLowerCase().includes("headache"))&&(l!=="Cramps"||f.value.toLowerCase().includes("cramp")))));setAbsent(labels.filter(l=>existing?.symptomFree||existing?.facts.some(f=>f.kind===kindFor(l)&&!isPresentFact(f)&&/^(no|none|absent|not present|false|0)\b/i.test(f.value))));setDirty(false);setError("");setFollowupFacts([]);},[date,existing]);
  useEffect(()=>{nav.setDirty(dirty);return()=>nav.setDirty(false);},[dirty,nav.setDirty]);
  useEffect(()=>{draftId.current=null;},[date]);
  useEffect(()=>{const checkin=()=>setDate(currentDay);window.addEventListener("elya-checkin-today",checkin);return()=>window.removeEventListener("elya-checkin-today",checkin);},[currentDay]);
  const previousDemoDate=useRef(demoToday);
  useEffect(()=>{if(previousDemoDate.current!==demoToday){setDate(currentDay);previousDemoDate.current=demoToday;}},[demoToday,currentDay]);
  const estimates=(day:string)=>learning?.targetDate===day?learning.outlook.filter(s=>s.status==="experimental"&&checkinSymptoms.some(c=>c.key===s.symptom)).map(s=>({label:checkinSymptoms.find(c=>c.key===s.symptom)?.label??s.symptom,high:s.band==="high"})):forecast?.targetDate===day ? forecast.symptoms.filter(s=>s.state==="experimental-estimate"&&s.probability!==null).map(s=>({label:checkinSymptoms.find(c=>c.key===s.symptom)?.label??s.symptom,high:s.outlook==="higher-estimated-likelihood"})) : [];
  function goJournal(day=currentDay){setDate(day);if(continuous){document.getElementById("home-journal")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});}else nav.setView("Your story");}
  function changeDate(next:string) { if(!next||next>currentDay)return; if(dirty&&!window.confirm("Leave without saving? Your entry isn't saved yet."))return;setDate(next); }
  async function save(){
    if(saving.current||dictation.active||followupBusy)return;saving.current=true;
    setBusy(true);setError("");
    try{
      const confirmed=[...chips.map(l=>`I reported ${l.toLowerCase()}.`),...absent.map(l=>`I reported no ${l.toLowerCase()}.`),...(none?["No symptoms today."]:[])];
      const lines=[words.trim(),...confirmed.filter(line=>!words.includes(line))].filter(Boolean);
      if(!lines.length)throw Error("Write an entry or select a symptom before saving.");
      if(date>currentDay)throw Error("Choose today or a past date.");
      const text=lines.join("\n");
      const preserved=(existing?.facts??[]).filter(f=>text.includes(f.quote)&&!labels.some(l=>kindFor(l)===f.kind));
      const facts:Fact[]=[...preserved,...followupFacts.filter(f=>text.includes(f.quote)),...chips.map(l=>({kind:kindFor(l),value:l,quote:`I reported ${l.toLowerCase()}.`})),...absent.map(l=>({kind:kindFor(l),value:"No",quote:`I reported no ${l.toLowerCase()}.`}))];
      const entry=validateEntry({id:existing?.id??(draftId.current??=newEntryId()),date,text,facts,symptomFree:none,demo,...(existing?.persona?{persona:existing.persona}:{})});
      await onSave(entry);setDirty(false);nav.setDirty(false);if(continuous){document.getElementById("home-outlook")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});}else nav.setView("Outlook");
    }catch(e){setError(e instanceof Error?e.message:"Your entry could not be saved. Please try again.");}finally{setBusy(false);saving.current=false;}
  }
  return <div className="linen-experience">
    <div className="linen-static"><HeroBackground frozen /></div>
    <div className="linen-content">
      {demo&&<p className="demo-chip">Fictional demo history</p>}
      {(continuous||view==="Your story")&&<section className="linen-panel journal-panel" aria-labelledby="journal-heading">
        <div className="linen-date-heading"><button aria-label="Previous day" onClick={()=>changeDate(shiftDate(date,-1))}>←</button><h1 id="journal-heading">Journal <span>— {pretty(date)}</span></h1><button aria-label="Next day" disabled={date>=currentDay} onClick={()=>changeDate(shiftDate(date,1))}>→</button></div>
        <label className="linen-date-picker">Entry date<input type="date" value={date} max={currentDay} onChange={e=>changeDate(e.target.value)}/></label>
        {estimates(date).length>0&&<div className="linen-forecast"><strong>{date===currentDay?"Today’s outlook":"Outlook"}</strong><p>{estimates(date).map(s=>s.label).join(", ")}</p><span>Estimate · experimental</span></div>}
        <label className="entry-label" htmlFor="linen-entry">What are you experiencing today?</label>
        <div className="linen-input-wrap"><textarea id="linen-entry" value={words} maxLength={9000} onChange={e=>{setWords(e.target.value);setDirty(true);}}/><button type="button" className="button" disabled={followupBusy} onClick={dictation.active?dictation.stop:dictation.start}>{dictation.active?"Stop recording":"Speak"}</button></div>
        <p className="voice-processing-note">Your browser may send audio to its speech service. elya does not save raw audio.</p>
        {dictation.message&&<p role="status">{dictation.message}{dictation.message.includes("localhost")&&<> <a href={`http://localhost:3001/journal?date=${date}`}>Open localhost Journal</a></>}</p>}
        <JournalFollowups key={view+":"+date+":"+(demo?entries[0]?.persona??"demo":"personal")} text={words} sessionKey={view+":"+date} disabled={dictation.active||busy} paused={nav.settings} onActivity={markFollowupActivity} onAnswer={(question,answer,fact)=>{setWords(current=>current+"\n\nelya follow-up: "+question+"\nMy answer: "+answer);if(fact)setFollowupFacts(current=>[...current,fact]);setDirty(true);}}/>
        <fieldset className="linen-symptoms"><legend>Symptoms</legend><div className="journal-symptom-bubbles">{labels.map(label=><button type="button" key={label} aria-pressed={chips.includes(label)} onClick={()=>{setChips(current=>current.includes(label)?current.filter(l=>l!==label):[...current,label]);setAbsent(current=>current.filter(l=>l!==label));setNone(false);setDirty(true);}}>{chips.includes(label)&&<span aria-hidden="true">✓ </span>}{label}{absent.includes(label)&&<small> · None reported</small>}</button>)}</div></fieldset>
        <details className="journal-absence-options"><summary>Record a symptom as absent</summary><div className="journal-statuses">{labels.map(label=><label className="journal-symptom-answer" key={label}><span>{label}</span><select aria-label={`${label} status`} value={chips.includes(label)?"present":absent.includes(label)?"absent":"unknown"} onChange={e=>{setChips(current=>[...current.filter(l=>l!==label),...(e.target.value==="present"?[label]:[])]);setAbsent(current=>[...current.filter(l=>l!==label),...(e.target.value==="absent"?[label]:[])]);setNone(false);setDirty(true);}}><option value="unknown">○ Unanswered</option><option value="present">● Present</option><option value="absent">○✓ None reported</option></select></label>)}</div></details>
        <label className="linen-none"><input type="checkbox" checked={none} onChange={e=>{setNone(e.target.checked);if(e.target.checked){setChips([]);setAbsent([...labels]);}else setAbsent([]);setDirty(true);}}/>No symptoms today</label>
        {error&&<p role="alert">{error}</p>}
        <div className="linen-main-action"><button className="button primary" disabled={busy||dictation.active||followupBusy} onClick={save}>{busy?"Saving…":existing?"Save changes":"Add to calendar"}</button></div>
      </section>}
      {(continuous||view==="Outlook")&&<section id={continuous?"home-outlook":undefined} aria-label="Outlook"><LinenOutlook learning={learning} demoDays={demoDays} onSettings={onSettings} today={currentDay} selected={date} onSelect={setDate} onEdit={goJournal} entries={entries} forecast={forecast} demoControls={demoControls} loading={loading} error={forecastError} onRetry={onRetry}/></section>}
      {view==="Privacy"?<section className="linen-panel"><h1>Privacy</h1><h2>Storage</h2><p>Personal journal entries are saved in this browser’s IndexedDB. Preferences and confirmed check-ins use local storage. Fictional demo entries and personal-learning snapshots are saved separately by profile on this device. Issued forecasts preserve their original inputs; later reports are linked as outcomes. Nothing is encrypted or synchronized across devices.</p><h2>Voice</h2><p>Speak uses your browser’s speech recognition when available. Your browser may send audio to its speech service. Microphone access starts only when you press Speak. Optional follow-ups are selected locally from the consultation guide; browser speech reads only the question text, not your Journal or answers. Microphone capture and spoken questions pause when Settings opens.</p><h2>Export and deletion</h2><p>Appointment Brief lets you copy your selected entries or print them to PDF. Deleting browser data does not delete files you have already exported.</p><button className="button" onClick={onSettings}>Connections and preferences</button><button className="button" onClick={()=>setConfirmDelete(true)}>Delete personal journal data</button>{confirmDelete&&<div><p>Delete saved personal entries, confirmed check-ins, and their personal-learning snapshots from this browser?</p><button className="button" onClick={()=>setConfirmDelete(false)}>Cancel</button><button className="button primary" onClick={async()=>{try{await onDelete();setConfirmDelete(false);setCopied("Personal journal data deleted.");}catch{setError("Deletion failed. Please try again.");}}}>Delete data</button></div>}{copied&&<p role="status">{copied}</p>}{error&&<p role="alert">{error}</p>}</section>:null}
      <div id={continuous?"home-appointment-brief":undefined} hidden={!continuous&&view!=="Appointment brief"}><LinenBrief wearableNote={wearableNote} key={demo?entries[0]?.persona??"demo":"personal"} active={continuous||view==="Appointment brief"} entries={entries} today={currentDay} onSource={entry=>goJournal(entry.date)} onJournal={()=>goJournal()}/></div>
      <p className="linen-disclaimer">Experimental symptom-risk estimates. Not a diagnostic tool or a replacement for medical care.</p>
    </div>
  </div>;
}
