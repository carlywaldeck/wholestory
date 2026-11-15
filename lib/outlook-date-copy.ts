import {shiftDate} from './forecast-time';
/** Presentation only: never relabel an issued forecast as a different day. */
export function outlookDateCopy(target:string|undefined,today:string){
 const date=target?new Date(target+'T12:00:00').toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}):'';
 const when=target===today?'today':target===shiftDate(today,1)?'tomorrow':target?'on '+date:'';
 return {heading:when==='today'?'Today’s outlook':when==='tomorrow'?'Tomorrow’s outlook':'Symptom outlook',when,
  followup:target?`Check in ${when} to record what actually happened.`:'Your check-ins record how you feel today. No forecast date is available yet.'};
}
