# WholeStory: separate symptom forecasts

The product target is a next-day outlook for individual symptoms, rather than one generic bad-day score. Proposed outcomes are pelvic pain/cramps, fatigue, bloating, bowel symptoms, headache, and interference with daily activities. Bladder symptoms and bleeding can be added when adequate direct labels are available. Pain during sex requires exposure-aware collection; a day without sex must not count as a negative symptom label.

## Real-data experiment completed

The free [MPIS Zenodo API](https://zenodo.org/api/records/21538147) provides CC BY 4.0 menstrual symptom records without an account. Attribution: Valeria Tisch, Stefan Konigorski and Hannah Neumayer, MPIS Study Data, DOI 10.5281/zenodo.21538147. This is an intervention study, not a confirmed-endometriosis cohort, and it has no wearable measurements.

We excluded all 1,856 imputed rows. The remaining 304 observed rows from 19 participants yield 178 consecutive-day pairs from 16 participants. Only 41 paired targets have answered symptom checklists. An unanswered checklist remains unknown. An unselected item on an answered checklist means not selected, not clinically confirmed absent. These conditional labels cannot establish all-day symptom prevalence.

The reproducible script trains separate next-day classifiers for cramps, bloating, fatigue/concentration difficulties, headache, lower back pain, bowel pain, nausea/vomiting/diarrhea, and urination pain, plus an any-menstrual-pain classifier and pain-severity regression. Combined source labels remain combined; this dataset cannot validate independent fatigue, concentration, nausea, vomiting or diarrhea forecasts.

Evaluation holds each participant out of training, uses only preceding observed calendar dates, compares historical-rate and previous-report baselines, and excludes folds without adequate training classes. The JSON reports eligible targets, excluded folds and evaluated targets separately. No imputed targets, LLM labels, inferred phase, participant identity or target-day values enter the model. Shifted source dates and unknown reporting arrival times limit real-time interpretation.

Results do not justify enabling forecasts for users. For example, bloating logistic AUROC is 0.438 versus 0.694 for previous-report persistence. Any-pain logistic AUROC is 0.779 versus 0.846 for persistence, although logistic Brier error is lower (0.091 versus 0.101). Pain-severity ridge MAE is 0.824 on a 0–10 scale versus 0.624 for previous pain; ridge has lower RMSE. There is no consistent model winner. Sparse bowel/bladder labels make stable estimation impossible. Support thresholds are engineering checks, not clinical validation. Confidence intervals, prospective evaluation and independent replication remain outstanding.

## Product contract for Lexi

No experience or storytelling files were changed. Proposed UI integration is a short per-symptom outlook with separate states: learning your pattern, experimental estimate, or unavailable. Do not show invented probabilities or an overall readiness score. A clearly marked synthetic demo may illustrate the eventual experience; it must never imply these real-data models are clinically validated.

Collect each symptom independently with explicit none, present/severity, and not answered states. Capture symptom date, submission time, treatment changes, cycle context when known, and functional impact. Wearables are optional additional features, not substitutes for reported symptom labels. Evaluate whether they improve each outcome over personal journal and persistence baselines before using them. No fixed number of journal days guarantees reliable prediction.

## Access and next evidence needed

No additional account or API key is needed for the MPIS experiment. The missing resource is adequately sized, authorized longitudinal endometriosis data with directly reported daily symptoms and preferably aligned wearable signals. Public menstrual records are useful research tests but do not validate endometriosis forecasts. Participant-held-out retrospective testing is not a prospective clinical trial.

Other investigated sources: [PMData](https://datasets.simula.no/pmdata/) supplies real wearable/fatigue pairs but is not an endometriosis cohort; [KI EndoLIST](https://physionet.org/content/ki-endolist/1.0.0/) is blocked by the user's activation-email problem; [mcPHASES](https://physionet.org/content/mcphases/1.0.0/) no longer provides its files; [GOCD2](https://rubenarslan.github.io/gocd2/) public synthetic examples must not be treated as real participant records. Unverified interpolated marketplace datasets are not substitutes. Author-held datasets may require an approved data request and cannot be assumed available today. No requests have been sent on your behalf.

Endometriosis involves symptoms beyond pain, including bloating, nausea, fatigue and bowel/bladder difficulties: [WHO](https://www.who.int/news-room/fact-sheets/detail/endometriosis). These clinical associations do not establish forecast accuracy. No evidence here establishes that WholeStory accelerates diagnosis, and no market-wide uniqueness claim is supported.

Reproduce from the repository root:

```sh
python3 research/mpis_symptom_benchmark.py --cache ../work/mpis-benchmark --output ../work/mpis-symptom-benchmark.json
python3 -m unittest discover -s tests/research -v
```
