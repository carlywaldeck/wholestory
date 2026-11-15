import {expect,it} from 'vitest';
import {createMonthlyBriefPdf} from './monthly-brief-pdf';
import type {Entry} from './model';
const entry:Entry={id:'sample',date:'2026-11-14',text:'Full private narrative that should stay in the journal. Fatigue today. Missed activities.',facts:[{kind:'Fatigue',value:'Fatigue',quote:'Fatigue today.'},{kind:'Daily-life impact',value:'Missed activities',quote:'Missed activities.'}],demo:true,persona:'maya',symptomFree:false};
it('creates a concise one-page summary with source dates without dumping the raw journal',async()=>{
 const pdf=await createMonthlyBriefPdf([entry],'2026-11');const output=pdf.output();expect(pdf.getNumberOfPages()).toBe(1);expect(output).toContain('APPOINTMENT SUMMARY');expect(output).toContain('Missed activities');expect(output).toContain('Nov 14');expect(output).not.toContain('Full private narrative');expect(output).toContain('FICTIONAL DEMO HISTORY');
});
it('keeps an unrecorded detail unknown instead of calling it absent',async()=>{
 const pdf=await createMonthlyBriefPdf([{...entry,facts:[],text:'Original unstructured words.'}],'2026-11');const output=pdf.output();expect(output).toContain('Not recorded in confirmed details.');expect(output).not.toContain('No daily-life impact');expect(output).toContain('Missing days are unknown');
});
it('includes only verified AI-selected statements in the doctor overview',async()=>{
 const items=[{text:'“Missed activities.”',sourceIds:['sample']}];const pdf=await createMonthlyBriefPdf([entry],'2026-11',items);expect(pdf.output()).toContain('AI-selected key points');expect(pdf.output()).toContain('Missed activities');
});
it('rejects stale or invented AI summaries rather than exporting unsupported medical claims',async()=>{
 await expect(createMonthlyBriefPdf([entry],'2026-11',[{text:'Diagnosed endometriosis.',sourceIds:['sample']}])).rejects.toThrow('no longer matches');
});

it("keeps confirmed treatment and severity details even when AI highlights are present",async()=>{const e={...entry,text:entry.text+" Pain was moderate. Heat did not help.",facts:[...entry.facts,{kind:"Severity" as const,value:"Moderate",quote:"Pain was moderate."},{kind:"What helped" as const,value:"No benefit",quote:"Heat did not help."}]};const pdf=await createMonthlyBriefPdf([e],"2026-11",[{text:"Fatigue: reported on 1 day.",sourceIds:[e.id]}]);expect(pdf.output()).toContain("Heat did not help.");expect(pdf.output()).toContain("Pain was moderate.");expect(pdf.output()).not.toContain("Questions for the appointment");expect(pdf.output()).toContain("/journal?date=2026-11-14");});
it('keeps explicit absence separate from unknown and retains confirmed absence of daily impact',async()=>{
 const e={...entry,text:'No cramps today. Impact was unknown. No interference today.',facts:[{kind:'Pelvic pain' as const,value:'No',quote:'No cramps today.'},{kind:'Fatigue' as const,value:'Unknown',quote:'Impact was unknown.'},{kind:'Daily-life impact' as const,value:'No',quote:'No interference today.'}]};
 const pdf=await createMonthlyBriefPdf([e],'2026-11');expect(pdf.output()).toContain('Pelvic pain: explicitly absent on 1 logged day.');expect(pdf.output()).not.toContain('Fatigue: explicitly absent');expect(pdf.output()).toContain('No interference today.');
});
