import { expect, it } from "vitest";
import { experimentalRiskBands, symptomRiskOutlook } from "./symptom-risk-outlook";

it("assigns explicit experimental bands at fixed boundaries without displaying percentages", () => {
  const values = [0, 1 / 3 - 0.00001, 1 / 3, 2 / 3 - 0.00001, 2 / 3, 1];
  const result = symptomRiskOutlook(values.map(candidateEstimate => ({ symptom: "fatigue", candidateEstimate })), "2026-11-15");
  expect(result.map(r => r.band)).toEqual(["low", "low", "medium", "medium", "high", "high"]);
  expect(result.every(r => r.probabilityPercent === null && !r.clinicallyValidated)).toBe(true);
  expect(experimentalRiskBands.calibrated).toBe(false);
});

it("does not turn missing or invalid predictions into reassuring low risk", () => {
  const result = symptomRiskOutlook([null, NaN, Infinity, -0.1, 1.1].map(candidateEstimate => ({ symptom: "pelvicPain", candidateEstimate })), "2026-11-15");
  expect(result.every(r => r.band === null && r.status === "learning" && r.label === "Still learning your pattern")).toBe(true);
});

it("keeps symptom-specific forecasts separate", () => {
  const result = symptomRiskOutlook([
    { symptom: "fatigue", candidateEstimate: .8 },
    { symptom: "bloating", candidateEstimate: .5 },
    { symptom: "pelvicPain", candidateEstimate: .1 },
  ], "2026-11-15");
  expect(result.map(r => [r.symptom, r.label])).toEqual([["fatigue", "High risk"], ["bloating", "Medium risk"], ["pelvicPain", "Low risk"]]);
  expect(result.every(r => r.targetDate === "2026-11-15")).toBe(true);
});
