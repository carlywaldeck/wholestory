/** Personal prospective learning: freeze inputs now, learn from outcomes reported later.
 * One state belongs to one profile. No network requests or automatic storage.
 */
import { z } from "zod";
import { physiologyContext, physiologyDaySchema } from "./forecast-physiology";
import { calendarGap, forecastSchedule, localDate, shiftDate, validTimeZone } from "./forecast-time";
import { riskInputSchema, riskSymptoms, type RiskInput, type RiskSymptom } from "./symptom-risk";
import { candidateMetrics, combinedFeatureNames, fitPersonalLogistic, type LearningRow } from "./combined-forecast-candidate";
import { symptomRiskOutlook } from "./symptom-risk-outlook";

export const personalLearningVersion = "personal-prospective-1";
const vector = z.array(z.number().finite().nullable()).length(23);
const recordSchema = z.object({
  symptom: z.enum(riskSymptoms), targetDate: z.iso.date(), issuedAt: z.iso.datetime({ offset: true }),
  x: vector, source: physiologyDaySchema.shape.source.nullable(),
  estimate: z.number().min(0).max(1).nullable(), baselineEstimate: z.number().min(0).max(1).nullable(),
  usedWearables: z.boolean(), trainingPairs: z.number().int().nonnegative(),
  outcomes: z.array(z.object({ occurred: z.boolean().nullable(), reportedAt: z.iso.datetime({ offset: true }) }).strict()).max(100),
}).strict();
export const personalLearningSchema = z.object({
  version: z.literal(personalLearningVersion), profileId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  kind: z.enum(["real", "synthetic"]), timeZone: z.string().refine(validTimeZone),
  records: z.array(recordSchema).max(5840),
}).strict();
export type PersonalLearningState = z.infer<typeof personalLearningSchema>;
type Record = PersonalLearningState["records"][number];
const baselineColumns = Array.from({ length: 9 }, (_, i) => i);
const allColumns = Array.from({ length: 23 }, (_, i) => i);
const mean = (v: number[]) => v.reduce((s, x) => s+x, 0)/v.length;
const median = (v: number[]) => {
  const a = [...v].sort((x, y) => x-y), m = Math.floor(a.length/2);
  return a.length % 2 ? a[m] : (a[m-1]+a[m])/2;
};

export function createPersonalLearner(profileId: string, kind: "real" | "synthetic", timeZone: string) {
  return personalLearningSchema.parse({ version: personalLearningVersion, profileId, kind, timeZone, records: [] });
}

function validateState(raw: PersonalLearningState) {
  const state = personalLearningSchema.parse(raw), seen = new Set<string>();
  for (const row of state.records) {
    const key = `${row.symptom}:${row.targetDate}`;
    if (seen.has(key)) throw Error("Duplicate personal forecast snapshot");
    seen.add(key);
    // Match the existing forecast contract, including exact closing midnight.
    forecastSchedule(row.targetDate, row.issuedAt, state.timeZone);
    let previous = -Infinity;
    for (const outcome of row.outcomes) {
      const time = Date.parse(outcome.reportedAt);
      if (time <= previous || time < Date.parse(row.issuedAt) || localDate(outcome.reportedAt, state.timeZone) < row.targetDate)
        throw Error("Invalid outcome revision chronology");
      previous = time;
    }
  }
  return state;
}

/** Corrections append a revision; old predictions/features remain unchanged. */
export function recordPersonalOutcome(raw: PersonalLearningState, report: {
  targetDate: string; symptom: RiskSymptom; occurred: boolean | null; reportedAt: string;
}) {
  const state = validateState(raw);
  const parsed = z.object({ targetDate: z.iso.date(), symptom: z.enum(riskSymptoms),
    occurred: z.boolean().nullable(), reportedAt: z.iso.datetime({ offset: true }) }).strict().parse(report);
  const row = state.records.find(r => r.targetDate === parsed.targetDate && r.symptom === parsed.symptom);
  if (!row) throw Error("No previously issued snapshot for this symptom/date");
  if (localDate(parsed.reportedAt, state.timeZone) < row.targetDate || Date.parse(parsed.reportedAt) < Date.parse(row.issuedAt))
    throw Error("Outcome precedes the target day");
  const last = row.outcomes.at(-1);
  if (last && Date.parse(parsed.reportedAt) < Date.parse(last.reportedAt)) throw Error("Outcome correction is backdated");
  if (last?.occurred === parsed.occurred) return state;
  if (last && Date.parse(parsed.reportedAt) === Date.parse(last.reportedAt)) throw Error("Conflicting outcome revision timestamp");
  row.outcomes.push({ occurred: parsed.occurred, reportedAt: parsed.reportedAt });
  return validateState(state);
}

function currentFeatures(input: z.infer<typeof riskInputSchema>, raw: unknown) {
  const readings = z.array(physiologyDaySchema.extend({ restingHeartRateBpm: z.number().min(20).max(220).nullable().optional() }).strict()).max(730).parse(raw);
  const context = physiologyContext(readings.map(({ restingHeartRateBpm: _, ...base }) => base), input.targetDate, input.asOf, input.timeZone, input.kind);
  const cutoff = Date.parse(input.asOf);
  const prior = readings.find(r => r.date === shiftDate(input.targetDate, -1) && Date.parse(r.availableAt) <= cutoff);
  const resting = readings.filter(r => r.date >= shiftDate(input.targetDate, -29) && r.date < shiftDate(input.targetDate, -1)
    && Date.parse(r.availableAt) <= cutoff && r.source === prior?.source && r.restingHeartRateBpm != null).map(r => r.restingHeartRateBpm!);
  const rest = prior?.restingHeartRateBpm ?? null;
  const sensors = [...context.signals.flatMap(s => [s.value, s.changeFromMedian]), rest,
    rest !== null && resting.length >= 7 ? rest-median(resting) : null];
  let cycle: (number | null)[] = Array(5).fill(null);
  const c = input.cycle;
  if (c?.regime === "natural" && Date.parse(c.availableAt) <= cutoff) {
    const starts = c.periodStarts.filter(s => s.date < input.targetDate && s.date >= c.regimeSince && Date.parse(s.availableAt) <= cutoff).sort((a, b) => a.date.localeCompare(b.date));
    if (new Set(starts.map(s => s.date)).size !== starts.length) throw Error("Duplicate period start");
    const lengths = starts.slice(1).map((s, i) => calendarGap(s.date, starts[i].date)).slice(-6);
    const elapsed = starts.length ? calendarGap(input.targetDate, starts.at(-1)!.date) : Infinity;
    if (lengths.length >= 3 && lengths.every(v => v >= 15 && v <= 90) && Math.max(...lengths)-Math.min(...lengths) <= 10 && elapsed <= Math.max(...lengths))
      cycle = [1, 2].flatMap(h => [mean(lengths.map(v => Math.sin(2*Math.PI*h*elapsed/v))), mean(lengths.map(v => Math.cos(2*Math.PI*h*elapsed/v)))]).concat(Math.max(...lengths)-Math.min(...lengths));
  }
  const known = input.days.filter(d => d.date < input.targetDate && Date.parse(d.availableAt) <= cutoff);
  if (new Set(input.days.map(d => d.date)).size !== input.days.length) throw Error("Duplicate journal day");
  for (const d of input.days) if (localDate(d.availableAt, input.timeZone) < d.date) throw Error("Journal available before measurement day");
  const floor = c && Date.parse(c.availableAt) <= cutoff ? c.regimeSince : "0000-01-01";
  return { source: prior?.source ?? null, floor,
    forSymptom(symptom: RiskSymptom) {
      const history = known.filter(d => d.date >= floor && d.symptoms[symptom] !== null);
      const previous = history.find(d => d.date === shiftDate(input.targetDate, -1))?.symptoms[symptom] ?? null;
      const windows = [3, 7].map(n => history.filter(d => d.date >= shiftDate(input.targetDate, -n)).map(d => Number(d.symptoms[symptom])));
      return [previous === null ? null : Number(previous), ...windows.map(v => v.length ? mean(v) : null), windows[1].length, ...cycle, ...sensors];
    } };
}

function learningRows(records: Record[], cutoff: string, floor: string) {
  return records.flatMap(r => {
    const outcome = r.outcomes.filter(o => Date.parse(o.reportedAt) <= Date.parse(cutoff)).at(-1);
    if (r.targetDate < floor || r.x[0] === null || outcome?.occurred == null) return [];
    return [{ date: r.targetDate, availableAt: outcome.reportedAt, x: r.x,
      y: Number(outcome.occurred), previous: Boolean(r.x[0]), source: r.source, issuedAt: r.issuedAt }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}
const enough = (rows: LearningRow[], min = 30, each = 5) => rows.length >= min && rows.filter(r => r.y).length >= each && rows.filter(r => !r.y).length >= each;

function syncJournal(state: PersonalLearningState, input: z.infer<typeof riskInputSchema>) {
  const byDate = new Map(input.days.map(d => [d.date, d]));
  for (const row of state.records) {
    const day = byDate.get(row.targetDate);
    if (!day || Date.parse(day.availableAt) > Date.parse(input.asOf)) continue;
    if (localDate(day.availableAt, state.timeZone) < row.targetDate) throw Error("Journal outcome precedes its day");
    const last = row.outcomes.at(-1), occurred = day.symptoms[row.symptom] as boolean | null;
    // An unanswered journal field cannot erase an earlier confirmed report.
    // Explicit withdrawals use recordPersonalOutcome(... occurred: null).
    if (occurred === null) continue;
    if (last && Date.parse(day.availableAt) < Date.parse(last.reportedAt)) continue;
    if (last?.occurred === occurred || (!last && occurred === null)) continue;
    if (last && Date.parse(day.availableAt) === Date.parse(last.reportedAt)) throw Error("Conflicting journal revision timestamp");
    row.outcomes.push({ occurred, reportedAt: day.availableAt });
  }
}

/** Every issuance refits from earlier frozen input/outcome pairs; no universal sensor rule. */
export function issuePersonalOutlook(raw: PersonalLearningState, rawInput: RiskInput, physiology: unknown) {
  const state = validateState(raw), input = riskInputSchema.parse(rawInput);
  if (state.kind !== input.kind || state.timeZone !== input.timeZone) throw Error("Profile and inputs must share data kind and time zone");
  forecastSchedule(input.targetDate, input.asOf, input.timeZone);
  if (state.records.some(r => Date.parse(r.issuedAt) > Date.parse(input.asOf))) throw Error("Cannot backdate an issuance behind an existing snapshot");
  const features = currentFeatures(input, physiology), details = [];
  // Link new confirmed journal outcomes automatically; frozen vectors/estimates never change.
  syncJournal(state, input);
  for (const symptom of riskSymptoms) {
    const existing = state.records.find(r => r.targetDate === input.targetDate && r.symptom === symptom);
    const x = features.forSymptom(symptom);
    const prior = state.records.filter(r => r.symptom === symptom && r.targetDate < input.targetDate);
    const completed = prior.filter(r => r.targetDate < localDate(input.asOf, input.timeZone));
    const rows = learningRows(completed, input.asOf, features.floor);
    let estimate: number | null = null, baselineEstimate: number | null = null, usedWearables = false;
    let validation = null;
    const paired = rows.filter(r => r.source === features.source && r.x.slice(9).some(v => v !== null));
    if (enough(rows) && x[0] !== null) {
      baselineEstimate = fitPersonalLogistic(rows, baselineColumns).predict(x);
      estimate = baselineEstimate;
      if (features.source && enough(paired, 45, 8) && x.slice(9).some(v => v !== null)) {
        const split = Math.floor(paired.length*.7), validationRows = paired.slice(split);
        const origin = validationRows.length ? Date.parse(validationRows[0].issuedAt) : null;
        const train = origin === null ? [] : paired.slice(0, split).filter(r => Date.parse(r.availableAt) <= origin);
        if (enough(train, 25, 5) && enough(validationRows, 10, 2)) {
          const base = fitPersonalLogistic(train, baselineColumns), combined = fitPersonalLogistic(train, allColumns);
          const baseMetrics = candidateMetrics(validationRows.map(r => ({ ...r, p: base.predict(r.x) })));
          const combinedMetrics = candidateMetrics(validationRows.map(r => ({ ...r, p: combined.predict(r.x) })));
          usedWearables = combinedMetrics.all.brier! <= baseMetrics.all.brier!-.005;
          validation = { days: validationRows.length, baseline: baseMetrics, wearable: combinedMetrics,
            selectedWearables: usedWearables, interpretation: "Earlier personal validation only; not clinical proof or guaranteed future improvement." };
          if (usedWearables) estimate = fitPersonalLogistic(paired, allColumns).predict(x);
        }
      }
    }
    const snapshot = existing ?? { symptom, targetDate: input.targetDate, issuedAt: input.asOf, x, source: features.source,
      estimate, baselineEstimate, usedWearables, trainingPairs: rows.length, outcomes: [] };
    if (!existing) state.records.push(snapshot);
    const scored = completed.flatMap(r => {
      const actual = r.outcomes.filter(o => Date.parse(o.reportedAt) <= Date.parse(input.asOf)).at(-1);
      return r.estimate !== null && actual?.occurred != null ? [{ y: Number(actual.occurred), p: r.estimate, previous: Boolean(r.x[0]) }] : [];
    });
    const wearableScored = completed.flatMap(r => {
      const actual = r.outcomes.filter(o => Date.parse(o.reportedAt) <= Date.parse(input.asOf)).at(-1);
      return r.usedWearables && r.estimate !== null && r.baselineEstimate !== null && actual?.occurred != null
        ? [{ y: Number(actual.occurred), estimate: r.estimate, baseline: r.baselineEstimate }] : [];
    });
    details.push({ symptom, trainingPairs: snapshot.trainingPairs, matchedWearablePairs: paired.length,
      positivePairs: rows.filter(r => r.y).length, negativePairs: rows.filter(r => !r.y).length,
      candidateEstimate: snapshot.estimate, usedWearables: snapshot.usedWearables,
      stage: snapshot.estimate === null ? "learning-history" : snapshot.usedWearables ? "personal-wearable-outlook" : "learning-wearable-relationship",
      wearableLearningReason: snapshot.usedWearables ? "selected-on-earlier-personal-validation" : !features.source || !x.slice(9).some(v => v !== null)
        ? "current-wearable-reading-unavailable" : !enough(paired, 45, 8) ? "collecting-paired-wearable-and-symptom-observations"
        : validation ? "no-earlier-validation-gain" : "insufficient-earlier-validation-support",
      issuedAt: snapshot.issuedAt, frozen: Boolean(existing), validation: existing ? null : validation,
      observedInputs: combinedFeatureNames.map((name, i) => ({ name, value: snapshot.x[i] })),
      prospectivePerformance: candidateMetrics(scored),
      prospectiveWearableComparison: { days: wearableScored.length,
        wearableBrier: wearableScored.length ? mean(wearableScored.map(r => (r.estimate-r.y)**2)) : null,
        baselineBrier: wearableScored.length ? mean(wearableScored.map(r => (r.baseline-r.y)**2)) : null,
        interpretation: "Comparison of frozen forecasts with later outcomes; descriptive personal feedback, not clinical validation." },
      minimumHistory: { pairs: 30, positive: 5, negative: 5 },
      minimumWearableHistory: { pairs: 45, positive: 8, negative: 8 },
    });
  }
  return { state: validateState(state), modelVersion: personalLearningVersion,
    targetDate: input.targetDate, symptoms: details,
    outlook: symptomRiskOutlook(details, input.targetDate),
    clinicalValidation: false, privacy: { networkRequestsMade: 0, persisted: false },
    disclosure: "Experimental personal symptom outlook. More observations allow learning but do not guarantee improvement. Wearables are used when earlier personal validation supports them; risk bands are provisional, not calibrated probabilities or diagnoses." };
}

export interface PersonalLearningStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
const storageKey = (id: string) => `elya-personal-learning-v1:${personalLearningSchema.shape.profileId.parse(id)}`;
export async function savePersonalLearner(storage: PersonalLearningStorage, raw: PersonalLearningState) {
  const state = validateState(raw);
  await storage.setItem(storageKey(state.profileId), JSON.stringify(state));
}
export async function loadPersonalLearner(storage: PersonalLearningStorage, profileId: string) {
  const value = await storage.getItem(storageKey(profileId));
  if (value === null) return null;
  const state = validateState(JSON.parse(value));
  if (state.profileId !== profileId) throw Error("Stored profile does not match requested profile");
  return state;
}
export async function deletePersonalLearner(storage: PersonalLearningStorage, profileId: string) {
  await storage.removeItem(storageKey(profileId));
}
