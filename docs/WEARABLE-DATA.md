# Wearable workstream: data, connections, and research

Branch: `carly/wearable-data`. Keep experience/storytelling changes in the partner branch. This branch is a reviewable integration; do not deploy it over another branch.

## What is implemented

- Existing normalized CSV import remains compatible (`date,sleep_hours,steps`). Both saved records and analysis inputs reject invalid measurements and duplicate dates. Missing values are never replaced by zero.
- Day labels distinguish explicit impact, explicit symptom-free, unknown, and conflicting reports. Conflicting dates do not enter either comparison group.
- `wearableQuality(entries, days)` returns coverage, missing measurements, conflict counts, and source entry IDs.
- `buildResearchDataset(entries, days)` builds retrospective next-day label rows using only previous-calendar-day observations and an earlier 28-day baseline. It contains no model, clinical risk estimate, or validated prediction. Baselines require seven earlier observed dates; missing features stay missing. Explicit symptom-free is the only negative label; this selected comparison population is not equivalent to all days without impact.
- Oura OAuth, manual import, and disconnect are implemented for both Next.js and the Sites Worker. No refresh token is persisted. Sessions last at most one hour; users reconnect rather than grant background access. Tokens use encrypted, HttpOnly, SameSite cookies; state and PKCE protect the exchange. The API requests `daily` scope only. No client secrets, OAuth tokens, or journal text are returned by the data API.
- A public PMData sample is displayed separately from the fictional symptom demo. The two are never joined. Public source data has no endometriosis outcome labels.

## Turn on Oura

1. Register an OAuth application through https://cloud.ouraring.com/ (My Applications).
2. Register the exact callback: `<APP_ORIGIN>/api/wearables/oura/callback`.
3. Configure server-only `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`, `OURA_SESSION_SECRET`, and `APP_ORIGIN`. The secret must contain at least 32 random characters. Generate it locally; never put it in GitHub, chat, or a recording. `APP_ORIGIN` has no trailing slash. HTTPS is required except for `http://localhost:<port>` during development.
4. Set these through the hosting secret controls for the deployed Site, or `.env.local` for local development. `.env.example` contains names only.
5. Start the app. Open Today → Explore what changes on difficult days → Connect your Oura account. Authorize on Oura, then return to the explorer and choose Import from Oura.
6. Use a real Oura account to verify consent denial, import, expiration, and disconnect. Mocked tests cover protocol handling but cannot establish real provider compatibility or account eligibility.

No real Oura credentials or test account are available in this project yet. A disabled button means unconfigured, not connected. Devices may upload records late. Data requests cover the preceding 60 completed UTC calendar dates; sleep records are grouped by their own local waking-date strings and activity uses the provider date. Travel and time-zone changes can prevent exact calendar alignment. No continuous monitoring or notification service runs.

Disconnect removes the local authorization cookie. Previously imported measurements remain on this device until deleted in Settings. Remove WholeStory in Oura account settings to revoke provider permission. Do not claim a background connection or automatic synchronization.

## UI integration contract for partner

Existing `WearableExplorer` props are unchanged. New `WearableConnections` accepts `onImported(record): Promise<void>`. Successful imports call the callback only after the complete provider response validates; a failed import leaves prior local records untouched. Import intentionally replaces the prior wearable dataset; this is stated before the action.

Routes:
- `GET /api/wearables/oura/status` → `{configured, connected}`. Does not expose tokens or health data.
- `POST /api/wearables/oura/connect` → provider authorization redirect.
- `GET /api/wearables/oura/callback` → `/?wearable=oura` on success or `/?wearable=cancelled` on denial.
- `POST /api/wearables/oura/sync` → `{source, days, provenance}` for local persistence.
- `POST /api/wearables/oura/disconnect` → clears local connection; does not delete imported records.

**Small experience follow-up:** handle the `wearable` query parameter by opening Insights and showing a neutral success/cancelled notice. Currently the callback returns to Today, and users navigate back to the explorer. Shared `app/page.tsx`, global styles, settings, and PDF files were deliberately left unchanged in this branch.

`PublicWearableSample` is a read-only disclosure. Keep its research-source and noncommercial license labels visible. Do not reuse PMData dates as this fictional patient's history or claim its measurements explain pelvic pain.

## Public sample provenance

PMData: A Sports Logging Dataset, Thambawita et al., 2020. DOI https://doi.org/10.1145/3339825.3394926.
Source: https://datasets.simula.no/pmdata/ and https://osf.io/vx4bk/.
License: **CC BY-NC 4.0**, https://creativecommons.org/licenses/by-nc/4.0/. Original license text is in `data/PMDATA-LICENSE.txt`. This excerpt is for a noncommercial hackathon demonstration; obtain suitable permission or replace it before commercial reuse.

`data/pmdata-sample.json` retains 60 original dates from participant p01. It includes attribution, transformation rules, source URLs, and original-file SHA-256 hashes. Longest sleep episode per waking date is used, and step totals require exactly 1,440 unique minute timestamps with no duplicates. Incomplete or ambiguous activity dates remain unknown. These aggregation choices are not clinical definitions of sleep quality or activity capacity.

Reproduce using Python 3 and curl (TLS verification remains enabled):

```sh
python3 scripts/prepare-pmdata.py
```

The script fetches two public source files and verifies pinned hashes before preparing the excerpt. No public dataset was uploaded to an LLM or combined with private data. The fictional demo remains explicitly hand-shaped and cannot validate a predictor.

## Research boundaries

A wearable API supplies measurements, not endometriosis labels. The current dataset builder is a foundation for evaluating an idea, not an ML model. It flags synthetic labels and excludes unknown/conflicting outcomes. Calendar ordering prevents target-day feature leakage but does not prove those readings were available at a real prediction time. No synthetic or public research sample can establish clinical utility.

Before any user-facing forecast: obtain appropriately consented longitudinal outcome data, define the outcome and decision it supports, evaluate forward in time against a simple baseline, measure false alerts and missed events, and obtain clinical review. Do not describe a low sample threshold as statistical significance or imply normal readings invalidate pain.

Official Oura references: https://cloud.ouraring.com/docs/authentication and https://cloud.ouraring.com/v2/docs (OpenAPI 1.43 inspected during implementation).
