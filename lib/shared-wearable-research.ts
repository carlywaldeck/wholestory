/** Shared-model research utilities. Never called by the live forecast API. */
import {fitPersonalLogistic,type LearningRow} from "./combined-forecast-candidate";
export type SharedResearchRow=LearningRow&{featureDate:string;coreSensorsComplete:boolean};
export const sharedWearableFeatures={
  history:[0,1,2,3],
  // Sleep level plus source-specific changes from at least seven prior readings.
  // Absolute HR, HRV, temperature and steps are excluded from this fixed experiment.
  wearable:[4,5,7,9,11,13],
} as const;

export function groupedTemporalFolds(people:{rows:SharedResearchRow[]}[]){
  const dates=[...new Set(people.flatMap(p=>p.rows.map(r=>r.date)))].sort();
  if(dates.length<10)throw Error("Too few distinct dates");
  const cutoffDate=dates[Math.floor(dates.length*.7)],cutoff=Date.parse(cutoffDate+"T00:00:00Z");
  for(const person of people)for(const row of person.rows){
    if(row.featureDate>=row.date)throw Error("Target-day or future features");
    if(!Number.isFinite(Date.parse(row.availableAt)))throw Error("Invalid target availability");
  }
  return {cutoffDate,folds:Array.from({length:5},(_,fold)=>({
    fold,
    training:people.flatMap((p,index)=>index%5===fold?[]:p.rows
      .filter(r=>r.date<cutoffDate&&Date.parse(r.availableAt)<=cutoff)
      .map(row=>({personIndex:index,row}))),
    testing:people.flatMap((p,index)=>index%5!==fold?[]:[{personIndex:index,rows:p.rows.filter(r=>r.date>=cutoffDate)}]),
  }))};
}

export function fitSharedWearableModels(rows:SharedResearchRow[]){
  const events=rows.reduce((s,r)=>s+r.y,0);
  if(rows.length<200||events<20||rows.length-events<20)return null;
  const history=fitPersonalLogistic(rows,[...sharedWearableFeatures.history]);
  const wearable=fitPersonalLogistic(rows,[...sharedWearableFeatures.wearable]);
  const combined=fitPersonalLogistic(rows,[...sharedWearableFeatures.history,...sharedWearableFeatures.wearable]);
  const prevalence=(events+1)/(rows.length+2);
  const transition=(previous:boolean)=>{
    const same=rows.filter(r=>r.previous===previous);
    return (same.reduce((s,r)=>s+r.y,0)+4*prevalence)/(same.length+4);
  };
  return {predict:(row:SharedResearchRow)=>({history:history.predict(row.x),wearable:wearable.predict(row.x),
    combined:combined.predict(row.x),prevalence,transition:transition(row.previous),persistence:Number(row.previous)})};
}
