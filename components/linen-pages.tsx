"use client";
import { useEffect, useRef, useState } from "react";
import { HeroBackground } from "./hero-background";
import { LinenOutlook } from "./linen-outlook";
import { LinenBrief } from "./linen-brief";
import { useAppNavigation } from "./app-navigation";
import { type Entry, type Fact, isPresentFact, validateEntry } from "../lib/model";
import type { ForecastResult } from "./forecast-outlook";
import { checkinSymptoms } from "../lib/experience-checkins";
import { shiftDate } from "../lib/forecast-time";

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const labels = ["Pelvic pain", "Cramps", "Fatigue", "Bloating", "Bowel symptoms", "Headache"];
const kindFor = (label: string): Fact["kind"] => label === "Cramps" ? "Pelvic pain" : label === "Bowel symptoms" ? "Bowel discomfort" : label === "Headache" ? "Pain" : label as Fact["kind"];
const pretty = (date: string) => new Date(date+"T12:00:00").toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"});
type SpeechSession = {start:()=>void;stop:()=>void;abort:()=>void;continuous:boolean;interimResults:boolean;lang:string;onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null};

export function LinenPages({view, entries, forecast, loading, forecastError, onSave, onSettings, onDelete, demo, onRetry}: {
  view:string; entries:Entry[]; forecast:ForecastResult|null; loading:boolean; forecastError:string;
  onSave:(entry:Entry)=>Promise<void>; onSettings:()=>void; onDelete:()=>Promise<void>; demo:boolean; onRetry:()=>void;
}) {
  const nav = useAppNavigation()!;
  const [date,setDate]=useState(localToday);
  const [words,setWords]=useState(""); const [chips,setChips]=useState<string[]>([]); const [none,setNone]=useState(false);
  const [dirty,setDirty]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const [recording,setRecording]=useState(false); const [voiceNote,setVoiceNote]=useState("");
  const recognition=useRef<SpeechSession|null>(null);
  const [confirmDelete,setConfirmDelete]=useState(false); const [copied,setCopied]=useState("");
  const existing=entries.find(e=>e.date===date);
  useEffect(()=>{const requested=new URLSearchParams(window.location.search).get("date");if(requested&&/^\d{4}-\d{2}-\d{2}$/.test(requested)&&requested<=localToday()&&!Number.isNaN(Date.parse(requested)))setDate(requested);},[]);
  useEffect(()=>{setWords(existing?.text??"");setNone(existing?.symptomFree??false);setChips(labels.filter(l=>existing?.facts.some(f=>f.kind===kindFor(l)&&isPresentFact(f)&&(l!=="Headache"||f.value.toLowerCase().includes("headache"))&&(l!=="Cramps"||f.value.toLowerCase().includes("cramp")))));setDirty(false);setError("");},[date,existing]);
  useEffect(()=>{nav.setDirty(dirty);return()=>nav.setDirty(false);},[dirty,nav.setDirty]);
  useEffect(()=>()=>recognition.current?.abort(),[]);
  useEffect(()=>{recognition.current?.stop();},[view]);
  useEffect(()=>{const checkin=()=>setDate(localToday());window.addEventListener("elya-checkin-today",checkin);return()=>window.removeEventListener("elya-checkin-today",checkin);},[]);
  const estimates=(day:string)=>forecast?.targetDate===day ? forecast.symptoms.filter(s=>s.state==="experimental-estimate"&&s.probability!==null).map(s=>({label:checkinSymptoms.find(c=>c.key===s.symptom)?.label??s.symptom,high:s.outlook==="higher-estimated-likelihood"})) : [];
  function changeDate(next:string) { if(!next||next>localToday())return; if(dirty&&!window.confirm("Leave without saving? Your entry isn't saved yet."))return;setDate(next); }
  function speak(){
    if(recording){recognition.current?.stop();return;}
    const api=window as unknown as {SpeechRecognition?:new()=>SpeechSession;webkitSpeechRecognition?:new()=>SpeechSession};
    const Constructor=api.SpeechRecognition??api.webkitSpeechRecognition;
    if(!Constructor){setVoiceNote("Voice recognition is unavailable in this browser. You can keep typing.");return;}
    setVoiceNote("Your browser processes speech and may send audio to its speech service.");
    const r=new Constructor(); recognition.current=r;r.lang="en-US";r.continuous=true;r.interimResults=false;
    const initial=words;
    r.onresult=e=>{setWords([initial,Array.from(e.results).map(result=>result[0].transcript).join(" ")].filter(Boolean).join(" "));setDirty(true);};
    r.onerror=e=>{setRecording(false);setVoiceNote(e.error==="not-allowed"?"Microphone access was denied. You can keep typing.":"Recording stopped. You can keep typing or try Speak again.");};
    r.onend=()=>setRecording(false);
    try{r.start();setRecording(true);}catch{setVoiceNote("Voice recognition could not start. You can keep typing.");}
  }
  async function save(){
    setBusy(true);setError("");recognition.current?.stop();
    try{
      const lines=[words.trim(),...chips.map(l=>`I reported ${l.toLowerCase()}.`),...(none?["No symptoms today."]:[])].filter(Boolean);
      if(!lines.length)throw Error("Write an entry or select a symptom before saving.");
      if(date>localToday())throw Error("Choose today or a past date.");
      const text=lines.join("\n");
      const preserved=(existing?.facts??[]).filter(f=>text.includes(f.quote)&&!labels.some(l=>kindFor(l)===f.kind));
      const facts:Fact[]=[...preserved,...chips.map(l=>({kind:kindFor(l),value:l,quote:`I reported ${l.toLowerCase()}.`}))];
      const entry=validateEntry({id:existing?.id??crypto.randomUUID(),date,text,facts,symptomFree:none,demo,...(existing?.persona?{persona:existing.persona}:{})});
      await onSave(entry);setDirty(false);nav.setDirty(false);nav.setView("Outlook");
    }catch(e){setError(e instanceof Error?e.message:"Your entry could not be saved. Please try again.");}finally{setBusy(false);}
  }
  return <div className="linen-experience">
    <div className="linen-static"><HeroBackground frozen /></div>
    <div className="linen-content">
      {demo&&<p className="demo-chip">Fictional demo history</p>}
      {view==="Your story"?<section className="linen-panel journal-panel" aria-labelledby="journal-heading">
        <div className="linen-date-heading"><button aria-label="Previous day" onClick={()=>changeDate(shiftDate(date,-1))}>←</button><h1 id="journal-heading">Journal <span>— {pretty(date)}</span></h1><button aria-label="Next day" disabled={date>=localToday()} onClick={()=>changeDate(shiftDate(date,1))}>→</button></div>
        <label className="linen-date-picker">Entry date<input type="date" value={date} max={localToday()} onChange={e=>changeDate(e.target.value)}/></label>
        {estimates(date).length>0&&<div className="linen-forecast"><strong>{date===localToday()?"Today’s outlook":"Outlook"}</strong><p>{estimates(date).map(s=>s.label).join(", ")}</p><span>Estimate · experimental</span></div>}
        <label className="entry-label" htmlFor="linen-entry">What are you experiencing today?</label>
        <div className="linen-input-wrap"><textarea id="linen-entry" value={words} maxLength={9000} onChange={e=>{setWords(e.target.value);setDirty(true);}}/><button className="button" onClick={speak}>{recording?"Stop":"Speak"}</button></div>
        {(voiceNote||recording)&&<p role="status">{recording?"Recording… ":""}{voiceNote}</p>}
        <fieldset className="linen-symptoms"><legend>Symptoms</legend><div>{labels.map(label=><button key={label} aria-pressed={chips.includes(label)} onClick={()=>{setChips(current=>current.includes(label)?current.filter(l=>l!==label):[...current,label]);setNone(false);setDirty(true);}}>{chips.includes(label)?"✓ ":""}{label}</button>)}</div></fieldset>
        <label className="linen-none"><input type="checkbox" checked={none} onChange={e=>{setNone(e.target.checked);if(e.target.checked)setChips([]);setDirty(true);}}/>No symptoms today</label>
        {error&&<p role="alert">{error}</p>}
        <div className="linen-main-action"><button className="button primary" disabled={busy||recording} onClick={save}>{busy?"Saving…":existing?"Save changes":"Add to calendar"}</button></div>
      </section>:view==="Outlook"?<LinenOutlook today={localToday()} selected={date} onSelect={setDate} onEdit={day=>{setDate(day);nav.setView("Your story");}} entries={entries} forecast={forecast} loading={loading} error={forecastError} onRetry={onRetry}/>: view==="Privacy"?<section className="linen-panel"><h1>Privacy</h1><h2>Storage</h2><p>Personal journal entries are saved in this browser’s IndexedDB. Preferences and confirmed check-ins use local storage. Fictional demo entries stay separate from personal entries.</p><h2>Voice</h2><p>Speak uses your browser’s speech recognition when available. Your browser may send audio to its speech service. Microphone access starts only when you press Speak.</p><h2>Export and deletion</h2><p>Appointment Brief lets you copy your selected entries or print them to PDF. Deleting browser data does not delete files you have already exported.</p><button className="button" onClick={onSettings}>Connections and preferences</button><button className="button" onClick={()=>setConfirmDelete(true)}>Delete personal journal data</button>{confirmDelete&&<div><p>Delete saved personal entries and confirmed check-ins from this browser?</p><button className="button" onClick={()=>setConfirmDelete(false)}>Cancel</button><button className="button primary" onClick={async()=>{try{await onDelete();setConfirmDelete(false);setCopied("Personal journal data deleted.");}catch{setError("Deletion failed. Please try again.");}}}>Delete data</button></div>}{copied&&<p role="status">{copied}</p>}{error&&<p role="alert">{error}</p>}</section>:null}
      <div hidden={view!=="Appointment brief"}><LinenBrief active={view==="Appointment brief"} entries={entries} today={localToday()} onSource={entry=>{setDate(entry.date);nav.setView("Your story");}} onJournal={()=>{setDate(localToday());nav.setView("Your story");}}/></div>
      <p className="linen-disclaimer">Experimental symptom-risk estimates. Not a diagnostic tool or a replacement for medical care.</p>
    </div>
  </div>;
}
