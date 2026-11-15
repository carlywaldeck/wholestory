# Optional spoken Journal follow-ups

Source: *Your first consultation: questions your doctor may ask you*, by Ellen T. Johnson, Ros Wood and Lone Hummelshoj, Endometriosis.org; supplied PDF, pages 3–6. The app's questions are paraphrased from the guide's topics, not a reproduced questionnaire or a diagnostic assessment. No copy of the source PDF is published in the repository.

The local selector checks the initial entry and the patient's own answers for location, intensity, timing, activity impact and relief details. Mentioning a medication or another measure without a reported outcome prioritizes a question about what changed. Known topics are skipped, explicit symptom-free statements are respected, and a session stops at three prompts. Questions and skipped answers are never converted into reported symptoms.

Talk through a few follow-ups explicitly starts spoken questions. Browser speech synthesis reads only the fixed question text; the app does not send the Journal or answers to an AI provider to choose or voice these questions. The browser/device may supply remote speech services. Voice and pace are selected in Settings. No audio plays on load and the microphone never starts automatically after a question.

The microphone and speaker are mutually gated to avoid feedback. Answers can be typed or dictated, reviewed and corrected. Use answer appends the exact response, clearly labeled separately from the app question, to the editable entry. Confirmed contextual facts link to the exact answer quote. Ambiguous numeric severity is not turned into a score out of ten, and uncertainty stays uncertainty. Symptom occurrence still requires explicit Journal confirmation.

Finish questions can stop early and retain a typed answer. Save is blocked while recording, speaking, or an unfinished guided turn could be lost. Saved responses use the existing Journal → calendar → clinician-summary flow.

Automated tests cover contextual branching, at-most-three prompts, no initial playback, exact answer capture, uncertainty and persistence. Browser automation stubs audio so it does not play sound or capture the microphone. Real speaker delivery is a separate user check in Chrome on localhost; it is not established by stubbed audio tests. Existing live microphone input was separately user-confirmed in Chrome.

## Input preference and simpler controls

Settings now stores Speak or Type in `elya.journalMode` (Type is the default). Changes apply immediately to the Journal and follow-ups, including the scrolling Home. Type mode has editable text and no recording/read-aloud controls; Speak mode has recording controls and a read-only transcript. Switch to Type in Settings to correct a transcript. Switching input mode cancels capture. Reset-all clears this preference.

Follow-ups show one Next question action (Finish on the third answer), plus Skip and Finish questions. Type mode never synthesizes speech. The user confirmed hearing the first question in external Chrome.

Add symptom creates a selected custom bubble. Custom names and explicit reports persist in the existing entry text and source-linked contextual facts, using the existing Uncertainty category rather than inventing a backend prediction target. Custom bubbles are restored from saved entries; they do not extend the model's four forecast symptoms. Unselected bubbles remain unknown. Browser checks verified custom bubble save/reload, retained answers, mode visibility, and mobile/desktop rendering without activating microphone or audio. All 165 tests, TypeScript and production/Sites packaging pass.

## Speak and day-navigation follow-up

Speak transcripts remain editable for correction without changing input preference. Speak answer can interrupt question playback instead of waiting for synthesis to finish. The HTTP LAN preview now explains the microphone restriction before capture and links to localhost with the Speak preference explicitly selected; it does not transfer health data between origins. Chrome localhost is the local microphone test surface. Browser checks used simulated recognition and confirmed start/stop and transcript retention; this is not a new live microphone confirmation.

The day-detail heading toggles a date input. Choosing a day updates the displayed records and URL; previous/next arrows continue to navigate across dates. Seven focused tests, TypeScript, production build and Sites packaging passed. Chrome mobile checks verified date picker, next and previous navigation. No backend prediction or wearable files changed.
