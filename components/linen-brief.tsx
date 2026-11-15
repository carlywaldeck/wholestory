"use client";
import { useEffect, useState } from "react";
import { copyText } from "../lib/copy-text";
import { type Entry } from "../lib/model";

const dateLabel=(date:string)=>new Date(date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
export {monthlySections,recordedSummary} from "../lib/monthly-brief";
import {monthlySections} from "../lib/monthly-brief";
import {BriefAIHighlights} from "./brief-ai-highlights";

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
  const documentText=["elya | Appointment Brief",label,chosen.some(e=>e.demo)?"Fictional demo history":"","Source-linked journal summary",loggedDays+" logged "+(loggedDays===1?"day":"days")+". Missing entries are unknown, not symptom-free.",...sections.map(section=>section.heading+"\n"+section.statements.map(s=>s.text+" ["+s.sourceIds.map(ref).join(", ")+"]").join("\n")),"Source entries",...chosen.map((e,i)=>"["+(i+1)+"] "+dateLabel(e.date)+"\n"+e.text),"Patient-reported information. Not a diagnosis or a replacement for medical care."].filter(Boolean).join("\n\n");
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
        <p className="monthly-generation-label">Your month at a glance</p><p className="brief-overview">{loggedDays} logged {loggedDays===1?"day":"days"} this month.{sections[0]?.heading==="Reported symptoms"?" "+sections[0].statements.slice(0,2).map(s=>s.text).join(" "):" Your recorded experiences are organized below."}</p><details className="brief-method"><summary>About this summary</summary><p className="monthly-generation-status">This report is generated locally from confirmed journal entries. Optional AI highlights select verified statements and require a server-side AI connection.</p><p>This summary is generated locally from confirmed entries. Each statement links to its source. Forecasts are not included as experienced symptoms.</p></details>
        <BriefAIHighlights entries={chosen} month={month} onSource={onSource}/>
        {sections.map(section=><section className="monthly-report-section" key={section.heading}><h3>{section.heading}</h3><ul>{section.statements.map((statement,i)=><li key={i}>{statement.text}<span className="brief-statement-sources">{statement.sourceIds.map(id=>{const entry=chosen.find(e=>e.id===id);return entry?<span key={id}>{sourceLink(entry,"["+ref(id)+"]")}</span>:null;})}</span></li>)}</ul></section>)}
      </div>
      <details className="brief-sources"><summary>Supporting Journal entries ({chosen.length})</summary><ol>{chosen.map(e=><li key={e.id}>{sourceLink(e,dateLabel(e.date))}<p>{e.text}</p></li>)}</ol></details>
      <div className="brief-export-actions"><button className="button" onClick={async()=>{try{await copyText(documentText);setStatus("Brief copied.");}catch{setStatus("Copy is unavailable in this browser. Select the report text to copy it.");}}}>Copy</button><button className="button" onClick={()=>window.print()}>Print</button><button className="button primary" disabled={busy} onClick={pdf}>{busy?"Saving PDF…":"Save as PDF"}</button></div>
      {status&&<p className="brief-status" role="status">{status}</p>}
      {active&&<article className="brief-print-document"><h2>elya | Appointment Brief</h2><div>{documentText.split("\n\n").slice(1).join("\n\n")}</div></article>}
    </>}
  </section>;
}
