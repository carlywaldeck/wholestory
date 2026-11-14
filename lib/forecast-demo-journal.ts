import type { Entry, Fact } from "./model";
import { calendarGap } from "./forecast-time";
import type { forecastDemo } from "./forecast-demo";

/** Journal evidence generated from the exact same fictional daily labels as the
 * predictor, not from the older sparse personas or an unrelated real dataset.
 */
export function forecastDemoJournal(
  demo: ReturnType<typeof forecastDemo>,
): Entry[] {
  const kinds = [
    ["pelvicPain", "Pelvic pain", "pelvic pain"],
    ["fatigue", "Fatigue", "fatigue"],
    ["bloating", "Bloating", "bloating"],
    ["bowelSymptoms", "Bowel discomfort", "bowel discomfort"],
    [
      "dailyLifeImpact",
      "Daily-life impact",
      "interference with daily activities",
    ],
  ] as const;
  return demo.input.days.map((day) => {
    const facts: Fact[] = [],
      parts: string[] = [];
    for (const [key, kind, label] of kinds) {
      const value = day.symptoms[key];
      if (value === null) continue;
      const quote = value
        ? `I reported ${label} today.`
        : `I reported no ${label} today.`;
      parts.push(quote);
      facts.push({ kind, value: value ? label : "No", quote });
    }
    const start = demo.input.cycle.periodStarts
      .filter((s) => s.date <= day.date)
      .at(-1)?.date;
    if (start) {
      const n = calendarGap(day.date, start) + 1;
      const quote = `My most recent period started on ${start}. I am on cycle day ${n}.`;
      parts.push(quote);
      facts.push(
        { kind: "Cycle start", value: start, quote },
        { kind: "Cycle day", value: String(n), quote },
      );
    }
    return {
      id: `forecast-demo-${demo.persona}-${day.date}`,
      date: day.date,
      text: parts.join(" "),
      facts,
      symptomFree: false,
      demo: true,
      persona: demo.persona,
    };
  });
}
