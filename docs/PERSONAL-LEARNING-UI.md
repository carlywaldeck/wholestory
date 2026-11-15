# Personal-learning UI integration

Backend source: Carly's `origin/carly/onset-evaluation`, personal-learning commit `8211706`, with demo/guide commit `2b4a6b7`. Imported backend modules are unchanged. Existing journal storage and model logic were not replaced.

## Local flow

- The approved animated Home, scrolling journey, typography, rose palette and glass-panel layout remain. Outlook now renders the returned Low/Medium/High labels or Still learning your pattern in its existing summary area. Per-symptom details show usable paired observations, wearable support and descriptive later-outcome feedback. Percentages are withheld.
- Heavy issuance, model fitting, normalized-CSV preview and `personalLearningDemo` replay run in `workers/personal-learning.worker.ts`.
- Learners use a separate IndexedDB database, `elya-personal-learning-ui`. The current single personal Journal uses stable profile ID `personal-default`, independent of its display name. Fictional profiles are `demo-maya`, `demo-alex`, and `demo-jules`, with synthetic provenance. Additional real-profile switching UI was not added.
- Backend `create/load/savePersonalLearner` helpers use an async storage port. Updates are queued; Web Locks serialize across supported browser tabs. Learner state and its display bundle are committed together in one transaction. Reset is serialized, invalidates pending UI work, and clears learner snapshots, receipts and observations. Export local learning data includes explicitly namespaced personal/demo ledgers.
- Reopening a forecast preserves its original features, estimate and issuance time. Later Journal reports link outcomes. Explicit withdrawals append null revisions. Missing answers remain unknown.
- Existing confirmed structured Journal fields are read without modifying original entries. Legacy fields without receipt metadata are first available at integration time, never backdated to their described date. Text omissions are not interpreted as absence. Real cycle regimes are not guessed; the fictional demo supplies its own supported cycle context.
- Settings retains Oura authorization/import controls and adds a local normalized CSV import through `previewLearningWearableForecast`. Readings retain provider, units and receipt time; unchanged imported values keep their earliest known receipt. No universal native Apple Watch/Garmin synchronization is claimed.
- In About this demo, Next demo day advances only the synthetic clock. It appends later outcomes without rebuilding historical forecasts. It does not change real Journal dates or personal data.
- Clinician briefs remain based on confirmed Journal observations. The report explicitly separates these from experimental forecasts and observed wearable context; predictions are not counted as experienced symptoms.

## Verification

155 TypeScript tests pass, including Carly's backend tests and new persistence, serialization, receipt-time, profile-isolation and reset tests. TypeScript, the webpack production build and Sites worker packaging pass.

Chrome exercised the real worker: personal check-in and refresh; chronological Maya replay; demo check-in; saved learner reload; two later synthetic days; frozen-feature/estimate/issuance preservation; clinician summary; mobile widths; normalized CSV import; and reset. Fatigue's usable pairs moved from 166 to 168. The initial Maya replay selected wearables for fatigue and retained baseline models for the other supported primary symptoms. No health-data POST requests were made in these tests.

App tests in jsdom substitute a small deterministic worker executor; actual worker execution and full chronological replay were separately verified in Chrome. Synthetic results establish engineering behavior, not medical accuracy.

## Before deployment

Nothing has been deployed or merged into main. Verify worker assets and IndexedDB behavior on the deployed HTTPS origin, configured Oura credentials with a consenting account, and the intended cross-tab/reset behavior in supported browsers. There is no encryption, identity service or cross-device sync. Monthly AI-summary generation remains a separate, unconnected backend contract. Real-user predictive value and clinical validation remain research work; more observations do not guarantee improvement.
