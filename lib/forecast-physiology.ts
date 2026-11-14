import { z } from "zod";
import { localDate, shiftDate } from "./forecast-time";
export const physiologySources = ["oura", "fitbit", "apple-health", "garmin", "manual", "synthetic"] as const;
export const physiologyDaySchema = z
  .object({
    date: z.iso.date(), // Sleep/nocturnal signals belong to the local waking date.
    availableAt: z.iso.datetime({ offset: true }),
    source: z.enum(physiologySources),
    kind: z.enum(["real", "synthetic"]),
    sleepHours: z.number().min(0).max(24).nullable(),
    nightHeartRateBpm: z.number().min(20).max(220).nullable(),
    hrvRmssdMs: z.number().min(0).max(500).nullable(),
    temperatureDeviationC: z.number().min(-5).max(5).nullable(),
    respiratoryRateBpm: z.number().min(4).max(60).nullable(),
    steps: z.number().int().min(0).max(150000).nullable(),
  })
  .strict();
export type PhysiologyDay = z.infer<typeof physiologyDaySchema>;
export const physiologySignals = [
  "sleepHours",
  "nightHeartRateBpm",
  "hrvRmssdMs",
  "temperatureDeviationC",
  "respiratoryRateBpm",
  "steps",
] as const;
const median = (v: number[]) => {
  const a = [...v].sort((a, b) => a - b),
    m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
export function physiologyContext(
  raw: unknown,
  targetDate: string,
  asOf: string,
  timeZone: string,
  kind: "real" | "synthetic",
) {
  const days = z.array(physiologyDaySchema).max(730).parse(raw),
    seen = new Set<string>();
  for (const d of days) {
    if (seen.has(d.date))
      throw Error(
        "Duplicate physiology date; combine measurements from the same source explicitly.",
      );
    if (d.kind !== kind || (d.source === "synthetic" && d.kind !== "synthetic"))
      throw Error("Do not mix synthetic and real records.");
    if (localDate(d.availableAt, timeZone) < d.date)
      throw Error("Physiology cannot be available before its measurement day.");
    seen.add(d.date);
  }
  const known = days.filter(
    (d) => d.date < targetDate && Date.parse(d.availableAt) <= Date.parse(asOf),
  );
  const prior = known.find((d) => d.date === shiftDate(targetDate, -1));
  return {
    usedInForecast: false,
    status: "context-only-pending-incremental-validation",
    featureCutoff: asOf,
    excludedUnavailableOrFuture: days.length - known.length,
    signals: physiologySignals.map((signal) => {
      // Keep device/source separate. RMSSD must never be replaced by SDNN or a readiness score.
      const rows = known.filter(
        (d) =>
          d.date >= shiftDate(targetDate, -29) &&
          d.date < shiftDate(targetDate, -1) &&
          d.source === prior?.source &&
          d[signal] !== null,
      );
      const baseline =
        rows.length >= 7 ? median(rows.map((d) => d[signal]!)) : null;
      const value = prior?.[signal] ?? null;
      return {
        signal,
        value,
        source: prior?.source ?? null,
        baselineDays: rows.length,
        trailingMedian: baseline,
        changeFromMedian:
          baseline === null || value === null ? null : value - baseline,
      };
    }),
    limitation:
      "Descriptive prior-day readings and trailing baselines only. Not adjusted for cycle position, illness, alcohol or treatment; no standalone symptom-warning rule is applied.",
  };
}
