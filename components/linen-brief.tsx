"use client";
import { useEffect, useState } from "react";
import { copyText } from "../lib/copy-text";
import { categories, isPresentFact, type Entry } from "../lib/model";

const dateLabel=(date:string)=>new Date(date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
export type BriefStatement={text:string;sourceIds:string[]};
export type BriefSection={heading:string;statements:BriefStatement[]};
export function monthlySections(entries:Entry[]):BriefSection[] {
  const ordered=[...entries].sort((a,b)=>a.date.localeCompare(b.date));
  const sections:BriefSection[]=[];
  const counts=new Map<string,{dates:Set<string>;ids:Set<string>}>();
  for(const e of ordered)for(const f of e.facts){
    if(!categories.includes(f.kind as typeof categories[number])||!isPresentFact(f)||!e.text.includes(f.quote))continue;
    const row=counts.get(f.kind)??{dates:new Set<string>(),ids:new Set<string>()};row.dates.add(e.date);row.ids.add(e.id);counts.set(f.kind,row);
  }
  if(counts.size)sections.push({heading:"Reported symptoms",statements:[...counts].sort((a,b)=>b[1].dates.size-a[1].dates.size).map(([kind,row])=>({text:kind+": reported on "+row.dates.size+(row.dates.size===1?" day.":" days."),sourceIds:[...row.ids]}))});
  for(const [heading,kinds] of [["Severity and timing",["Severity","Fatigue score","Timing","Menstrual context"]],["Daily-life impact",["Daily-life impact"]],["What helped or did not help",["Intervention","What helped","Medication effect"]]] as const){
    const quotes=new Map<string,Set<string>>();
    for(const e of ordered)for(const f of e.facts){
      if(!(kinds as readonly string[]).includes(f.kind)||!e.text.includes(f.quote)||(f.kind==="Daily-life impact"&&!isPresentFact(f)))continue;
      const context=e.journal?.provenance.find(p=>p.quote===f.quote&&p.symptom)?.symptom;const wording=context?context+": “"+f.quote+"”":"“"+f.quote+"”";const ids=quotes.get(wording)??new Set<string>();ids.add(e.id);quotes.set(wording,ids);
    }
    if(quotes.size)sections.push({heading,statements:[...quotes].map(([quote,ids])=>({text:quote,sourceIds:[...ids]}))});
  }
  const absent=ordered.filter(e=>e.symptomFree);
  if(absent.length)sections.push({heading:"Explicitly symptom-free days",statements:[{text:"No symptoms explicitly reported on "+new Set(absent.map(e=>e.date)).size+" day(s).",sourceIds:absent.map(e=>e.id)}]});
  const unstructured=ordered.filter(e=>!e.facts.length&&!e.symptomFree);
  if(unstructured.length)sections.push({heading:"In their words",statements:unstructured.map(e=>({text:"“"+e.text+"”",sourceIds:[e.id]}))});
  return sections;
}
export function recordedSummary(entries:Entry[]) {
  return monthlySections(entries).map(section=>section.heading+"\n"+section.statements.map(s=>s.text).join("\n")).join("\n\n");
}

export function LinenBrief({entries,today,onSource,active=true}: {entries:Entry[];today:string;onSource:(entry:Entry)=>void;onJournal?:()=>void;active?:boolean;wearableNote?:string}) {
  const [month,setMonth]=useState(today.slice(0,7));
  const [status,setStatus]=useState("");const [busy,setBusy]=useState(false);
  const valid=/^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const chosen=valid?entries.filter(e=>e.date.startsWith(month+"-")&&e.date<=today).sort((a,b)=>a.date.localeCompare(b.date)):[];
  const sections=monthlySections(chosen);
  const label=valid?new Date(month+"-01T12:00:00").toLocaleDateString(undefined,{month:"long",year:"numeric"}):"";
  const loggedDays=new Set(chosen.map(e=>e.date)).size;
  const signature=JSON.stringify(chosen);
  useEffect(()=>setStatus(""),[month,signature]);
  const ref=(id:string)=>chosen.findIndex(e=>e.id===id)+1;
  const documentText=["elya | Appointment Brief",label,chosen.some(e=>e.demo)?"Fictional demo history":"","Source-linked journal summary (AI generation not connected)",loggedDays+" logged "+(loggedDays===1?"day":"days")+". Missing entries are unknown, not symptom-free.",...sections.map(section=>section.heading+"\n"+section.statements.map(s=>s.text+" ["+s.sourceIds.map(ref).join(", ")+"]").join("\n")),"Source entries",...chosen.map((e,i)=>"["+(i+1)+"] "+dateLabel(e.date)+"\n"+e.text),"Patient-reported information. Not a diagnosis or a replacement for medical care."].filter(Boolean).join("\n\n");
  async function pdf(){
    setBusy(true);setStatus("");
    try{const {downloadMonthlyBrief}=await import("../lib/monthly-brief-pdf");await downloadMonthlyBrief(documentText,month);}
    catch{setStatus("The PDF could not be saved. Try Print, then choose Save as PDF.");}
    finally{setBusy(false);}
  }
  const sourceLink=(entry:Entry,text:string)=><a href={"/journal?date="+entry.date} aria-label={"View Journal entry for "+dateLabel(entry.date)} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onSource(entry);}}>{text}</a>;
  return <section className="linen-panel appointment-document monthly-brief" aria-labelledby="brief-title">
    <div className="brief-heading"><h1 id="brief-title">Appointment Brief</h1><label className="brief-month-selector">Month<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label></div>
    {!valid?<p role="alert">Select a month.</p>:!chosen.length?<p className="monthly-brief-empty">No journal entries for this month.</p>:<>
      <div className="monthly-report-body">
        <p className="day-context-note">Confirmed Journal observations only. Experimental forecasts and observed wearable readings are separate context and are not counted as reported symptoms.</p>
        <div className="monthly-report-title"><h2>{label}</h2><p>{loggedDays} logged {loggedDays===1?"day":"days"} · Missing entries are unknown.</p>{chosen.some(e=>e.demo)&&<span className="demo-chip">Fictional demo history</span>}</div>
        <p className="monthly-generation-label">Source-linked journal summary</p><p className="monthly-generation-status">AI-generated summary unavailable: a monthly AI service is not connected.</p>
        {sections.map(section=><section className="monthly-report-section" key={section.heading}><h3>{section.heading}</h3><ul>{section.statements.map((statement,i)=><li key={i}>{statement.text}<span className="brief-statement-sources">{statement.sourceIds.map(id=>{const entry=chosen.find(e=>e.id===id);return entry?<span key={id}>{sourceLink(entry,"["+ref(id)+"]")}</span>:null;})}</span></li>)}</ul></section>)}
      </div>
      <details className="brief-sources"><summary>Supporting Journal entries ({chosen.length})</summary><ol>{chosen.map(e=><li key={e.id}>{sourceLink(e,dateLabel(e.date))}<p>{e.text}</p></li>)}</ol></details>
      <div className="brief-export-actions"><button className="button" onClick={async()=>{try{await copyText(documentText);setStatus("Brief copied.");}catch{setStatus("Copy is unavailable in this browser. Select the report text to copy it.");}}}>Copy</button><button className="button" onClick={()=>window.print()}>Print</button><button className="button primary" disabled={busy} onClick={pdf}>{busy?"Saving PDF…":"Save as PDF"}</button></div>
      {status&&<p className="brief-status" role="status">{status}</p>}
      {active&&<article className="brief-print-document"><h2>elya | Appointment Brief</h2><div>{documentText.split("\n\n").slice(1).join("\n\n")}</div></article>}
    </>}
  </section>;
}
