# elya demo journey

The default `/` screen is the animated fabric welcome. It greets the saved name when one is set, without inventing a name. Start your story has a down arrow and scrolls to Journal. Continue scrolling through Journal → Outlook → Appointment Brief, all sharing the same history. Saving an embedded Journal entry scrolls to its Outlook date. The standalone routes remain available from Menu; `/welcome` is an alias for the opening. The wordmark always links home.

## Four-minute walkthrough

1. Start on Outlook. Choose Maya, Alex or Jules under Demo history. The fictional label stays visible. Each choice loads the forecast and matching journal history from the existing forecast API.
2. Show the four independent tomorrow states. Missing estimates say Still learning. Percentages are not confidence scores; no clinical accuracy is claimed. Wearables are context only.
3. Click Check in today. Tap symptom bubbles to select experienced symptoms, and tap again to clear them. Unselected symptoms are unanswered. No symptoms today explicitly records absence; optional per-symptom absence controls are behind a disclosure. Optionally write. Save changes / Add to calendar returns to the selected calendar day. Click Edit entry to review the stored text and answers.
4. Open Appointment Brief. Choose a month and read the report. Statements link to Journal entries; corrections happen in Journal and refresh the report. Copy, Print, or Save as PDF. There are no contribution fields. This is currently a clearly labeled browser-local summary; the proposed monthly AI contract is in MONTHLY-BRIEF-HANDOFF.md and is not implemented.

No wearable purchase or additional account is needed. Demo changes stay in memory and do not overwrite personal IndexedDB records. Switching persona resets appointment draft text to avoid mixing fictional histories. Personal check-ins compute locally; they are not posted to an AI service.

## Frontend contracts

- No model, API route, research or wearable-owned files changed.
- `LinenPages.onSave(Entry): Promise<void>` updates the confirmed day using the existing `checkinRecord` helper. True / false / null remain present / explicitly absent / unanswered. Demo saves update both `demoInput.days` and `demoJournalEntries`, then call the existing model with evaluation disabled.
- The existing wearable `onInclude(text)` callback still supplies optional context to the brief, copy and print. It does not influence forecasts.
- Shared navigation uses an `elya-checkin-today` browser event to select today's Journal. The Menu stays mounted. `HeroBackground.frozen` adds a single-frame mode for interior screens without changing the approved animated default.

Dependencies remain those in package.json, including Next.js, React, lucide-react, idb and jsPDF. UI implementation and test support used OpenAI Codex. No new dependencies or media assets were added.
