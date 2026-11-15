import type { RiskSymptom } from "./symptom-risk";

// Provisional presentation boundaries, not clinically validated alert thresholds.
export const experimentalRiskBands = {
  version: "experimental-bands-1",
  mediumAt: 1 / 3,
  highAt: 2 / 3,
  calibrated: false,
} as const;

export function symptomRiskOutlook(
  rows: readonly { symptom: RiskSymptom; candidateEstimate: number | null }[],
  targetDate: string,
) {
  return rows.map(({ symptom, candidateEstimate }) => {
    const supported = candidateEstimate !== null && Number.isFinite(candidateEstimate)
      && candidateEstimate >= 0 && candidateEstimate <= 1;
    const band = !supported ? null : candidateEstimate >= experimentalRiskBands.highAt
      ? "high" : candidateEstimate >= experimentalRiskBands.mediumAt ? "medium" : "low";
    return {
      symptom,
      targetDate,
      status: supported ? "experimental" as const : "learning" as const,
      band,
      label: band ? `${band[0].toUpperCase()}${band.slice(1)} risk` : "Still learning your pattern",
      // Withhold percentages: candidate model outputs have not been calibrated.
      probabilityPercent: null,
      interpretation: "Estimated symptom occurrence, not severity or risk of endometriosis.",
      disclosure: supported
        ? "Experimental risk band. These boundaries have not been validated; symptoms may occur at any level."
        : "Not enough usable history or a valid estimate to show a risk band.",
      thresholdVersion: experimentalRiskBands.version,
      clinicallyValidated: false,
    };
  });
}
