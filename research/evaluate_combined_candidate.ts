import { writeFileSync } from "node:fs";
import { combinedSymptomCandidate } from "../lib/combined-forecast-candidate";
import { forecastDemo, forecastPersonas } from "../lib/forecast-demo";

const outcomes = forecastPersonas.map(persona => {
  const demo = forecastDemo(persona, "2026-11-15");
  return { persona, result: combinedSymptomCandidate(demo.input, demo.physiology) };
});
const report = { dataKind: "synthetic", clinicalValidation: false,
  disclosure: "Existing fictional personas, no test tuning. Sensors were constructed to follow cycle position, not verified symptom physiology. Improvements cannot establish real-world accuracy or wearable benefit.", outcomes };
writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
for (const { persona, result } of outcomes) {
  for (const symptom of result.symptoms) {
    const e = symptom.evaluation;
    if (e) console.log(JSON.stringify({ persona, symptom: symptom.symptom, journal: e.journalAndCycle,
      combined: e.journalCycleAndWearables, persistence: e.persistence }));
  }
}
