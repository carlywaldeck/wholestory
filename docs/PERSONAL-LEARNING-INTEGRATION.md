# Elya personal learning backend

Available on branch `carly/onset-evaluation` in `carlywaldeck/wholestory`. UI and production deployment are unchanged.


Verification: 36 relevant TypeScript tests passed and `tsc --noEmit` passed. The six-month synthetic replay completed successfully. These checks establish implementation behavior, not real-user medical accuracy.

## The learning loop

1. Create a separate learner state for each profile with `createPersonalLearner(profileId, kind, timeZone)`.
2. Before tomorrow begins, call `issuePersonalOutlook(state, riskInput, physiology)` with confirmed journal labels and readings actually available now. It returns the updated state, per-symptom progress, risk outlook, and performance information.
3. Keep the returned state. Each new date creates a frozen feature snapshot, including readings, personal baseline changes, recent symptom history, and supported cycle context. Reopening the same day's forecast returns its original estimate; it does not rewrite it.
4. Later confirmed journal entries automatically link outcomes to existing snapshots at the next issuance. Explicit `recordPersonalOutcome` is also available. Corrections append dated revisions; missing/null labels remain unknown. Only completed calendar days are used for model fitting and performance scoring.
5. Each later issuance refits models using earlier frozen input/outcome pairs. New observations can change the model, but improvement is not guaranteed.

Journal input uses the existing RiskInput schema; physiology uses the existing normalized fields plus optional separate restingHeartRateBpm. Keep real and synthetic profiles separate. Call the browser computation in a worker to keep UI responsive.

## What is learned

Separate personal regularized logistic models for pelvic pain, fatigue, bloating, headache, bowel symptoms, urinary symptoms, nausea, and daily-life impact. Labels are occurrence, not severity or endometriosis diagnosis.

The initial baseline uses symptom history and supported cycle context. Its first estimate requires at least 30 usable frozen pairs, five positive outcomes, five negative outcomes, and a known preceding-day symptom report. These are engineering support limits, not an accuracy guarantee or a promise that the app becomes reliable after a month.

The wearable candidate requires at least 45 matched same-provider pairs and eight outcomes in each class. It is compared with the journal-and-cycle baseline on the same earlier personal chronological holdout. Training outcomes must be available before the first validation forecast was issued. At least 25 earlier training rows and ten validation rows with class support are required. A fixed 0.005 Brier improvement selects the candidate. This limited internal selection is experimental; it does not establish reliable clinical predictions.

When the candidate is unsupported or does not improve that comparison, the app retains the baseline and explains that it is still learning the wearable relationship. It does not force a sensor effect. More paired data permits repeated learning and evaluation. Changing device provider requires collecting paired history for that source.

## UI contract for Lexi

- `outlook`: per-symptom Low risk / Medium risk / High risk, or Still learning your pattern. Provisional cutpoints remain unchanged. Probability percentages remain withheld.
- `symptoms`: trainingPairs, matchedWearablePairs, positivePairs, negativePairs, minimumHistory, minimumWearableHistory, stage, wearableLearningReason, usedWearables, issuedAt, and frozen.
- Stages: learning-history; learning-wearable-relationship (baseline estimate may be available); personal-wearable-outlook.
- `observedInputs` are the values preserved with the issuance, not causal explanations or feature attribution. Do not say “sleep caused your risk” based on these values.
- `prospectivePerformance` scores frozen predictions against later reported outcomes. `prospectiveWearableComparison` compares wearable-selected forecasts with the baseline estimates saved at those same issuances. These are descriptive personal feedback, not clinical validation.
- All new issuance/learning work is local and makes zero network requests. Persist returned state deliberately; calculations alone do not save it.

`previewLearningWearableForecast(state, journal, csv, options, {experimentalPreview:true})` provides a normalized CSV import wrapper. This supplements the earlier stateless preview. Receipt timestamps remain actual import times; the stateful learner does not backfill historical input snapshots from a new bulk import.

## Persistence and privacy

`savePersonalLearner`, `loadPersonalLearner`, and `deletePersonalLearner` take an async getItem/setItem/removeItem storage port. Keys are namespaced as `elya-personal-learning-v1:<profileId>`; existing journal keys are not touched. Use the app's chosen local persistence implementation and serialize state updates/transactions to avoid concurrent stale writes. Persisted snapshots contain health-derived features and outcomes; include this separate store in profile deletion/reset/export controls. No encryption or cross-device synchronization is implemented by these helpers.

The pure learner validates timestamps, duplicate records, vector shapes, data kind and outcome revisions. The storage layer must preserve original receipt/issuance timestamps; a client-editable local ledger is not a tamper-proof clinical audit trail. Never combine two people's journals into one learner.

## Demo

`personalLearningDemo(persona, targetDate)` replays the existing fictional persona in chronological order, including check-ins arriving after each forecast. It uses a separate demo profile and synthetic kind. It returns progress and the final learner state/outlook. The offline demo runner is `research/evaluate_personal_learning_demo.ts`.

The Maya replay for 2026-11-15 contains 169 issuances and 166 usable fatigue pairs. The earlier personal comparison selects wearable inputs for fatigue, while other supported targets retain their baseline. This demonstrates learning and selective use, not clinical accuracy. The aggregate synthetic demo artifact is in `research/fixtures/personal-learning-demo.json`. Do not import a demo state into a real profile.

## Still required in the product

Lexi's UI/storage wiring, import controls, responsive worker execution, profile-reset integration, and end-to-end interaction verification. The backend works locally but has not been published. No universal live connection to Apple/Garmin has been added. Real-user predictive value remains an evaluation task; no universal medical rule or reliability claim was inferred from the demo.
