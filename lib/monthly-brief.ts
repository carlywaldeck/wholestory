import {categories,isPresentFact,type Entry} from "./model";
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

