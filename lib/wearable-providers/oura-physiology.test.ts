import { expect, it } from "vitest";
import { normalizeOuraPhysiology } from "./oura-physiology";
const sleep = (id: string, seconds: number, hrv: number | null) => ({
  id,
  day: "2026-11-12",
  bedtime_end: "2026-11-13T07:00:00-08:00",
  total_sleep_duration: seconds,
  type: "long_sleep",
  average_heart_rate: 61,
  average_hrv: hrv,
  average_breath: 14,
});
it("preserves waking dates, seconds-to-hours and main-sleep biomarkers", () => {
  const r = normalizeOuraPhysiology(
    [
      sleep("a", 21600, 42),
      sleep("b", 3600, 12),
      { ...sleep("nap", 1800, 100), type: "late_nap" },
    ],
    [{ id: "steps", day: "2026-11-13", steps: 0 }],
    [{ id: "readiness", day: "2026-11-13", temperature_deviation: 0 }],
    "2026-11-14T00:00:00Z",
    "synthetic",
  );
  expect(r).toHaveLength(1);
  expect(r[0]).toMatchObject({
    date: "2026-11-13",
    sleepHours: 7,
    hrvRmssdMs: 42,
    nightHeartRateBpm: 61,
    steps: 0,
    temperatureDeviationC: 0,
    kind: "synthetic",
    source: "oura",
    availableAt: "2026-11-14T00:00:00Z",
  });
});
it("keeps unavailable biomarkers unknown and rejects duplicate readiness days", () => {
  const r = normalizeOuraPhysiology(
    [sleep("a", 21600, null)],
    [],
    [],
    "2026-11-14T00:00:00Z",
    "real",
  );
  expect(r[0].hrvRmssdMs).toBeNull();
  expect(r[0].temperatureDeviationC).toBeNull();
  expect(r[0].steps).toBeNull();
  const ready = { id: "r", day: "2026-11-13", temperature_deviation: 0.1 };
  expect(() =>
    normalizeOuraPhysiology(
      [],
      [],
      [ready, ready],
      "2026-11-14T00:00:00Z",
      "real",
    ),
  ).toThrow(/Duplicate/);
});
