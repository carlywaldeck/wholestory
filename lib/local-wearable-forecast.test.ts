import { expect, it } from "vitest";
import { forecastDemo } from "./forecast-demo";
import { previewWearableForecast, previewLearningWearableForecast } from "./local-wearable-forecast";
import { createPersonalLearner } from "./personal-learning";

const consent = { experimentalPreview: true } as const;
it("connects a local CSV to a persistent-learning snapshot without uploading or backfilling", () => {
  const { input } = forecastDemo("maya", "2026-11-15");
  const state = createPersonalLearner("demo-one", "synthetic", input.timeZone!);
  const result = previewLearningWearableForecast(state, input,
    "date,sleep_hours\n2026-11-14,6", { source: "synthetic", kind: "synthetic", timeZone: input.timeZone!, importedAt: input.asOf }, consent);
  expect(result.personal.state.records).toHaveLength(8);
  expect(result.personal.symptoms.every(s => s.trainingPairs === 0)).toBe(true);
  expect(result.personal.state.records[0].x[9]).toBe(6);
  expect(result.personal.privacy.networkRequestsMade).toBe(0);
});
it("connects normalized imports to the local model without inventing historical access", () => {
  const { input } = forecastDemo("maya", "2026-11-15");
  const options = { source: "synthetic", kind: "synthetic", timeZone: input.timeZone, importedAt: input.asOf } as const;
  const a = previewWearableForecast(input, "date,sleep_hours,resting_heart_rate_bpm\n2026-11-14,7,62", options, consent);
  expect(a.status).toBe("experimental-local-preview");
  expect(a.privacy).toEqual({ networkRequestsMade: 0, persisted: false });
  expect(a.forecast.activeInPublicApp).toBe(false);
  expect(a.forecast.symptoms.length).toBeGreaterThan(1);
  // Today's bulk import cannot improve replay of forecasts made before receipt.
  for (const symptom of a.forecast.symptoms) {
    if (symptom.evaluation)
      expect(symptom.evaluation.journalCycleAndWearables).toEqual(symptom.evaluation.journalAndCycle);
  }
});

it("rejects implicit consent, mixed provenance, and an import after the forecast cutoff", () => {
  const { input } = forecastDemo("maya", "2026-11-15");
  const csv = "date,steps\n2026-11-13,5000";
  const options = { source: "synthetic", kind: "synthetic", timeZone: input.timeZone, importedAt: input.asOf } as const;
  expect(() => previewWearableForecast(input, csv, options, {} as typeof consent)).toThrow(/consent/);
  expect(() => previewWearableForecast(input, csv, { ...options, source: "garmin", kind: "real" }, consent)).toThrow(/same data kind/);
  expect(() => previewWearableForecast(input, csv, { ...options, importedAt: "2026-12-01T23:00:00Z" }, consent)).toThrow(/cutoff/);
});
