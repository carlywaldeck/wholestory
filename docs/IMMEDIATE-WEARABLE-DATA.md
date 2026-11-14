# Real wearable data available now

**Downloaded successfully: LifeSnaps daily data from the authors' official open Zenodo release. No account, email request, payment or approval wait was required.**

- 7,410 participant-day rows from 71 people.
- 2,290 days with a recorded daily tired-selection label: 880 selected tired and 1,410 did not. The remaining 5,120 days are unknown, not negative.
- Available physiological fields include HRV RMSSD (2,475 rows), resting heart rate (4,422), nightly temperature (3,359), sleep duration/minutes asleep (3,551) and steps (4,777). These are marginal availability counts, not a count of complete paired forecast examples.
- No duplicate participant/date rows found.
- Source metadata declares open access and CC BY 4.0. The same identifiers connect wearable and self-report fields within this source.

The daily CSV was fetched through anonymous HTTP byte ranges from the official archive. This avoided downloading the full 615 MB archive. The CSV ZIP-member CRC was verified and its SHA-256 recorded. The whole archive MD5 was recorded from source metadata but was not verified against a full download.

## What it enables

This gives us another real paired wearable/self-report dataset to test whether wearable readings improve prediction of later reported tiredness. It includes more sensor types than our existing PMData experiment. No model was trained on it in this acquisition step; label aggregation, temporal alignment, units and missingness need review before forecasting. In particular, sleep duration is stored in milliseconds, nightly temperature is an absolute reading rather than a device-provided temperature deviation, and selecting “tired” is not a clinical fatigue-severity score.

**It is not an endometriosis cohort and has no verified menstrual symptom/period targets.** It cannot validate wearable-based pelvic-pain or bowel-symptom warnings. Keep EndoLIST for endometriosis symptom-history experiments and LifeSnaps for wearable/tiredness experiments; do not join unrelated people across these datasets.

Raw records are in the ignored local `work/lifesnaps-cache/` folder, not GitHub or the public demo. The collector is reproducible in `research/fetch_lifesnaps_daily.py`; the shared aggregate audit is `elya-lifesnaps-data-audit.json`. Thirty-two Python research tests passed, including ZIP integrity, missing-label and duplicate-date checks. Lexi's UI and the live model are unchanged.

Original sources: [LifeSnaps release v4](https://zenodo.org/records/7229547), [peer-reviewed dataset paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC9622868/).
