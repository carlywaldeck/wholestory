# WholeStory: symptom risk and the APIs we can actually use

Reviewed November 14, 2026. The goal is a next-day probability for each symptom, not certainty, diagnosis, or an untested overall flare score.

## Decision

Build our own symptom-specific personal risk estimator. Use direct daily symptom answers as outcomes, and test wearable inputs for additional value. No reviewed public API supplies a verified, free endometriosis-specific multi-symptom forecast that we can simply embed. This is a search finding, not a proof that none exists.

A working local-first estimator is now in `lib/symptom-risk.ts`, with tests. It estimates each symptom independently using observed next-day transitions, shrunk toward the person's overall rate. It returns missing rather than inventing risk when history or a recent label is absent. It includes chronological backtests against historical-rate and previous-report baselines. It uses no paid service and transmits no health data. It is experimental and not mounted in Lexi's UI or deployed.

## API findings

| API | What it offers | Access now | Decision |
| --- | --- | --- | --- |
| Oura V2 sandbox | Sample sleep, HRV, heart rate, temperature and activity responses | Live smoke test passed for four endpoints; no account or ring needed | Use for integration/demo only; samples cannot establish accuracy |
| Oura production | Consented real wearable measurements | OAuth app required; API is free, but Gen3+ users need active membership to access data | Keep existing optional connector; no need for Carly to buy a ring |
| WHOOP | Public API exposes recovery, sleep, physiological cycles and workouts | OAuth and a data-bearing account needed | Measurements can be inputs; hormonal symptom forecasts are not documented public API outputs |
| Google Health API | Successor to Fitbit Web API; health measurements via Google OAuth | Development test-user setup is documented; no pre-populated sample health data | Candidate next real-data connector; verify project availability/cost before onboarding |
| Zenodo MPIS | Downloadable real daily menstrual symptom records through an API | HTTP 200, open CC BY 4.0; no account/key | Already used to run observed-only multi-symptom experiments |
| OSF PMData | Real paired wearable/fatigue study files | No account/key for public files; verified-hash mirror fallback needed for some downloads | Already benchmarked; not endometriosis-specific |
| APIVerve menstrual calculator | Calendar-based period/ovulation estimates | 200 free monthly calls; detailed phases/PMS fields paid | Does not supply personalized symptom-risk probabilities; skip |
| Sahha | Wellbeing, sleep, activity, mental wellbeing and readiness scores | Current pricing page lists a 30-day trial followed by paid plans | No documented endometriosis symptom-risk output; skip for our free scope |
| Terra | Aggregated wearable and menstruation data | Current onboarding requires a plan/billing; no free ongoing production plan verified | Adds cost rather than supplying a validated symptom predictor; skip |

Oura live test: daily_sleep, sleep, daily_activity and daily_readiness each returned HTTP 200 and six sample records for November 1–7. Sandbox needs an Authorization header but accepted the deliberately fake string `Bearer wholestory-sandbox`; this is not a credential and must never be used against production endpoints. No user data was sent. The reproducible smoke-test script saves only response metadata.

WHOOP's own app already provides directional, personal symptom predictions across cycles. This supports the product concept, but we cannot claim this feature alone is unique or import its predictions through an undocumented/private API. Its product claims also do not establish accuracy for WholeStory.

## What the real-data risk experiment shows

MPIS evaluation leaves each participant out of training. Only preceding observed dates enter features. All 1,856 imputed rows were excluded; 304 observed records yield 178 consecutive-day pairs. Symptom checklists exist for only 41 of those targets and are selectively answered. Dates were changed by the data authors. This is an intervention cohort, not an endometriosis validation cohort.

The added transition-probability comparator is an exploratory follow-up, not an independently preregistered replication. It uses other participants' training transitions and a fixed 0.5 alert threshold. The app module instead learns one person's transitions and reports expanding-window results; the public benchmark does not validate that personal implementation.

| Recorded outcome | Evaluated days | Transition alert precision | Symptom-day recall | Overall accuracy |
| --- | ---: | ---: | ---: | ---: |
| Any menstrual pain | 178 | 78.9% | 75.0% | 89.9% |
| Bloating checklist selection | 41 | 60.9% | 70.0% | 63.4% |
| Fatigue/concentration checklist selection | 41 | 64.0% | 72.7% | 63.4% |
| Headache checklist selection | 41 | 57.1% | 26.7% | 65.9% |
| Lower-back-pain checklist selection | 41 | 81.2% | 81.2% | 85.4% |

For any menstrual pain, 38 alerts include 30 true alerts and 8 false alerts; 10 of 40 symptom days were missed. Always predicting absence would be 77.5% accurate. The simple previous-report baseline has exactly the same binary accuracy, precision and recall, so this is not evidence that our model beats persistence. The transition model has lower Brier error (0.091 versus 0.101), an exploratory probability-quality result without confidence intervals.

Other symptoms remain too sparsely labeled for strong claims. For cramps, always predicting presence already yields 78% accuracy; a headline accuracy number would disguise an unhelpful model. Some bowel/bladder evaluation folds contain no positive events after training-support exclusions; their high accuracy is not evidence of symptom detection. The complete JSON includes baseline comparisons, eligible/excluded counts, confusion counts, probability error and limitations.

## How we get to a useful risk outlook

1. Collect each symptom independently: present, explicitly absent, or not answered. Preserve the symptom date and submission time. Capture confirmed cycle context and treatment changes without assuming a regular cycle. Free-text extraction must be confirmed before it becomes a training label. Existing journal omissions are not negative labels.
2. Start with personal symptom-history probabilities. The implementation supports pelvic pain, fatigue, bloating, headache, bowel symptoms, urinary symptoms, nausea and daily-life impact. Labels stay separate; MPIS's combined fatigue/concentration item must not be relabeled as fatigue alone.
3. Add optional wearable sleep, HRV, resting heart rate and temperature only using values available before the forecast. Compare journal-only versus journal-plus-wearable models on the same held-out days. The current personal estimator intentionally uses symptom labels only; Oura sample measurements must not be joined to real MPIS symptoms or treated as paired people.
4. Measure alert precision (were alerts right?), recall (how many symptom days did we catch?), false alerts per month, probability calibration/Brier error, and uncertainty by person. Fix alert thresholds on training/development data, then evaluate untouched future records. Repeated days are dependent; use participant-level intervals and external/prospective testing before claiming reliable performance.
5. Integrate a clearly marked experimental outlook after reviewing local-time scheduling and the check-in contract with Lexi. A high estimated likelihood must not be presented as severity, medical urgency, or a diagnosis. No wearable score alone should become an endometriosis flare alert.

Engineering guards in the current module require at least 30 labeled consecutive-day pairs, five examples of each outcome and five similar preceding-day examples. These only prevent extreme sparsity; they do not mean a month of tracking guarantees accuracy. Predictions can be generated before useful accuracy is established, so the module always preserves its experimental status and displays backtest support separately.

## What Carly needs to do now

No new paid account, API key or wearable purchase is required to continue the model and demo work. The evidence bottleneck is a larger authorized longitudinal symptom dataset, especially confirmed endometriosis records paired with wearables, or prospectively collected consenting-user history. A wearable API supplies measurements from consenting users, not a population of labeled endometriosis patients. Author data requests may help but have unknown approval times; none were sent on Carly's behalf.

For a real connection later, choose one participant who already has a supported data-bearing account and set up the corresponding OAuth application. Google Health permits named test users in its documented testing flow; production verification takes longer. Do not send client secrets in chat. The existing Oura connection remains unverified with a real account.

## Lexi integration contract

Import `symptomRisk` and `riskSymptoms` from `lib/symptom-risk.ts`. Input is one person's `{kind, targetDate, asOf, days}`. Each day requires `{date, availableAt, symptoms}` with all eight boolean/null labels. Do not mix users or demo/real records. `probability: null` means unavailable. Each output carries support counts and validation metrics. Current research boundaries are UTC; review conversion before scheduling local-day forecasts. No main page, stylesheet, existing journal schema, Settings, PDF, or experience component was edited in this work.

## Primary sources

- [Oura API reference](https://cloud.ouraring.com/v2/docs) and [membership/access requirements](https://support.ouraring.com/hc/en-us/articles/4415266939155-The-Oura-API)
- [WHOOP hormonal symptom predictions](https://support.whoop.com/s/article/Hormonal-Symptom-Predictions) and [public API reference](https://developer.whoop.com/api/)
- [Google Health API setup and sample-data limits](https://developers.google.com/health/setup)
- [MPIS dataset metadata and license](https://zenodo.org/api/records/21538147), DOI 10.5281/zenodo.21538147, Valeria Tisch, Stefan Konigorski and Hannah Neumayer
- [PMData primary dataset](https://datasets.simula.no/pmdata/)
- [APIVerve parameters, response and free-plan limits](https://apiverve.com/marketplace/menstrualcycle)
- [Sahha score definitions](https://www.sahha.ai/docs/products/scores/) and [current pricing](https://www.sahha.ai/pricing/)
- [Terra onboarding](https://docs.tryterra.co/introduction/account-setup-and-api-keys), [menstruation endpoint](https://docs.tryterra.co/reference) and [pricing](https://tryterra.co/pricing)
- [FemWear 2026 research](https://arxiv.org/abs/2608.08244): relevant experimental architecture, not an endometriosis forecast API; raw datasets/checkpoints remain subject to access restrictions. Not integrated or replicated here.
