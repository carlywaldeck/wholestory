/** jsdom has no Worker runtime. Browser tests exercise the actual worker and full replay. */
import {computeLearning} from "../lib/learning-compute";
import {forecastDemo} from "../lib/forecast-demo";
import {forecastDemoJournal} from "../lib/forecast-demo-journal";
import {createPersonalLearner} from "../lib/personal-learning";
import {shiftDate} from "../lib/forecast-time";
import type {LearningTask} from "../lib/learning-types";
export async function executeTestLearning(task:LearningTask){
 if(task.op!=="demo")return computeLearning(task);
 const source=forecastDemo(task.persona,task.targetDate);
 source.input.asOf=shiftDate(task.targetDate,-1)+"T23:00:00Z";
 const bundle=computeLearning({op:"issue",state:createPersonalLearner("demo-"+task.persona,"synthetic","UTC"),input:source.input,physiology:source.physiology});
 return {...bundle,persona:task.persona,entries:forecastDemoJournal(source),label:source.label,disclosure:source.disclosure};
}
