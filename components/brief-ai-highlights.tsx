'use client';
import {useEffect,useRef,useState} from 'react';
import type {Entry} from '../lib/model';
import {monthlySections} from '../lib/monthly-brief';
export function BriefAIHighlights({entries,month,onSource}:{entries:Entry[];month:string;onSource:(entry:Entry)=>void}){
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [items,setItems]=useState<{text:string;sourceIds:string[]}[]>([]);
 const signature=JSON.stringify({month,entries}),current=useRef(signature);current.current=signature;
 useEffect(()=>{setItems([]);setConsent(false);setError('');},[signature]);
 async function generate(){
  const issued=current.current;setBusy(true);setError('');
  try{
   const response=await fetch('/api/appointment-summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({month,entries,consentToServerProcessing:consent})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'AI highlights unavailable.');
   const allowed=monthlySections(entries).flatMap(s=>s.statements);
   if(data.month!==month||data.provenance!=='ai-selected-verified-statements'||!Array.isArray(data.statements)||!data.statements.length||data.statements.length>4||data.statements.some((s:{text:string;sourceIds:string[]})=>!allowed.some(a=>a.text===s.text&&JSON.stringify(a.sourceIds)===JSON.stringify(s.sourceIds))))throw Error('The highlights could not be matched to your entries.');
   if(current.current===issued)setItems(data.statements);
  }catch(e){if(current.current===issued)setError(e instanceof Error?e.message:'AI highlights unavailable.');}finally{setBusy(false);}
 }
 return <details className="brief-method ai-highlights"><summary>AI appointment highlights</summary>
  <p>AI can select up to four useful statements from this month’s entries. Their wording and source links stay unchanged.</p>
  {!items.length&&<><label className="checkbox"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Send this month’s selected journal entries to OpenAI to create highlights.</label><button className="button" disabled={!consent||busy} onClick={()=>void generate()}>{busy?'Preparing highlights…':'Create AI highlights'}</button></>}
  {items.length>0&&<><strong>AI-selected highlights · verified journal statements</strong><ul>{items.map((s,i)=><li key={i}>{s.text} {s.sourceIds.map(id=>{const entry=entries.find(e=>e.id===id)!;return <a key={id} href={'/journal?date='+entry.date} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onSource(entry);}}>[{entry.date}] </a>;})}</li>)}</ul><p>These optional highlights supplement the source-linked report below.</p></>}
  {error&&<p role="status">{error}</p>}
 </details>;
}
