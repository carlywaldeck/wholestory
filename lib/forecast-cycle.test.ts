import { expect, it } from "vitest";
import { cycleEstimate, type ForecastCycle } from "./forecast-cycle";
import { shiftDate } from "./forecast-time";
const day = (n: number) => shiftDate("2026-01-01", n);
const context: ForecastCycle = {
  regime: "natural",
  regimeSince: day(0),
  availableAt: day(0) + "T12:00:00Z",
  periodStarts: [0, 30, 60, 90, 120].map((n) => ({
    date: day(n),
    availableAt: day(n) + "T12:00:00Z",
  })),
};
const history = Array.from({ length: 123 }, (_, i) => ({
  date: day(i),
  availableAt: day(i) + "T18:00:00Z",
  value: i % 30 < 5,
}));
it("learns a 30-day pattern without a 28-day assumption", () => {
  const r = cycleEstimate(
    context,
    history,
    day(123),
    Date.parse(day(123) + "T00:00:00Z"),
  );
  expect(r.probability).toBeGreaterThan(0.5);
  expect(r.observedLengthRange).toEqual([30, 30]);
  expect(r.matchedCycles).toBe(4);
});
it("cannot use future/late period starts or target-day outcomes", () => {
  const cutoff = Date.parse(day(123) + "T00:00:00Z");
  const expected = cycleEstimate(context, history, day(123), cutoff);
  const c = structuredClone(context);
  c.periodStarts.push({ date: day(125), availableAt: day(125) + "T12:00:00Z" });
  expect(
    cycleEstimate(
      c,
      [
        ...history,
        { date: day(123), availableAt: day(123) + "T12:00:00Z", value: false },
      ],
      day(123),
      cutoff,
    ),
  ).toEqual(expected);
  c.periodStarts[3].availableAt = day(150) + "T00:00:00Z";
  expect(cycleEstimate(c, history, day(123), cutoff).probability).toBeNull();
});
it("does not infer a natural cycle for hormonal/unknown regimes", () => {
  for (const regime of ["hormonal", "unknown"] as const)
    expect(
      cycleEstimate(
        { ...context, regime },
        history,
        day(123),
        Date.parse(day(123)),
      ).probability,
    ).toBeNull();
});
it("falls back when cycles are too variable or context is not yet available", () => {
  const c = structuredClone(context);
  c.periodStarts[2].date = day(72);
  expect(cycleEstimate(c, history, day(123), Date.parse(day(123))).reason).toBe(
    "cycle-timing-too-uncertain",
  );
  expect(
    cycleEstimate(
      { ...context, availableAt: day(150) + "T00:00:00Z" },
      history,
      day(123),
      Date.parse(day(123)),
    ).reason,
  ).toBe("cycle-context-unavailable");
});
