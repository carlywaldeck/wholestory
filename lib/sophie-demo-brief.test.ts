import {expect,it} from 'vitest';
import prepared from '../public/demos/maya-learning-v3.json';
import {sophieDemoBrief} from './sophie-demo-brief';
import {validateEntry,isPresentFact,type Entry} from './model';
import {personalLearningSchema} from './personal-learning';
import {symptomRiskOutlook} from './symptom-risk-outlook';
const entries=prepared.entries.filter(e=>e.date>='2026-11-01') as Entry[];
it('ships one internally consistent fictional seed, with varied symptoms and recorded impact',()=>{
 expect(entries).toHaveLength(14);entries.forEach(e=>{expect(e.demo).toBe(true);validateEntry(e);expect(e.text).not.toMatch(/I reported (?:no )?.*today|no interference/i);});
 for(const [key,kind,n] of [['pelvicPain','Pelvic pain',5],['fatigue','Fatigue',6],['bloating','Bloating',6]] as const){expect(entries.filter(e=>e.facts.some(f=>f.kind===kind&&isPresentFact(f)))).toHaveLength(n);for(const e of entries)expect(e.facts.some(f=>f.kind===kind&&isPresentFact(f))).toBe(prepared.input.days.find(d=>d.date===e.date)!.symptoms[key]);}
 expect(entries.filter(e=>e.facts.some(f=>f.kind==='Daily-life impact'&&isPresentFact(f)))).toHaveLength(3);
 expect(entries.find(e=>e.date==='2026-11-14')!.facts.some(f=>f.kind==='Daily-life impact')).toBe(false);
});
it('keeps frozen November 14 forecasts prospective and genuinely high for fatigue and bloating',()=>{
 const state=personalLearningSchema.parse(prepared.result.state);
 const rows=state.records.filter(r=>r.targetDate==='2026-11-14');
 for(const row of state.records)for(const outcome of row.outcomes){expect(outcome.reportedAt>row.issuedAt).toBe(true);expect(outcome.reportedAt.slice(0,10)>=row.targetDate).toBe(true);}
 const outlook=symptomRiskOutlook(rows.map(r=>({symptom:r.symptom,candidateEstimate:r.estimate})),'2026-11-14');
 for(const symptom of ['fatigue','bloating'])expect(outlook.find(s=>s.symptom===symptom)?.band).toBe('high');
 expect(rows.every(r=>r.issuedAt<'2026-11-14')).toBe(true);
 expect(prepared.input.cycle.periodStarts.every(s=>s.date<'2026-11-15')).toBe(true);
});
it('computes concise counts and only claims before-period timing when supported',()=>{
 const report=sophieDemoBrief(entries,'2026-11');expect(report.summary).toContain('pelvic pain was reported on 5 of 14 logged days');expect(report.summary).toContain('mostly recorded before a period');expect(report.summary).toContain('affected on 3 days');expect(report.sections.some(s=>s.heading==='Symptoms explicitly reported absent')).toBe(false);expect(report.dates.some(s=>s.heading==='Symptoms explicitly reported absent')).toBe(true);
 const withoutContext=entries.map(e=>({...e,facts:e.facts.filter(f=>f.kind!=='Menstrual context')}));expect(sophieDemoBrief(withoutContext,'2026-11').summary).not.toContain('before a period');
});
