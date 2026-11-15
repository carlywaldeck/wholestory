import { z } from "zod";
import { validateWearableDays, type WearableDay } from "../wearables";
const sleepSchema = z.object({
  id: z.string(),
  day: z.iso.date(),
  bedtime_end: z.string().datetime({ offset: true }),
  total_sleep_duration: z.number().int().min(0).max(86400).nullable(),
  type: z.string().nullable(),
});
const activitySchema = z.object({
  id: z.string(),
  day: z.iso.date(),
  steps: z.number().int().min(0).max(150000),
});
export function normalizeOura(
  sleepInput: unknown[],
  activityInput: unknown[],
): WearableDay[] {
  const sleeps = z.array(sleepSchema).parse(sleepInput),
    activity = z.array(activitySchema).parse(activityInput);
  const days = new Map<string, WearableDay>(),
    ids = new Set<string>(),
    activityDates = new Set<string>();
  const get = (date: string) => {
    if (!days.has(date))
      days.set(date, { date, sleepHours: null, steps: null });
    return days.get(date)!;
  };
  // Long sleep only; sum split long-sleep episodes by local waking date. No scores converted into hours.
  for (const sleep of sleeps) {
    if (ids.has(sleep.id)) throw Error("Duplicate Oura sleep record.");
    ids.add(sleep.id);
    if (sleep.type !== "long_sleep" || sleep.total_sleep_duration === null)
      continue;
    const date = sleep.bedtime_end.slice(0, 10);
    const day = get(date);
    day.sleepHours = (day.sleepHours ?? 0) + sleep.total_sleep_duration / 3600;
  }
  for (const row of activity) {
    if (activityDates.has(row.day))
      throw Error("Duplicate Oura activity date.");
    activityDates.add(row.day);
    get(row.day).steps = row.steps;
  }
  return validateWearableDays([...days.values()]);
}
