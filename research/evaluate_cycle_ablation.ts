// Local authorized evaluation. Never export participant records or fitted coefficients.
import { readFileSync, writeFileSync } from "node:fs";
import { combinedSymptomCandidate } from "../lib/combined-forecast-candidate";
import type { RiskInput } from "../lib/symptom-risk";

type Evaluation = NonNullable<ReturnType<typeof combinedSymptomCandidate>["symptoms"][number]["evaluation"]>;
type Metrics = Evaluation["journalAndCycle"];
type Group = Metrics["all"];
const source = JSON.parse(readFileSync(process.argv[2], "utf8")) as {
  archiveSha256: string; participants: number; people: {task: string; input: RiskInput}[];
};
const grouped = new Map<string, Evaluation[]>();
for (const person of source.people) {
  const result = combinedSymptomCandidate(person.input, []);
  for (const row of result.symptoms) if (row.evaluation) {
    const key = `${person.task}:${row.symptom}`;
    const rows = grouped.get(key) ?? []; rows.push(row.evaluation); grouped.set(key, rows);
  }
}
function pool(rows: Group[]) {
  const sum = (key: "n" | "events" | "hits" | "falseAlerts") => rows.reduce((s, r) => s+r[key], 0);
  const n = sum("n"), events = sum("events"), hits = sum("hits"), falseAlerts = sum("falseAlerts");
  return { n, events, hits, missed: events-hits, falseAlerts,
    recall: events ? hits/events : null, precision: hits+falseAlerts ? hits/(hits+falseAlerts) : null,
    brier: n ? rows.reduce((s, r) => s+(r.brier ?? 0)*r.n, 0)/n : null };
}
type Pair = {journalOnly: Metrics; journalAndCycle: Metrics};
function comparison(rows: Pair[]) {
  if (rows.length < 5) return {participants: rows.length, status: "insufficient-participants", models: null, uncertainty: null};
  for (const row of rows) for (const group of ["all", "newOnset", "continuation"] as const) {
    if (row.journalOnly[group].n !== row.journalAndCycle[group].n || row.journalOnly[group].events !== row.journalAndCycle[group].events)
      throw Error("Ablation models must share exactly the same targets");
  }
  let seed = 14112026;
  const random = () => {seed = (seed*1664525+1013904223) >>> 0; return seed/2**32;};
  const changes: number[] = [], onsetChanges: number[] = [];
  for (let i = 0; i < 2000; i++) {
    const sample = rows.map(() => rows[Math.floor(random()*rows.length)]);
    changes.push(pool(sample.map(r => r.journalAndCycle.all)).brier!-pool(sample.map(r => r.journalOnly.all)).brier!);
    const cycle = pool(sample.map(r => r.journalAndCycle.newOnset));
    const history = pool(sample.map(r => r.journalOnly.newOnset));
    if (cycle.recall !== null && history.recall !== null) onsetChanges.push(cycle.recall-history.recall);
  }
  const interval = (a: number[]) => {
    a.sort((x, y) => x-y);
    const q = (p: number) => {const index = (a.length-1)*p, lo = Math.floor(index); return a[lo]+(a[Math.ceil(index)]-a[lo])*(index-lo);};
    return {definedReplicates: a.length, percentile95: a.length ? [q(.025), q(.975)] : null};
  };
  return {participants: rows.length, status: "exploratory-only", models: Object.fromEntries(
    ["journalOnly", "journalAndCycle"].map(model => [model, Object.fromEntries(
      ["all", "newOnset", "continuation"].map(group => [group, pool(rows.map(r => r[model as keyof Pair][group as keyof Metrics]))]))])),
    uncertainty: {unit: "participant", replicates: 2000, seed: 14112026,
      brierDeltaCycleMinusJournal: interval(changes), onsetRecallDeltaCycleMinusJournal: interval(onsetChanges),
      limitation: "Exploratory, unadjusted for multiple comparisons; prior exposure to this dataset means this is not independent confirmation."}};
}
const outcomes = [...grouped].map(([key, rows]) => ({
  task: key.split(":")[0], symptom: key.split(":")[1],
  allSupportedDays: comparison(rows.map(r => ({journalOnly: r.cycleAblation.journalOnly, journalAndCycle: r.journalAndCycle}))),
  cycleSupportedDays: comparison(rows.flatMap(r => r.cycleAblation.onCycleSupportedDays ? [r.cycleAblation.onCycleSupportedDays] : [])),
  coverage: {participantsWithAnyTrainingCycleFeatures: rows.filter(r => r.cycleAblation.trainingDaysWithCycle > 0).length,
    participantsWith14TrainingCycleDays: rows.filter(r => r.cycleAblation.trainingDaysWithCycle >= 14).length,
    testDaysWithCycle: rows.reduce((s, r) => s+r.cycleAblation.testDaysWithCycle, 0)},
}));
const report = {source: "KI EndoLIST v1.0.0", sourceArchiveSha256: source.archiveSha256,
  participants: source.participants, clinicalValidation: false, activeInPublicApp: false,
  method: "Paired ablation: history columns 0–3 versus history plus cycle columns 0–8 in the exact 0.3 candidate; identical first-70% / last-30% targets, training preprocessing, L2 settings, availability assumptions and fixed 0.5 alert threshold. No wearable inputs or threshold tuning.",
  cycleSubset: "Fixed before this run: at least 14 training dates with all five cycle features observed, then compare only test dates with all five observed. Fourteen days is an engineering diagnostic, not clinical sufficiency.",
  limitations: ["Retrospective relative-day data with assumed receipt time, not prospective lead-time validation.",
    "Support and individualized instrument exclusions select small subsets; fewer than five supported participants suppresses metrics.",
    "Cycle and journal models share history support. Cycle features require three previously completed cycles and can be absent from training.",
    "No wearable data, clinical calibration, diagnosis or commercial data-use authorization is established.",
    "Same previously examined cohort; no independent confirmation. No patient-level records, weights or forecasts exported."], outcomes};
writeFileSync(process.argv[3], JSON.stringify(report, null, 2)+"\n");
for (const o of outcomes) if (o.task === "presence" && o.allSupportedDays.models) {
  const a = o.allSupportedDays.models;
  console.log(JSON.stringify({symptom:o.symptom,people:o.allSupportedDays.participants,
    journal:a.journalOnly, cycle:a.journalAndCycle, coverage:o.coverage,
    uncertainty:o.allSupportedDays.uncertainty}));
}
