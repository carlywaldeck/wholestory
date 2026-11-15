import { forecastDemo, type forecastPersonas } from "./forecast-demo";
import { shiftDate } from "./forecast-time";
import { createPersonalLearner, issuePersonalOutlook } from "./personal-learning";

/** Replays fictional observations in date order. Engineering demonstration only. */
export function personalLearningDemo(persona: (typeof forecastPersonas)[number], targetDate: string) {
  const demo = forecastDemo(persona, targetDate);
  let state = createPersonalLearner(`demo-${persona}`, "synthetic", "UTC");
  const progress = [];
  const dates = [...demo.input.days.map(d => d.date), targetDate];
  let latest: ReturnType<typeof issuePersonalOutlook> | null = null;
  for (const date of dates) {
    const input = { ...demo.input, timeZone: "UTC", targetDate: date, asOf: `${shiftDate(date, -1)}T23:00:00Z`,
      days: demo.input.days.filter(d => d.date < date) };
    latest = issuePersonalOutlook(state, input, demo.physiology);
    state = latest.state;
    progress.push({ date, symptoms: latest.symptoms.map(s => ({ symptom: s.symptom,
      trainingPairs: s.trainingPairs, matchedWearablePairs: s.matchedWearablePairs,
      stage: s.stage, usedWearables: s.usedWearables })) });
  }
  return { disclosure: "Fictional chronological demo. Shows learning behavior, not clinical accuracy or guaranteed improvement.",
    persona, profileId: state.profileId, kind: "synthetic" as const, progress, latest: latest! };
}
