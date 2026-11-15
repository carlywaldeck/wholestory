# Adaptive Journal questions

This prototype collects details; it does not diagnose, estimate endometriosis probability, assign urgency or determine whether care is needed. Clinical review is pending. The rules and questions have not been clinically validated.

## Bank and selection

`lib/journal-question-policy.ts` defines the versioned custom bank, field, wording, symptom template, tier, answer options, eligibility/exclusions and stable order. Runtime questions have stable symptom-specific IDs, bank version, optional and sensitive flags. No LLM can invent questions. Policy version is independent of bank version.

Eligibility precedes ranking. Only the current entry, explicit selections and this session's answers enter the selector. Existing confirmed details from the same dated entry provide context when editing. Forecasts, wearable readings and other days are not selector inputs. Local conservative text patterns prevent obvious duplicate questions; these are routing hints, not extracted or confirmed observations. Unrecognized text remains unknown. Rules may miss unusual phrasing, negation or symptom associations; users review and correct the entry.

Tier 1 resolves contradictory symptom-free wording. Tier 2 fills severity, duration and daily impact. Tier 3 covers pain location, unspecified bowel symptoms and intervention response. Tier 4 asks optional intervention context. Within a tier, an explicitly most-bothersome symptom comes first, then a shared daily-impact question for multiple symptoms, then configured question order and stable symptom order. These are provisional product rules, not medical scores. A complete daily description does not trigger an intake questionnaire solely to collect pain location.

Answered, skipped, declined, unknown and not-applicable topics stay excluded for that session. No symptom history questionnaire is repeated. Explicit symptom-free entries skip routine prompts; contradictions require an explicit symptom-status confirmation at review. Missing, skipped and declined answers never create absent symptoms or zero severity.

## Flow and stopping

One inline question appears in the existing Journal panel. Options or free text work in Type; Speak uses the same flow and user-initiated browser recognition/synthesis. No automatic microphone activation or audio on load. Original entry edits and answer edits recalculate eligibility. Adding a symptom does not reset the total three-prompt session limit. Stop questions, exhaustion of relevant questions or three completed/skipped prompts ends the flow. Saving with an unanswered question is allowed; active microphone/audio must stop first to avoid losing pending words.

Add to calendar opens a compact review in the same panel; Confirm and save performs the write. Original text stays editable and is stored separately, unchanged. Users can correct/remove proposed follow-up details and adjust selected symptoms. No chat transcript, avatar, progress bar or second glass panel is added.

## Extraction, confirmation and provenance

No AI extraction call is connected to this flow. Existing server AI routes are not invoked. The honest fallback is explicit symptom selections and structured follow-up answers, confirmed at review. Local text matching controls eligibility only; it does not populate medical facts. There is no AI confidence score.

The optional `Entry.journal` extension preserves backwards compatibility and existing IndexedDB records. It stores originalText, creation/update timestamps, question-bank and selection-policy versions, fact provenance (`user-selection`, `follow-up-answer`, or reserved `user-confirmed-extraction`) and a separate selection metadata list containing only question IDs/statuses. The reserved extraction source is unused until a candidate-span service and review are integrated. There are no analytics logs or health-data requests. Patient-facing facts retain exact supporting quotes; original text plus confirmed answer quotes remain available to existing source links and exports. Date means the day described, independent of timestamps. Legacy entries have no fabricated timestamps.

Unknown, declined, skipped and not-applicable answers are selection metadata, not symptom observations. Editing a saved entry keeps confirmed source-linked facts unless removed. Structured occurrence still requires explicit symptom selection; question routing never converts a text mention or prediction into a forecast training target. Personal and demo profiles continue to use the existing separated storage flow.

## Monthly report

The read-only monthly report uses confirmed entries, exact source links and distinct logged-day coverage. Missing dates/severity are unknown. Symptom-specific answer context accompanies severity/timing quotes. Unconfirmed answers, selection priorities, predictions and wearable data are excluded. Monthly AI summary generation remains unconnected and accurately labeled; the local source-linked report and Copy/Print/PDF remain available.

## Examples

- “Cramps for two hours and missed class” → missing severity, not duration/impact.
- “Moderate cramps for two hours. Heat helped a lot. I missed class.” → no routine follow-up.
- “No symptoms today, but cramps” → clarify before routine questions; resolve status at review.
- Multiple selected symptoms → shared impact may come first, at most three total prompts.
- Skip/decline a topic → it does not reappear in that session. Adding a symptom preserves the cap.

## Review before broader use

Clinical review must assess wording, eligibility, sensitivity, omissions, negation/contradiction handling and accessibility. Product research must assess burden and comprehension. Any future extraction service must return candidate spans, support correction/removal, handle ambiguity and obtain the required external-processing consent. This system provides no triage or reassurance that serious conditions are excluded. Existing safety disclosures remain separate.

## Verification performed

175 automated tests passed during implementation, including question eligibility, unknown/absence, contradiction, total cap, skip/decline, review-gated saving and monthly confirmed content. TypeScript, webpack production build and Sites packaging passed. A Chrome fictional-data journey verified inline questions, saving with an unanswered prompt, correcting severity in review, unchanged original text after reload, confirmed content in the monthly report, PDF action and mobile layout, without health-data POSTs or audio/microphone activation. Automated checks are software checks, not clinical validation. Real microphone/read-aloud was not re-tested during this pass; it uses the existing browser integration.

## Voice-first presentation refinement

Speak mode now hides answer choices and the large text field. It shows the short spoken question and one primary action: Answer, Done speaking, Continue or Stop speaking. A transcript preview appears only after an answer; Edit answer reveals a correction field. Hear question, Skip and Finish questions remain quieter controls. The compact AI voice label remains visible and detailed processing disclosure stays in Settings and the main microphone notice. Type mode retains its answer choices. The approved prepared voice, bank, policy, three-question cap and confirmation-before-save behavior are unchanged. Recording still starts explicitly; this is not a native Apple Watch app or automatic/background microphone session.

185 tests and the production/Sites build passed. Chrome mobile/desktop checks used simulated recognition to verify control states, hidden choices/editing, transcript correction and next-question behavior; no real microphone or audio was activated.
