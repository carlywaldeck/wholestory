import type {Entry} from './model';
import {monthlySections} from './monthly-brief';
const ink=[84,55,45] as const, muted=[115,88,76] as const, rose=[158,90,104] as const;
const clean=(text:string)=>text.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/…/g,'...');
const shortDate=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
/** Patient-reported summary only. Forecasts and wearable readings are not counted as symptoms. */
export async function createMonthlyBriefPdf(entries:Entry[],month:string){
 const {jsPDF}=await import('jspdf');const pdf=new jsPDF();
 const chosen=entries.filter(e=>e.date.startsWith(month+'-')).sort((a,b)=>a.date.localeCompare(b.date));
 const sections=monthlySections(chosen),days=new Set(chosen.map(e=>e.date)).size;
 const label=new Date(month+'-01T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'});
 let y=20;
 const text=(value:string,x:number,top:number,size=10,bold=false,color:readonly number[]=ink)=>{pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(color[0],color[1],color[2]);pdf.text(clean(value),x,top);};
 const ensure=(height:number)=>{if(y+height>270){pdf.addPage();y=24;text('elya | Appointment summary - continued',18,y,12,true);y+=12;}};
 const para=(value:string,size=10,color:readonly number[]=ink)=>{pdf.setFont('helvetica','normal');pdf.setFontSize(size);const lines=pdf.splitTextToSize(clean(value),174);ensure(lines.length*5+3);pdf.setTextColor(color[0],color[1],color[2]);pdf.text(lines,18,y);y+=lines.length*5+3;};
 const heading=(value:string)=>{ensure(20);y+=5;text(value,18,y,11,true,rose);y+=7;};
 const dates=(ids:string[])=>[...new Set(ids.map(id=>chosen.find(e=>e.id===id)?.date).filter((d):d is string=>!!d))].map(shortDate).join(', ');
 pdf.setFillColor(249,240,242);pdf.rect(0,0,210,48,'F');
 text('elya',18,19,24,true);text('APPOINTMENT SUMMARY',18,30,10,true,rose);text(label,18,40,11,false,muted);
 if(chosen.some(e=>e.demo))text('FICTIONAL DEMO - SOPHIE',127,20,9,true,rose);
 y=59;
 para(`${days} logged ${days===1?'day':'days'}${chosen.length?` | ${shortDate(chosen[0].date)} - ${shortDate(chosen.at(-1)!.date)}`:''}. Missing days are unknown, not symptom-free.`,10,muted);
 const symptoms=sections.find(s=>s.heading==='Reported symptoms');
 heading('At a glance');
 const positiveIds=new Set(symptoms?.statements.flatMap(s=>s.sourceIds)??[]);const positiveDays=new Set(chosen.filter(e=>positiveIds.has(e.id)).map(e=>e.date)).size;const impactIds=new Set(sections.find(s=>s.heading==='Daily-life impact')?.statements.flatMap(s=>s.sourceIds)??[]);const impactDays=new Set(chosen.filter(e=>impactIds.has(e.id)).map(e=>e.date)).size;
 para(positiveDays?`Symptoms were explicitly reported on ${positiveDays} logged ${positiveDays===1?'day':'days'}.${impactDays?` Daily-life impact was recorded on ${impactDays} ${impactDays===1?'day':'days'}.`:''}`:'No confirmed symptom details were recorded for this month.');
 if(symptoms){
  y+=3;pdf.setFillColor(246,241,238);pdf.roundedRect(18,y-4,174,9,2,2,'F');text('Reported symptom',21,y+2,9,true);text('Reported days / dates',103,y+2,9,true);y+=13;
  for(const statement of symptoms.statements.slice(0,6)){
   const split=statement.text.split(':');const sourceDates=dates(statement.sourceIds);pdf.setFontSize(9);const lines=pdf.splitTextToSize(clean(split.slice(1).join(':').trim()+' '+sourceDates),85);ensure(Math.max(8,lines.length*4+3));text(split[0],21,y,10);text(lines.join('\n'),103,y,9,false,muted);y+=Math.max(9,lines.length*4+3);
  }
  if(symptoms.statements.length>6)para(`${symptoms.statements.length-6} additional symptom categories are available in the journal.`,9,muted);
 }
 for(const name of ['Severity and timing','Daily-life impact','What helped or did not help']){
  const section=sections.find(s=>s.heading===name);heading(name);
  if(!section){para('Not recorded in confirmed details.',9,muted);continue;}
  for(const statement of section.statements.slice(0,2)){para(statement.text,10);para('Reported '+dates(statement.sourceIds),8,muted);}
  if(section.statements.length>2)para('Additional observations are available in the source journal.',8,muted);
 }
 heading('Questions for the appointment');
 for(const q of ['What evaluation would you recommend for these symptoms?','Could the timing around bleeding be relevant?','What should I record before our next appointment?'])para('- '+q,9);
 const pages=pdf.getNumberOfPages();for(let n=1;n<=pages;n++){pdf.setPage(n);pdf.setDrawColor(232,221,217);pdf.line(18,279,192,279);text('Patient-reported information. Not a diagnosis or a replacement for medical care.',18,285,8,false,muted);text(`${n} / ${pages}`,181,291,8,false,muted);}
 return pdf;
}
export async function downloadMonthlyBrief(entries:Entry[],month:string){const pdf=await createMonthlyBriefPdf(entries,month);pdf.save(`elya-appointment-summary-${month}.pdf`);}
