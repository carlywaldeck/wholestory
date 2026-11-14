import { readFileSync, writeFileSync } from "node:fs";
import { combinedSymptomCandidate, type CandidatePhysiologyDay } from "../lib/combined-forecast-candidate";
import type { RiskInput } from "../lib/symptom-risk";

const source = JSON.parse(readFileSync(process.argv[2], "utf8")) as { people: { input: RiskInput; physiology: CandidatePhysiologyDay[] }[] };
const results = source.people.map(person => combinedSymptomCandidate(person.input, person.physiology)
  .symptoms.find(s => s.symptom === "fatigue")!);
const eligible = results.filter(r => r.evaluation !== null);
const report = {
  source: "PMData / Simula / OSF vx4bk", sourceUrl: "https://datasets.simula.no/pmdata/",
  license: "Noncommercial research; retain original CC BY-NC 4.0 restriction despite differing current repository metadata.",
  outcome: "Next-day self-report of very tired or more tired than normal (PMsys score <=2).",
  dataKind: "real", clinicalValidation: false, endometriosisValidated: false,
  method: "Exact TypeScript 0.3 research candidate; personal chronological first 70% train / final 30% test; fixed 0.5 threshold. Joint-model settings fixed before this experiment; subsequent onset-only training comparison is an additional exploratory analysis, not independent confirmation.",
  limitations: ["Not an endometriosis cohort; no period starts, HRV or temperature available in this experiment.",
    "Sleep and daily resting HR only. Daily resting HR is not substituted for nocturnal HR.",
    "Retrospective availability of wearable values by midnight UTC is assumed, not documented receipt time.",
    "Small selected personal splits; no independent replication or calibration claim.",
    "Exploratory research after earlier experiments on PMData, not an untouched external validation set."],
  participants: results.length, evaluatedParticipants: eligible.length,
  excludedForTrainingSupport: results.length-eligible.length,
  evaluations: eligible.map(r => r.evaluation),
};
writeFileSync(process.argv[3], JSON.stringify(report, null, 2)+"\n");
for (const model of ["journalAndCycle", "journalCycleAndWearables", "persistence", "historicalRate"] as const) {
  const rows = eligible.map(r => r.evaluation![model].all);
  const n = rows.reduce((s, r) => s+r.n, 0);
  console.log(model, JSON.stringify({ n, events: rows.reduce((s, r) => s+r.events, 0), hits: rows.reduce((s, r) => s+r.hits, 0),
    falseAlerts: rows.reduce((s, r) => s+r.falseAlerts, 0), brier: n ? rows.reduce((s, r) => s+r.brier!*r.n, 0)/n : null }));
}
console.log("evaluatedParticipants", report.evaluatedParticipants, "excluded", report.excludedForTrainingSupport);
