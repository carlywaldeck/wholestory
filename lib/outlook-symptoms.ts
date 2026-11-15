import {checkinSymptoms} from './experience-checkins';
/** Display coverage only; does not change the learner or its feature selection. */
export const outlookSymptoms=[...checkinSymptoms,{key:'headache',label:'Headache',kind:'Pain'}] as const;
export const unavailableOutlookLabel=(symptom:string)=>symptom==='headache'?'Not enough history yet to forecast headache.':'Still learning your pattern';
