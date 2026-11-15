import type {LearningBundle,LearningTask} from "./learning-types";
export function runLearningTask(task:LearningTask):Promise<LearningBundle>{
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
