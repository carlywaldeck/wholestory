import { z } from "zod";

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
  })
  .strict();
export type RiskInput = z.infer<typeof riskInputSchema>;
type Day = z.infer<typeof riskDaySchema>;
const shift = (date: string, n: number) =>
  new Date(Date.parse(date + "T00:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
const value = (d: Day | undefined, s: RiskSymptom): boolean | null =>
  (d?.symptoms[s] as boolean | null) ?? null;
const guard = {
  trainingPairs: 30,
  positivePairs: 5,
  negativePairs: 5,
  similarPairs: 5,
};

function pairsFor(days: Day[], symptom: RiskSymptom) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return days.flatMap((d) => {
    const prior = byDate.get(shift(d.date, -1));
    const x = value(prior, symptom),
      y = value(d, symptom);
    // At this historical midnight, was the preceding day's report available?
    if (
      x === null ||
      y === null ||
      !prior ||
      Date.parse(prior.availableAt) > Date.parse(d.date + "T00:00:00Z")
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
function backtest(pairs: Pair[]) {
  const predictions = pairs.flatMap((row) => {
    const cutoff = Date.parse(row.date + "T00:00:00Z");
    const train = pairs.filter(
      (r) => r.date < row.date && Date.parse(r.availableAt) <= cutoff,
    );
    if (!enough(train)) return [];
    const e = estimate(train, row.x);
    if (e.similar < guard.similarPairs) return [];
    return [
      {
        actual: row.y,
        risk: e.probability,
        baseline: e.base,
        persistence: Number(row.x),
      },
    ];
  });
  const n = predictions.length;
  const score = (key: "risk" | "baseline" | "persistence") => {
    const tp = predictions.filter(
      (r) => r[key] >= 0.5 && r.actual === 1,
    ).length;
    const fp = predictions.filter(
      (r) => r[key] >= 0.5 && r.actual === 0,
    ).length;
    const fn = predictions.filter((r) => r[key] < 0.5 && r.actual === 1).length;
    const tn = n - tp - fp - fn;
    return {
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      trueNegatives: tn,
      accuracy: n ? (tp + tn) / n : null,
      alertPrecision: tp + fp ? tp / (tp + fp) : null,
      symptomRecall: tp + fn ? tp / (tp + fn) : null,
      brier: n
        ? predictions.reduce((s, r) => s + (r[key] - r.actual) ** 2, 0) / n
        : null,
    };
  };
  return {
    evaluatedDays: n,
    method:
      "Expanding-window chronological testing; fixed 0.5 threshold; UTC research boundaries.",
    risk: score("risk"),
    historicalRate: score("baseline"),
    previousReport: score("persistence"),
  };
}

/** Runs locally. It calls no API and sends no health records to an LLM or server.
 * One person's labels only. Caller must keep people and real/synthetic sources separate.
 * Probabilities are experimental estimates, not clinically calibrated forecasts.
 */
export function symptomRisk(input: unknown) {
  const parsed = riskInputSchema.parse(input);
  const cutoff = Date.parse(parsed.asOf);
  const boundary = Date.parse(parsed.targetDate + "T00:00:00Z");
  if (cutoff > boundary || cutoff < boundary - 86400000)
    throw Error(
      "asOf must be within the preceding UTC day or its closing midnight. Only next-day estimates are supported.",
    );
  const seen = new Set<string>();
  for (const d of parsed.days) {
    if (seen.has(d.date)) throw Error("Use one confirmed check-in per date.");
    if (Date.parse(d.availableAt) < Date.parse(d.date + "T00:00:00Z"))
      throw Error(
        "A reported outcome cannot be available before its UTC symptom day begins.",
      );
    seen.add(d.date);
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
    timing: "UTC research day; local-time scheduling needs integration review.",
    supportRules: guard,
    symptoms: riskSymptoms.map((symptom) => {
      const pairs = pairsFor(days, symptom),
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
      const probability = reason ? null : fit!.probability;
      return {
        symptom,
        state: reason
          ? ("learning" as const)
          : ("experimental-estimate" as const),
        reason,
        probability, // Null means unavailable, not low risk.
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
        validation: backtest(pairs),
      };
    }),
    limitations: [
      "Engineering support rules do not establish accuracy or clinical validity.",
      "A lower estimate does not rule out symptoms. Estimates describe reported symptom presence, not severity or urgency.",
      "No treatment recommendation, diagnosis or prediction of endometriosis is made.",
      "Backtests are exploratory, use UTC day boundaries and have no confidence intervals; prospective evaluation is required.",
      "Wearable measurements are not used by this version; paired data must show added value before they are included.",
    ],
  };
}
