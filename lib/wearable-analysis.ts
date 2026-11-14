import { Entry } from "./model";
import { classifyJournalDay } from "./wearable-labels";
export { classifyJournalDay } from "./wearable-labels";
import { WearableDay, validateWearableDays } from "./wearables";
const shift = (date: string, n: number) =>
  new Date(Date.parse(date + "T12:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
export function wearableQuality(entries: Entry[], input: WearableDay[]) {
  const days = validateWearableDays(input);
  const dates = new Map<string, Entry[]>();
  for (const e of entries) dates.set(e.date, [...(dates.get(e.date) || []), e]);
  const rows = days.map((day) => ({
    ...day,
    label: classifyJournalDay(dates.get(day.date) || []),
    entryIds: (dates.get(day.date) || []).map((e) => e.id),
  }));
  return {
    days: rows.length,
    missingSleep: rows.filter((d) => d.sleepHours === null).length,
    missingSteps: rows.filter((d) => d.steps === null).length,
    noJournal: rows.filter((d) => !d.entryIds.length).length,
    conflicts: rows.filter((d) => d.label === "conflicting").length,
    rows,
  };
}
const median = (values: number[]) => {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b),
    m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
/** Historical baseline only. No target-day readings or synthetic outcomes enter features. */
export function buildResearchDataset(entries: Entry[], input: WearableDay[]) {
  const days = validateWearableDays(input),
    byDate = new Map(days.map((d) => [d.date, d]));
  const labels = new Map<string, Entry[]>();
  for (const e of entries)
    labels.set(e.date, [...(labels.get(e.date) || []), e]);
  const exclusions: { date: string; reason: string }[] = [];
  const rows = [...labels]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([date, es]) => {
      const label = classifyJournalDay(es);
      if (label !== "impact" && label !== "symptom-free") {
        exclusions.push({ date, reason: label });
        return [];
      }
      const cutoff = shift(date, -1),
        prior = byDate.get(cutoff);
      if (!prior || prior.sleepHours === null || prior.steps === null) {
        exclusions.push({ date, reason: "missing-previous-day-measurement" });
        return [];
      }
      const history = days.filter(
        (d) => d.date < cutoff && d.date >= shift(cutoff, -28),
      );
      const sleep = history.filter((d) => d.sleepHours !== null),
        steps = history.filter((d) => d.steps !== null);
      return [
        {
          targetDate: date,
          featureCutoff: cutoff,
          label: label === "impact" ? 1 : 0,
          synthetic: es.some((e) => e.demo),
          entryIds: es.map((e) => e.id),
          features: {
            previousSleepHours: prior.sleepHours,
            previousSteps: prior.steps,
            sleepBaseline:
              sleep.length >= 7
                ? median(sleep.map((d) => d.sleepHours!))
                : null,
            stepsBaseline:
              steps.length >= 7 ? median(steps.map((d) => d.steps!)) : null,
          },
          featureDates: [cutoff, ...history.map((d) => d.date)],
        },
      ];
    });
  return {
    purpose: "retrospective-research-only" as const,
    availability:
      "Calendar-date ordering only; API arrival times are unknown. Not validated for real-time forecasting.",
    rows,
    exclusions,
    eligibleForClinicalPrediction: false as const,
  };
}
