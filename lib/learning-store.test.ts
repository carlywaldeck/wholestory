// @vitest-environment jsdom
import "fake-indexeddb/auto";
import {beforeEach,expect,it} from "vitest";
import {clearLearningData,currentPersonalOutlook,loadLearningBundle,learnerStorage,REAL_PROFILE,importLearningCSV} from "./learning-store";
import {computeLearning} from "./learning-compute";
import {createPersonalLearner,savePersonalLearner,loadPersonalLearner} from "./personal-learning";
import {riskSymptoms,type RiskInput} from "./symptom-risk";
import {putEntry,loadEntries,clearEntries} from "./storage";
const execute=async(task:Parameters<typeof computeLearning>[0])=>computeLearning(task);
const day=(date:string,value:boolean|null,availableAt:string)=>({date,availableAt,symptoms:Object.fromEntries(riskSymptoms.map(s=>[s,s==="fatigue"?value:null]))}) as RiskInput["days"][number];
beforeEach(async()=>{await clearLearningData();await clearEntries();});
it("serializes updates, freezes issued inputs, and links later outcomes without overwriting predictions",async()=>{
 const first=day("2026-11-14",false,"2026-11-14T17:00:00Z");
 const [a,b]=await Promise.all([currentPersonalOutlook([first],"UTC",execute,{asOf:"2026-11-14T18:00:00Z"}),currentPersonalOutlook([{...first,symptoms:{...first.symptoms,fatigue:true},availableAt:"2026-11-14T19:00:00Z"}],"UTC",execute,{asOf:"2026-11-14T20:00:00Z"})]);
 expect(b.result.state.records).toHaveLength(8);expect(b.result.state.records[1].x).toEqual(a.result.state.records[1].x);
 const frozen=structuredClone(a.result.state.records.find(r=>r.symptom==="fatigue")!);
 const c=await currentPersonalOutlook([first,day("2026-11-15",true,"2026-11-15T17:00:00Z")],"UTC",execute,{asOf:"2026-11-16T18:00:00Z"});
 const linked=c.result.state.records.find(r=>r.symptom==="fatigue"&&r.targetDate==="2026-11-15")!;
 expect(linked.outcomes.at(-1)?.occurred).toBe(true);expect(linked.estimate).toBe(frozen.estimate);expect(linked.x).toEqual(frozen.x);expect(linked.issuedAt).toBe(frozen.issuedAt);
 expect((await loadLearningBundle(REAL_PROFILE))?.result.state).toEqual(c.result.state);
});
it("keeps learner namespaces separate and preserves existing journal data",async()=>{
 const entry={id:"legacy",date:"2026-11-10",text:"Original personal words.",facts:[],symptomFree:false,demo:false};await putEntry(entry);
 await savePersonalLearner(learnerStorage,createPersonalLearner("demo-maya","synthetic","UTC"));
 await currentPersonalOutlook([],"UTC",execute,{asOf:"2026-11-14T18:00:00Z",entries:[entry]});
 expect((await loadPersonalLearner(learnerStorage,"demo-maya"))?.kind).toBe("synthetic");expect((await loadPersonalLearner(learnerStorage,REAL_PROFILE))?.kind).toBe("real");expect(await loadEntries()).toEqual([entry]);
});
it("clears queued state updates rather than resurrecting them after reset",async()=>{
 const update=currentPersonalOutlook([],"UTC",async task=>{await new Promise(r=>setTimeout(r,10));return computeLearning(task);},{asOf:"2026-11-14T18:00:00Z"});
 const reset=clearLearningData();await Promise.all([update,reset]);expect(await loadLearningBundle(REAL_PROFILE)).toBeNull();
});
it("imports normalized data at its receipt time without replacing an issued feature snapshot",async()=>{
 const initial=await currentPersonalOutlook([],"UTC",execute,{asOf:"2026-11-14T18:00:00Z"});
 const imported=await importLearningCSV("date,sleep_hours,temperature_deviation_c\n2026-11-14,6.5,0.2",{kind:"real",source:"oura",timeZone:"UTC",importedAt:"2026-11-14T19:00:00Z"},[],execute);
 expect(imported.physiology[0].availableAt).toBe("2026-11-14T19:00:00Z");expect(imported.result.state.records[0].x).toEqual(initial.result.state.records[0].x);
});
