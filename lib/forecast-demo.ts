import { riskSymptoms, type RiskInput } from "./symptom-risk";
import { calendarGap, shiftDate } from "./forecast-time";
import type { PhysiologyDay } from "./forecast-physiology";
export const forecastPersonas = ["maya", "alex", "jules"] as const;
export type ForecastPersona = (typeof forecastPersonas)[number];
export function forecastDemo(persona: ForecastPersona, targetDate: string) {
  const start = shiftDate(targetDate, -168),
    latestStart = shiftDate(targetDate, -3);
  const starts = [latestStart];
  let cursor = latestStart,
    k = 0;
  const lengths =
    persona === "alex"
      ? [26, 39, 24, 41]
      : persona === "jules"
        ? [30, 29, 31, 30]
        : [28, 29, 27, 28];
  while (cursor > start) {
    cursor = shiftDate(cursor, -lengths[k++ % lengths.length]);
    starts.push(cursor);
  }
  starts.sort();
  const days: RiskInput["days"] = [],
    physiology: PhysiologyDay[] = [];
  for (let i = 0; i < 168; i++) {
    const date = shiftDate(start, i),
      cycleStart = starts.filter((s) => s <= date).at(-1)!,
      cycleDay = calendarGap(date, cycleStart) + 1;
    const pain =
      persona === "alex"
        ? i % 9 < 6
        : persona === "jules"
          ? i < 118 && cycleDay <= 4
          : cycleDay <= 5;
    const fatigue =
      persona === "alex"
        ? i % 8 < 5
        : persona === "jules"
          ? i < 118 && cycleDay <= 5
          : cycleDay <= 7 || cycleDay >= 25;
    const bloating =
      persona === "alex"
        ? i % 10 < 4
        : persona === "jules"
          ? i < 118 && cycleDay <= 3
          : cycleDay <= 5 || cycleDay >= 25;
    const bowel =
      persona === "alex"
        ? i % 7 < 4
        : persona === "jules"
          ? i < 118 && cycleDay <= 2
          : cycleDay <= 4;
    const symptoms = Object.fromEntries(riskSymptoms.map((s) => [s, null]));
    Object.assign(symptoms, {
      pelvicPain: pain,
      fatigue,
      bloating,
      bowelSymptoms: bowel,
      dailyLifeImpact: pain && fatigue,
    });
    days.push({ date, availableAt: date + "T18:00:00Z", symptoms });
    // Illustrative physiological context only. Never used to validate a learned association.
    const oscillation = Math.sin((cycleDay / 30) * Math.PI * 2);
    physiology.push({
      date,
      availableAt: date + "T10:00:00Z",
      source: "synthetic",
      kind: "synthetic",
      sleepHours: 7.3 + ((i % 5) - 2) * 0.2,
      nightHeartRateBpm: 61 + oscillation * 2,
      hrvRmssdMs: 49 - oscillation * 4,
      temperatureDeviationC: oscillation * 0.15,
      respiratoryRateBpm: 14 + oscillation * 0.2,
      steps: 4500 + (i % 7) * 500,
    });
  }
  return {
    persona,
    label:
      persona === "maya"
        ? "Cyclical symptoms"
        : persona === "alex"
          ? "Persistent symptoms beyond period days"
          : "Fewer symptoms in recent check-ins",
    disclosure:
      "Entirely synthetic history, period dates and wearable values. Constructed to demonstrate the workflow; not evidence of model accuracy or wearable benefit.",
    input: {
      kind: "synthetic",
      targetDate,
      asOf: targetDate + "T00:00:00Z",
      timeZone: "UTC",
      days,
      cycle: {
        regime: persona === "alex" ? "unknown" : "natural",
        regimeSince: start,
        availableAt: start + "T12:00:00Z",
        periodStarts: starts
          .filter((s) => s >= start)
          .map((date) => ({ date, availableAt: date + "T12:00:00Z" })),
      },
    } satisfies RiskInput,
    physiology,
  };
}
