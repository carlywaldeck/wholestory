# Elya: real wearable added-value test

**Completed on LifeSnaps. This version of the wearable-augmented model did not demonstrate useful incremental benefit.** It detected more reported tiredness transitions, but generated more false alerts and worse probability estimates. This is a finding about this model, sample and task, not proof that wearables cannot help menstrual symptoms.

## Data and target

The official daily CSV contains 7,410 participant-day rows from 71 people. The authors' preprocessing code one-hot encodes answered mood reports and takes the daily maximum. Thus `TIRED=1` means tired was selected at least once that day; `TIRED=0` means it was not selected among answered reports. This is not a clinical fatigue-severity instrument or proof of absence throughout the day. All 2,290 nonmissing tired fields had at least one mood selected; all-zero/unknown mood rows would be excluded rather than assumed negative.

There were 2,013 consecutive calendar-day labeled pairs across 58 people. Personal models required at least 30 training examples, five per class and ten later test examples. Twenty-four people qualified, yielding 437 held-out dates. Thirty-four people with pairs were excluded for support, and 13 source participants had no eligible labeled pairs.

## Frozen experiment

Each person's earliest 70% of paired dates trained the models, and the final 30% tested them. The same dates were used for history-only, wearable-only, combined and two simple baselines. No participant identifier, age, gender or BMI was used as a feature. Each person had their own fit, so this tests later days of existing users, not prediction for unseen people.

History inputs were preceding tired selection, 3/7-day prior selection rates and reporting count. Wearable inputs were preceding-day sleep hours, resting heart rate, HRV RMSSD, absolute nightly temperature and steps, each with a change from that person's earlier trailing median when at least seven readings existed. Resting HR was not substituted for nocturnal HR. Zero HRV was treated as invalid/missing (30 source rows); missing values were not filled with zero. Medians for physiological changes used only dates before the preceding reading, and model preprocessing used training rows only.

The fixed L2 logistic solver used 250 steps and a 0.05 penalty, with the same 0.5 alert threshold in all arms. Model settings were fixed before this experiment; there was no post-result threshold or feature search.

Source timestamps support local calendar-day alignment but not actual data receipt. Availability of prior-day exports by next midnight is an explicit retrospective assumption. Sleep hours use `minutesAsleep / 60`; the separate duration field is milliseconds of time in bed and was not mistaken for sleep hours. Temperature was treated as absolute Celsius plus a derived personal median change, not a device-provided deviation.

## Primary results: all 437 paired test dates

Lower Brier score means less squared probability error. It is not classification accuracy.

| Model | Brier score | Reported-tired days detected / 171 | False alerts |
|---|---:|---:|---:|
| Personal historical rate | 0.2220 | 72 | 46 |
| Symptom history | 0.2259 | 64 | 52 |
| Wearables | 0.2509 | 81 | 71 |
| History + wearables | 0.2600 | 83 | 76 |
| Previous report | 0.3959 | 84 | 86 |

The participant-cluster 95% interval for combined-minus-history Brier difference was **+0.0060 to +0.0698**. Positive differences favor history alone. This is an exploratory interval, not prospective confirmation.

## New tired-selection days after prior nonselection

There were 267 such evaluated opportunities, including 87 positive next-day tired-selection reports.

| Model | Detected / 87 | False alerts | Precision |
|---|---:|---:|---:|
| Symptom history | 24 | 25 | 49.0% |
| Wearables | 33 | 41 | 44.6% |
| History + wearables | 42 | 48 | 46.7% |
| Personal historical rate | 24 | 22 | 52.2% |
| Previous report | 0 | 0 | Undefined: no alerts |

Adding wearables increased sensitivity but did not establish a useful overall improvement. More detected events accompanied more false alerts and worse probability error. These are reported selections, not confirmed clinical symptom onset events.

## Complete-core-sensor sensitivity check

Fourteen participants had at least ten held-out dates with preceding sleep, resting HR and HRV present, giving 230 common test dates. Using the same previously trained models, history Brier was 0.2313 and combined Brier was 0.2838. The paired cluster interval again favored history: combined-minus-history **+0.0054 to +0.1074**. On transitions after prior nonselection, history detected 11 of 47 with seven false alerts; combined detected 20 with 20 false alerts.

This selected subgroup does not represent all users or eliminate every missing-data issue. It does show that the primary result was not reversed merely by restricting to those three sensors being present.

## Implications and next modeling step

Keep wearable ingestion available for research and descriptive context; do not automatically raise a symptom estimate because a wearable metric deviates. The current personal fits have short training histories and relatively many sensor inputs, so limited training support/overfitting is a plausible explanation, not an established cause. Sensor noise, the broad mood-selection endpoint and population differences are other possible limitations.

A justified next model experiment is shared learning across people with personal baselines, using explicit participant/time separation for evaluation. That should be defined before testing, with a frozen baseline and no claim of independent confirmation from reusing already examined data. It is preferable to trying many feature/threshold combinations on these same test dates until one wins. No such shared model was trained in this section.

For Elya's endometriosis-specific wearable claims, a paired menstrual symptom/wearable cohort is still required. LifeSnaps has no verified endometriosis, period-start, pelvic-pain or bowel-symptom labels. It cannot be joined to unrelated EndoLIST participants to create those missing associations.

## Deliverables and verification

Added a local feature-preparation script, a reproducible evaluator and aggregate JSON results. Thirty-six Python research tests passed, including new checks for unknown survey labels, exact prior-calendar-day pairing, target-day feature exclusion, units, invalid HRV and duplicate dates. TypeScript type-check passed. Source and normalized participant data remain in ignored local storage; no participant histories, model coefficients or predictions were shared.

Lexi's UI, the live API and the active production model are unchanged. No account was created and nothing was purchased.

Sources: [official LifeSnaps release v4](https://zenodo.org/records/7229547), [authors' preprocessing notebook](https://github.com/Datalab-AUTH/LifeSnaps-EDA/blob/main/notebooks_preprocessing/visualization_df_creation.ipynb), [dataset paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC9622868/). The notebook was inspected as text, not executed.
