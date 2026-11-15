import { it, expect } from "vitest";
import { normalizeOura } from "./oura";
it("uses local waking dates, converts seconds, excludes naps and retains missing steps", () => {
  const s = [
    {
      id: "a",
      day: "2026-11-01",
      bedtime_end: "2026-11-02T07:00:00+02:00",
      total_sleep_duration: 21600,
      type: "long_sleep",
    },
    {
      id: "b",
      day: "2026-11-02",
      bedtime_end: "2026-11-02T15:00:00+02:00",
      total_sleep_duration: 3600,
      type: "late_nap",
    },
  ];
  expect(normalizeOura(s, [{ id: "c", day: "2026-11-03", steps: 0 }])).toEqual([
    { date: "2026-11-02", sleepHours: 6, steps: null },
    { date: "2026-11-03", sleepHours: null, steps: 0 },
  ]);
  expect(() => normalizeOura([...s, s[0]], [])).toThrow();
  expect(() =>
    normalizeOura(
      [],
      [
        { id: "a", day: "2026-11-02", steps: 1 },
        { id: "b", day: "2026-11-02", steps: 2 },
      ],
    ),
  ).toThrow();
});
