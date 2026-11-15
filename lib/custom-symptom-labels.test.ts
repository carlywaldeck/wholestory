import {expect,it} from 'vitest';
import {customSymptomLabels} from './custom-symptom-labels';
import {forecastDemo} from './forecast-demo';
import {forecastDemoJournal} from './forecast-demo-journal';
it('does not turn full fictional narratives into custom symptom buttons',()=>{
 expect(customSymptomLabels(forecastDemoJournal(forecastDemo('maya','2026-11-15')))).toEqual([]);
});
it('restores explicit custom bubbles, including absence, without reading arbitrary prose',()=>{
 const entry={id:'test',date:'2026-11-14',demo:false,symptomFree:false,text:'I reported dizziness.\nI reported no dizziness.',facts:[{kind:'Uncertainty' as const,value:'dizziness',quote:'I reported dizziness.'},{kind:'Uncertainty' as const,value:'No',quote:'I reported no dizziness.'}]};
 expect(customSymptomLabels([entry])).toEqual(['dizziness']);
});
