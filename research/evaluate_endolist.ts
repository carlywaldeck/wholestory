// Authorized local research only. Export pooled metrics, never individual trajectories/weights.
import { readFileSync, writeFileSync } from "node:fs";
import { combinedSymptomCandidate } from "../lib/combined-forecast-candidate";
import { riskSymptoms, type RiskInput } from "../lib/symptom-risk";

const source = JSON.parse(readFileSync(process.argv[2], "utf8")) as {
  archiveSha256: string; verifiedFiles: number; participants: number;
  people: { task: string; input: RiskInput }[];
};
type Result = ReturnType<typeof combinedSymptomCandidate>["symptoms"][number];
const grouped = new Map<string, Result[]>();
for (const person of source.people) {
  const report = combinedSymptomCandidate(person.input, []);
  for (const symptom of report.symptoms) {
    const key = `${person.task}:${symptom.symptom}`;
    const rows = grouped.get(key) ?? [];
    rows.push(symptom); grouped.set(key, rows);
  }
}
type Metric = NonNullable<Result["evaluation"]>["journalAndCycle"]["all"];
function pool(rows: Metric[]) {
  const sum = (key: "n" | "events" | "hits" | "falseAlerts" | "missed") => rows.reduce((s, r) => s+r[key], 0);
  const n = sum("n"), events = sum("events"), hits = sum("hits"), falseAlerts = sum("falseAlerts");
  return { n, events, hits, falseAlerts, missed: sum("missed"),
    brier: n ? rows.reduce((s, r) => s+(r.brier ?? 0)*r.n, 0)/n : null,
    recall: events ? hits/events : null, precision: hits+falseAlerts ? hits/(hits+falseAlerts) : null,
    falseAlertsPer30EvaluatedOpportunities: n ? 30*falseAlerts/n : null };
}
type Evaluation = NonNullable<Result["evaluation"]>;
function uncertainty(rows: Evaluation[]) {
  let seed = 14112026;
  const random = () => { seed = (seed*1664525+1013904223) >>> 0; return seed/2**32; };
  const percentile = (values: number[], p: number) => {
    const sorted = values.sort((a, b) => a-b);
    const index = (sorted.length-1)*p, lower = Math.floor(index);
    return sorted[lower]+(sorted[Math.ceil(index)]-sorted[lower])*(index-lower);
  };
  const persistence: number[] = [], rate: number[] = [], recall: number[] = [], precision: number[] = [];
  for (let i = 0; i < 2000; i++) {
    const sample = rows.map(() => rows[Math.floor(random()*rows.length)]);
    const model = pool(sample.map(e => e.journalAndCycle.all));
    persistence.push(model.brier!-pool(sample.map(e => e.persistence.all)).brier!);
    rate.push(model.brier!-pool(sample.map(e => e.historicalRate.all)).brier!);
    const onset = pool(sample.map(e => e.journalAndCycle.newOnset));
    if (onset.recall !== null) recall.push(onset.recall);
    if (onset.precision !== null) precision.push(onset.precision);
  }
  const interval = (values: number[]) => ({ definedReplicates: values.length,
    percentile95: values.length ? [percentile(values, .025), percentile(values, .975)] : null });
  return { unit: "participant", replicates: 2000, seed: 14112026,
    brierDeltaVsPersistence: interval(persistence), brierDeltaVsHistoricalRate: interval(rate),
    onsetRecall: interval(recall), onsetPrecision: interval(precision),
    limitation: "Small selected cohorts; exploratory unadjusted intervals across multiple outcomes, not independent confirmation." };
}
const outcomes = [];
for (const task of ["presence", "higher_burden"]) for (const symptom of riskSymptoms) {
  const rows = grouped.get(`${task}:${symptom}`) ?? [];
  const eligible = rows.flatMap(r => r.evaluation ? [r.evaluation] : []);
  const count = eligible.length;
  const models = count < 5 ? null : Object.fromEntries(
    ["journalAndCycle", "persistence", "historicalRate"].map(model => [model,
      Object.fromEntries(["all", "newOnset", "continuation"].map(group => [group,
        pool(eligible.map(e => e[model as "journalAndCycle"][group as "all"]))]))]));
  const onsetFits = eligible.flatMap(e => e.onsetOnlyTraining ? [e.onsetOnlyTraining.journalCycle] : []);
  outcomes.push({ task, symptom, evaluatedParticipants: count,
    excludedForTrainingSupport: rows.length-count,
    status: count >= 5 ? "exploratory-only" : "insufficient-participants-metrics-withheld",
    models, uncertainty: count >= 5 ? uncertainty(eligible) : null,
    onsetSpecificModel: onsetFits.length >= 5 ? {
      evaluatedParticipants: onsetFits.length, newOnset: pool(onsetFits),
    } : null });
}
const report = {
  source: "KI EndoLIST v1.0.0", sourceUrl: "https://physionet.org/content/ki-endolist/1.0.0/",
  sourceArchiveSha256: source.archiveSha256, verifiedFiles: source.verifiedFiles,
  participants: source.participants, model: "0.3.0-research-candidate-without-wearables",
  clinicalValidation: false, wearableBenefitEstablished: false, activeInPublicApp: false,
  method: "Same candidate and fixed hyperparameters as prior PMData test. Per-person first 70% train / final 30% temporal test; 0.5 alert threshold; no held-out threshold tuning. Pooled metrics only; outcome metrics withheld if fewer than five supported participants.",
  tasks: { presence: "Any positive report; newOnset means prior explicitly absent then present.",
    higher_burden: "At least half of the individual's instrument maximum (2/4 or 5/10); engineering definition, not validated clinical severity. NewOnset here means a transition into this category, not necessarily a new symptom." },
  mappings: { pelvicPain: "Pelvic pain / right pelvic pain / left pelvic pain only; excludes composite back/leg instruments.",
    fatigue: "Fatigue only; excludes energy, brain fog and muscle weakness composites.",
    bloating: "Bloating or Endo belly; pooled symptom family, not a validated common instrument.",
    headache: "Headache only; excludes migraine instruments.",
    bowelSymptoms: "Painful bowel movement or pain before/during bowel movement; not all gastrointestinal symptoms.",
    urinarySymptoms: "Urination pain only; excludes frequency/urgency/incomplete emptying.",
    nausea: "Nausea only; excludes nausea/vomiting composites.", dailyLifeImpact: "Not inferred from sick days; left unknown." },
  limitations: [
    "Small selected cohort of formally diagnosed, regularly cycling participants not using hormonal treatment at enrolment. Cannot establish performance in undiagnosed or hormonally treated users.",
    "Recorded day-in-study converted to arbitrary technical calendar dates; actual dates and report receipt times unavailable. Prior-day availability by 18:00 is a retrospective assumption, not a prospective timing result.",
    "Only past recorded first-period-day flags supply cycle context. Target-day cycle day/number are never features. No wearable measurements in this dataset.",
    "Missing values stay unknown. Presence from any selected positive item; absence requires all selected family items observed below the task threshold.",
    "Per-person instrument choices and 0–4 versus 0–10 scales may differ in meaning despite numerical rescaling.",
    "Participant-cluster bootstrap intervals are exploratory and unadjusted for multiple outcomes. No prospective external validation; supported participant exclusions and missing labels select the evaluated subset.",
    "No participant-level data, model coefficients or histories are included. Research data must not be placed in the public demo or GitHub.",
  ], outcomes,
};
writeFileSync(process.argv[3], JSON.stringify(report, null, 2)+"\n");
for (const o of outcomes) if (o.models) console.log(JSON.stringify({task:o.task,symptom:o.symptom,people:o.evaluatedParticipants,
  journalCycle:o.models.journalAndCycle, persistence:o.models.persistence}));
