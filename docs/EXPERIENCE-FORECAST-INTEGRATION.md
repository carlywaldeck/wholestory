# Elya demo and interface handoff

The default home is Outlook; navigation is Outlook, Journal, Appointment brief.
Personalization, spoken replies and wearable connections remain in Settings.
The approved fabric welcome screen remains accessible through Settings.

## Backend contract used unchanged

GET /api/forecast?persona=maya|alex|jules&targetDate=YYYY-MM-DD supplies the entire
fictional session: forecast, demoInput, demoPhysiology, demoJournalEntries and demo
disclosure. Responses are checked for matching persona, synthetic provenance,
valid evidence quotes and forecast-demo entry IDs. No old sparse demo history is
loaded or combined. Persona changes clear report statements/questions/evidence,
wearable brief notes and export review. A failed request reports an error rather
than falling back to constructed percentages.

Forecast state and probability come directly from the response. Displayed whole
percentages are rounded probabilities, labeled Estimate and experimental; support
counts are not confidence. All four primary symptoms remain separate. Missing
outputs remain Still learning, with plain-language explanations. Lower estimated
likelihood is not called a personal usual baseline or a reassurance about pain.

## Confirmed check-ins

Quick check-in captures true, false or null separately for each primary symptom.
All secondary symptoms remain null; optional writing never fills missing labels.
Each day includes its actual confirmation timestamp. It creates source-quoted,
schema-valid journal facts. symptomFree remains false because four answered fields
cannot establish global symptom absence. Save routes to Journal for review.

Personal confirmed labels are stored separately under elya-confirmed-checkins-v1.
They alone are supplied to symptomRisk in the browser with evaluate:false, local
time zone, actual asOf and tomorrow's date. No personal history is POSTed to the
server. Existing prose journal entries are never inferred as training labels.
All local data deletion clears this store as well.

Fictional edits and check-ins stay only in the in-memory forecast session and are
never written to personal IndexedDB or confirmed-label storage. Demo check-ins
replace the corresponding day in both demoInput and demoJournalEntries, then call
the existing backend-exported symptomRisk function locally; model logic is unchanged.
Reloading/selecting a persona starts a fresh matching server-provided demo.

Editing/deleting a confirmed source entry removes its previous model label rather
than guessing new booleans from prose. The UI explains re-confirmation. Personal
JSON export contains the journal, not the separate confirmed model-label store.

## Wearable boundary

The forecast-demo context disclosure displays the same endpoint's demoPhysiology.
It deliberately does not mount the older synthetic wearable comparison generator.
Personal wearable entry points/callbacks remain untouched. Context-only readings
are explicitly excluded from prediction. No device/account is required.

Appointment brief still uses the existing report builder, original quotations,
entry links, editable priority/questions and accuracy checkbox before PDF export.

## Four-minute fictional demo

1. Outlook: select Maya. Point out fictional data and the four experimental estimates.
2. Check in today: mark pain Present, fatigue None reported, leave bowel unanswered.
   Add a fictional daily-life note and save.
3. Journal: review the explicit statuses and edit an entry if needed.
4. Appointment brief: write the main priority, select a question, inspect a source,
   review the brief and check accuracy before downloading.
5. If time permits, switch to Alex or Jules to show different backend estimates.

Research accuracy, confidence, wearables influence, diagnosis and treatment effects
are not claimed. Backend routes/research/model logic are owned by Carly and unchanged.
