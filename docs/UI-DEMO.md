# elya demo journey

The default `/` screen is Outlook; `/outlook` is an alias. The approved animated fabric opening is preserved at `/welcome` and is available from Settings. Journal, Appointment Brief, Privacy and Settings retain their routes.

## Four-minute walkthrough

1. Start on Outlook. Choose Maya, Alex or Jules under Demo history. The fictional label stays visible. Each choice loads the forecast and matching journal history from the existing forecast API.
2. Show the four independent tomorrow states. Missing estimates say Still learning. Percentages are not confidence scores; no clinical accuracy is claimed. Wearables are context only.
3. Click Check in today. Confirm present, none reported, or leave symptoms unanswered; optionally write. Save changes / Add to calendar returns to the selected calendar day. Click Edit entry to review the stored text and answers.
4. Open Appointment Brief. Choose dates, add what you want understood and your questions, review the sources, check the review box, then Copy or Print / Save as PDF.

No wearable purchase or additional account is needed. Demo changes stay in memory and do not overwrite personal IndexedDB records. Switching persona resets appointment draft text to avoid mixing fictional histories. Personal check-ins compute locally; they are not posted to an AI service.

## Frontend contracts

- No model, API route, research or wearable-owned files changed.
- `LinenPages.onSave(Entry): Promise<void>` updates the confirmed day using the existing `checkinRecord` helper. True / false / null remain present / explicitly absent / unanswered. Demo saves update both `demoInput.days` and `demoJournalEntries`, then call the existing model with evaluation disabled.
- The existing wearable `onInclude(text)` callback still supplies optional context to the brief, copy and print. It does not influence forecasts.
- Shared navigation uses an `elya-checkin-today` browser event to select today's Journal. The Menu stays mounted. `HeroBackground.frozen` adds a single-frame mode for interior screens without changing the approved animated default.

Dependencies remain those in package.json, including Next.js, React, lucide-react, idb and jsPDF. UI implementation and test support used OpenAI Codex. No new dependencies or media assets were added.
