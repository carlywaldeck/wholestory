import { expect, it } from "vitest";
import { forecastDemo } from "./forecast-demo";
import { physiologyContext } from "./forecast-physiology";
it("ignores target-day and late readings and never converts missing values into zero", () => {
  const d = forecastDemo("maya", "2026-11-15"),
    rows = d.physiology.slice(-10);
  rows.at(-1)!.hrvRmssdMs = null;
  rows.push({
    ...rows[0],
    date: "2026-11-15",
    availableAt: "2026-11-15T10:00:00Z",
    hrvRmssdMs: 500,
  });
  const r = physiologyContext(
    rows,
    "2026-11-15",
    "2026-11-15T00:00:00Z",
    "UTC",
    "synthetic",
  );
  expect(r.excludedUnavailableOrFuture).toBe(1);
  expect(r.signals.find((s) => s.signal === "hrvRmssdMs")!.value).toBeNull();
  expect(r.usedInForecast).toBe(false);
  rows[rows.length - 2].availableAt = "2026-11-16T10:00:00Z";
  expect(
    physiologyContext(
      rows,
      "2026-11-15",
      "2026-11-15T00:00:00Z",
      "UTC",
      "synthetic",
    ).signals.every((s) => s.value === null),
  ).toBe(true);
});
it("never pools baselines across device sources and rejects duplicate days", () => {
  const d = forecastDemo("maya", "2026-11-15"),
    rows = d.physiology.slice(-10);
  rows.at(-1)!.source = "manual";
  const r = physiologyContext(
    rows,
    "2026-11-15",
    "2026-11-15T00:00:00Z",
    "UTC",
    "synthetic",
  );
  expect(r.signals.every((s) => s.trailingMedian === null)).toBe(true);
  expect(() =>
    physiologyContext(
      [...rows, rows[0]],
      "2026-11-15",
      "2026-11-15T00:00:00Z",
      "UTC",
      "synthetic",
    ),
  ).toThrow(/Duplicate/);
});
