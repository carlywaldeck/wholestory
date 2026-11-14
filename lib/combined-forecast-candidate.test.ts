import { expect, it } from "vitest";
import { forecastDemo } from "./forecast-demo";
import { candidateMetrics, chooseOnsetThreshold, combinedSymptomCandidate, fitPersonalLogistic, selectPersonalFeatureSet, type LearningRow } from "./combined-forecast-candidate";
import { shiftDate } from "./forecast-time";

it("can learn a predictive sensor signal and ignore a sensor never observed in training", () => {
  const rows: LearningRow[] = Array.from({ length: 100 }, (_, i) => ({
    date: "2026-01-01", availableAt: "2026-01-01T18:00:00Z",
    x: [i%2, null], y: i%2, previous: false,
  }));
  const fit = fitPersonalLogistic(rows, [0, 1]);
  expect(fit.predict([1, 100])).toBeGreaterThan(.7);
  expect(fit.predict([0, -100])).toBeLessThan(.3);
  expect(fit.predict([1, 100])).toBe(fit.predict([1, null]));
});

it("evaluates new onsets separately from continuing symptoms", () => {
  const result = candidateMetrics([
    { y: 1, p: .8, previous: false }, { y: 0, p: .8, previous: false },
    { y: 1, p: .2, previous: false }, { y: 1, p: .9, previous: true },
  ]);
  expect(result.newOnset).toMatchObject({ n: 3, events: 2, hits: 1, falseAlerts: 1, recall: .5, precision: .5 });
  expect(result.continuation.n).toBe(1);
  expect(candidateMetrics([]).all.brier).toBeNull();
});

it("does not use target-day labels or target-day sensors", () => {
  const demo = forecastDemo("maya", "2026-11-15");
  const before = combinedSymptomCandidate(demo.input, demo.physiology);
  const future = structuredClone(demo);
  future.input.days.push({ ...future.input.days[0], date: "2026-11-15", availableAt: "2026-11-15T18:00:00Z" });
  future.physiology.push({ ...future.physiology[0], date: "2026-11-15", availableAt: "2026-11-15T18:00:00Z", sleepHours: 0 });
  expect(combinedSymptomCandidate(future.input, future.physiology)).toEqual(before);
  expect(before.symptoms.find(s => s.symptom === "pelvicPain")!.evaluation).not.toBeNull();
  expect(before.activeInPublicApp).toBe(false);
});

it("preserves data kind boundaries and withholds unsupported fits", () => {
  const demo = forecastDemo("maya", "2026-11-15");
  demo.physiology[0].kind = "real";
  expect(() => combinedSymptomCandidate(demo.input, demo.physiology)).toThrow(/mix/);
  const tiny = forecastDemo("maya", "2026-11-15");
  tiny.input.days = tiny.input.days.slice(-15);
  const result = combinedSymptomCandidate(tiny.input, []);
  expect(result.symptoms.every(s => s.candidateEstimate === null && s.evaluation === null)).toBe(true);
});

it("with no sensors, adding the wearable columns cannot change the model", () => {
  const demo = forecastDemo("maya", "2026-11-15");
  const result = combinedSymptomCandidate(demo.input, []);
  for (const row of result.symptoms) {
    if (row.evaluation) expect(row.evaluation.journalCycleAndWearables).toEqual(row.evaluation.journalAndCycle);
    expect(row.candidateEstimate).toBe(row.journalCycleEstimate);
  }
});

it("can use a preceding-day wearable signal to forecast synthetic new symptoms", () => {
  const demo = forecastDemo("maya", "2026-11-15");
  // Independent known signal, not a medical relationship: validates wiring only.
  let seed = 417;
  const signals = demo.input.days.map(() => {
    seed = (seed*1664525+1013904223) >>> 0;
    return seed/2**32 < .4;
  });
  demo.physiology.forEach((day, i) => { day.sleepHours = signals[i] ? 4 : 9; });
  demo.input.days.forEach((day, i) => { day.symptoms.nausea = i > 0 ? signals[i-1] : false; });
  const result = combinedSymptomCandidate(demo.input, demo.physiology).symptoms.find(s => s.symptom === "nausea")!;
  expect(result.evaluation!.journalCycleAndWearables.newOnset.recall).toBeGreaterThan(.5);
  expect(result.evaluation!.journalCycleAndWearables.all.brier!).toBeLessThan(result.evaluation!.journalAndCycle.all.brier!);
});

it("removing unavailable cycle features leaves identical paired predictions", () => {
  const demo = forecastDemo("alex", "2026-11-15");
  const result = combinedSymptomCandidate(demo.input, []);
  for (const row of result.symptoms) if (row.evaluation) {
    expect(row.evaluation.cycleAblation.journalOnly).toEqual(row.evaluation.journalAndCycle);
    expect(row.evaluation.cycleAblation.trainingDaysWithCycle).toBe(0);
    expect(row.evaluation.cycleAblation.onCycleSupportedDays).toBeNull();
  }
});

it("period starts learned only at the final cutoff cannot leak into historical cycle features", () => {
  const demo = forecastDemo("maya", "2026-11-15");
  demo.input.cycle.periodStarts.forEach(start => { start.availableAt = demo.input.asOf; });
  const result = combinedSymptomCandidate(demo.input, []);
  for (const row of result.symptoms) if (row.evaluation) {
    expect(row.evaluation.cycleAblation.journalOnly).toEqual(row.evaluation.journalAndCycle);
    expect(row.evaluation.cycleAblation.trainingDaysWithCycle).toBe(0);
    expect(row.evaluation.cycleAblation.testDaysWithCycle).toBe(0);
  }
});

it("the feature selector can learn a known synthetic cycle signal using earlier validation only", () => {
  const rows: LearningRow[] = Array.from({length:100},(_,i)=>{
    const date=shiftDate("2026-01-01",i);
    return {date,availableAt:date+"T18:00:00Z",previous:false,y:i%2,x:[0,.5,.5,7,i%2,0,0,0,0]};
  });
  const result=selectPersonalFeatureSet(rows,date=>Date.parse(date+"T00:00:00Z"));
  expect(result.selected).toBe("cycle");
  expect(result.cycleValidationBrier!).toBeLessThan(result.historyValidationBrier!-.005);
  rows.slice(0,10).forEach(r=>{r.availableAt="2027-01-01T00:00:00Z";});
  expect(selectPersonalFeatureSet(rows,date=>Date.parse(date+"T00:00:00Z")).innerTrainingDays).toBe(60);
});

it("later test outcomes cannot change the earlier feature selection", () => {
  const demo=forecastDemo("maya","2026-11-15");
  const before=combinedSymptomCandidate(demo.input,[]).symptoms.find(r=>r.symptom==="pelvicPain")!.evaluation!;
  demo.input.days.slice(-10).forEach(d=>{d.symptoms.pelvicPain=!d.symptoms.pelvicPain;});
  const after=combinedSymptomCandidate(demo.input,[]).symptoms.find(r=>r.symptom==="pelvicPain")!.evaluation!;
  expect(after.adaptiveSelection.selection).toEqual(before.adaptiveSelection.selection);
  expect(after.onsetWarningPolicy.policy).toEqual(before.onsetWarningPolicy.policy);
  expect(after.adaptiveSelection.metrics).not.toEqual(before.adaptiveSelection.metrics);
});

it("selects earlier recall under the empirical false-alert budget, with conservative tie breaking",()=>{
  const rows=[{y:1,p:.4},{y:1,p:.35},{y:1,p:.3},{y:0,p:.45},...Array.from({length:10},()=>({y:0,p:.05}))];
  const policy=chooseOnsetThreshold(rows);
  expect(policy.threshold).toBe(.3);
  expect(policy.validationRecall).toBe(1);
  expect(policy.validationPrecision).toBe(.75);
  expect(policy.validationFalseAlertsPer30!).toBeLessThanOrEqual(3);
});

it("withholds unsupported or unhelpful policies rather than declaring low risk",()=>{
  expect(chooseOnsetThreshold([]).threshold).toBeNull();
  const rows=Array.from({length:14},(_,i)=>({y:Number(i<3),p:.2}));
  expect(chooseOnsetThreshold(rows).reason).toBe("no-earlier-policy-meets-budget");
  expect(chooseOnsetThreshold(rows.slice(0,5)).reason).toBe("insufficient-earlier-onset-validation");
  expect(()=>candidateMetrics([],NaN)).toThrow(/threshold/);
});
