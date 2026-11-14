import {Entry,report} from './model';
/** A compact first page with numbered source references; quotes get separate pages. */
export async function downloadBrief(entries:Entry[],statement:string,questions:string[],appendix:boolean,brand:string){
 const {jsPDF}=await import('jspdf');const p=new jsPDF();const r=report(entries);let y=19;
 const ref=(id:string)=>entries.findIndex(e=>e.id===id)+1;
 const line=(text:string,size=10,space=2)=>{p.setFontSize(size);const lines=p.splitTextToSize(text,174);p.text(lines,18,y);y+=lines.length*(size*.42)+space;};
 line(`${brand} | Appointment brief`,19,4);if(entries.some(e=>e.demo))line('SYNTHETIC DEMO DATA',9);
 line(`${r.range} | ${r.logged} logged days`,10);line('Patient-reported documentation. Unlogged days are unknown.',9,4);
 p.setFont('helvetica','bold');line('Symptoms & everyday impact',12);p.setFont('helvetica','normal');
 r.claims.forEach(c=>line(`${c.text} [${c.ids.map(ref).join(', ')}]`));
 const observed=entries.filter(e=>e.facts.some(f=>['Menstrual context','Timing','What helped'].includes(f.kind))).slice(0,2);
 if(observed.length){p.setFont('helvetica','bold');line('Recent context (latest two relevant entries)',11);p.setFont('helvetica','normal');observed.forEach(e=>{const f=e.facts.find(f=>['Menstrual context','Timing','What helped'].includes(f.kind))!;line(`${e.date}: "${f.quote.slice(0,180)}${f.quote.length>180?'…':''}" [${ref(e.id)}]`,9)});}
 if(statement.trim()){p.setFont('helvetica','bold');line('Patient statement (user authored)',11);p.setFont('helvetica','normal');line(statement.slice(0,600),9);}
 if(questions.length){p.setFont('helvetica','bold');line('Questions for my clinician',11);p.setFont('helvetica','normal');questions.forEach(q=>line(`- ${q}`,9));}
 p.setFont('helvetica','bold');line('Source key: numbered journal entries',10);p.setFont('helvetica','normal');
 // Three columns keep a month of source references compact and independently traceable.
 p.setFontSize(8);entries.forEach((e,i)=>{p.text(`[${i+1}] ${e.date}`,18+(i%3)*59,y+Math.floor(i/3)*4);});y+=Math.ceil(entries.length/3)*4+5;
 if(y>268){ // Never silently truncate a larger-than-MVP dataset.
 p.addPage();y=20;
 }
 line('Not a diagnosis or a treatment recommendation. Review with your clinician.',8);
 if(appendix){p.addPage();y=20;line('Evidence appendix',17);r.quotes.forEach(q=>{const content=`[${ref(q.id)}] ${q.date} | ${q.kind}: "${q.quote}"`;p.setFontSize(9);for(const row of p.splitTextToSize(content,174)){if(y>278){p.addPage();y=20;}p.text(row,18,y);y+=4.5}y+=3;});}
 p.save('wholestory-appointment-brief.pdf');
}
