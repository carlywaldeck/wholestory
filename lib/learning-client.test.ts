import {afterEach,expect,it,vi} from 'vitest';
import {loadPreparedMaya,runLearningTask} from './learning-client';
import {createPersonalLearner} from './personal-learning';
const input={kind:'synthetic',timeZone:'UTC',targetDate:'2026-11-15',asOf:'2026-11-14T23:00:00Z',days:[]};
const snapshot=()=>({persona:'maya',demoSeedVersion:'maya-prebleeding-2',input,physiology:[],entries:[{id:'fake',date:'2026-11-14',text:'Fictional',demo:true,persona:'maya',facts:[],symptomFree:false}],result:{state:createPersonalLearner('demo-maya','synthetic','UTC'),targetDate:input.targetDate,outlook:[]}});
afterEach(()=>vi.unstubAllGlobals());
it('loads Maya without creating a training worker',async()=>{
 const worker=vi.fn();vi.stubGlobal('Worker',worker);vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>snapshot()})));
 const bundle=await runLearningTask({op:'demo',persona:'maya',targetDate:'2026-12-01'});
 expect(worker).not.toHaveBeenCalled();expect(bundle.input.targetDate).toBe('2026-11-15');expect(bundle.result.state.kind).toBe('synthetic');
});
it('fails safely rather than starting a minutes-long replay when the asset is missing',async()=>{
 const worker=vi.fn();vi.stubGlobal('Worker',worker);vi.stubGlobal('fetch',vi.fn(async()=>({ok:false})));
 await expect(loadPreparedMaya()).rejects.toThrow('could not load');expect(worker).not.toHaveBeenCalled();
});
it('rejects a real profile masquerading as a prepared demo',async()=>{
 const payload=snapshot();payload.result.state=createPersonalLearner('personal-default','real','UTC');
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>payload})));
 await expect(loadPreparedMaya()).rejects.toThrow('could not be verified');
});
