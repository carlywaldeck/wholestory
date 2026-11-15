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
    try{const {downloadMonthlyBrief}=await import("../lib/monthly-brief-pdf");await downloadMonthlyBrief(chosen,month);}
    catch{setStatus("The PDF could not be saved. Try Print, then choose Save as PDF.");}
    finally{setBusy(false);}
  }
  const sourceLink=(entry:Entry,text:string)=><a href={"/journal?date="+entry.date} aria-label={"View Journal entry for "+dateLabel(entry.date)} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onSource(entry);}}>{text}</a>;
  return <section className="linen-panel appointment-document monthly-brief" aria-labelledby="brief-title">
    <div className="brief-heading"><h1 id="brief-title">Appointment Brief</h1><label className="brief-month-selector">Month<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label></div>
    {!valid?<p role="alert">Select a month.</p>:!chosen.length?<p className="monthly-brief-empty">No journal entries for this month.</p>:<>
      <div className="monthly-report-body">
        <p className="day-context-note">A source-linked record to bring to your next appointment.</p>
        <div className="monthly-report-title"><h2>{label}</h2><p>{loggedDays} logged {loggedDays===1?"day":"days"} · Missing entries are unknown.</p>{chosen.some(e=>e.demo)&&<span className="demo-chip">Fictional demo history</span>}</div>
        {sections.map(section=><section className="monthly-report-section" key={section.heading}><h3>{section.heading}</h3><ul>{section.statements.map((statement,i)=><li key={i}>{statement.text}<span className="brief-statement-sources">{statement.sourceIds.map(id=>{const entry=chosen.find(e=>e.id===id);return entry?<span key={id}>{sourceLink(entry,"["+ref(id)+"]")}</span>:null;})}</span></li>)}</ul></section>)}
      </div>
      <p className="brief-download-note">The PDF is a formatted appointment summary. Full journal entries stay in Supporting Journal entries below.</p><details className="brief-method"><summary>How this report is prepared</summary><p>This report is generated locally from confirmed journal entries. Each statement links to its source. Missing entries are unknown. Forecasts are not counted as experienced symptoms.</p></details>
      <BriefAIHighlights entries={chosen} month={month} onSource={onSource}/>
      <details className="brief-sources"><summary>Supporting Journal entries ({chosen.length})</summary><ol>{chosen.map(e=><li key={e.id}>{sourceLink(e,dateLabel(e.date))}<p>{e.text}</p></li>)}</ol></details>
      <div className="brief-export-actions"><button className="button" onClick={async()=>{try{await copyText(documentText);setStatus("Brief copied.");}catch{setStatus("Copy is unavailable in this browser. Select the report text to copy it.");}}}>Copy</button><button className="button" onClick={()=>window.print()}>Print</button><button className="button primary" disabled={busy} onClick={pdf}>{busy?"Saving PDF…":"Download report"}</button></div>
      {status&&<p className="brief-status" role="status">{status}</p>}
      {active&&<article className="brief-print-document"><h2>elya | Appointment Brief</h2><p>{label} · {loggedDays} logged days</p>{chosen.some(e=>e.demo)&&<p>Fictional demo history</p>}{sections.map(section=><section key={section.heading}><h3>{section.heading}</h3>{section.statements.map((s,i)=><p key={i}>{s.text} ({s.sourceIds.map(id=>chosen.find(e=>e.id===id)?.date).filter(Boolean).join(", ")})</p>)}</section>)}<p>Missing entries are unknown. Patient-reported information, not a diagnosis.</p></article>}
    </>}
  </section>;
}
