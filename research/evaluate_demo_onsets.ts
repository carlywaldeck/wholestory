// Engineering replay only. Synthetic patterns cannot establish medical accuracy.
import { forecastDemo, forecastPersonas } from "../lib/forecast-demo";
import { symptomRisk } from "../lib/symptom-risk";
import { writeFileSync } from "node:fs";

const outcomes = [];
for (const persona of forecastPersonas) {
  const demo = forecastDemo(persona, "2026-11-15");
  const counts = new Map<string, { n: number; events: number; alerts: number; hits: number; falseAlerts: number }>();
  for (let i = 1; i < demo.input.days.length; i++) {
    const target = demo.input.days[i];
    const prior = demo.input.days[i-1];
    const forecast = symptomRisk({ ...demo.input, targetDate: target.date,
      asOf: target.date + "T00:00:00Z" }, { evaluate: false });
    for (const row of forecast.symptoms) {
      if (prior.symptoms[row.symptom] !== false || target.symptoms[row.symptom] === null) continue;
      // Compare all three candidates on exactly the same supported opportunities.
      if (row.probability === null || row.historyProbability === null || row.cycle.probability === null) continue;
      for (const [model, p] of [["production", row.probability], ["history", row.historyProbability], ["cycle", row.cycle.probability]] as const) {
        const key = `${row.symptom}:${model}`;
        const value = counts.get(key) ?? { n: 0, events: 0, alerts: 0, hits: 0, falseAlerts: 0 };
        const event = target.symptoms[row.symptom] === true;
        value.n++; value.events += Number(event); value.alerts += Number(p >= .5);
        value.hits += Number(event && p >= .5); value.falseAlerts += Number(!event && p >= .5);
        counts.set(key, value);
      }
    }
  }
  outcomes.push({ persona, comparisons: Object.fromEntries(counts) });
}
const report = { dataKind: "synthetic", clinicalValidation: false, threshold: .5,
  method: "Chronological midnight UTC replay of actual model; available timestamps enforced; paired cycle-supported onset opportunities only. No threshold tuning.", outcomes };
writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
