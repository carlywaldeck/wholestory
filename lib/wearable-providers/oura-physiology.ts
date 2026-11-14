import { z } from "zod";
import {
  physiologyDaySchema,
  type PhysiologyDay,
} from "../forecast-physiology";
import { normalizeOura } from "./oura";
const sleepSchema = z.object({
  id: z.string(),
  bedtime_end: z.iso.datetime({ offset: true }),
  total_sleep_duration: z.number().min(0).max(86400).nullable(),
  type: z.string().nullable(),
  average_heart_rate: z.number().min(20).max(220).nullable().optional(),
  average_hrv: z.number().min(0).max(500).nullable().optional(),
  average_breath: z.number().min(4).max(60).nullable().optional(),
});
const readinessSchema = z.object({
  id: z.string(),
  day: z.iso.date(),
  temperature_deviation: z.number().min(-5).max(5).nullable().optional(),
});
export function normalizeOuraPhysiology(
  sleep: unknown[],
  activity: unknown[],
  readiness: unknown[],
  fetchedAt: string,
  kind: "real" | "synthetic",
): PhysiologyDay[] {
  z.iso.datetime({ offset: true }).parse(fetchedAt);
  const days = normalizeOura(sleep, activity),
    sleeps = z.array(sleepSchema).parse(sleep),
    ready = z.array(readinessSchema).parse(readiness);
  const main = new Map<string, z.infer<typeof sleepSchema>>(),
    temperature = new Map<string, number | null>();
  for (const r of ready) {
    if (temperature.has(r.day)) throw Error("Duplicate Oura readiness date.");
    temperature.set(r.day, r.temperature_deviation ?? null);
  }
  for (const s of sleeps) {
    if (s.type !== "long_sleep" || s.total_sleep_duration === null) continue;
    const date = s.bedtime_end.slice(0, 10),
      prior = main.get(date);
    if (
      !prior ||
      s.total_sleep_duration > prior.total_sleep_duration! ||
      (s.total_sleep_duration === prior.total_sleep_duration && s.id < prior.id)
    )
      main.set(date, s);
  }
  const byDate = new Map(days.map((d) => [d.date, d]));
  const dates = [...new Set([...byDate.keys(), ...temperature.keys()])].sort();
  return dates.map((date) => {
    const d = byDate.get(date),
      s = main.get(date);
    return physiologyDaySchema.parse({
      date,
      availableAt: fetchedAt,
      source: "oura",
      kind,
      sleepHours: d?.sleepHours ?? null,
      steps: d?.steps ?? null,
      nightHeartRateBpm: s?.average_heart_rate ?? null,
      hrvRmssdMs: s?.average_hrv ?? null,
      respiratoryRateBpm: s?.average_breath ?? null,
      temperatureDeviationC: temperature.get(date) ?? null,
    });
  });
}
