# Six noon-demo fixes

No forecasting formulas, feature selection, thresholds, or prepared fictional data changed. No history was rewritten.

1. **Saved entries across screens.** Primary IndexedDB writes now await transaction completion. The shared personal entry list updates as soon as the primary write succeeds, even if the separate learning/check-in cache fails. Old reads cannot overwrite newer saves. Unsaved selections are labelled as drafts. Restoring a profile shows loading instead of an empty calendar/report. Journal, calendar and brief continue to use the same confirmed entry list; fictional profiles retain their own durable learner bundle.
2. **Actual forecast date.** Headings, dates and outcome-follow-up instructions use the forecast target. Sophie's stage intentionally shows the already-issued outlook for her sample day; the calendar shows next-day estimates. Check in today always records today, rather than inventing a future observation.
3. **Headache.** Display-only symptom coverage includes headache. Existing estimates are shown; an unavailable estimate explicitly says "Not enough history yet to forecast headache." No model output is synthesized.
4. **Wearable claims.** Sophie's prepared November 14 issued forecasts and November 15 outlook both select fatigue and bloating. The outlook names those symptoms, while new personal profiles do not claim wearable selection. The approved homepage wording is retained because the prepared Sophie comparison does select wearable inputs.
5. **Exclusive symptom controls.** Spoken opening answers with an explicitly reported symptom cannot also activate No symptoms today. Regression tests cover the voice path, bubbles, the symptom-free checkbox and status dropdowns.
6. **Ellie.** Her first voice controls and support panel define her as "Ellie is Elya's voice journal assistant."

## Verification

- Los Angeles timezone, November 30 at 5:30 PM PT / December 1 at 01:30 UTC: fresh dictated entry remains November 30 in the Journal, calendar and November brief, including after remount.
- Fresh personal save also exercised with a deliberately blocked secondary check-in store and delayed initial journal read.
- Sophie: simulated recognized speech → review → Save & see my day → highlighted November 14 → saved day → appointment brief → refresh retaining the unique transcript. Personal records remain separate.
- Browser rehearsal used fictional typed input through the same review/save/calendar/brief path. Confirmed entry and severity appeared in the saved day and source-linked report after browser reload.
- Simulated speech regression exercises the actual recognition callbacks and local learner computation. Real microphone permissions and a person speaking into the device were not retested automatically.

## Shared UI contracts

Optional loading-only flags were added to prevent false empty states: LinenPages.entriesLoading, LinenOutlook.entriesLoading and LinenBrief.loading. No backend/model contract changed.
