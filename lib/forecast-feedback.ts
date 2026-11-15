import { z } from "zod";
import { riskSymptoms } from "./symptom-risk";
import { localDate, shiftDate, validTimeZone } from "./forecast-time";

const snapshotSchema = z.object({
  modelVersion: z.string().min(1).max(100),
  symptom: z.enum(riskSymptoms),
  targetDate: z.iso.date(),
  issuedAt: z.iso.datetime({ offset: true }),
  timeZone: z.string().refine(validTimeZone),
  kind: z.enum(["real", "synthetic"]),
  band: z.enum(["low", "medium", "high"]).nullable(),
}).strict();
export type ForecastSnapshot = z.infer<typeof snapshotSchema>;

/** Call when issuing a forecast, before the target day. Caller owns local storage. */
export function snapshotForecast(raw: ForecastSnapshot): Readonly<ForecastSnapshot> {
  const snapshot = snapshotSchema.parse(raw);
  if (localDate(snapshot.issuedAt, snapshot.timeZone) !== shiftDate(snapshot.targetDate, -1))
    throw Error("Snapshot must be issued on the preceding local calendar day");
  return Object.freeze(snapshot);
}

const feedbackSchema = z.object({
  forecast: snapshotSchema,
  reportedAt: z.iso.datetime({ offset: true }),
  occurred: z.boolean().nullable(),
}).strict();
export type ForecastFeedback = z.infer<typeof feedbackSchema>;

/** Aggregate one local person's frozen forecasts, never infer absence from missing reports. */
export function evaluateForecastFeedback(raw: unknown, modelVersion: string, kind: "real" | "synthetic") {
  const rows = z.array(feedbackSchema).max(10000).parse(raw);
  const seen = new Set<string>();
  for (const row of rows) {
    snapshotForecast(row.forecast);
    if (Date.parse(row.reportedAt) < Date.parse(row.forecast.issuedAt)
      || localDate(row.reportedAt, row.forecast.timeZone) < row.forecast.targetDate)
      throw Error("Outcome report precedes the forecast target day");
    const key = JSON.stringify([row.forecast.modelVersion, row.forecast.kind, row.forecast.symptom, row.forecast.targetDate]);
    if (seen.has(key)) throw Error("Duplicate outcome; choose a single versioned report per forecast day");
    seen.add(key);
  }
  const selected = rows.filter(r => r.forecast.modelVersion === modelVersion && r.forecast.kind === kind);
  return {
    modelVersion, kind, clinicalValidation: false,
    privacy: { persisted: false, networkRequestsMade: 0 },
    symptoms: riskSymptoms.map(symptom => ({
      symptom,
      bands: (["low", "medium", "high"] as const).map(band => {
        const matching = selected.filter(r => r.forecast.symptom === symptom && r.forecast.band === band);
        const known = matching.filter(r => r.occurred !== null);
        const n = known.length, events = known.filter(r => r.occurred).length;
        const rate = n ? events/n : null;
        // Wilson interval describes observed rate only; dependent days weaken its assumptions.
        const z = 1.96, divisor = 1+z*z/(n || 1);
        const center = n ? (events/n+z*z/(2*n))/divisor : null;
        const radius = n ? z*Math.sqrt((events/n)*(1-events/n)/n+z*z/(4*n*n))/divisor : null;
        return { band, reportedDays: n, unknownDays: matching.length-n, symptomDays: events,
          observedRate: rate,
          descriptiveInterval: center !== null && radius !== null ? [Math.max(0, center-radius), Math.min(1, center+radius)] : null,
          support: n >= 30 && events >= 5 && n-events >= 5 ? "descriptive-only" : "insufficient",
        };
      }),
    })),
    limitation: "Local observational feedback, not clinical validation or proof of wearable benefit. Missing outcomes remain unknown; repeated days are dependent and selection/missing-report bias may affect rates. Frozen issued snapshots and independently recorded timestamps must be preserved by storage.",
  };
}
