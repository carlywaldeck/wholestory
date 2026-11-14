/** Retrospective three-day planning experiment. No live API integration. */
import {candidateMetrics,chooseOnsetThreshold,fitPersonalLogistic,type LearningRow} from "./combined-forecast-candidate";
import {calendarGap,forecastSchedule,localDate,shiftDate} from "./forecast-time";
import {riskInputSchema,riskSymptoms,type RiskInput,type RiskSymptom} from "./symptom-risk";

export type WindowRow=LearningRow&{endDate:string};
const columns=[0,1,2,3];
const mean=(a:number[])=>a.reduce((s,v)=>s+v,0)/a.length;
const enough=(rows:WindowRow[],n=60,events=8)=>rows.length>=n&&rows.filter(r=>r.y===1).length>=events&&rows.filter(r=>r.y===0).length>=events;

export function threeDayLabel(values:(boolean|null|undefined)[]):number|null {
  if(values.length!==3)throw Error("Exactly three calendar-day labels required");
  if(values.some(v=>v===true))return 1;
  return values.every(v=>v===false)?0:null;
}

export function matureBefore(rows:WindowRow[],date:string,cutoff:number){
  return rows.filter(r=>r.endDate<date&&Date.parse(r.availableAt)<=cutoff);
}

export function nonoverlappingWindows(rows:WindowRow[],anchor:string){
  return rows.filter(r=>calendarGap(r.date,anchor)%3===0);
}

export function buildThreeDayExamples(raw:RiskInput,symptom:RiskSymptom){
  const input=riskInputSchema.parse(raw),seen=new Set<string>();
  for(const day of input.days){
    if(seen.has(day.date))throw Error("Duplicate journal date");
    if(localDate(day.availableAt,input.timeZone)<day.date)throw Error("Report available before measurement day");
    seen.add(day.date);
  }
  const schedule=forecastSchedule(input.targetDate,input.asOf,input.timeZone);
  const known=input.days.filter(d=>d.date<input.targetDate&&Date.parse(d.availableAt)<=Date.parse(input.asOf)).sort((a,b)=>a.date.localeCompare(b.date));
  const byDate=new Map(known.map(d=>[d.date,d]));
  const featureAt=(date:string)=>{
    const origin=date===input.targetDate?Date.parse(input.asOf):schedule.origin(date);
    if(origin===null)return null;
    const floor=input.cycle&&Date.parse(input.cycle.availableAt)<=origin?input.cycle.regimeSince:"0000-01-01";
    const history=known.filter(d=>d.date<date&&d.date>=floor&&Date.parse(d.availableAt)<=origin&&d.symptoms[symptom]!==null);
    const prior=history.find(d=>d.date===shiftDate(date,-1));
    if(!prior)return null;
    const rates=[3,7].map(n=>history.filter(d=>d.date>=shiftDate(date,-n)).map(d=>Number(d.symptoms[symptom])));
    return [Number(prior.symptoms[symptom]),...rates.map(a=>a.length?mean(a):null),rates[1].length];
  };
  const rows:WindowRow[]=[];
  for(const day of known){
    const endDate=shiftDate(day.date,2);
    // Exclude immature windows even when an early positive is already observed.
    if(endDate>=input.targetDate||day.date<shiftDate(input.targetDate,-180))continue;
    const days=[0,1,2].map(n=>byDate.get(shiftDate(day.date,n)));
    const y=threeDayLabel(days.map(d=>d?.symptoms[symptom] as boolean|null|undefined));
    if(y===null)continue;
    const x=featureAt(day.date);
    if(!x)continue;
    const close=schedule.origin(shiftDate(endDate,1));
    if(close===null)continue;
    const availableAt=new Date(Math.max(close,...days.map(d=>d?Date.parse(d.availableAt):0))).toISOString();
    if(Date.parse(availableAt)>Date.parse(input.asOf))continue;
    rows.push({date:day.date,endDate,availableAt,x,y,previous:Boolean(x[0])});
  }
  return {input,rows,featureAt,schedule,anchor:known[0]?.date??input.targetDate};
}

/** Earlier prequential validation; refresh models every 21 calendar days. */
export function learnThreeDayPolicy(rows:WindowRow[],anchor:string,origin:(date:string)=>number|null){
  const predictions:{y:number;p:number}[]=[];
  const cached=new Map<string,ReturnType<typeof fitPersonalLogistic>|null>();
  if(!rows.length)return chooseOnsetThreshold(predictions);
  const first=rows[0].date;
  for(const row of nonoverlappingWindows(rows,anchor)){
    // Validation windows are nonoverlapping and fixed to the source study-day anchor.
    if(row.previous||calendarGap(row.date,first)<45)continue;
    const blockStart=shiftDate(first,21*Math.floor(calendarGap(row.date,first)/21));
    if(!cached.has(blockStart)){
      const cutoff=origin(blockStart);
      const train=cutoff===null?[]:matureBefore(rows,blockStart,cutoff);
      cached.set(blockStart,enough(train,30,5)?fitPersonalLogistic(train,columns):null);
    }
    const fit=cached.get(blockStart);
    if(fit)predictions.push({y:row.y,p:fit.predict(row.x)});
  }
  return chooseOnsetThreshold(predictions);
}

export function threeDayForecastCandidate(raw:RiskInput){
  return {model:"three-day-history-planning-candidate",horizonDays:3,clinicalValidation:false,activeInPublicApp:false,
    symptoms:riskSymptoms.map(symptom=>{
      const {input,rows,featureAt,schedule,anchor}=buildThreeDayExamples(raw,symptom);
      const split=Math.floor(rows.length*.7),tail=rows.slice(split),firstTest=tail[0]?.date;
      const cutoff=firstTest?schedule.origin(firstTest):null;
      const train=cutoff===null||!firstTest?[]:matureBefore(rows.slice(0,split),firstTest,cutoff);
      const test=nonoverlappingWindows(tail,anchor);
      const policy=learnThreeDayPolicy(train,anchor,date=>schedule.origin(date));
      const evaluation=enough(train)&&test.length>=5?(()=>{
        const fit=fitPersonalLogistic(train,columns);
        const base=(train.reduce((s,r)=>s+r.y,0)+1)/(train.length+2);
        const predicted=test.map(r=>({...r,p:fit.predict(r.x)}));
        const transitions=(previous:boolean)=>{
          const same=train.filter(r=>r.previous===previous);
          return (same.reduce((s,r)=>s+r.y,0)+4*base)/(same.length+4);
        };
        const onset=predicted.filter(r=>!r.previous);
        return {trainingOrigins:train.length,testWindows:test.length,firstTestTarget:firstTest!,
          lastTrainingWindowEnd:train.at(-1)!.endDate,
          history:candidateMetrics(predicted),
          transition:candidateMetrics(test.map(r=>({...r,p:transitions(r.previous)}))),
          prevalence:candidateMetrics(test.map(r=>({...r,p:base}))),
          persistence:candidateMetrics(test.map(r=>({...r,p:Number(r.previous)}))),
          policy,policyComparison:policy.threshold===null?null:{
            selected:candidateMetrics(onset,policy.threshold).newOnset,
            fixed:candidateMetrics(onset).newOnset},
        };
      })():null;
      const x=featureAt(input.targetDate),fit=enough(rows)&&x?fitPersonalLogistic(rows,columns):null;
      // Local research call only: report future policy separately from retrospective evaluation.
      const futurePolicy=fit?learnThreeDayPolicy(rows,anchor,date=>schedule.origin(date)):null;
      return {symptom,status:fit?"experimental-candidate":"learning",evaluation,
        futureEstimate:fit&&x?fit.predict(x):null,
        futureWarning:fit&&x&&x[0]===0&&futurePolicy?.threshold!=null?fit.predict(x)>=futurePolicy.threshold:null};
    }),
    limitations:["Forecasts reported presence within three calendar days, not exact onset timing or symptom severity.",
      "Uses symptom history only, following prior cycle ablation; wearable and incremental cycle benefits are not tested.",
      "Overlapping windows may be used for training; validation and test scoring use fixed nonoverlapping three-day windows.",
      "Training labels must mature before validation/test origins. Unknown windows are not negative; mature positive windows can contain unknown other days.",
      "Retrospective assumed report availability, selected small cohort and previously examined data; not independent or prospective validation.",
      "Estimates are not calibrated clinical probabilities. No guarantee that the empirical alert budget holds later."],
  };
}
