# Elya: three-day symptom planning experiment

**The experiment is complete. Three-day forecasting remains a plausible planning feature, but we have not established an advantage over a simple personal history baseline or a dependable learned warning policy.** More paired symptom/cycle/wearable data will be needed to validate the full product. No paid API or additional account was needed for this test.

## What was predicted

The target was any reported symptom presence within the next three calendar days. For the separate higher-burden task, the target was any report at or above half of the person's instrument maximum. Higher burden is an engineering threshold, not validated clinical severity.

“New-onset” metrics here mean a positive future window following an explicitly symptom-free preceding day, or a below-threshold preceding day for the higher-burden task. They do not identify an exact onset date or count distinct symptom episodes. These counts cannot be compared directly with the earlier next-day benchmark: horizons, supported participants and scoring units differ.

## Method and leakage checks

- Used the same authorized KI EndoLIST archive and normalized symptom definitions. No wearable values were added or invented.
- Used the existing fixed personal logistic model with four symptom-history features. Prior experiments did not establish a cycle-feature benefit, so this experiment held the history-only feature set fixed rather than adding further models to search.
- A positive report established window presence. A negative label required explicit absence on all three days. Other windows remained unknown; immature windows were excluded even if an early positive was already known.
- Kept a first-70% training / final-30% test-origin split. Training windows ending on/after the first test day, or whose labels were unavailable at the test origin, were removed.
- Scored test windows only every three days on a fixed study-day grid. Missing origins did not move that grid. Training windows could overlap; scored validation and test windows did not.
- Earlier validation updated fits every 21 calendar days, using only closed, available prior windows. It began after 45 days and required at least 30 training examples and five per class. This provided more earlier validation opportunities without training on future window labels.
- Reused the previously fixed threshold grid and empirical warning budget: maximize earlier recall with at least 50% precision and at most three false alerts per 30 evaluated onset opportunities, plus minimum support. No requirements were loosened after seeing test scores. This budget is not a guarantee and is not a monthly notification limit.

## Any-presence results at the fixed 0.5 threshold

The following are positive planning windows after a symptom-free preceding day, not exact episodes. Participants needed sufficient training labels and both classes; outcome metrics for fewer than five supported people were withheld.

| Symptom family | Participants | All test windows | Positive windows after prior absence | Detected | False alerts after prior absence |
|---|---:|---:|---:|---:|---:|
| Pelvic pain | 6 | 81 | 22 | 10 | 13 |
| Bloating / endo belly | 7 | 95 | 14 | 12 | 7 |
| Headache | 8 | 119 | 30 | 17 | 12 |
| Bowel-movement pain | 8 | 115 | 25 | 6 | 5 |
| Nausea | 6 | 87 | 18 | 12 | 5 |

Fatigue presence and urinary-pain presence had too few supported participants for reported metrics. For higher-burden fatigue, six supported participants yielded 18 positive windows after a below-threshold preceding day: 13 were detected with three false alerts. This is a small exploratory result, not a clinical accuracy claim.

## Does it beat a simple baseline?

The main comparator was a smoothed personal transition baseline trained on the same three-day labels, conditioned on the preceding symptom state. This is a more relevant comparator than simply repeating yesterday's symptom state. Lower Brier score means less squared probability error across all test windows.

| Any-presence outcome | Logistic history model | Simple transition baseline |
|---|---:|---:|
| Pelvic pain | 0.2415 | 0.2385 |
| Bloating / endo belly | 0.1369 | 0.1383 |
| Headache | 0.1898 | 0.1977 |
| Bowel-movement pain | 0.1940 | 0.2102 |
| Nausea | 0.1108 | 0.1162 |

The model's participant-cluster 95% Brier-difference intervals included zero for all these presence outcomes. The small differences do not establish superiority. For higher-burden pelvic pain and nausea, the transition baseline had lower error and exploratory intervals favored it. Those intervals are unadjusted across outcomes and not independent confirmation.

## Learned warning policy

No symptom outcome reached five supported participants for the validation-selected warning policy. Small-subset performance was withheld. Bloating presence had zero supported policies; headache presence had two and pelvic pain presence had one. Withholding is not a successful low-risk prediction. A fixed-threshold result and an assessable learned policy are different milestones.

Thus the planning horizon is testable, but the current data still cannot support a broadly reliable, personalized low-false-alert warning policy. We did not relax criteria or alter thresholds after seeing this result.

## What more data is needed?

For the full Elya model, the highest-value data pair the **same people's** daily symptom severity/absence reports, recorded period starts, relevant treatment changes and wearable measurements over multiple cycles. Receipt/measurement timestamps are needed to establish what was actually available before each forecast. Missing measurements must stay missing. Unrelated symptom and wearable cohorts cannot be joined as if they were paired observations.

The next wearable-specific lead remains [mcPHASES](https://physionet.org/content/mcphases/1.0.0/), if authorized files are available to Carly's signed-in account. Publicly, the files were reported unavailable at the last check. An account alone does not prove file availability. The EndoTECH author-request route is another option and is not guaranteed same-day. Buying an integration API would not by itself provide the required longitudinal symptom labels.

The present cohort has already been examined across several experiments. New-cohort or prospective confirmation is needed before making accuracy, wearable-benefit or clinical-usefulness claims. Do not keep changing this benchmark until one variant scores well.

## Implementation and checks

Added an independent local three-day research candidate and an aggregate-only evaluator. Tests cover three-day missing-label semantics, target maturity and late labels, nonoverlapping scoring with missing origins, future-outcome exclusion from features, and earlier-policy independence from later test outcomes. Five new tests passed; TypeScript type-check passed.

Raw and normalized participant data remain local and ignored by Git. No individual trajectories, predictions, model parameters or thresholds were included in the shared report. Lexi's UI, live API and production model remain unchanged. No new account was created and nothing was purchased.

Source: [KI EndoLIST v1.0.0](https://physionet.org/content/ki-endolist/1.0.0/), under the PhysioNet Restricted Health Data License 1.5.0. Existing limitations remain: small selected diagnosed/regular-cycle cohort, individualized scales, selective missing labels, arbitrary technical calendar coordinates and assumed historical receipt times. No wearable benefit was tested here.
