# Elya: advance-warning evaluation

Part 2 is complete as an exploratory evaluation. It does not establish clinical accuracy. The live model and Lexi's interface have not been changed.

## Real reported data

Source: [MPIS Study Data](https://zenodo.org/records/21538147), CC BY 4.0. Only directly observed records were used; imputed rows were excluded. This is a small menstrual-symptom intervention dataset, not a confirmed-endometriosis cohort, and has no paired wearable measurements or reliable recorded period starts for testing our cycle model.

There were 140 consecutive-day opportunities after reported zero pain, including 10 next-day pain onsets. Leave-one-participant-out evaluation trained a fixed regularized logistic model only on onset opportunities. All preprocessing used training participants only. The previously built personal app model was not trained on these participants: this is a separate research experiment, not an accuracy score for the app.

At the fixed 50% threshold, the logistic model caught 0 of 10 onsets. At 10%, it still caught none and produced 30 false alarms. At 5%, it caught all 10 but produced 120 false alarms: only 7.7% of alerts were correct. A simple onset-prevalence baseline at 5% also caught all 10 and produced 130 false alarms. Lowering thresholds is therefore not a demonstrated useful solution. This grid is descriptive; no operating threshold was selected from test results.

Other symptom onsets were much sparser: cramps 3, bloating 4, fatigue/concentration 5, headache 4, lower-back pain 1, bowel pain 3, nausea/vomiting/diarrhea 1, urination pain 1. These are eligible events before training-support exclusions. Unanswered checklists stayed unknown. Selection after prior nonselection is not clinically confirmed new symptom onset. The data cannot validate reliable multi-symptom warnings.

## Actual app model: synthetic engineering replay

The existing model was replayed chronologically at midnight UTC, using report availability timestamps. Production, history-only, and cycle-only estimates were compared on the same cycle-supported opportunities at a fixed 50% threshold.

For Maya's constructed cyclical history, the production mixture missed the eligible new onsets; cycle-only estimates caught them, with some adjacent-day false alerts. This exposes a design tradeoff: averaging low transition estimates after a symptom-free day with a strong cycle signal can suppress advance warnings.

For Jules's constructed improvement history, cycle-only estimates continued producing false alerts after symptoms improved. Alex's unknown cycle regime had no cycle-supported comparisons and was excluded from that paired comparison, not counted as successful. These fictional personas test behavior only; they provide no evidence of medical accuracy. The symptom endpoints are correlated and must not be summed as independent clinical events.

## Recommendation

Keep the public experience explicitly experimental. Separate calendar-based preparation windows from measured symptom probabilities, and show whether recent symptoms support the calendar pattern. Do not deploy cycle-only forecasting or a lower alert threshold based on these results. Real validation needs longitudinal symptom diaries with confirmed period starts, enough new-onset events, and prospective testing; wearable benefit additionally needs paired measurements.

Part 3 can proceed independently: build a practical wearable import path and a normalized data contract, with synthetic demo data clearly labeled. Connecting a wearable alone will not establish forecasting accuracy.

Reproducible scripts are on local branch `carly/onset-evaluation`: `research/onset_audit.py` and `research/evaluate_demo_onsets.ts`. Aggregate JSON reports accompany this memo. No participant-level records are exported in these reports.
