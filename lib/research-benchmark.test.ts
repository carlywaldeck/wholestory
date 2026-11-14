import { it, expect } from "vitest";
import { benchmarkResponse } from "./research-benchmark";
it("serves reproducible real-data metrics without claiming a live symptom forecast", async () => {
  const r = benchmarkResponse(),
    data = await r.json();
  expect(r.status).toBe(200);
  expect(data.dataKind).toBe("real-world-observational");
  expect(data.participantsEvaluated).toBe(13);
  expect(data.heldOutDates).toBe(353);
  expect(data.models.journal_and_wearable.n).toBe(353);
  expect(data.endometriosisValidated).toBe(false);
  expect(data.appForecastEnabled).toBe(false);
  expect(data.forecastApiAvailable).toBe(false);
  expect(data.perParticipant).toBeUndefined();
});
