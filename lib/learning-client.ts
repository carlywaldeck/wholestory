import {personalLearningSchema} from "./personal-learning";
import {riskInputSchema} from "./symptom-risk";
import type {LearningBundle,LearningTask} from "./learning-types";
/** Shipped synthetic snapshot computed offline by the actual learner, never scripted risk labels. */
export async function loadPreparedMaya():Promise<LearningBundle>{
 const response=await fetch("/demos/maya-learning-v3.json",{cache:"force-cache",signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error("Sophie’s demo could not load. Please try again; your personal journal is unchanged.");
 const bundle=await response.json() as LearningBundle;
 const state=personalLearningSchema.parse(bundle.result?.state),input=riskInputSchema.parse(bundle.input);
 if(bundle.persona!=="maya"||state.kind!=="synthetic"||state.profileId!=="demo-maya"||input.kind!=="synthetic"||state.timeZone!==input.timeZone||bundle.demoSeedVersion!=="sophie-irregular-3"||bundle.result.targetDate!==input.targetDate||!bundle.entries?.length||bundle.entries.some(e=>!e.demo||e.persona!=="maya"))
  throw Error("The fictional demo snapshot could not be verified.");
 return {...bundle,input,result:{...bundle.result,state},disclosure:"Fictional demo history with an intentionally short irregular cycle in November 2026. Computed by the learner; new check-ins remain fictional. Not a typical endometriosis pattern or clinical validation."};
}
export function runLearningTask(task:LearningTask):Promise<LearningBundle>{
 if(task.op==="demo"&&task.persona==="maya")return loadPreparedMaya();
 return new Promise((resolve,reject)=>{
  if(typeof Worker==="undefined"){reject(Error("This browser cannot run local learning workers. Your Journal is still available."));return;}
  const worker=new Worker(new URL("../workers/personal-learning.worker.ts",import.meta.url),{type:"module"});
  const timeout=setTimeout(()=>{worker.terminate();reject(Error("Local learning took too long. Your saved Journal is unchanged. Try again."));},180000);
  const done=()=>{clearTimeout(timeout);worker.terminate();};
  worker.onmessage=event=>{done();if(event.data.ok)resolve(event.data.bundle);else reject(Error(event.data.error));};
  worker.onerror=()=>{done();reject(Error("The local learning worker could not start. Your Journal is still available."));};
  worker.postMessage(task);
 });
}
