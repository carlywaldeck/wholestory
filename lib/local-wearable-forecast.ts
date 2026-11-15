import { combinedSymptomCandidate } from "./combined-forecast-candidate";
import { riskInputSchema } from "./symptom-risk";
import { importWearableCSV, type WearableImportOptions } from "./wearable-csv-import";
import { symptomRiskOutlook } from "./symptom-risk-outlook";
import { issuePersonalOutlook, type PersonalLearningState } from "./personal-learning";

/** Stateful local entry point: persist returned state in a separate per-profile store. */
export function previewLearningWearableForecast(
  state: PersonalLearningState, journal: unknown, csv: string,
  options: WearableImportOptions, consent: { experimentalPreview: true },
) {
  if (consent?.experimentalPreview !== true) throw Error("Explicit experimental-preview consent is required");
  const input = riskInputSchema.parse(journal), imported = importWearableCSV(csv, options);
  if (input.kind !== imported.metadata.kind || input.timeZone !== imported.metadata.timeZone)
    throw Error("Journal and wearable import must use the same data kind and time zone");
  if (Date.parse(imported.metadata.importedAt) > Date.parse(input.asOf)) throw Error("Forecast cutoff precedes wearable receipt");
  return { import: imported.metadata, personal: issuePersonalOutlook(state, input, imported.candidateDays) };
}

/** Local research entry point. No upload, storage, or changes to the public forecast. */
export function previewWearableForecast(
  journal: unknown,
  csv: string,
  options: WearableImportOptions,
  consent: { experimentalPreview: true },
) {
  if (consent?.experimentalPreview !== true)
    throw Error("Explicit experimental-preview consent is required");
  const input = riskInputSchema.parse(journal);
  const imported = importWearableCSV(csv, options);
  if (input.kind !== imported.metadata.kind || input.timeZone !== imported.metadata.timeZone)
    throw Error("Journal and wearable import must use the same data kind and time zone");
  if (Date.parse(imported.metadata.importedAt) > Date.parse(input.asOf))
    throw Error("Forecast cutoff precedes wearable receipt; choose a current cutoff");
  const forecast = combinedSymptomCandidate(input, imported.candidateDays);
  return {
    status: "experimental-local-preview" as const,
    clinicalValidation: false as const,
    privacy: { networkRequestsMade: 0, persisted: false },
    import: imported.metadata,
    // Preserve resting HR separately rather than substituting it for nighttime HR.
    forecast,
    outlook: symptomRiskOutlook(forecast.symptoms, input.targetDate),
    disclosure: "Experimental wearable-informed estimates. Added predictive benefit has not been established. This does not diagnose endometriosis or replace medical care.",
    historicalEvaluation: "Imported readings were first available at receipt. Earlier forecasts cannot use them; retrospective wearable validation requires independently recorded availability timestamps.",
  };
}
