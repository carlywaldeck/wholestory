# Cycle timing and physiological inputs for Elya

Reviewed November 14, 2026. This is the engineering evidence map for the experimental backend, not a medical treatment guide. Lexi's layout and styling were left unchanged; the separately requested Elya rename updates branding strings only.

## What the research supports testing

| Input | Evidence and proposed use | Boundary |
| --- | --- | --- |
| Confirmed period starts and observed cycle lengths | Personal calendar recurrence; compare similar positions in previous completed cycles | Estimated calendar position is not a hormone-confirmed phase. Do not assume 28 days or fixed day-14 ovulation. |
| Overnight wrist/skin temperature | Candidate aid to cycle-event timing | Temperature deviation is not core temperature, measured hormones, or proof of an upcoming endometriosis symptom. |
| Nocturnal heart rate and HRV (RMSSD) | Candidate autonomic context and within-person fatigue association | Normal cycle-related variation, other stressors and device processing can change these readings. |
| Sleep duration/disruption and activity | Candidate behavioral context, especially fatigue | Symptoms themselves can change sleep and movement; same-day association is not next-day prediction. |
| Respiratory rate | Secondary cycle-context candidate | Not a symptom-specific alert or endometriosis biomarker. |

Primary evidence reviewed:

- **Wrist temperature:** A prospective study of 260 participants/889 cycles evaluated retrospective ovulation estimates and next-menses timing. It supports cycle-event estimation, not a symptom forecast. Hormonal contraception users were excluded. [Wang et al., Human Reproduction 2025](https://academic.oup.com/humrep/article/40/3/469/7989515).
- **Heart rate/HRV and symptoms:** A November 2026 study followed 20 young women with nocturnal ECG and diaries. It found phase-related physiology and contemporaneous physical-condition/fatigue associations, with inferential uncertainty. It did not test predictive accuracy. Its raw individual records are restricted. [Syed Taha et al., Frontiers in Digital Health](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2026.1992950/full).
- **Endometriosis-specific actigraphy:** The exploratory EndoTECH study followed 68 people with confirmed endometriosis. Activity was associated with fatigue; daily activity/pain associations were weak. No validated next-day symptom model resulted. Individual data require an authorized research request. [Edgley et al., npj Digital Medicine 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12048534/).
- **Cycle confounding and contraception:** A large Fitbit/Pixel Watch observational study compared naturally cycling and hormonal-contraception groups and described phase-related RHR, HRV and breathing changes. It motivates cycle and regimen controls, not a generic abnormal-vitals flare rule. Authors were Google employees/shareholders. [Heneghan et al., Women's Health 2026](https://pubmed.ncbi.nlm.nih.gov/42980658/).
- **Potential paired dataset:** mcPHASES combines wearable, symptom and hormone measurements, but its official files are still unavailable. Do not treat the paper or public code as data access. [Official dataset status](https://physionet.org/content/mcphases/1.0.0/).

## What was built

1. A local-time-aware personal symptom model and optional server interface, with eight separate confirmed boolean/null outcomes. Forecasts and backtests use the same local issuance clock. DST gaps/ambiguities are withheld rather than silently shifted. Reports arriving after the historical issuance time cannot enter those features.
2. An experimental calendar-position candidate: use up to six completed observed cycles, learn their lengths, and average over those lengths when locating tomorrow in prior patterns. No future period starts, inferred hormone labels or fixed 28-day assumption enter the model. It requires at least three completed cycles and enough matched symptom labels. These are engineering guards, not validated clinical thresholds. It abstains when timing is too variable, the current cycle exceeds the observed range, or the recorded regimen is hormonal/unknown.
3. A fixed equal mixture of the cycle candidate and the previous-day transition model when both are supported; otherwise the transition model remains available. The mixture is not selected to optimize the displayed test score. Backtests compare it with history-only, historical-rate and persistence on identical evaluated dates. The cycle candidate has not been validated in a real paired cohort. Existing MPIS results do not validate this new model.
4. A six-signal physiological contract and Oura physiology import. Nocturnal heart rate is kept distinct from a lowest/resting-heart-rate measure; HRV is RMSSD in milliseconds; temperature is provider deviation in Celsius. Sleep uses local waking dates. Import receipt time is recorded rather than pretending historical values were available earlier. Missing signals remain null and sources are not pooled into one baseline.
5. Physiological readings are currently **context-only** and explicitly marked `usedInForecast: false`. Their simple trailing baselines are not cycle-adjusted. We have not established that adding them improves accuracy; neither a low HRV nor a temperature change independently triggers a symptom warning.

## What "making it accurate" means next

Run prespecified comparisons of history-only, cycle-aware, and cycle-plus-physiology models on future, directly reported outcomes. Model each symptom independently. Preserve no-symptom reports, missingness, submission times, device provenance, regime changes and availability cutoffs. A known regime start now resets the transition-model training window as well as the calendar component. The current regimen record is not a complete treatment-event ledger.

For physiological models, compare deviations from the person's usual values at similar cycle positions, not just deviations from a whole-month average. Include illness, travel, alcohol, exercise and treatment context when directly reported, without claiming causal explanations. Test whether any added signal improves calibration, alert precision/recall and false-alert burden beyond cycle timing and symptom history alone. Use participant/cycle separation and uncertainty intervals; do not tune on the final test period.

The real MPIS benchmark now includes 2,000 participant-cluster bootstrap replicates. For the existing transition comparator versus previous-report persistence on any menstrual pain, the Brier difference is -0.0100 with an exploratory 95% interval [-0.0237, +0.0044]. Because it includes zero, improvement remains unestablished. Most other symptoms remain sparsely or selectively labeled. These intervals are not adjusted for multiple outcomes and do not establish prospective or endometriosis-specific performance.

## Access today

No new paid API or ring purchase is needed for the synthetic demo. Oura sandbox requests have already succeeded without a user account, and MPIS/PMData support public-data experiments. Actual future validation needs authorized longitudinal labels, preferably from an endometriosis cohort with aligned wearable signals; a connector alone cannot supply those labels. No author emails or data-access applications were sent on Carly's behalf.

Evaluation also separates new symptom onsets after an explicitly absent preceding day from continuation after a present preceding day. A continuation forecast is not evidence of advance warning before symptoms begin.

The onset breakdown is particularly important: the existing MPIS transition comparator detected none of the 10 new pain onsets following reported absence (140 onset opportunities), while detecting all 30 continuations following reported presence. This is why its overall accuracy cannot substantiate advance-warning performance, and why the new calendar candidate needs a separate onset-focused evaluation on appropriate real data.

Brand update: visible product copy is now Elya. The existing GitHub repository, shared URL and browser storage identifiers are retained for continuity. Only branding strings/wordmark were changed in experience files; no layout or navigation changes were made.
