"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { categories, isPresentFact, type Entry } from "../lib/model";

const dateLabel=(date:string)=>new Date(date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
export function recordedSummary(entries:Entry[]) {
  const ordered=[...entries].sort((a,b)=>a.date.localeCompare(b.date));
  const sections:string[]=[];
  const counts=new Map<string,Set<string>>();
  for(const e of ordered)for(const f of e.facts){
    if(!categories.includes(f.kind as typeof categories[number])||!isPresentFact(f))continue;
    const dates=counts.get(f.kind)??new Set<string>();dates.add(e.date);counts.set(f.kind,dates);
  }
  if(counts.size)sections.push("Reported symptoms\n"+[...counts].sort((a,b)=>b[1].size-a[1].size).map(([kind,dates])=>`${kind}: ${dates.size} ${dates.size===1?"day":"days"} reported.`).join("\n"));
  for(const [heading,kinds] of [["Severity",["Severity","Fatigue score"]],["Daily-life impact",["Daily-life impact"]],["What I tried and reported outcomes",["Intervention","What helped","Medication effect"]]] as const){
    const quotes=new Map<string,Set<string>>();
    for(const e of ordered)for(const f of e.facts){
      if(!(kinds as readonly string[]).includes(f.kind)||(f.kind==="Daily-life impact"&&!isPresentFact(f)))continue;
      const dates=quotes.get(f.quote)??new Set<string>();dates.add(e.date);quotes.set(f.quote,dates);
    }
    if(quotes.size)sections.push(heading+"\n"+[...quotes].map(([quote,dates])=>`“${quote}” (${[...dates].map(dateLabel).join("; ")})`).join("\n"));
  }
  const absentDays=new Set(ordered.filter(e=>e.symptomFree).map(e=>e.date));
  if(absentDays.size)sections.push(`No symptoms explicitly reported on ${absentDays.size} ${absentDays.size===1?"day":"days"}.`);
  if(!sections.length&&ordered.length)sections.push("In my words\n"+ordered.map(e=>`“${e.text}” (${dateLabel(e.date)})`).join("\n\n"));
  return sections.join("\n\n");
}

export function LinenBrief({entries,today,onSource,onJournal,active=true,wearableNote=""}: {entries:Entry[];today:string;onSource:(entry:Entry)=>void;onJournal:()=>void;active?:boolean;wearableNote?:string}) {
  const [start,setStart]=useState(today.slice(0,7)+"-01");
  const [end,setEnd]=useState(today);
  const [statement,setStatement]=useState("");const [questions,setQuestions]=useState("");
  const [edits,setEdits]=useState<Record<string,string>>({});const [reviewed,setReviewed]=useState(false);
  const [status,setStatus]=useState("");
  const summaryRef=useRef<HTMLTextAreaElement>(null);
  const validRange=!!start&&!!end&&start<=end&&end<=today;
  const chosen=validRange?entries.filter(e=>e.date>=start&&e.date<=end&&e.date<=today).sort((a,b)=>a.date.localeCompare(b.date)):[];
  const key=start+":"+end;
  const generated=recordedSummary(chosen);
  const summary=edits[key]??generated;
  const rangeLabel=validRange?`${dateLabel(start)} – ${dateLabel(end)}`:"";
  const loggedDays=new Set(chosen.map(e=>e.date)).size;
  const sourceSignature=JSON.stringify(chosen);
  useEffect(()=>{setReviewed(false);setStatus("");},[sourceSignature,start,end,summary,statement,questions,wearableNote]);
  useLayoutEffect(()=>{
    const el=summaryRef.current;if(!el||!active)return;
    const fit=()=>{el.style.height="auto";el.style.height=el.scrollHeight+2+"px";};fit();
    if(typeof ResizeObserver==="undefined")return;
    let width=el.getBoundingClientRect().width;
    const observer=new ResizeObserver(()=>{const next=el.getBoundingClientRect().width;if(next!==width){width=next;fit();}});
    observer.observe(el);return()=>observer.disconnect();
  },[summary,chosen.length,active]);
  const documentText=["elya | Appointment Brief",chosen.some(e=>e.demo)?"Fictional demo history":"",rangeLabel,`${loggedDays} logged ${loggedDays===1?"day":"days"}. Unanswered days are unknown.`,statement.trim()?"What I want understood\n"+statement.trim():"",summary.trim(),questions.trim()?"Questions for my appointment\n"+questions.trim():"",wearableNote?"Wearable context (not used in forecasts)\n"+wearableNote:"","Source entries",...chosen.map((e,i)=>`[${i+1}] ${dateLabel(e.date)}\n${e.text}`),"Patient-reported information. This brief does not diagnose or replace medical care."].filter(Boolean).join("\n\n");
  return <section className="linen-panel appointment-document" aria-labelledby="brief-title">
    <div className="brief-heading"><h1 id="brief-title">Appointment Brief</h1>{chosen.length>0&&<span>{loggedDays} logged {loggedDays===1?"day":"days"}</span>}</div>
    <div className="brief-date-controls"><label>From<input type="date" value={start} max={end||today} onChange={e=>setStart(e.target.value)}/></label><span aria-hidden="true">—</span><label>To<input type="date" value={end} min={start} max={today} onChange={e=>setEnd(e.target.value)}/></label></div>
    {!validRange?<p role="alert">Choose a date range ending today or earlier.</p>:!chosen.length?<div className="brief-empty"><p>No recorded entries in this date range.</p><button className="button primary" onClick={onJournal}>Write an entry</button></div>:<>
      <div className="brief-document-editor">
        <label htmlFor="brief-statement">What I want understood <span>Optional</span></label>
        <textarea id="brief-statement" rows={3} maxLength={4000} value={statement} onChange={e=>setStatement(e.target.value)}/>
        <label htmlFor="brief-summary">Recorded symptoms and daily life{edits[key]!==undefined&&<span>Edited by you</span>}</label>
        <textarea ref={summaryRef} id="brief-summary" value={summary} onChange={e=>setEdits(current=>({...current,[key]:e.target.value}))}/>
        <label htmlFor="brief-questions">Questions for my appointment <span>Optional</span></label>
        <textarea id="brief-questions" rows={3} maxLength={4000} value={questions} onChange={e=>setQuestions(e.target.value)}/>
      </div>
      {wearableNote&&<div className="brief-wearable-context"><h2>Wearable context</h2><p>{wearableNote}</p><p>Context only. Not used in forecasts. Normal readings do not invalidate pain.</p></div>}
      <details className="brief-sources"><summary>Review source entries ({chosen.length})</summary><ol>{chosen.map(e=><li key={e.id}><a href={`/journal?date=${e.date}`} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onSource(e);}}>{dateLabel(e.date)}</a><p>{e.text}</p></li>)}</ol></details>
      <label className="brief-review"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>I’ve reviewed this brief and its source entries.</label>
      <div className="brief-export-actions"><button className="button" disabled={!reviewed||!summary.trim()} onClick={async()=>{try{await navigator.clipboard.writeText(documentText);setStatus("Brief copied.");}catch{setStatus("Copy is unavailable in this browser. You can select and copy the summary text.");}}}>Copy</button><button className="button primary" disabled={!reviewed||!summary.trim()} onClick={()=>{setStatus("");window.print();}}>Print / Save as PDF</button></div>
      {status&&<p className="brief-status" role="status">{status}</p>}
      <article className="brief-print-document"><h2>elya | Appointment Brief</h2>{chosen.some(e=>e.demo)&&<p>Fictional demo history</p>}<p>{rangeLabel} · {loggedDays} logged {loggedDays===1?"day":"days"}</p>{statement.trim()&&<><h3>What I want understood</h3><p>{statement}</p></>}<div>{summary}</div>{questions.trim()&&<><h3>Questions for my appointment</h3><p>{questions}</p></>}{wearableNote&&<><h3>Wearable context (not used in forecasts)</h3><p>{wearableNote}</p></>}<h3>Source entries</h3>{chosen.map((e,i)=><section key={e.id}><h4>[{i+1}] {dateLabel(e.date)}</h4><p>{e.text}</p></section>)}<p>Unanswered days are unknown. Patient-reported information, not a diagnosis or a replacement for medical care.</p></article>
    </>}
  </section>;
}
