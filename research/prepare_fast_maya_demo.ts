import {readFileSync,writeFileSync} from 'node:fs';
import {issuePersonalOutlook} from '../lib/personal-learning';
import {forecastDemoJournal} from '../lib/forecast-demo-journal';
import {forecastDemo} from '../lib/forecast-demo';
// Reuse the previously computed, explicitly synthetic pre-bleeding replay.
// No displayed risk label is supplied by this script.
const fixture=JSON.parse(readFileSync(process.argv[2]??'research/fixtures/maya-demo-persona.json','utf8'));
const state={...fixture.learnerState,profileId:'demo-maya'};
const result=issuePersonalOutlook(state,fixture.forecastInput,fixture.physiology);
const source={...forecastDemo('maya','2026-11-20'),input:fixture.forecastInput,physiology:fixture.physiology};
const bundle={result,input:source.input,physiology:source.physiology,entries:forecastDemoJournal(source),persona:'maya',label:'Symptoms before bleeding',demoSeedVersion:'maya-prebleeding-2',disclosure:'Fictional pre-bleeding scenario. Computed estimates vary by symptom; this run does not establish accurate pain warnings or clinical reliability.'};
writeFileSync('public/demos/maya-learning-v2.json',JSON.stringify(bundle));
console.log(result.outlook.map(s=>[s.symptom,s.label]));
