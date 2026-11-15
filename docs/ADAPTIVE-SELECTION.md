# Elya: selecting symptom-history versus cycle-aware models

**The selection rule works as intended, but this experiment did not establish better new-symptom warnings.** It usually chose history-only forecasting. It sometimes reduced probability error or false alerts, with no increase in new-onset detections in the reported supported symptom groups. This is progress in testing model choices, not a reliable-warning or clinical-validation milestone.

## Fixed selection protocol

The outer personal split stayed unchanged: first 70% training, last 30% evaluation. The selector never received the later test outcomes. Within outer training, the earliest 70% fitted two models and the latest 30% compared their Brier scores. Training labels unavailable at the inner validation origin were excluded from fitting.

The rule required at least 30 inner-training examples with five examples per class and at least 14 validation examples. Cycle selection additionally required at least 14 inner-training dates and seven validation dates with usable cycle features. It chose cycle only for a validation Brier reduction of at least 0.005; otherwise history was the default. These fixed support/margin settings were specified before this run and are engineering choices, not clinical sufficiency criteria. The selected model was refitted on the full outer training period. When cycle context was unavailable on a test day, history was used.

The warning threshold stayed 0.5. No threshold was changed after examining test results. No wearable inputs were used. This optimizes probability error, not a patient-chosen balance of missed symptoms and false alarms.

## Any reported symptom presence

Lower Brier score means less squared probability error. The alert counts below cover new-onset opportunities after explicit prior absence, not continuing symptoms.

| Outcome | Participants | Cycle selected for | History Brier | Adaptive Brier | New episodes detected: history → adaptive | False alerts: history → adaptive |
|---|---:|---:|---:|---:|---:|---:|
| Pelvic pain | 8 | 2 | 0.18135 | 0.17519 | 6 → 5 | 18 → 14 |
| Fatigue | 5 | 0 | 0.19741 | 0.19741 | 10 → 10 | 8 → 8 |
| Bloating / endo belly | 13 | 0 | 0.15370 | 0.15370 | 33 → 33 | 20 → 20 |
| Headache | 11 | 0 | 0.18706 | 0.18706 | 18 → 18 | 17 → 17 |
| Bowel-movement pain | 9 | 1 | 0.15550 | 0.15586 | 7 → 7 | 8 → 8 |
| Nausea | 8 | 1 | 0.15993 | 0.15973 | 20 → 20 | 26 → 26 |

Pelvic pain had 38 new episodes, so both variants still missed most onsets. A reduction of four false alerts cost one additional missed episode. Bowel-movement pain slightly worsened in probability error. Other differences were negligible or identical. Higher-burden target results are in the aggregate JSON; there was no new-onset detection gain there either. Higher burden is an engineering threshold at half the personal instrument maximum, not validated clinical severity.

Exploratory participant-cluster intervals for the adaptive-minus-history Brier differences included or touched zero. When no choices changed, zero-width delta intervals simply reflect identical predictions, not proven clinical equivalence or certainty. These intervals are unadjusted for multiple outcomes, and this cohort has already been examined in earlier experiments. Independent or prospective confirmation is still needed.

## What changed in the backend

The research candidate now exposes `adaptiveSelection` metrics using earlier selection and `adaptiveCandidate` for an experimental future estimate selected using available past data. Existing future-estimate fields retain their original meaning. Existing history and cycle benchmark target counts and Brier scores reproduced their frozen references within 1e-12. The public API does not activate the research candidate.

The new tests verify that a known synthetic cycle signal can be learned, late inner-training labels are excluded, and changing later test outcomes cannot change the earlier model choice. Eighteen relevant backend tests passed; TypeScript type-check passed.

## Recommended next decision

Choose the intended warning tradeoff before the next experiment: catching more new episodes generally permits more false alerts, while fewer false alerts can mean more missed episodes. Define the evaluation target and warning burden explicitly, then choose alert policy using earlier validation data and measure the tradeoff on later days. Reusing this already inspected cohort remains exploratory. No operating policy should be presented as clinically validated.

Restricted data remain local. Only pooled metrics are exported; no participant-level records, forecasts, choices or model coefficients were published. Lexi's UI, the live API and the active production model remain unchanged. This section stops at the research checkpoint.

Source: [KI EndoLIST v1.0.0](https://physionet.org/content/ki-endolist/1.0.0/). All prior limitations remain: selected diagnosed/regularly cycling cohort, individualized symptom instruments, missing labels, assumed historical receipt times and no wearable measurements.
