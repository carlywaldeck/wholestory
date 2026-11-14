import { expect, it } from "vitest";
import { evaluateForecastFeedback, snapshotForecast, type ForecastSnapshot } from "./forecast-feedback";

const forecast: ForecastSnapshot = { modelVersion: "test-1", symptom: "fatigue", targetDate: "2026-11-15",
  issuedAt: "2026-11-14T23:00:00Z", timeZone: "America/Los_Angeles", kind: "real", band: "high" };

it("freezes a separate issued snapshot and rejects a forecast created after the outcome day starts", () => {
  const snapshot = snapshotForecast(forecast);
  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(snapshot).not.toBe(forecast);
  expect(() => snapshotForecast({ ...forecast, issuedAt: "2026-11-15T18:00:00Z" })).toThrow(/preceding/);
});

it("keeps unknown outcomes unknown and separates real from synthetic data", () => {
  const report = evaluateForecastFeedback([
    { forecast, reportedAt: "2026-11-16T01:00:00Z", occurred: true },
    { forecast: { ...forecast, targetDate: "2026-11-16", issuedAt: "2026-11-15T23:00:00Z" }, reportedAt: "2026-11-17T01:00:00Z", occurred: null },
    { forecast: { ...forecast, kind: "synthetic" }, reportedAt: "2026-11-16T01:00:00Z", occurred: false },
  ], "test-1", "real");
  const high = report.symptoms.find(r => r.symptom === "fatigue")!.bands[2];
  expect(high).toMatchObject({ reportedDays: 1, unknownDays: 1, symptomDays: 1, observedRate: 1, support: "insufficient" });
});

it("rejects early outcome labels and duplicate reports", () => {
  const row = { forecast, reportedAt: "2026-11-16T01:00:00Z", occurred: false };
  expect(() => evaluateForecastFeedback([row, row], "test-1", "real")).toThrow(/Duplicate/);
  expect(() => evaluateForecastFeedback([{ ...row, reportedAt: "2026-11-15T00:00:00Z" }], "test-1", "real")).toThrow(/precedes/);
});
