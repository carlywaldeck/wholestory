/** jsdom has no Worker runtime. Browser tests exercise the actual worker and full replay. */
import {computeLearning} from "../lib/learning-compute";
import {forecastDemo} from "../lib/forecast-demo";
import {forecastDemoJournal} from "../lib/forecast-demo-journal";
import {createPersonalLearner} from "../lib/personal-learning";
import {shiftDate} from "../lib/forecast-time";
import type {LearningTask} from "../lib/learning-types";
export async function executeTestLearning(task:LearningTask){
 if(task.op!=="demo")return computeLearning(task);
 // Production Sophie uses a fixed prepared sample day, independent of the wall clock.
 const targetDate=task.persona==="maya"?"2026-11-15":task.targetDate;
 const source=forecastDemo(task.persona,targetDate);
 source.input.asOf=shiftDate(targetDate,-1)+"T23:00:00Z";
 const bundle=computeLearning({op:"issue",state:createPersonalLearner("demo-"+task.persona,"synthetic","UTC"),input:source.input,physiology:source.physiology});
 return {...bundle,persona:task.persona,demoSeedVersion:task.persona==="maya"?"maya-prebleeding-2":undefined,entries:forecastDemoJournal(source),label:source.label,disclosure:source.disclosure};
}
