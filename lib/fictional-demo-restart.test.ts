// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {readFileSync} from 'node:fs';
import {beforeEach,expect,it} from 'vitest';
import {clearLearningData,loadFictionalLearning,restartFictionalLearning,exportLearningData,loadLearningBundle,REAL_PROFILE,currentPersonalOutlook} from './learning-store';
import type {LearningBundle} from './learning-types';
import {clearEntries,putEntry,loadEntries} from './storage';
import {computeLearning} from './learning-compute';
const fixture=JSON.parse(readFileSync('public/demos/maya-learning-v2.json','utf8')) as LearningBundle;
beforeEach(async()=>{await clearLearningData();await clearEntries();});
it('restores the starting scenario, archives the previous run and preserves personal data',async()=>{
 const privateEntry={id:'private',date:'2026-11-01',text:'Private personal words.',facts:[],symptomFree:false,demo:false};await putEntry(privateEntry);
 const personal=await currentPersonalOutlook([],'UTC',async task=>computeLearning(task),{asOf:'2026-11-14T18:00:00Z'});
 const altered=structuredClone(fixture);altered.result.targetDate='2026-11-16';altered.input.targetDate='2026-11-16';
 await loadFictionalLearning('maya','2026-11-15',async()=>altered);
 const restored=await restartFictionalLearning('maya','2026-11-15',async()=>structuredClone(fixture));
 expect(restored.result.targetDate).toBe('2026-11-15');expect(restored.physiology).toHaveLength(163);expect(restored.result.outlook.map(s=>s.band)).toEqual(fixture.result.outlook.map(s=>s.band));
 expect((await loadLearningBundle(REAL_PROFILE))?.result.state).toEqual(personal.result.state);expect(await loadEntries()).toEqual([privateEntry]);
 expect(Object.keys(await exportLearningData()).some(k=>k.startsWith('archived-demo-run:demo-maya:'))).toBe(true);
});
it('rejects a real-profile response without replacing the fictional run',async()=>{
 await loadFictionalLearning('maya','2026-11-15',async()=>structuredClone(fixture));
 const invalid=structuredClone(fixture);invalid.result.state.kind='real';
 await expect(restartFictionalLearning('maya','2026-11-15',async()=>invalid)).rejects.toThrow('profile mismatch');
 expect((await loadLearningBundle('demo-maya'))?.result.state.kind).toBe('synthetic');
});
