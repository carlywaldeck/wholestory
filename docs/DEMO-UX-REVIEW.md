# Demo and appointment report review

Reviewed November 15, 2026. Based on a first-time walkthrough, not usability testing with children or patients.

## Five main issues addressed

1. The demo offered voice as its only obvious next step. Outlook now has a quiet Type instead action; the Journal navigation step does not itself start a voice conversation. The explicit voice action remains available.
2. The demo's fixed date could look like a live personal forecast. The sample day is now visible alongside the fictional-profile label.
3. AI summaries were hidden behind a disclosure. The optional step is visible before export, with explicit consent and clear unavailable/error states.
4. Export omitted some confirmed context, added generic questions, and presented confirmed lack of daily-life impact as missing. PDF now preserves all reported symptom categories, explicit absences, recorded severity/timing, daily-life impact, and treatment responses; unknown stays separate. Original wording and numbered sources are retained. No generic questions are added.
5. Copy/Print/PDF differed. All now include the current verified AI selections when available; Copy gives a concise report and source key rather than dumping full private entries. Long on-screen source lists sit behind disclosures.

## Verification

- Fictional typed journey: Outlook → Type instead → answer follow-up → finish → review → save → calendar → saved day → appointment brief → actual PDF download.
- No audio played and no microphone activated during this walkthrough.
- Phone report checked at 390px; document width matches viewport width.
- Demo report rendered and visually reviewed. Source history remains fictional and separate from personal records.
- Key points are AI-selected extracts from confirmed statements, not invented medical narrative. All reported symptoms remain in the complete report, even if not selected as key points.
- Live OpenAI test used fictional entries only. Existing configured API account returned HTTP 429 / credit_balance_exhausted. No live AI result is claimed. Credits are required before real-provider success can be verified.

## Remaining checks

- Ask first-time users from the intended age range to complete the journey without coaching; this review cannot establish age-specific usability.
- Recheck spoken interaction in the user's normal browser with permission, and the live AI summary after API credits are available.
- Publish through an account with editor access to the existing Sites project. No public-site changes were made by this review.
