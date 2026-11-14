# WholeStory: bad-day prediction research

This is an offline evaluation harness. It does not enable app forecasts or assert clinical validation. The checked-in public wearable sample cannot validate an endometriosis outcome because it lacks those labels.

## Research questions

1. Can yesterday's journal predict tomorrow's **explicitly reported daily-life impact** better than a historical-rate or previous-outcome baseline?
2. Do earlier wearable readings add measurable performance beyond a journal-only model?
3. Are estimates calibrated, and how many false alerts and missed difficult days would a chosen threshold create?

An alternative, explicitly research-defined outcome is next-day reported pain at least 7/10. It is not interchangeable with interference in daily life. Do not merge these targets or call either a validated flare definition.

## Local input contract

Use one JSON file with `source`, `permission`, `kind` (`real` or `synthetic`), and `records`:

```json
{
  "source": "Name and version of an authorized source",
  "permission": "Reference to applicable permission or agreement",
  "kind": "real",
  "records": [
    {
      "participant": "pseudonymous-id",
      "date": "2026-01-01",
      "impact": null,
      "pain": null,
      "sleepHours": null,
      "steps": null,
      "journalAvailableAt": null,
      "wearableAvailableAt": null
    }
  ]
}
```

Blank/unknown outcomes must be null, not false. Scales must be mapped from their source codebook before import. Pain is a confirmed 0–10 self-report, not a score inferred by an LLM. Some EndoLIST scales have opposite directions or different ranges; do not guess mappings. Do not concatenate unrelated wearable and symptom datasets by date or shift real participants onto fictional timelines.

`kind: real` is a user declaration, not verified provenance. Keep a source manifest and review rights and codebooks locally. Do not publish restricted records, pseudonymous predictions, fitted models, or per-participant results unless the data agreement permits this. This tool does not authorize data use.

## Run

Python standard library only; no API credits or ML services required.

```sh
python3 research/evaluate_bad_days.py --self-test --output work/research-engineering-report.json
python3 -m unittest discover -s tests/research -v
python3 research/evaluate_bad_days.py --input /absolute/path/to/authorized-local-data.json --target impact --output /absolute/private/path/to/report.json
```

Store authorized data and results outside the repository, or under ignored `work/`. Never commit health data. The report contains pseudonymous participant IDs and remains governed by the source agreement. No external service is called by the evaluator.

## Method and limits

- Personal expanding-window evaluation: training precedes each target date. No random split across repeated daily records.
- Uses previous-calendar-day pain, sleep and activity only. Known late-arriving features and labels are withheld at the midnight UTC research cutoff. Unknown timestamps mean retrospective calendar ordering only, not proven real-time availability.
- Missing features are imputed using training medians with missing indicators. Scaling and fitting use training rows only.
- Fixed regularized logistic models compare journal-only versus journal plus wearable data, alongside historical-rate and previous-outcome baselines. Hyperparameters and the 0.5 reporting threshold are fixed; the held-out outcomes are not used to tune them.
- At least 30 prior training examples and five per class are engineering guards, not a clinical sample-size justification.
- Reports AUROC, average precision, Brier score, calibration bins, sensitivity, specificity, precision, missed events, and false alerts per 30 **evaluated** days. Unknown days are not counted as successful predictions. Undefined metrics remain null.
- No participant-held-out external validation, confidence intervals, clinical review, or prospective impact study has been completed. Repeated days are dependent; pooled scores alone can mislead. Per-person results expose variation but do not fix this.
- Reports always retain `clinicallyValidated: false`, `appForecastEnabled: false`, and `wearableBenefitEstablished: false`. A good retrospective metric cannot flip those fields.

## Real-data access next step

KI EndoLIST is the closest identified symptom dataset, but requires a PhysioNet account and agreement. The team member who will analyze it must review and sign the agreement personally. We have inspected public metadata only. Raw column mappings must wait for authorized access to its codebooks. It has no healthy control group and is not diagnostic validation data.

EndoTECH is more directly relevant to wearable/symptom pairing, but individual data require a research request and ethical approval. Do not promise access during the hackathon. PMData remains useful for engineering verification, not clinical accuracy.

Sources and precise claim limits: `dataset-registry.json` and `../docs/ENDOMETRIOSIS-RESEARCH.md`.

## Multi-symptom risk and current free APIs

The observed-only MPIS benchmark, personal local estimator and verified Oura sandbox are documented in `../docs/SYMPTOM-RISK-APIS.md`. MPIS access is free without PhysioNet registration; it is not an endometriosis cohort. `mpis_symptom_benchmark.py` evaluates separate recorded outcomes and a transition-probability comparator with explicit alert counts. `../lib/symptom-risk.ts` implements an experimental personal model; its prospective accuracy has not been established and it is not mounted in the app.

```sh
python3 research/mpis_symptom_benchmark.py --cache ../work/mpis-benchmark --output ../work/mpis-symptom-benchmark.json
python3 research/probe_free_apis.py --start 2026-11-01 --end 2026-11-07 --output ../work/free-api-checks.json
```

Oura sandbox records are sample data, not real validation data. Do not join them to MPIS or other participants' symptom outcomes.
