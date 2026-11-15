import type {Entry} from './model';
/** Only explicit custom-chip facts create buttons; prose and demo narratives never do. */
export function customSymptomLabels(entries:Entry[]):string[]{
 const labels=entries.flatMap(e=>e.facts.flatMap(f=>{
  if(f.kind!=='Uncertainty')return [];
  const m=/^I reported (?:no )?([^.!?\n]{1,60})\.$/.exec(f.quote);
  return m?[m[1]]:[];
 }));
 return [...new Set(labels)];
}
