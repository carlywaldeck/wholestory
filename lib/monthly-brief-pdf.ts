import type {Entry} from './model';
import {sophieDemoBrief} from './sophie-demo-brief';
import {verifiedHighlights} from './appointment-overview';
import {monthlySections,type BriefStatement} from './monthly-brief';
const ink=[58,46,42] as const,muted=[107,91,86] as const,rose=[158,90,104] as const;
const clean=(text:string)=>text.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/…/g,'...');
const shortDate=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
/** Complete confirmed symptom table and optional verified AI selections. No forecasts. */
export async function createMonthlyBriefPdf(entries:Entry[],month:string,highlights:BriefStatement[]=[]){
 const {jsPDF}=await import('jspdf');const pdf=new jsPDF();
 const chosen=entries.filter(e=>e.date.startsWith(month+'-')).sort((a,b)=>a.date.localeCompare(b.date));
 if(new Set(chosen.map(e=>e.demo?`demo:${e.persona??'fictional'}`:'personal')).size>1)throw Error('Keep fictional and personal reports separate.');
 const overview=verifiedHighlights(chosen,month,highlights),sections=monthlySections(chosen);
 const days=new Set(chosen.map(e=>e.date)).size;
 const sophie=chosen.length>0&&chosen.every(e=>e.demo&&e.persona==="maya");
 const label=new Date(month+'-01T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'});
 const origin=typeof window!=='undefined'?window.location.origin:'https://elya.ingeniouscondor8.chatgpt.site';
 pdf.setProperties({title:`elya | Appointment summary | ${label}`,subject:'Confirmed patient-reported journal summary',creator:'elya'});
 let y=60;
 function text(value:string,x:number,top:number,size=10,bold=false,color:readonly number[]=ink){pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(color[0],color[1],color[2]);pdf.text(clean(value),x,top);}
 function ensure(height:number){if(y+height>270){pdf.addPage();text('elya',18,19,18,true);text(`${label} | Appointment summary`,18,28,9,false,muted);pdf.setDrawColor(232,221,217);pdf.line(18,33,192,33);y=43;return true;}return false;}
 function para(value:string,size=10,color:readonly number[]=ink){pdf.setFont('helvetica','normal');pdf.setFontSize(size);const lines=pdf.splitTextToSize(clean(value),174) as string[];const step=size*.45;for(const line of lines){ensure(step);text(line,18,y,size,false,color);y+=step;}y+=3;}
 function heading(value:string){ensure(24);y+=5;text(value,18,y,12,true,rose);y+=8;}
 function refs(ids:string[]){const numbers=[...new Set(ids.map(id=>chosen.findIndex(e=>e.id===id)+1).filter(n=>n>0))].sort((a,b)=>a-b);const groups:string[]=[];for(let i=0;i<numbers.length;i++){const start=numbers[i];let end=start;while(numbers[i+1]===end+1)end=numbers[++i];groups.push(end-start>=2?`${start}-${end}`:end>start?`${start}, ${end}`:String(start));}return '['+groups.join(', ')+']';}
 function statement(item:BriefStatement){para(`${item.text} ${refs(item.sourceIds)}`);}
 pdf.setFillColor(250,246,244);pdf.rect(0,0,210,48,'F');pdf.setFillColor(...rose);pdf.rect(18,14,1,24,'F');
 text('elya',23,22,26,true);text('APPOINTMENT SUMMARY',23,32,10,true,rose);text(label,23,41,11,false,muted);
 if(chosen.some(e=>e.demo))text('FICTIONAL DEMO HISTORY',128,19,8,true,rose);
 para(`${days} logged ${days===1?'day':'days'}${chosen.length?` | ${shortDate(chosen[0].date)} - ${shortDate(chosen.at(-1)!.date)}`:''}`,11);
 para('Missing days are unknown, not symptom-free. Only confirmed journal details are summarized.',9,muted);
 if(sophie)para(sophieDemoBrief(chosen,month).summary,10);
 if(overview.length){heading('AI-selected key points');para('AI-assisted summary: original wording checked against the confirmed entries.',9,muted);overview.forEach(statement);}
 const symptoms=sections.find(s=>s.heading==='Reported symptoms');heading('Reported symptoms');
 if(!symptoms)para('No confirmed symptom details were recorded for this month.',10,muted);
 else{
  function tableHeader(){pdf.setFillColor(237,229,225);pdf.rect(18,y-4,174,10,'F');text('Symptom',21,y+2,9,true);text('Days reported',100,y+2,9,true);text('Sources',143,y+2,9,true);y+=14;}
  tableHeader();
  for(const item of symptoms.statements){
   const name=item.text.split(':')[0],count=new Set(chosen.filter(e=>item.sourceIds.includes(e.id)).map(e=>e.date)).size;
   pdf.setFontSize(10);const names=pdf.splitTextToSize(clean(name),74) as string[];
   pdf.setFontSize(8);const citations=pdf.splitTextToSize(refs(item.sourceIds),47) as string[];
   const height=Math.max(10,Math.max(names.length,citations.length)*4.5+4);
   if(ensure(height+12))tableHeader();
   names.forEach((line,i)=>text(line,21,y+i*4.5));text(sophie?`${count} of ${days}`:String(count),108,y,10,true);citations.forEach((line,i)=>text(line,143,y+i*4.5,8,false,muted));
   y+=height;pdf.setDrawColor(232,221,217);pdf.line(18,y-4,192,y-4);
  }
 }
 const absent=sections.find(s=>s.heading==='Explicitly symptom-free days');if(absent){y+=3;absent.statements.forEach(statement);}
 const absentSymptoms=sections.find(s=>s.heading==='Symptoms explicitly reported absent');if(absentSymptoms){heading('Recorded absence');absentSymptoms.statements.forEach(statement);}
 const missing:string[]=[];
 for(const name of ['Severity and timing','Daily-life impact','What helped or did not help']){const section=sections.find(s=>s.heading===name);if(section){heading(name);section.statements.forEach(statement);}else missing.push(name.toLowerCase());}
 if(missing.length){heading('Details not recorded');para('Not recorded in confirmed details. '+missing.join('; ')+'.',9,muted);}
 heading('Source entries');para('Numbered references identify saved entries behind each statement. Open a date to review or correct it in the journal.',9,muted);
 const referenced=new Set(sections.flatMap(s=>s.statements.flatMap(item=>item.sourceIds)));
 const sourceEntries=[...chosen.entries()].filter(([,entry])=>referenced.has(entry.id));
 for(let index=0;index<sourceEntries.length;index+=4){ensure(7);sourceEntries.slice(index,index+4).forEach(([ref,entry],column)=>{const x=18+column*43.5;text(`[${ref+1}] ${shortDate(entry.date)}`,x,y,9,false,rose);pdf.link(x,y-4,41,5,{url:`${origin}/journal?date=${entry.date}`});});y+=6;}
 para('Forecasts and wearable measurements are not counted as experienced symptoms. Patient-reported information, not a diagnosis.',9,muted);
 const pages=pdf.getNumberOfPages();for(let n=1;n<=pages;n++){pdf.setPage(n);pdf.setDrawColor(232,221,217);pdf.line(18,279,192,279);text('Patient-reported information. Not a diagnosis or a replacement for medical care.',18,285,8,false,muted);text(`${n} / ${pages}`,181,291,8,false,muted);}
 return pdf;
}
export async function downloadMonthlyBrief(entries:Entry[],month:string,highlights:BriefStatement[]=[]){const pdf=await createMonthlyBriefPdf(entries,month,highlights);pdf.save(`elya-appointment-summary-${month}.pdf`);}
