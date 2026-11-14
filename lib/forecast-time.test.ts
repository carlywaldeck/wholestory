import { expect, it } from "vitest";
import {
  forecastSchedule,
  localDate,
  localInstant,
  validTimeZone,
} from "./forecast-time";
it("aligns LA evening reports to the local date rather than the UTC date", () => {
  expect(localDate("2026-11-15T04:00:00Z", "America/Los_Angeles")).toBe(
    "2026-11-14",
  );
  expect(
    forecastSchedule(
      "2026-11-15",
      "2026-11-15T04:00:00Z",
      "America/Los_Angeles",
    ).origin("2026-11-15"),
  ).toBe(Date.parse("2026-11-15T04:00:00Z"));
});
it("replays the same clock across DST instead of subtracting 24 hours", () => {
  const s = forecastSchedule(
    "2026-03-10",
    "2026-03-10T03:00:00Z",
    "America/Los_Angeles",
  );
  expect(s.origin("2026-03-08")).toBe(Date.parse("2026-03-08T04:00:00Z"));
  expect(s.origin("2026-03-09")).toBe(Date.parse("2026-03-09T03:00:00Z"));
});
it("withholds nonexistent or ambiguous historical wall clocks", () => {
  expect(
    localInstant("2026-03-08", "02:30:00", "America/Los_Angeles"),
  ).toBeNull();
  expect(
    localInstant("2026-11-01", "01:30:00", "America/Los_Angeles"),
  ).toBeNull();
});
it("supports fractional offsets and rejects invalid zones/horizons", () => {
  expect(localInstant("2026-11-14", "20:00:00", "Asia/Kathmandu")).toBe(
    Date.parse("2026-11-14T14:15:00Z"),
  );
  expect(validTimeZone("made-up")).toBe(false);
  expect(() =>
    forecastSchedule("2026-11-15", "2026-11-15T12:00:00Z", "UTC"),
  ).toThrow(/preceding local/);
});
