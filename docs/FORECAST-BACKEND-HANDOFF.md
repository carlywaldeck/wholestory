# Forecast backend handoff for Lexi

Backend branch: `carly/forecast-backend`. No UI, styling, Settings, journal schema or PDF changes. Model version 0.2.0; API schema version 1.0. Always present these as experimental estimates, not validated medical risk.

## Ready-to-use sample API

```
GET /api/forecast?persona=maya
GET /api/forecast?persona=alex
GET /api/forecast?persona=jules
```

Optional `targetDate=YYYY-MM-DD` makes the demo reproducible; the default is tomorrow in UTC. Response contains:

- `demo`: persona label and a required synthetic-data disclosure.
- `forecast.symptoms[]`: `symptom`, `state`, `reason`, `probability`, `outlook`, `historyProbability`, `cycle`, support counts, `factors`, `validation`.
- `forecast.primarySymptoms`: pelvicPain, fatigue, bloating, bowelSymptoms. The remaining outcomes are secondary; never turn their unknown states into low risk.
- `forecast.wearableContext`: available candidate readings and prior baselines, explicitly `usedInForecast: false`.
- `demoInput`, `demoPhysiology` and `demoJournalEntries`: one internally consistent fictional history for the outlook, charts, journal and clinician brief. Journal quotes/confirmed fields are generated from exactly the predictor labels and period dates. This is separate from the older sparse journal personas: use a dedicated predictor-demo mode or explicitly replace all fictional histories together; never mix with personal records. The `demoJournalEntries` objects validate against the existing Entry schema, so the current report builder can consume them without a journal-schema change. Negative reports are explicit for each answered field; they do not imply all symptoms were absent.

Example:

```ts
const r = await fetch('/api/forecast?persona=maya');
if (!r.ok) throw new Error('Demo is unavailable');
const { demo, forecast, demoInput, demoJournalEntries } = await r.json();
```

Main result states are `learning` or `experimental-estimate`. `probability: null` means unavailable. Do not invent a percentage, confidence level, diagnosis or medical urgency. `higher-estimated-likelihood` uses a fixed 0.5 threshold; it is not a calibrated clinical "high risk" cutoff. A lower estimate does not rule out symptoms. Counts are support, not a confidence score. The `cycle.reason` explains why calendar context is unavailable, while history-only estimates can still be returned.

## Local-first compute for personal records

For personal history, preferred browser-local usage needs no network transmission:

```ts
import { symptomRisk } from '../lib/symptom-risk';
const result = symptomRisk({
  kind: 'real', targetDate: '2026-11-15',
  asOf: '2026-11-14T20:00:00-08:00', timeZone: 'America/Los_Angeles',
  days: confirmedCheckIns,
  cycle: optionalConfirmedCycleContext,
});
```

`days` is one confirmed record per date:

```json
{"date":"2026-11-14","availableAt":"2026-11-14T18:00:00-08:00","symptoms":{"pelvicPain":true,"fatigue":true,"bloating":false,"headache":null,"bowelSymptoms":false,"urinarySymptoms":null,"nausea":null,"dailyLifeImpact":true}}
```

Each symptom is explicitly present (`true`), explicitly absent (`false`), or unanswered (`null`). Free-text omissions, unconfirmed LLM extraction and a healthy-looking wearable are not absence labels. Do not reconstruct historical availability from the symptom date. Keep user identities and real/synthetic sources separate. `kind` is caller-declared provenance, not independently verified truth.

Optional cycle input:

```json
{"regime":"natural","regimeSince":"2026-01-01","availableAt":"2026-01-01T12:00:00-08:00","periodStarts":[{"date":"2026-10-18","availableAt":"2026-10-18T18:00:00-07:00"}]}
```

Only confirmed period starts belong here; spotting is not automatically a new period. Do not infer a hormone regime. Use `unknown` if uncertain and `hormonal` for the separate not-yet-modeled regime; symptom-history estimates can still work. At least three completed cycles are needed for the calendar candidate. No fixed 28-day cycle or day-14 ovulation is assumed. Context recorded after a historical forecast is excluded from that backtest. A known regime start resets the symptom-model training window too; a complete treatment-event ledger remains a follow-up.

## Optional server compute

```
POST /api/forecast
Origin: <same Site origin>
Content-Type: application/json
```

Body: `{consentToServerProcessing: true, input: <same local input>, physiology: []}`. Explain server processing before using this path for real records. The handler makes no external AI calls, persists no records, echoes no raw personal history, and returns `Cache-Control: private, no-store`. This is handler behavior, not a claim about platform transport logs. It does not provide identity storage or a multi-user database. Browser-local compute remains available without server consent. Max 365 days per server request, 384 KiB body. Errors: 403 origin, 413 size, 415 content type, 422 validation, 405 unsupported method.

## Wearable fields and Oura

`POST /api/wearables/oura/physiology?timeZone=America%2FLos_Angeles` reuses the authorized Oura session and daily scope. No new UI connection flow or expanded permission scope is introduced. Real-account end-to-end verification still requires credentials and a data-bearing consenting account.

Each normalized physiological row has `date`, `availableAt`, `source`, `kind` and nullable `sleepHours`, `nightHeartRateBpm`, `hrvRmssdMs`, `temperatureDeviationC`, `respiratoryRateBpm`, `steps`. Source values are oura/fitbit/manual/synthetic; kind is real/synthetic. Never substitute SDNN for RMSSD or a readiness score for a measurement. Use the local waking date for sleep signals. Imported historic records are first known at the import time; preserve the earliest receipt of unchanged values when implementing storage, and keep edits/revisions separate rather than backdating them.

## Evaluation and integration checks

The endpoint returns support and explicitly sets validation.evaluationStatus to not-run. Retrospective scoring is intentionally kept out of live requests; run symptomRisk(input) locally with its default evaluation option for development comparisons. Use symptomRisk(input, {evaluate:false}) for faster interactive estimates. An unavailable evaluation is not an accuracy score. Tests replay the same local issuance clock, account for DST, exclude future and late data, preserve missingness, and compare identical held-out dates. The three constructed personas demonstrate different behavior; synthetic accuracy is an engineering check only. Real MPIS experiments and their cluster uncertainty are separate and do not validate the new cycle mixture. Research details: `CYCLE-AND-PHYSIOLOGY.md`.

Current work is backend-only. Lexi owns the forecast screen and check-in UX; no experience files should be overwritten to mount this module.

Evaluation also separates new symptom onsets after an explicitly absent preceding day from continuation after a present preceding day. A continuation forecast is not evidence of advance warning before symptoms begin.

Brand update: visible product copy is now Elya. The existing GitHub repository, shared URL and browser storage identifiers are retained for continuity. Only branding strings/wordmark were changed in experience files; no layout or navigation changes were made.
