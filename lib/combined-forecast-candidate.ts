/** Research candidate, deliberately separate from the public forecast API.
 * Learns personal symptom associations; does not prescribe wearable risk rules.
 */
import { z } from "zod";
import { physiologyContext, physiologyDaySchema, type PhysiologyDay } from "./forecast-physiology";
import { calendarGap, forecastSchedule, localDate, shiftDate } from "./forecast-time";
import { riskInputSchema, riskSymptoms, type RiskInput, type RiskSymptom } from "./symptom-risk";

type Vector = (number | null)[];
// Daily resting HR is a separate measurement from average nocturnal HR.
const candidatePhysiologySchema = physiologyDaySchema.extend({
  restingHeartRateBpm: z.number().min(20).max(220).nullable().optional(),
});
export type CandidatePhysiologyDay = PhysiologyDay & { restingHeartRateBpm?: number | null };
export type LearningRow = { date: string; availableAt: string; x: Vector; y: number; previous: boolean };
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
export const combinedFeatureNames = [
  "previousSymptom", "recent3DayRate", "recent7DayRate", "recent7DayReports",
  "cycleSin", "cycleCos", "cycleSin2", "cycleCos2", "cycleLengthSpread",
  ...["sleepHours", "nightHeartRateBpm", "hrvRmssdMs", "temperatureDeviationC", "respiratoryRateBpm", "steps"]
    .flatMap(s => [`${s}:value`, `${s}:changeFromPersonalMedian`]),
  "restingHeartRateBpm:value", "restingHeartRateBpm:changeFromPersonalMedian",
];
const journalCycleColumns = Array.from({ length: 9 }, (_, i) => i);
const journalOnlyColumns = [0, 1, 2, 3];
const allColumns = combinedFeatureNames.map((_, i) => i);

/** Fixed L2 logistic regression. All preprocessing is fit on training rows only. */
export function fitPersonalLogistic(rows: LearningRow[], columns: number[]) {
  if (!rows.length) throw Error("Training rows required");
  if (rows.some(r => ![0, 1].includes(r.y) || columns.some(col =>
    r.x[col] !== null && (typeof r.x[col] !== "number" || !Number.isFinite(r.x[col])))))
    throw Error("Binary labels and finite features required");
  const stats = columns.map(col => {
    const values = rows.map(r => r.x[col]).filter((v): v is number => v !== null);
    const center = values.length ? mean(values) : 0;
    const scale = values.length > 1 ? Math.sqrt(mean(values.map(v => (v-center)**2))) : 1;
    return { center, scale: scale || 1, observed: values.length > 0 };
  });
  const transform = (x: Vector) => [1, ...columns.flatMap((col, i) => {
    const { center, scale, observed } = stats[i];
    // A sensor absent throughout training cannot start influencing predictions later.
    return observed ? [x[col] === null ? 0 : Math.max(-5, Math.min(5, (x[col]!-center)/scale)), Number(x[col] === null)] : [0, 0];
  })];
  const xs = rows.map(r => transform(r.x));
  const prevalence = (rows.reduce((s, r) => s+r.y, 0)+1)/(rows.length+2);
  let weights = [Math.log(prevalence/(1-prevalence)), ...Array(xs[0].length-1).fill(0)] as number[];
  for (let step = 0; step < 250; step++) {
    const gradient = Array(weights.length).fill(0) as number[];
    rows.forEach((r, i) => {
      const error = sigmoid(weights.reduce((s, w, j) => s+w*xs[i][j], 0))-r.y;
      xs[i].forEach((v, j) => gradient[j] += error*v/rows.length);
    });
    weights = weights.map((w, j) => w-.08*(gradient[j]+(j ? .05*w : 0)));
  }
  return {
    predict: (x: Vector) => {
      const values = transform(x);
      return sigmoid(weights.reduce((s, w, j) => s+w*values[j], 0));
    },
    observedFeatures: columns.filter((_, i) => stats[i].observed).map(i => combinedFeatureNames[i]),
  };
}

export function candidateMetrics(rows: { y: number; p: number; previous: boolean }[]) {
  const group = (data: typeof rows) => {
    const events = data.reduce((s, r) => s+r.y, 0);
    const hits = data.filter(r => r.y && r.p >= .5).length;
    const falseAlerts = data.filter(r => !r.y && r.p >= .5).length;
    return { n: data.length, events, hits, falseAlerts, missed: events-hits,
      brier: data.length ? mean(data.map(r => (r.p-r.y)**2)) : null,
      recall: events ? hits/events : null,
      precision: hits+falseAlerts ? hits/(hits+falseAlerts) : null };
  };
  return { all: group(rows), newOnset: group(rows.filter(r => !r.previous)), continuation: group(rows.filter(r => r.previous)) };
}

function enough(rows: LearningRow[]) {
  const events = rows.reduce((s, r) => s+r.y, 0);
  return rows.length >= 60 && events >= 8 && rows.length-events >= 8;
}
function onsetFit(rows: LearningRow[], columns: number[]) {
  const opportunities = rows.filter(r => !r.previous);
  const events = opportunities.reduce((s, r) => s+r.y, 0);
  return opportunities.length >= 30 && events >= 5 && opportunities.length-events >= 5
    ? fitPersonalLogistic(opportunities, columns) : null;
}

/** Fixed selector. The caller supplies only outer-training rows, never test outcomes. */
export function selectPersonalFeatureSet(rows: LearningRow[], origin: (date: string) => number | null) {
  const split = Math.floor(rows.length*.7), validation = rows.slice(split);
  const cutoff = validation.length ? origin(validation[0].date) : null;
  const training = cutoff === null ? [] : rows.slice(0, split).filter(r => Date.parse(r.availableAt) <= cutoff);
  const events = training.reduce((s, r) => s+r.y, 0);
  const cycleKnown = (r: LearningRow) => r.x.slice(4, 9).length === 5 && r.x.slice(4, 9).every(v => v !== null);
  const support = {innerTrainingDays: training.length, validationDays: validation.length,
    cycleTrainingDays: training.filter(cycleKnown).length, cycleValidationDays: validation.filter(cycleKnown).length};
  const base = {selected: "history" as "history" | "cycle", ...support,
    historyValidationBrier: null as number | null, cycleValidationBrier: null as number | null,
    firstValidationTarget: validation[0]?.date ?? null, lastInnerTrainingTarget: training.at(-1)?.date ?? null};
  if (training.length < 30 || events < 5 || training.length-events < 5 || validation.length < 14)
    return {...base, reason: "insufficient-inner-validation-support"};
  if (support.cycleTrainingDays < 14 || support.cycleValidationDays < 7)
    return {...base, reason: "insufficient-earlier-cycle-support"};
  const history = fitPersonalLogistic(training, journalOnlyColumns);
  const cycle = fitPersonalLogistic(training, journalCycleColumns);
  const historyBrier = mean(validation.map(r => (history.predict(r.x)-r.y)**2));
  const cycleBrier = mean(validation.map(r => {
    const estimate = cycleKnown(r) ? cycle.predict(r.x) : history.predict(r.x);
    return (estimate-r.y)**2;
  }));
  const selected = cycleBrier <= historyBrier-.005 ? "cycle" : "history";
  return {...base, selected, historyValidationBrier: historyBrier, cycleValidationBrier: cycleBrier,
    reason: selected === "cycle" ? "earlier-brier-improvement-at-least-0.005" : "earlier-cycle-improvement-not-established"};
}

export function combinedSymptomCandidate(raw: RiskInput, rawPhysiology: CandidatePhysiologyDay[]) {
  const input = riskInputSchema.parse(raw);
  const readings = z.array(candidatePhysiologySchema).max(730).parse(rawPhysiology);
  const physiology = readings.map(({ restingHeartRateBpm: _restingHR, ...base }) => base);
  // Reuse strict chronology, duplicate, data-kind and source checks.
  physiologyContext(physiology, input.targetDate, input.asOf, input.timeZone, input.kind);
  const seen = new Set<string>();
  for (const day of input.days) {
    if (seen.has(day.date)) throw Error("Duplicate journal date");
    if (localDate(day.availableAt, input.timeZone) < day.date) throw Error("Journal available before measurement day");
    seen.add(day.date);
  }
  const schedule = forecastSchedule(input.targetDate, input.asOf, input.timeZone);
  const startDates = input.cycle?.periodStarts.map(s => s.date) ?? [];
  if (new Set(startDates).size !== startDates.length) throw Error("Duplicate period start");
  const known = input.days.filter(d => d.date < input.targetDate && Date.parse(d.availableAt) <= Date.parse(input.asOf))
    .sort((a, b) => a.date.localeCompare(b.date));
  const dates = [...known.map(d => d.date), input.targetDate];
  const shared = new Map<string, Vector>();
  for (const target of dates) {
    const origin = target === input.targetDate ? Date.parse(input.asOf) : schedule.origin(target);
    if (origin === null) continue;
    let calendar: Vector = Array(5).fill(null);
    const cycle = input.cycle;
    if (cycle?.regime === "natural" && Date.parse(cycle.availableAt) <= origin) {
      const starts = cycle.periodStarts.filter(s => s.date < target && s.date >= cycle.regimeSince && Date.parse(s.availableAt) <= origin)
        .sort((a, b) => a.date.localeCompare(b.date));
      const lengths = starts.slice(1).map((s, i) => calendarGap(s.date, starts[i].date)).slice(-6);
      if (lengths.length >= 3 && lengths.every(v => v >= 15 && v <= 90) && Math.max(...lengths)-Math.min(...lengths) <= 10) {
        const elapsed = calendarGap(target, starts.at(-1)!.date);
        if (elapsed <= Math.max(...lengths)) calendar = [1, 2].flatMap(harmonic => [
          mean(lengths.map(len => Math.sin(2*Math.PI*harmonic*elapsed/len))),
          mean(lengths.map(len => Math.cos(2*Math.PI*harmonic*elapsed/len))),
        ]).concat(Math.max(...lengths)-Math.min(...lengths));
      }
    }
    const context = physiologyContext(physiology, target, new Date(origin).toISOString(), input.timeZone, input.kind);
    const prior = readings.find(d => d.date === shiftDate(target, -1) && Date.parse(d.availableAt) <= origin);
    const restingHistory = readings.filter(d => d.date >= shiftDate(target, -29) && d.date < shiftDate(target, -1)
      && Date.parse(d.availableAt) <= origin && d.source === prior?.source && d.restingHeartRateBpm != null)
      .map(d => d.restingHeartRateBpm!).sort((a, b) => a-b);
    const m = Math.floor(restingHistory.length/2);
    const median = restingHistory.length < 7 ? null : restingHistory.length%2 ? restingHistory[m] : (restingHistory[m-1]+restingHistory[m])/2;
    const restingValue = prior?.restingHeartRateBpm ?? null;
    shared.set(target, [...calendar, ...context.signals.flatMap(s => [s.value, s.changeFromMedian]),
      restingValue, restingValue === null || median === null ? null : restingValue-median]);
  }
  const features = (target: string, symptom: RiskSymptom): Vector | null => {
    const origin = target === input.targetDate ? Date.parse(input.asOf) : schedule.origin(target);
    if (origin === null || !shared.has(target)) return null;
    const floor = input.cycle && Date.parse(input.cycle.availableAt) <= origin
      ? input.cycle.regimeSince : "0000-01-01";
    const history = known.filter(d => d.date < target && d.date >= floor && Date.parse(d.availableAt) <= origin && d.symptoms[symptom] !== null);
    const prior = history.find(d => d.date === shiftDate(target, -1));
    if (!prior) return null;
    const rates = [3, 7].map(n => history.filter(d => d.date >= shiftDate(target, -n)).map(d => Number(d.symptoms[symptom])));
    return [Number(prior.symptoms[symptom]), ...rates.map(v => v.length ? mean(v) : null), rates[1].length, ...shared.get(target)!];
  };
  return {
    modelVersion: "0.3.0-research-candidate", clinicalValidation: false,
    activeInPublicApp: false, dataKind: input.kind,
    method: "Personal L2 logistic regression; fixed first-70% training / final-30% chronological test; fixed 0.5 threshold; training-only preprocessing; final future estimate refit on all available past labels.",
    limitations: ["A candidate estimate is not a calibrated clinical probability.", "A single personal split cannot establish generalizable wearable benefit.", "Synthetic performance is engineering evidence only.", "No diagnosis, treatment advice, or guaranteed symptom warning."],
    symptoms: riskSymptoms.map(symptom => {
      const rows: LearningRow[] = known.flatMap(day => {
        if (day.symptoms[symptom] === null || day.date < shiftDate(input.targetDate, -180)) return [];
        const x = features(day.date, symptom);
        return x ? [{ date: day.date, availableAt: day.availableAt, x, y: Number(day.symptoms[symptom]), previous: Boolean(x[0]) }] : [];
      });
      const split = Math.floor(rows.length*.7), test = rows.slice(split);
      const firstTestOrigin = test.length ? schedule.origin(test[0].date) : null;
      const train = firstTestOrigin === null ? [] : rows.slice(0, split).filter(r => Date.parse(r.availableAt) <= firstTestOrigin);
      const evaluation = enough(train) && test.length >= 20 ? (() => {
        const journalOnly = fitPersonalLogistic(train, journalOnlyColumns);
        const journal = fitPersonalLogistic(train, journalCycleColumns);
        const combined = fitPersonalLogistic(train, allColumns);
        const onsetJournal = onsetFit(train, journalCycleColumns);
        const onsetCombined = onsetFit(train, allColumns);
        const onsetTest = test.filter(r => !r.previous);
        const cycleKnown = (r: LearningRow) => r.x.slice(4, 9).every(v => v !== null);
        const cycleTrain = train.filter(cycleKnown);
        const cycleTest = test.filter(cycleKnown);
        const selection = selectPersonalFeatureSet(train, date => schedule.origin(date));
        const adaptive = (r: LearningRow) => selection.selected === "cycle" && cycleKnown(r) ? journal.predict(r.x) : journalOnly.predict(r.x);
        const prevalence = (train.reduce((s, r) => s+r.y, 0)+1)/(train.length+2);
        return { trainingDays: train.length, testDays: test.length,
          lastTrainingTarget: train.at(-1)!.date, firstTestTarget: test[0].date,
          journalAndCycle: candidateMetrics(test.map(r => ({ ...r, p: journal.predict(r.x) }))),
          cycleAblation: {
            trainingDaysWithCycle: cycleTrain.length, testDaysWithCycle: cycleTest.length,
            journalOnly: candidateMetrics(test.map(r => ({ ...r, p: journalOnly.predict(r.x) }))),
            onCycleSupportedDays: cycleTrain.length >= 14 && cycleTest.length ? {
              journalOnly: candidateMetrics(cycleTest.map(r => ({ ...r, p: journalOnly.predict(r.x) }))),
              journalAndCycle: candidateMetrics(cycleTest.map(r => ({ ...r, p: journal.predict(r.x) }))),
            } : null,
          },
          adaptiveSelection: {selection,
            cycleUsedTestDays: selection.selected === "cycle" ? cycleTest.length : 0,
            metrics: candidateMetrics(test.map(r => ({...r, p: adaptive(r)})))},
          journalCycleAndWearables: candidateMetrics(test.map(r => ({ ...r, p: combined.predict(r.x) }))),
          historicalRate: candidateMetrics(test.map(r => ({ ...r, p: prevalence }))),
          persistence: candidateMetrics(test.map(r => ({ ...r, p: Number(r.previous) }))),
          onsetOnlyTraining: onsetJournal && onsetCombined ? {
            journalCycle: candidateMetrics(onsetTest.map(r => ({ ...r, p: onsetJournal.predict(r.x) }))).newOnset,
            combined: candidateMetrics(onsetTest.map(r => ({ ...r, p: onsetCombined.predict(r.x) }))).newOnset,
          } : null,
          wearableBenefitEstablished: false };
      })() : null;
      const x = features(input.targetDate, symptom);
      const fit = enough(rows) && x ? fitPersonalLogistic(rows, allColumns) : null;
      const journal = fit ? fitPersonalLogistic(rows, journalCycleColumns) : null;
      const onset = x?.[0] === 0 ? onsetFit(rows, allColumns) : null;
      const selection = fit ? selectPersonalFeatureSet(rows, date => schedule.origin(date)) : null;
      const adaptiveFit = fit ? fitPersonalLogistic(rows, selection?.selected === "cycle" && x!.slice(4, 9).every(v => v !== null)
        ? journalCycleColumns : journalOnlyColumns) : null;
      return { symptom, status: fit ? "experimental-candidate" : "learning",
        trainingDays: rows.length, candidateEstimate: fit && x ? fit.predict(x) : null,
        journalCycleEstimate: journal && x ? journal.predict(x) : null,
        newOnsetCandidateEstimate: onset && x ? onset.predict(x) : null,
        adaptiveCandidate: {selection, estimate: adaptiveFit && x ? adaptiveFit.predict(x) : null},
        observedTrainingFeatures: fit?.observedFeatures ?? [], evaluation };
    }),
  };
}
