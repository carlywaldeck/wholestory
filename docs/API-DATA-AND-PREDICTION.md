# Free APIs, real data, and prediction: working results

November 14, 2026. Carly's backend/data branch only. No Lexi-owned screens, global styles, journal schema or PDF files were changed.

## Concrete result

We used the free public **OSF API** for PMData to collect daily fatigue reports, Fitbit sleep and resting heart rate from 16 participants. No login, activation email, device ownership or API key was required. Public source file hashes are recorded in `research/pmdata-source-manifest.json`. Where OSF downloads timed out, a public mirror was accepted only after matching the original OSF SHA-256 hash.

After fixed data-quality and minimum-history checks, 13 participants and 353 held-out target days entered a next-day fatigue benchmark. The other three did not have sufficient matched history/test data. Original dates were retained; no fictional symptom histories were joined.

| Model | Mean absolute error | Root mean squared error |
| --- | ---: | ---: |
| Training-history mean | 0.4413 | 0.5592 |
| Previous day's fatigue | 0.4136 | 0.7298 |
| Journal-only ridge model | 0.4209 | 0.5485 |
| Wearable-only ridge model | 0.4331 | 0.5615 |
| Journal + wearable ridge model | 0.4185 | 0.5551 |

Errors are **points on the source 1–5 fatigue scale**, not percentages or endometriosis probabilities. All models are evaluated on the same held-out dates. The combined model does not consistently beat the simpler alternatives. The tiny MAE difference from journal-only is not evidence of a meaningful benefit; its RMSE is worse. No significance or clinical benefit claim is made.

This is real-world fatigue data, but participants are not an endometriosis cohort. It tests the forecasting pipeline and the incremental contribution of wearable inputs in another population. It does not establish pelvic-pain prediction, individual symptom accuracy in endometriosis, or earlier diagnosis.

## API and reproduction

Free source API: `https://api.osf.io/v2/nodes/vx4bk/files/osfstorage/`

Recorded app research API: `GET /api/research/benchmark`. Implemented for Next.js and the Sites Worker on this branch. It returns the aggregate recorded result, provenance, method and limitations. It does not fetch a person's health record or generate a live forecast. No patient identifiers or raw records are returned. It is not live on the hosted app until the branch is integrated and deployed.

```sh
python3 research/pmdata_benchmark.py \
  --cache work/pmdata-api-cache \
  --output work/pmdata-real-benchmark.json
python3 -m unittest discover -s tests/research -v
npm test
```

Source: [PMData](https://datasets.simula.no/pmdata/), Thambawita et al. (2020), doi:10.1145/3339825.3394926. Retain original downloaded CC BY-NC 4.0 terms for this noncommercial research demonstration; the current landing page lists a different license, so don't silently remove the original restriction.

## What the experiment actually does

Within each person, the first 70% of eligible dates train a fixed regularized linear model and the last 30% test it. Features are previous-day fatigue, sleep duration and resting heart rate. Imputation and scaling use training data only. Minimum 30 training targets and 10 complete-wearable test targets are engineering filters, not clinical validation thresholds. Late prior journal reports are excluded. Wearable arrival timestamps are unavailable, so results are retrospective rather than verified real-time forecasts.

Invalid readings are excluded at the measurement level, not replaced with zero. Missing or invalid fatigue ratings do not become negative labels. Whole histories are not discarded because of one invalid sensor reading. Per-person quality counts and exclusions are retained. This was an exploratory run; there are no confidence intervals, prospectively chosen study protocol, or external participant-held-out validation.

## Additional real-data sources outside PhysioNet

| Source | Access checked | Suitable use | Does not test |
| --- | --- | --- | --- |
| [PMData](https://datasets.simula.no/pmdata/) | Public OSF API and downloads; actual benchmark completed | Longitudinal fatigue forecast and wearable ablation | Endometriosis-specific symptoms or diagnosis |
| [SILVER-Pain](https://data.mendeley.com/datasets/m38f8ydn49/3) | Repository describes an open physiological/pain-label portion, CC BY 4.0; restricted extra modalities are separate | A separate experiment on physiological signals and pain labels | Next-day endometriosis flare prediction |
| [Endometriosis Knowledge Australia](https://www.nature.com/articles/s44294-025-00096-6) | Public OSF API `https://api.osf.io/v2/nodes/spzej/files/osfstorage/` lists Endo_data.sav, R code and supplement | Potential cross-sectional symptom/knowledge analysis; verify reuse terms first | Daily forecasting; API metadata did not declare a dataset license |
| [Delayed treatment of endometriosis](https://data.mendeley.com/datasets/s749x837jx/1) | Public repository page describes data with CC BY 4.0; patient files not inspected | Candidate for diagnostic-delay research after schema/quality review | A wearable predictor or daily symptom forecast |

Open files and an API are helpful access properties; neither makes an unrelated target clinically valid. No restricted-access mirrors were used.

## Endometriosis implications for the product

[WHO](https://www.who.int/news-room/fact-sheets/detail/endometriosis) describes a variable symptom burden and long diagnostic delays. The app should capture pain timing and functional effects without assuming every user's symptoms follow a regular cycle. Symptoms may remain important when wearable measurements look normal.

[NICE NG73](https://www.nice.org.uk/guidance/ng73/chapter/Recommendations) supports symptom records for clinical discussion and states that normal examination/ultrasound does not exclude endometriosis. We should help people document persistent concerns and discuss evaluation, without requiring months of logging before care.

The exploratory [EndoTECH study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12048534/) motivates studying symptom/activity relationships but is not a validated next-day predictor. Its individual paired records require a research request. Clinical-domain evaluation remains an explicit unmet requirement.

## Competitive decision to discuss with Lexi

The [Juno comparison article](https://junocompanion.com/blog/symptom-tracking/best-apps-for-endometriosis) is written by Juno and discloses that it is promoting its own app. Its stated voice logging, reports and wearable imports overlap our current bundle. We should not call that bundle unique or treat the article as an independent ranking.

A sharper product hypothesis: **a personal forecast that earns trust, paired with a record of what remains unresolved in care**. Evaluate predictions against what actually happened; disclose when a simple baseline works better; preserve the person's words in the appointment record; carry a chosen question and next step forward after the visit. This requires user and clinician testing and does not establish novelty by itself.

Proposed division:
- Carly: source ingestion, temporal modeling, error/calibration evaluation, data sufficiency, provenance, and backend contracts.
- Lexi: usable check-in, uncertainty/abstention states, appointment story and follow-up experience.

No new UI or care-navigation behavior has been implemented in this update. The backend still does not enable a public clinical symptom forecast. The next clinically relevant step is obtaining appropriately licensed longitudinal endometriosis outcomes or running an approved prospective study; we will not substitute a fatigue benchmark and advertise endometriosis validation.
