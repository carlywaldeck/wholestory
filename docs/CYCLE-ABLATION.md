# Elya: does cycle timing add predictive value?

**This experiment did not establish a consistent benefit from adding the current cycle features to recent symptom history.** The first EndoLIST results remain reproducible, but their gains over simple baselines cannot be attributed to cycle timing. Symptom history is a useful foundation; cycle information should earn its influence through earlier validation rather than being assumed to improve forecasts.

## Controlled comparison

We used the same authorized KI EndoLIST archive, personal first-70% training/final-30% held-out targets, training-only preprocessing, fixed logistic settings and fixed 0.5 alert threshold. Only the feature set changed:

- History: preceding symptom presence, recent 3/7-day rates and report count.
- History plus cycle: the same history features plus the existing calendar harmonics and cycle-length spread, computed from period starts known before the forecast origin.

The current cycle features require three completed recorded cycles. Missing cycle features were not filled using later periods. Training windows, regime boundaries and eligibility stayed identical in both arms. Wearable inputs were absent.

The previously saved cycle-model Brier scores and target counts matched the frozen reference within 1e-12. No test thresholds or model parameters were tuned. This is an additional exploratory analysis of an already examined cohort, not independent validation.

## Any reported symptom presence

Lower Brier score means less squared probability error. It does not measure new-onset detection directly.

| Outcome | Participants | History Brier | History + cycle Brier | New episodes detected: history → +cycle | False alerts on onset opportunities: history → +cycle |
|---|---:|---:|---:|---:|---:|
| Pelvic pain | 8 | 0.18135 | 0.18168 | 6 → 7 | 18 → 21 |
| Fatigue | 5 | 0.19741 | 0.21394 | 10 → 16 | 8 → 13 |
| Bloating / endo belly | 13 | 0.15370 | 0.16267 | 33 → 33 | 20 → 20 |
| Headache | 11 | 0.18706 | 0.18607 | 18 → 19 | 17 → 18 |
| Bowel-movement pain | 9 | 0.15550 | 0.16220 | 7 → 8 | 8 → 11 |
| Nausea | 8 | 0.15993 | 0.16597 | 20 → 20 | 26 → 26 |

History-only had lower probability error in five of these six supported symptom families. The small headache improvement was uncertain: the participant-cluster 95% interval for cycle-minus-history Brier difference included zero. Fatigue caught additional episodes with cycle features but also increased false alerts and worsened overall probability error. We cannot select a preferred clinical warning policy from this tradeoff alone.

For bloating, both models detected 33 of 56 new episodes with 20 false alerts. Adding cycle features did not improve those alert counts and worsened the probability score. Thus our earlier bloating result was not evidence that cycle timing caused the improvement over simple baselines.

## Check restricted to days with usable cycle context

Before running this comparison, we defined a diagnostic subset: at least 14 training dates with all five cycle features observed, followed by test dates with those same features observed. Fourteen days is an engineering diagnostic, not evidence of clinical sufficiency. Results were withheld when fewer than five participants remained.

- Bloating presence: 5 participants, 216 test dates; Brier 0.15838 for history versus 0.17773 with cycle. Both detected 18 of 24 onsets with 12 false alerts.
- Bowel-movement pain presence: 5 participants, 213 test dates; Brier 0.14866 versus 0.15280. Onset detections 7 versus 8; false alerts 5 versus 8.
- Higher-burden bloating: 6 participants, 267 test dates; Brier 0.16476 versus 0.17407. This category is at least half of the personal scale maximum, not a validated clinical severity boundary.
- Higher-burden fatigue: 5 participants, 212 test dates; Brier 0.18325 versus 0.18448.

This check also did not establish consistent incremental benefit. Other cycle-supported subsets were too small to report performance.

## Implications for the model

Keep recent personal symptom history as the reference model. Treat cycle timing and wearables as candidate additions whose value must be demonstrated, rather than forcing them into every forecast. This result concerns these calendar features, model settings and selected data; it does not establish that cycles are biologically irrelevant or that other cycle models cannot help.

A sensible next experiment is to choose history-only versus cycle-aware forecasting using earlier training/validation periods, then evaluate that selection rule on later days. Alert sensitivity and false-alert burden need a separately defined evaluation policy. Reusing these already inspected held-out days remains exploratory; prospective or new-cohort confirmation is still needed.

## Limits and privacy

This small, selected cohort had diagnosed endometriosis, regular cycles and no hormonal treatment at enrolment. Missing labels and personal symptom instruments select different participants per outcome. Scale definitions and study-day/receipt-time assumptions from the first benchmark remain unchanged. Bootstrap intervals use 2,000 participant resamples and are exploratory, unadjusted for multiple comparisons. No wearable benefit is tested here.

Only pooled metrics are shared. Restricted patient records, individual forecasts and fitted coefficients remain outside GitHub and the public demo. Lexi's UI, live API and production forecasts were not changed.

Source: [KI EndoLIST v1.0.0](https://physionet.org/content/ki-endolist/1.0.0/), under the PhysioNet Restricted Health Data License 1.5.0. Full aggregate metrics and uncertainty are in `elya-cycle-ablation.json`.
