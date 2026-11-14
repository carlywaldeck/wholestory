# Elya: choosing an advance-warning policy

## Product decision

Prioritize helping users prepare for new symptom episodes, while limiting false alerts. The intended use is planning and appointment preparation, not diagnosis, treatment decisions or reassurance that symptoms will not occur. A warning policy should be learned from earlier data and assessed on later days, rather than lowering a threshold until the already inspected test scores look impressive.

## Fixed research policy

We tested a validation-selected threshold for the adaptive history/cycle model. The earlier validation objective was highest onset recall subject to at least 50% empirical precision and no more than three false alerts per 30 evaluated onset opportunities. This is a preliminary engineering policy, not a clinically validated or user-tested burden limit. Thirty evaluated onset opportunities is not a calendar month, and the budget is per symptom, not a combined app notification budget.

The threshold grid was fixed before this run: 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80 and 0.90. Ties favored fewer false alerts, then the higher threshold. Validation needed at least 14 onset opportunities, three positive episodes and three negatives. If support or budget rules failed, no threshold was issued. This is an unavailable policy, not a low-risk prediction.

Earlier feature selection and threshold selection occurred within the outer training portion only. The final 30% test dates remained unchanged. The model was refitted on outer training before test evaluation, which can shift score distributions; satisfying the earlier validation budget cannot guarantee the same later false-alert rate. The cohort has already been inspected, so this remains exploratory, not independent confirmation.

## Result: insufficient supported policies

No symptom group reached five participants with an assessable selected policy. Performance metrics for those small subsets were therefore withheld. This does not mean the model predicted absence successfully.

| Any-presence outcome | Participants with a supported base model | Participants with a supported warning policy | Covered / eligible test onset opportunities |
|---|---:|---:|---:|
| Pelvic pain | 8 | 2 | 63 / 195 |
| Fatigue | 5 | 0 | 0 / 69 |
| Bloating / endo belly | 13 | 0 | 0 / 182 |
| Headache | 11 | 0 | 0 / 301 |
| Bowel-movement pain | 9 | 2 | 53 / 268 |
| Nausea | 8 | 2 | 63 / 154 |

Most failures were too few earlier onset opportunities/events, or no threshold satisfying the empirical alert budget. Higher-burden outcomes also failed to reach five supported participants. We did not relax support, precision or budget requirements after seeing the results. We have not demonstrated reliable higher-sensitivity warnings with an acceptable false-alert burden.

## What is implemented

The research backend now has a fixed-protocol threshold selector and separate new-onset warning candidate. It compares selected versus fixed-0.5 thresholds on exactly the same supported test opportunities, and reports withholding separately. The original forecast scores retain their meaning. The public API does not activate this candidate.

Tests cover budget-respecting selection, deterministic conservative ties, missing support, no feasible threshold, invalid thresholds, and the fact that changing later test outcomes cannot change the earlier policy. Twenty relevant backend tests passed; TypeScript type-check passed. Restricted records and patient-specific thresholds remain local. Lexi's UI and the active live model are unchanged.

## Recommended next experiment

Test symptom presence or escalation over the next three days as a planning forecast, rather than treating exact next-day onset as the only useful outcome. This is a proposed new target, not a result or accuracy claim. It should retain unknown labels, prevent overlapping future target windows from crossing training/validation boundaries, and account for dependent overlapping windows in evaluation. Select the policy using earlier data; keep the already observed cohort limitations explicit and seek new/prospective confirmation.

No new account or paid API is needed for that experiment. Real wearable contribution still needs an authorized dataset pairing the same people's measurements with symptom labels.

Source: [KI EndoLIST v1.0.0](https://physionet.org/content/ki-endolist/1.0.0/). All prior limitations remain, including a small selected diagnosed/regular-cycle cohort, individualized scales and assumed historical report availability.
