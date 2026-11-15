import {expect,it} from "vitest";
import {forecastDemo} from "./forecast-demo";
import {buildThreeDayExamples,matureBefore,nonoverlappingWindows,threeDayForecastCandidate,threeDayLabel,type WindowRow} from "./three-day-forecast-candidate";
import {shiftDate} from "./forecast-time";

it("unknown windows cannot become negative, while a reported positive establishes window presence",()=>{
  expect(threeDayLabel([false,false,false])).toBe(0);
  expect(threeDayLabel([false,null,false])).toBeNull();
  expect(threeDayLabel([undefined,true,null])).toBe(1);
  expect(()=>threeDayLabel([false])).toThrow(/three/);
});

it("overlapping or late labels cannot enter an earlier training block",()=>{
  const base={x:[0,0,0,1],y:1,previous:false};
  const rows:WindowRow[]=[
    {...base,date:"2026-01-01",endDate:"2026-01-03",availableAt:"2026-01-04T00:00:00Z"},
    {...base,date:"2026-01-02",endDate:"2026-01-04",availableAt:"2026-01-05T00:00:00Z"},
    {...base,date:"2026-01-01",endDate:"2026-01-03",availableAt:"2026-01-06T00:00:00Z"},
  ];
  expect(matureBefore(rows,"2026-01-04",Date.parse("2026-01-04T00:00:00Z"))).toEqual([rows[0]]);
});

it("missing origins do not shift the scoring grid or create overlapping windows",()=>{
  const rows:WindowRow[]=Array.from({length:10},(_,i)=>({date:shiftDate("2026-01-01",i),endDate:shiftDate("2026-01-01",i+2),
    availableAt:shiftDate("2026-01-01",i+3)+"T00:00:00Z",x:[0,0,0,1],y:0,previous:false}));
  const result=nonoverlappingWindows(rows.filter((_,i)=>i!==3),"2026-01-01");
  expect(result.map(r=>r.date)).toEqual(["2026-01-01","2026-01-07","2026-01-10"]);
  expect(result.slice(1).every((r,i)=>r.date>result[i].endDate)).toBe(true);
});

it("future window outcomes do not alter preceding-history features and immature windows are omitted",()=>{
  const demo=forecastDemo("maya","2026-11-15");
  const before=buildThreeDayExamples(demo.input,"pelvicPain");
  const target=before.rows.at(-5)!.date;
  demo.input.days.find(d=>d.date===target)!.symptoms.pelvicPain=true;
  const after=buildThreeDayExamples(demo.input,"pelvicPain");
  expect(after.featureAt(target)).toEqual(before.featureAt(target));
  expect(after.rows.every(r=>r.endDate<demo.input.targetDate)).toBe(true);
});

it("later test outcomes cannot change the earlier warning policy and split targets do not overlap",()=>{
  const demo=forecastDemo("maya","2026-11-15");
  const before=threeDayForecastCandidate(demo.input).symptoms.find(r=>r.symptom==="pelvicPain")!.evaluation!;
  expect(before.lastTrainingWindowEnd<before.firstTestTarget).toBe(true);
  demo.input.days.slice(-9).forEach(d=>{d.symptoms.pelvicPain=!d.symptoms.pelvicPain;});
  const after=threeDayForecastCandidate(demo.input).symptoms.find(r=>r.symptom==="pelvicPain")!.evaluation!;
  expect(after.policy).toEqual(before.policy);
  expect(after.history).not.toEqual(before.history);
});
