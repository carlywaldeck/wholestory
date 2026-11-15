import { z } from "zod";
import {
  forecastSchedule,
  localDate,
  shiftDate,
  validTimeZone,
} from "./forecast-time";
import {
  cycleEstimate,
  cycleInputSchema,
  type ForecastCycle,
} from "./forecast-cycle";

export const riskSymptoms = [
  "pelvicPain",
  "fatigue",
  "bloating",
  "headache",
  "bowelSymptoms",
  "urinarySymptoms",
  "nausea",
  "dailyLifeImpact",
] as const;
export type RiskSymptom = (typeof riskSymptoms)[number];
// Only user-confirmed present/absent labels. Missing is never absence.
const labels = z
  .object(
    Object.fromEntries(riskSymptoms.map((k) => [k, z.boolean().nullable()])),
  )
  .strict();
export const riskDaySchema = z
  .object({
    date: z.iso.date(),
    availableAt: z.iso.datetime({ offset: true }),
    symptoms: labels,
  })
  .strict();
export const riskInputSchema = z
  .object({
    kind: z.enum(["real", "synthetic"]),
    targetDate: z.iso.date(),
    asOf: z.iso.datetime({ offset: true }),
    days: z.array(riskDaySchema).max(730),
    timeZone: z
      .string()
      .min(1)
      .max(80)
      .refine(validTimeZone, "Use a valid IANA time zone.")
      .default("UTC"),
    cycle: cycleInputSchema.optional(),
  })
  .strict();
export type RiskInput = z.input<typeof riskInputSchema>;
type Day = z.infer<typeof riskDaySchema>;
const shift = shiftDate;
const value = (d: Day | undefined, s: RiskSymptom): boolean | null =>
  (d?.symptoms[s] as boolean | null) ?? null;
const guard = {
  trainingPairs: 30,
  positivePairs: 5,
  negativePairs: 5,
  similarPairs: 5,
};

function pairsFor(
  days: Day[],
  symptom: RiskSymptom,
  schedule: ReturnType<typeof forecastSchedule>,
) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return days.flatMap((d) => {
    const prior = byDate.get(shift(d.date, -1));
    const x = value(prior, symptom),
      y = value(d, symptom);
    // Replay the same local issuance clock; later reports cannot become historical inputs.
    const origin = schedule.origin(d.date);
    if (
      x === null ||
      y === null ||
      !prior ||
      origin === null ||
      Date.parse(prior.availableAt) > origin
    )
      return [];
    return [{ x, y: Number(y), date: d.date, availableAt: d.availableAt }];
  });
}
type Pair = ReturnType<typeof pairsFor>[number];
function estimate(pairs: Pair[], previous: boolean) {
  const base =
    (pairs.reduce((sum, r) => sum + r.y, 0) + 1) / (pairs.length + 2);
  const similar = pairs.filter((r) => r.x === previous);
  // Shrink sparse transition counts toward this person's overall symptom rate.
  return {
    probability:
      (similar.reduce((sum, r) => sum + r.y, 0) + 4 * base) /
      (similar.length + 4),
    base,
    similar: similar.length,
  };
}
function enough(pairs: Pair[]) {
  const positive = pairs.reduce((sum, r) => sum + r.y, 0);
  return (
    pairs.length >= guard.trainingPairs &&
    positive >= guard.positivePairs &&
    pairs.length - positive >= guard.negativePairs
  );
}
function historyFloor(target: string, cutoff: number, cycle?: ForecastCycle) {
  const rolling = shift(target, -180);
  return cycle &&
    Date.parse(cycle.availableAt) <= cutoff &&
    cycle.regimeSince > rolling
    ? cycle.regimeSince
    : rolling;
}
function backtest(
  pairs: Pair[],
  days: Day[],
  symptom: RiskSymptom,
  cycle: ForecastCycle | undefined,
  schedule: ReturnType<typeof forecastSchedule>,
) {
  const history = days.map((d) => ({
    date: d.date,
    availableAt: d.availableAt,
    value: value(d, symptom),
  }));
  const predictions = pairs.flatMap((row) => {
    const cutoff = schedule.origin(row.date);
    if (cutoff === null) return [];
    const train = pairs.filter(
      (r) =>
        r.date < row.date &&
        shift(r.date, -1) >= historyFloor(row.date, cutoff, cycle) &&
        Date.parse(r.availableAt) <= cutoff,
    );
    if (!enough(train)) return [];
    const e = estimate(train, row.x);
    if (e.similar < guard.similarPairs) return [];
    const c = cycleEstimate(cycle, history, row.date, cutoff);
    return [
      {
        actual: row.y,
        previous: Number(row.x),
        cycle: c.probability,
        history: e.probability,
        risk:
          c.probability === null
            ? e.probability
            : (e.probability + c.probability) / 2,
        baseline: e.base,
        persistence: Number(row.x),
      },
    ];
  });
  const n = predictions.length;
  const score = (
    key: "risk" | "history" | "baseline" | "persistence",
    rows = predictions,
  ) => {
    const n = rows.length;
    const tp = rows.filter((r) => r[key] >= 0.5 && r.actual === 1).length;
    const fp = rows.filter((r) => r[key] >= 0.5 && r.actual === 0).length;
    const fn = rows.filter((r) => r[key] < 0.5 && r.actual === 1).length;
    const tn = n - tp - fp - fn;
    return {
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      trueNegatives: tn,
      accuracy: n ? (tp + tn) / n : null,
      alertPrecision: tp + fp ? tp / (tp + fp) : null,
      symptomRecall: tp + fn ? tp / (tp + fn) : null,
      balancedAccuracy:
        tp + fn && tn + fp ? (tp / (tp + fn) + tn / (tn + fp)) / 2 : null,
      falseAlertsPer30EvaluatedDays: n ? (fp / n) * 30 : null,
      symptomDays: tp + fn,
      symptomAbsentDays: tn + fp,
      brier: n
        ? rows.reduce((s, r) => s + (r[key] - r.actual) ** 2, 0) / n
        : null,
    };
  };
  return {
    evaluatedDays: n,
    eligiblePairs: pairs.length,
    evaluatedWithCycleContext: predictions.filter((p) => p.cycle !== null)
      .length,
    method: `Expanding-window chronological testing; trailing 180-day training; fixed 0.5 threshold; same ${schedule.issueClock} issuance clock in ${schedule.timeZone}. Ambiguous/nonexistent historical clocks excluded.`,
    risk: score("risk"),
    historyOnly: score("history"),
    historicalRate: score("baseline"),
    previousReport: score("persistence"),
    onsetOpportunities: {
      evaluatedDays: predictions.filter((p) => p.previous === 0).length,
      risk: score(
        "risk",
        predictions.filter((p) => p.previous === 0),
      ),
    },
    continuationOpportunities: {
      evaluatedDays: predictions.filter((p) => p.previous === 1).length,
      risk: score(
        "risk",
        predictions.filter((p) => p.previous === 1),
      ),
    },
  };
}

/** Runs locally. It calls no API and sends no health records to an LLM or server.
 * One person's labels only. Caller must keep people and real/synthetic sources separate.
 * Probabilities are experimental estimates, not clinically calibrated forecasts.
 */
export function symptomRisk(
  input: unknown,
  options: { evaluate?: boolean } = {},
) {
  const parsed = riskInputSchema.parse(input);
  const cutoff = Date.parse(parsed.asOf);
  const schedule = forecastSchedule(
    parsed.targetDate,
    parsed.asOf,
    parsed.timeZone,
  );
  const seen = new Set<string>();
  for (const d of parsed.days) {
    if (seen.has(d.date)) throw Error("Use one confirmed check-in per date.");
    if (localDate(d.availableAt, parsed.timeZone) < d.date)
      throw Error(
        "A reported outcome cannot be available before its local symptom day begins.",
      );
    seen.add(d.date);
  }
  if (parsed.cycle) {
    if (
      localDate(parsed.cycle.availableAt, parsed.timeZone) <
      parsed.cycle.regimeSince
    )
      throw Error(
        "A current hormone regime cannot be reported before its start date.",
      );
    const starts = new Set<string>();
    for (const s of parsed.cycle.periodStarts) {
      if (starts.has(s.date)) throw Error("Duplicate period-start date.");
      if (localDate(s.availableAt, parsed.timeZone) < s.date)
        throw Error("A period start cannot be reported before its local date.");
      starts.add(s.date);
    }
  }
  const days = parsed.days
    .filter(
      (d) => d.date < parsed.targetDate && Date.parse(d.availableAt) <= cutoff,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const previous = days.find((d) => d.date === shift(parsed.targetDate, -1));
  return {
    targetDate: parsed.targetDate,
    asOf: parsed.asOf,
    kind: parsed.kind,
    status: "experimental-personal-pattern" as const,
    clinicalValidation: false,
    wearableBenefitEstablished: false,
    modelVersion: "0.2.0",
    model: "fixed-equal-cycle-and-transition-mixture-when-supported",
    timeZone: parsed.timeZone,
    timing: `Calendar-day alignment and replay at ${schedule.issueClock} in ${parsed.timeZone}.`,
    supportRules: guard,
    symptoms: riskSymptoms.map((symptom) => {
      const allPairs = pairsFor(days, symptom, schedule);
      const pairs = allPairs.filter(
          (p) =>
            shift(p.date, -1) >=
            historyFloor(parsed.targetDate, cutoff, parsed.cycle),
        ),
        prior = value(previous, symptom);
      const positive = pairs.reduce((sum, r) => sum + r.y, 0);
      const fit = prior === null ? null : estimate(pairs, prior);
      const reason =
        prior === null
          ? "missing-previous-day-label"
          : !enough(pairs)
            ? "insufficient-history"
            : fit!.similar < guard.similarPairs
              ? "insufficient-similar-days"
              : null;
      const cycle = cycleEstimate(
        parsed.cycle,
        days.map((d) => ({
          date: d.date,
          availableAt: d.availableAt,
          value: value(d, symptom),
        })),
        parsed.targetDate,
        cutoff,
      );
      const probability = reason
        ? null
        : cycle.probability === null
          ? fit!.probability
          : (fit!.probability + cycle.probability) / 2;
      return {
        symptom,
        state: reason
          ? ("learning" as const)
          : ("experimental-estimate" as const),
        reason,
        probability, // Null means unavailable, not low risk.
        historyProbability: reason ? null : fit!.probability,
        cycle,
        factors:
          probability === null
            ? []
            : [
                {
                  source: "confirmed-symptom-history",
                  similarPriorDays: fit!.similar,
                },
                ...(cycle.probability === null
                  ? []
                  : [
                      {
                        source: "experimental-calendar-position",
                        matchedCycles: cycle.matchedCycles,
                      },
                    ]),
              ],
        outlook:
          probability === null
            ? "unavailable"
            : probability >= 0.5
              ? "higher-estimated-likelihood"
              : "lower-estimated-likelihood",
        trainingPairs: pairs.length,
        symptomDays: positive,
        symptomAbsentDays: pairs.length - positive,
        similarPriorDays: fit?.similar ?? 0,
        validation: {
          dataKind: parsed.kind,
          clinicalValidation: false,
          evaluationStatus:
            options.evaluate === false
              ? "not-run"
              : "exploratory-retrospective",
          ...backtest(
            options.evaluate === false ? [] : allPairs,
            options.evaluate === false ? [] : days,
            symptom,
            parsed.cycle,
            schedule,
          ),
        },
      };
    }),
    limitations: [
      "Engineering support rules do not establish accuracy or clinical validity.",
      "A lower estimate does not rule out symptoms. Estimates describe reported symptom presence, not severity or urgency.",
      "No treatment recommendation, diagnosis or prediction of endometriosis is made.",
      "Backtests are exploratory, replay local issuance time and have no confidence intervals; prospective evaluation is required.",
      "Calendar position uses observed past cycle lengths, not hormone-confirmed phases; unknown or hormonal regimes and uncertain timing fall back to symptom history.",
      "Wearable measurements are not used by this version; paired data must show added value before they are included.",
    ],
  };
}
