import {describe,it,expect,beforeEach} from 'vitest';
import 'fake-indexeddb/auto';
import {Entry,insights,report,validateEntry,extractionSchema,validateEvidence} from './model';
import {putEntry,loadEntries,deleteEntry,clearEntries,importEntries} from './storage';
const e:Entry={id:'a',date:'2026-11-01',text:'Pain. Missed class.',facts:[{kind:'Pelvic pain',value:'Pain',quote:'Pain.'},{kind:'Daily-life impact',value:'Missed class',quote:'Missed class.'}],symptomFree:false,demo:false};
describe('evidence-first analytics',()=>{
it('counts distinct days rather than entries',()=>{const s=insights([e,{...e,id:'b'}]);expect(s.logged).toBe(1);expect(s.items.find(x=>x.kind==='Pelvic pain')?.days).toBe(1);expect(s.items.find(x=>x.kind==='Daily-life impact')?.days).toBe(1)});
it('distinguishes missing and explicitly symptom-free days',()=>{const s=insights([e,{...e,id:'c',date:'2026-11-03',text:'No symptoms.',facts:[],symptomFree:true}]);expect(s.logged).toBe(2);expect(s.free).toBe(1)});
it('handles empty data',()=>{expect(insights([]).logged).toBe(0);expect(report([]).claims).toEqual([])});
it('rejects invented quotes and malformed output',()=>{expect(validateEvidence(e.text,[{...e.facts[0],quote:'Severe pain'}])).toBe(false);expect(()=>validateEntry({...e,facts:[{...e.facts[0],quote:'invented'}]})).toThrow();expect(extractionSchema.safeParse({facts:[],symptomFree:false,followUp:['two','questions']}).success).toBe(false)});
it('requires source links for every computed report claim',()=>{const r=report([e]);expect(r.claims).toHaveLength(2);for(const c of r.claims){expect(c.ids).toEqual(['a']);expect(c.days).toBe(1)}expect(r.quotes.every(q=>e.text.includes(q.quote))).toBe(true);expect(JSON.stringify(r)).not.toContain('diagnosis')});
it('rejects contradictory symptom-free records',()=>expect(()=>validateEntry({...e,symptomFree:true})).toThrow());
});
describe('persistence',()=>{beforeEach(clearEntries);it('saves, edits, and deletes records',async()=>{await putEntry(e);await putEntry({...e,text:'Pain.',facts:[e.facts[0]]});expect((await loadEntries())[0].facts).toHaveLength(1);await deleteEntry('a');expect(await loadEntries()).toEqual([])});it('validates all imports before mutation',async()=>{await expect(importEntries([e,{...e,id:'b',text:'unsupported'}])).rejects.toThrow();expect(await loadEntries()).toEqual([])})});
