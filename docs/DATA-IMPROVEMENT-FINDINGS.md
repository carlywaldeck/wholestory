# Elya data and model candidate findings

November 14 2026

## What changed

Audited CycleBench / fem-state and evaluated a new MPIS research candidate. The candidate adds preceding-day pain severity and other reported symptoms to the same symptom's preceding-day occurrence, three-day rate, seven-day rate and seven-day reporting count. This is a retrospective population-model feature ablation, not a change to Elya's production personal learner. No UI, deployment, risk bands or personal training records changed.

## Source audit

All 43 CycleBench CSV files were inspected, totaling 5,665 rows. None includes a date or study-day column. The dataset card does not establish an original study, participant recruitment, imputation procedure or forecast-time availability. Its documented 0–5 symptom coding disagrees with values up to 6 shown by the viewer. Declared license metadata is openrail; this alone does not verify the underlying records' provenance. These files are excluded from real-data model validation. Adjacent rows must not be treated as consecutive days.

MPIS access metadata lists open CC BY 4.0; the downloaded source checksum is verified. Attribution: Valeria Tisch, Stefan Konigorski and Hannah Neumayer, MPIS Study Data, DOI 10.5281/zenodo.21538147. Only the 304 directly observed entries were used; 1,856 imputed rows were excluded. Consecutive observed pain pairs total 178 across 16 participants. This is an intervention cohort, not a verified endometriosis cohort. It has no paired wearable measurements. Dates were changed by the authors; report-arrival times are unavailable.

## Evaluation

For each held-out person, train separate fixed regularized logistic models on other people, using only earlier calendar-day features for each example. Compare baseline and expanded features on identical eligible outcomes. Fit preprocessing on training records only. No symptom checklist answer is invented when the checklist is missing. Require a known preceding-day target report; this reduces the fatigue/concentration and bloating comparisons to 31 outcomes across 10 people each.

All-person training includes other people's later dates: this is a held-person-out retrospective benchmark, not a live rolling forecast simulation. The small checklist subsets and intervention context limit conclusions. Participant-cluster bootstrap intervals are exploratory and unadjusted across outcomes. Earlier MPIS exploration has already taken place; this is not an independently preregistered replication.

## Decision

Retain this candidate for follow-up research. Do not deploy cross-person MPIS weights into a user's personal model. Evaluate the same feature family in a separate version of the actual prospective personal learner, with independent later data, before selecting it. Preserve the existing wearable-added-value gate. No finding here establishes that wearables predict menstrual symptoms.

## Reproduce

From the backend repository:

```sh
python3 research/audit_cyclebench.py --cache /tmp/elya-cyclebench-cache --output /tmp/elya-cyclebench-audit.json
python3 research/evaluate_mpis_feature_candidate.py --cache /tmp/elya-mpis-cache --output /tmp/elya-mpis-candidate.json
python3 -m unittest discover -s research -p test_mpis_feature_candidate.py
```

Four engineering tests cover future-outcome isolation, missing calendar days, unknown checklist labels and participant separation. They verify evaluation logic, not medical accuracy.

## Sources

- MPIS: https://zenodo.org/records/21538147
- CycleBench card: https://huggingface.co/datasets/haammar/fem-state


## Computed results

Lower Brier score is better. These are error scores, not percentage accuracy.

| Target | Evaluated days | Baseline Brier | Expanded Brier | Paired difference 95% exploratory interval |
|---|---:|---:|---:|---|
| any_pain | 178 | 0.10290 | 0.08954 | -0.02029 to -0.00346 |
| fatigue_or_concentration | 31 | 0.30219 | 0.25579 | -0.13657 to 0.02650 |
| bloating | 31 | 0.31271 | 0.29115 | -0.11910 to 0.11563 |

The any-pain result is approximately 13% lower Brier error in this retrospective sample; it is not a 13-percentage-point gain in accuracy. Fatigue/concentration and bloating intervals include no benefit. Any pain includes mild symptoms and does not establish severe-episode warning performance.

Among 140 next-day pain opportunities following a reported pain-free day, there were 10 new-pain outcomes. Baseline Brier was 0.07756; candidate Brier was 0.07069. This small onset subset does not establish reliable warning performance.

At the fixed research alert threshold of 0.5, the expanded any-pain candidate missed all 10 new-pain outcomes after pain-free days and produced one false alert. Its onset ranking was poor (AUROC 0.216). Thus the overall Brier improvement does not establish an effective new-episode warning. Do not tune a threshold on these same outcomes and present that as validation.
