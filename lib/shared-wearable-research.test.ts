import {expect,it} from "vitest";
import {groupedTemporalFolds,fitSharedWearableModels,type SharedResearchRow} from "./shared-wearable-research";
import {shiftDate} from "./forecast-time";
const fixture=()=>Array.from({length:10},()=>({rows:Array.from({length:30},(_,i):SharedResearchRow=>{
  const date=shiftDate("2026-01-01",i);
  return {date,featureDate:shiftDate(date,-1),availableAt:date+"T23:59:59Z",x:Array(14).fill(0),y:i%2,previous:false,coreSensorsComplete:true};
})}));

it("holds out both people and later dates, including delayed training labels",()=>{
  const data=fixture();data[0].rows[0].availableAt="2027-01-01T00:00:00Z";
  const {cutoffDate,folds}=groupedTemporalFolds(data);
  expect(folds).toHaveLength(5);
  for(const fold of folds){
    const ids=new Set(fold.training.map(r=>r.personIndex));
    expect(fold.testing.every(p=>!ids.has(p.personIndex))).toBe(true);
    expect(fold.training.every(r=>r.row.date<cutoffDate&&r.row.availableAt<cutoffDate)).toBe(true);
    expect(fold.testing.every(p=>p.rows.every(r=>r.date>=cutoffDate))).toBe(true);
    expect(fold.training.some(r=>r.row.availableAt.startsWith("2027"))).toBe(false);
  }
});

it("later target changes cannot alter any shared model's training rows",()=>{
  const data=fixture(),before=groupedTemporalFolds(data);
  data.forEach(p=>p.rows.filter(r=>r.date>=before.cutoffDate).forEach(r=>{r.y=1-r.y;}));
  const after=groupedTemporalFolds(data);
  expect(after.folds.map(f=>f.training)).toEqual(before.folds.map(f=>f.training));
  expect(fitSharedWearableModels(data[0].rows)).toBeNull();
});

it("rejects target-day measurements rather than accepting leakage",()=>{
  const data=fixture();data[0].rows[0].featureDate=data[0].rows[0].date;
  expect(()=>groupedTemporalFolds(data)).toThrow(/features/);
});
