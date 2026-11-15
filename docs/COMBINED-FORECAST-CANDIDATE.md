# Elya: wearable-informed personal symptom forecasting

Product direction: add a personal symptom forecast to a tracker the user already wears. Combine cycle context, confirmed symptom diaries and wearable changes, then help the user prepare and describe their experience at an appointment. This is a product hypothesis, not a claim that the feature is unique, clinically accurate or proven to accelerate diagnosis.

## Implemented backend

`combinedSymptomCandidate(input, readings)` in `lib/combined-forecast-candidate.ts` is a callable local TypeScript research candidate. It has no network dependencies and is deliberately separate from the live forecast API. It does not change Lexi's screens or the active production model.

It trains separate personal L2 logistic models for pelvic pain, fatigue, bloating, headache, bowel symptoms, urinary symptoms, nausea and daily-life impact, when enough confirmed history exists. Unsupported outcomes return a learning state and null estimate, not zero risk.

Inputs include the preceding confirmed symptom state, 3/7-day symptom rates and reporting counts; four cyclic calendar features averaged over observed completed cycle lengths; length spread; prior-day sleep, nocturnal heart rate, HRV RMSSD, temperature deviation, respiratory rate and steps; and changes from source-specific personal trailing medians. Daily resting HR is an additional explicitly separate field in this candidate, not a substitute for nocturnal HR. A sensor never observed in training cannot suddenly affect a prediction.

Natural cycle features require three completed recorded cycles and exclude uncertain timing. Unknown/hormonal regimes have missing calendar features rather than fabricated phase labels. Wearable features can still be learned without a supported cycle. Existing source names are preserved; universal wearable OAuth and additional device import adapters are separate work.

Training labels are never filled from missing entries or synthetic medical inference. All feature dates precede their target, availability timestamps are enforced, and historical clock replay uses the user's timezone. Training resets at the supplied regime start and uses at most 180 days. No wearable symptom-risk thresholds are hard-coded.

## Evaluation

The same personal split compares journal/cycle inputs against journal/cycle/wearable inputs, plus prevalence and previous-report baselines. First 70% chronological training, final 30% held out; training label availability is checked at the first test origin. All preprocessing uses training rows only. The future candidate estimate is subsequently refit on all available past labels; it is not the held-out score. New-onset and continuing-symptom metrics are reported separately at a fixed 0.5 threshold. An additional onset-only model trains solely on prior explicit absence, with separate support requirements; it abstains if unsupported. Support thresholds are engineering limits, not clinical adequacy criteria.

The candidate estimates are not calibrated medical probabilities. Wearable benefit remains explicitly unestablished even when an individual split improves.

### Real wearable/diary experiment

Source: [PMData](https://datasets.simula.no/pmdata/), collected via its open OSF API with source checksum verification. Cached original files were reused. The original noncommercial licensing restriction is retained; no participant-level data or learned participant coefficients are committed or included in shareable reports.

The target is next-day very tired/more tired than normal (PMsys score <=2; lower scores mean worse tiredness). This is not an endometriosis cohort or an endometriosis symptom validation. Sleep and daily resting HR are available; no confirmed cycle starts, HRV or temperature were used. Exported wearable availability by day-end UTC is an explicit retrospective assumption, not recorded receipt metadata.

Seven of 16 participants met model support requirements, yielding 260 test dates and 54 tiredness days. Nine were excluded for support. Joint journal/cycle model: Brier 0.15768; adding wearables: 0.16353 (lower is better). Among 206 onset opportunities with 28 new tiredness episodes, adding wearables changed detections from 1 to 4 and false alerts from 2 to 11. The separate onset-only training experiment detected 1 versus 3 onsets, with 4 versus 11 false alerts. These are different comparisons on the same small data, not independent replications. No threshold was tuned to improve test scores.

This establishes that sensor inputs reach the actual model, not that they improve useful forecasting. The current candidate is not ready to replace production.

### Engineering tests

A separate synthetic, known prior-day sensor signal tests that the end-to-end model can learn an available predictive signal and forecast new symptoms. That relationship is invented solely to verify the pipeline; it is not physiological evidence. Additional tests cover missing sensors, future data exclusion, data-kind separation, unsupported fits, and new-onset metric accounting.

## Next model milestone

Obtain authorized paired longitudinal diaries, recorded period starts and wearable measurements; predefine the outcome and a useful warning burden; then compare cycle/journal and wearable-augmented models on later cycles not used to select the model. Prospective evaluation is needed before claims of clinical accuracy. Improving onset sensitivity while controlling false alerts is the unresolved modeling problem. Do not replace it with a marketing accuracy percentage or silent threshold change.

Reproduce:

```sh
python3 research/prepare_pmdata_candidate.py --cache ../pmdata-benchmark-cache --output ../pmdata-candidate-input.json
./node_modules/.bin/esbuild research/evaluate_real_combined_candidate.ts --bundle --platform=node --format=esm --outfile=../real-combined-evaluation.mjs
node ../real-combined-evaluation.mjs ../pmdata-candidate-input.json ../../outputs/elya-real-wearable-candidate-results.json
```

Keep the intermediate input in ignored local `work/`; share aggregate reports only.
