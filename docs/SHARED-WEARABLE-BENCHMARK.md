# Elya: shared wearable model with personal baselines

**Completed: a shared model was trained on other people's earlier dates and evaluated on held-out people's later days. This version still did not establish a useful wearable forecasting benefit. Wearable connection remains part of Elya; this result informs the forecasting claim, not whether ingestion should exist.**

## Protocol fixed before this run

The same official LifeSnaps daily input and tired-selection target were used. Participant groups were assigned deterministically by input order modulo five. For each held-out group, the shared coefficients were fitted using only other people's labels before the global 70% unique-calendar-date cutoff. Held-out people were scored only on dates at/after that cutoff, with at least five later paired dates per person. Training required at least 200 examples and 20 per class.

The fixed solver, training-only standardization and 0.5 alert threshold were unchanged. There was no test-set feature or threshold tuning. History inputs were previous selection, prior 3/7-day rates and prior report count. Wearable inputs were sleep level plus changes in sleep, resting HR, HRV RMSSD, nightly temperature and steps relative to personal trailing medians. Absolute HR, HRV, temperature and steps were excluded from this fixed experiment to emphasize within-person changes.

Held-out people's own earlier journals and physiological readings supplied personal history/baselines, as they could in an app. Their labels did not fit the shared coefficients. This therefore tests unseen people with some personal history, not a zero-history first-use forecast.

## Evaluation coverage

All five folds had sufficient training support, with 1,020–1,292 training examples from 44–46 people per fold. Eighteen people had sufficient later test observations, yielding 566 test days, including 248 tired-selection days. Forty of the 58 people with any eligible pairs had fewer than five observations after the global cutoff. Collection-period and reporting differences therefore select the evaluated population.

No training participant appeared in that fold's test group. No training date crossed the calendar cutoff. Calendar dates are the source's normalized local dates; the anonymized export does not establish globally comparable receipt instants. This is retrospective calendar separation, not verified prospective availability.

## Primary paired results

All variants were evaluated on the same 566 dates. Lower Brier score means less squared probability error; it is not classification accuracy.

| Model | Brier score | Tired-selection days detected / 248 | False alerts |
|---|---:|---:|---:|
| Shared history | 0.23089 | 61 | 23 |
| Shared wearables | 0.25470 | 2 | 1 |
| Shared history + wearables | 0.23400 | 54 | 26 |
| Smoothed shared transition baseline | 0.23803 | 0 | 0 |
| Shared prevalence | 0.25073 | 0 | 0 |
| Previous report | 0.37279 | 149 | 112 |

The participant-cluster 95% interval for combined-minus-history Brier difference was **+0.00069 to +0.00555**, favoring history alone in this exploratory comparison. Training folds overlap and the fitted models were not refitted within bootstrap replicates; this is not independent confirmation.

### New tired-selection days after prior nonselection

There were 305 such test opportunities, including 99 positive reports. At the fixed threshold, history detected 1 of 99 with zero false alerts; wearables detected 2 with zero false alerts; combined detected 3 with one false alert. **Those tiny detection counts are not a dependable advance-warning result.** In particular, quoting the combined model's 75% precision without the 3-of-99 detection count would be misleading.

## Complete personal-baseline sensitivity check

Nine participants had at least five test dates with all selected sensor features/baseline changes present, yielding 233 dates. History Brier was 0.24613 and combined Brier was 0.24690. The interval for the difference was −0.00362 to +0.00563, including zero. Both variants detected zero of the 43 new tired-selection reports in that subset at the fixed threshold. Complete measurements did not establish better warnings.

## Interpretation

Shared fitting avoids asking a short personal diary to estimate every coefficient, but this particular model and target still do not justify a validated wearable risk score. These are different test people/dates and features from the earlier personal-model experiment; the absolute scores cannot be compared as proof that shared learning improved over personal learning.

LifeSnaps tiredness is an aggregated mood selection, not a clinical fatigue score. It has no verified endometriosis, menstrual-cycle, pelvic-pain or bowel-symptom targets. The study cannot establish whether these wearable signals improve endometriosis-specific forecasts. Physiology missingness can encode reporting behavior, and unknown actual receipt times limit prospective interpretation.

The fixed 0.5 threshold may be conservative; lowering it after inspecting these test days would not establish useful performance. A new operating policy would need earlier validation and new/prospective confirmation, not repeated searches on the same held-out scores.

## Product recommendation

Keep wearable connection and imports central. They let users bring physiological context alongside their journals and create the paired records needed for future evaluation. Preserve source, measurement definitions, timestamps and missingness. Do not hard-code a symptom-risk increase for a poor sleep/HRV/temperature reading or imply that these experiments validate it.

The next practical backend piece should be a usable, documented wearable import/connection path that Lexi can connect to the experience, with synthetic demo records clearly labeled and forecast-evidence status explicit. Provider support must be represented honestly: existing Oura scaffolding is not a tested universal Apple/Garmin connection. Actual new users' pairing/consent and prospective labels will matter more than another round of feature searches on these same cohorts.

## Implementation and verification

Added reusable shared-model research utilities, participant/time-separated fold construction, a reproducible aggregate evaluator and three tests for participant/date separation, delayed labels, later-outcome independence and target-day feature rejection. Fifteen relevant backend tests passed; TypeScript type-check passed. Only pooled results were exported. Source records, individual model outputs and coefficients were not shared or placed in the demo.

Lexi's UI, the public API and the live production model remain unchanged. No account or paid API was required.

Source: [LifeSnaps official open release v4](https://zenodo.org/records/7229547). All earlier source/label/units/receipt-time limitations remain.
