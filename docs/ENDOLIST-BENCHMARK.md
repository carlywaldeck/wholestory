# Elya: first real endometriosis forecasting benchmark

**KI EndoLIST access worked.** The authorized archive was downloaded through the signed-in PhysioNet session. All 41 entries listed in the source checksum file verified successfully. It contains 34 participant files and 5,112 daily records. The research scripts read the archive locally; raw/normalized participant records and model coefficients are not included in this report, GitHub, or the public demo.

The frozen 0.3 research candidate was tested against later reported symptoms from people with formally diagnosed endometriosis. This is a retrospective research benchmark, not clinical validation. No wearable measurements are included, and the live app remains unchanged.

## What was tested

For each supported person and symptom, the first 70% of eligible days trained the model and the final 30% tested it. The model used prior reported symptoms and past recorded period starts. Target-day cycle numbers, cycle days and symptoms were never features. All preprocessing used training data only. Model settings and the 50% alert threshold were unchanged from the candidate built before this dataset became accessible.

Blank entries remained unknown. Each person's explicit 0–4 or 0–10 symptom scale was respected. Energy, migraine and combined nausea/vomiting instruments were excluded from fatigue, headache and nausea respectively. Bloating/“endo belly” and bowel-movement pain are explicitly defined symptom families, not universal interchangeable instruments.

## New symptom episodes: any reported presence

These counts use the joint cycle-and-journal candidate at the fixed alert threshold. A new episode requires an explicitly absent report on the preceding observed calendar day. These are different symptom subsets; do not add their events as independent people or episodes.

| Reported outcome | Supported participants | Test days | New episodes | Detected | False alerts on onset opportunities |
|---|---:|---:|---:|---:|---:|
| Pelvic pain | 8 | 335 | 38 | 7 | 21 |
| Fatigue | 5 | 200 | 30 | 16 | 13 |
| Bloating / endo belly | 13 | 518 | 56 | 33 | 20 |
| Headache | 11 | 486 | 67 | 19 | 18 |
| Bowel-movement pain | 9 | 388 | 44 | 8 | 11 |
| Nausea | 8 | 347 | 41 | 20 | 26 |

Participants were excluded from each outcome if their chosen instruments, missing labels or training support were insufficient. Results therefore do not describe all 34 participants. Urination pain and daily-life impact had insufficient supported participants; no performance claims are made for them.

The bloating-family result detected 59% of new episodes; 62% of onset alerts were correct. Participant-resampled exploratory 95% intervals were wide: approximately 34–80% for detection and 47–78% for precision. These are not prospective accuracy guarantees.

## Probability estimates versus simple baselines

Across all eligible test days, lower Brier score means less squared probability error. This metric is not the same as new-onset detection or clinical usefulness.

| Outcome | Cycle + journal | Previous report | Personal historical rate |
|---|---:|---:|---:|
| Pelvic pain | 0.1817 | 0.2358 | 0.2272 |
| Fatigue | 0.2139 | 0.3000 | 0.2009 |
| Bloating / endo belly | 0.1627 | 0.2181 | 0.1933 |
| Headache | 0.1861 | 0.2778 | 0.2066 |
| Bowel-movement pain | 0.1622 | 0.2320 | 0.2106 |
| Nausea | 0.1660 | 0.2277 | 0.1851 |

Five of these six supported outcomes had lower probability error than both baselines in this experiment. Fatigue did not beat personal historical rate. Exploratory participant-cluster bootstrap intervals for those five Brier differences excluded zero, but they are unadjusted for multiple comparisons and based on small selected cohorts. This is encouraging evidence to investigate further, not independently confirmed effectiveness.

The accompanying aggregate JSON also reports continuation metrics, the separate onset-only training experiment, higher-burden targets and uncertainty. Higher burden means at least half of the person's instrument maximum; it is an engineering definition, not a validated clinical severity boundary. A transition into higher burden is not necessarily a new symptom.

## Limits that matter

- Participants had regular monthly cycles and were not using hormonal treatment at enrolment. Results cannot be assumed to apply to undiagnosed users, irregular cycles or hormonal treatment. Subsequent treatment changes are not modeled here.
- Source study-day indices were converted into arbitrary technical calendar coordinates. Actual calendar dates and report-receipt times are unavailable. Assuming prior-day reports were available by 18:00 enables a retrospective replay; it does not prove real-time warning lead time.
- Individualized symptom definitions and scales may differ in meaning. Numerical rescaling does not establish equivalent measurement.
- All models use the same combined history/cycle feature family. This experiment does not isolate the incremental contribution of cycle features; an ablation comparison is still needed.
- No wearable benefit is established by these results. These participants cannot be joined to unrelated PMData wearers to fabricate paired data.
- False alerts and missed episodes remain material, especially for pelvic pain and headache. Strong overall probability scores do not establish a dependable advance-warning service.

## Recommended next section

Keep the prediction feature central. Next, compare symptom history alone versus cycle-aware history on this same data, with the onset outcome and alert burden fixed before evaluation. Preserve the current results as the frozen reference. Use only clearly labeled fictional histories in the public demo; expose no research participant records or patient-specific trained artifacts. Wearable benefit needs a separate authorized paired cohort.

Validation completed: 30 Python research tests passed; TypeScript type-check passed. The existing backend tests were unchanged. Lexi's UI and the public production model were not modified.

Source: [KI EndoLIST v1.0.0](https://physionet.org/content/ki-endolist/1.0.0/), Zelovich et al. (2026), [DOI: 10.13026/k99q-fm63](https://doi.org/10.13026/k99q-fm63). Use is governed by the PhysioNet Restricted Health Data License 1.5.0, not a blanket license to redistribute patient records or commercialize them.
