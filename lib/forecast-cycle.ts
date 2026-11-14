import { z } from "zod";
import { calendarGap, shiftDate } from "./forecast-time";
export const cycleInputSchema = z
  .object({
    regime: z.enum(["natural", "hormonal", "unknown"]),
    regimeSince: z.iso.date(),
    availableAt: z.iso.datetime({ offset: true }),
    periodStarts: z
      .array(
        z
          .object({
            date: z.iso.date(),
            availableAt: z.iso.datetime({ offset: true }),
          })
          .strict(),
      )
      .max(120),
  })
  .strict();
export type ForecastCycle = z.infer<typeof cycleInputSchema>;
export type LabeledDay = {
  date: string;
  availableAt: string;
  value: boolean | null;
};

/** Experimental calendar-position model. It marginalizes over observed cycle lengths;
 * it does not assume 28 days, measure hormones, or establish an ovulation date.
 */
export function cycleEstimate(
  input: ForecastCycle | undefined,
  history: LabeledDay[],
  target: string,
  asOf: number,
) {
  const unavailable = (reason: string) => ({
    probability: null,
    reason,
    matchedDays: 0,
    matchedCycles: 0,
    completedCycles: 0,
    cycleDayIfNoNewPeriod: null as number | null,
    observedLengthRange: null as number[] | null,
  });
  if (!input || Date.parse(input.availableAt) > asOf)
    return unavailable("cycle-context-unavailable");
  if (input.regime !== "natural")
    return unavailable(
      input.regime === "hormonal"
        ? "hormonal-regime-not-modeled"
        : "cycle-regime-unknown",
    );
  const starts = input.periodStarts
    .filter(
      (s) =>
        s.date < target &&
        s.date >= input.regimeSince &&
        Date.parse(s.availableAt) <= asOf,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!starts.length) return unavailable("no-confirmed-period-start");
  const completed = starts
    .slice(0, -1)
    .map((s, i) => ({
      start: s.date,
      end: starts[i + 1].date,
      length: calendarGap(starts[i + 1].date, s.date),
    }))
    .slice(-6);
  // These broad limits are engineering applicability limits, not a definition of a normal cycle.
  if (completed.some((c) => c.length < 15 || c.length > 90))
    return unavailable("cycle-length-outside-model-range");
  if (completed.length < 3) return unavailable("insufficient-completed-cycles");
  const lengths = completed.map((c) => c.length);
  const elapsed = calendarGap(target, starts.at(-1)!.date);
  const context = {
    completedCycles: completed.length,
    cycleDayIfNoNewPeriod: elapsed + 1,
    observedLengthRange: [Math.min(...lengths), Math.max(...lengths)],
  };
  if (
    Math.max(...lengths) - Math.min(...lengths) > 10 ||
    elapsed > Math.max(...lengths)
  )
    return { ...unavailable("cycle-timing-too-uncertain"), ...context };
  const known = history.filter(
    (d) =>
      d.date < target &&
      d.date >= shiftDate(target, -180) &&
      d.date >= input.regimeSince &&
      Date.parse(d.availableAt) <= asOf &&
      d.value !== null,
  );
  if (known.length < 30)
    return { ...unavailable("insufficient-cycle-labels"), ...context };
  const base =
    (known.reduce((s, d) => s + Number(d.value), 0) + 1) / (known.length + 2);
  let weight = 0,
    positives = 0,
    days = 0;
  const cycles = new Set<string>();
  for (const day of known) {
    const cycle = completed.find(
      (c) => c.start <= day.date && day.date < c.end,
    );
    if (!cycle) continue;
    const historicalPhase = calendarGap(day.date, cycle.start) / cycle.length;
    const w =
      lengths.reduce((sum, len) => {
        const prospectivePhase = (elapsed % len) / len;
        const gap = Math.abs(prospectivePhase - historicalPhase);
        const daysApart = Math.min(gap, 1 - gap) * len;
        return sum + Math.max(0, 1 - daysApart / 3);
      }, 0) / lengths.length;
    if (w <= 0) continue;
    days++;
    cycles.add(cycle.start);
    weight += w;
    positives += w * Number(day.value);
  }
  if (days < 9 || cycles.size < 3 || weight < 5)
    return {
      ...unavailable("insufficient-matching-cycle-history"),
      ...context,
      matchedDays: days,
      matchedCycles: cycles.size,
    };
  return {
    probability: (positives + 4 * base) / (weight + 4),
    reason: null,
    matchedDays: days,
    matchedCycles: cycles.size,
    ...context,
  };
}
