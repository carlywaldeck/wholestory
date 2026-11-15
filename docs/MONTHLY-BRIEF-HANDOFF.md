# Monthly appointment brief: backend coordination

The UI is a read-only monthly report with per-statement Journal links and local copy/print/PDF. It currently summarizes confirmed saved fields deterministically in the browser. It explicitly says AI generation is unavailable. The existing `/api/extract` contract only returns extracted facts, symptomFree and followUp; it cannot truthfully supply an AI-generated monthly report. No backend/model/research routes were changed.

Proposed contract for Carly to review (not implemented):

`POST /api/appointment-summary`

Request: `{ month: "YYYY-MM", entries: Entry[], consentToServerProcessing: true }`. Supply only the selected month and one source identity (personal OR one fictional persona). Real processing must require an existing explicit Settings consent; merely scrolling onto the report must not transmit health information.

Response: `{ month: "YYYY-MM", provenance: "ai-generated", sections: [{ heading: string, statements: [{ text: string, sourceIds: string[] }] }] }`.

Require nonempty, valid source IDs for every statement, validate quotes against source text, reject invented dates/scores/outcomes, and exclude forecast estimates. Frequency counts must use distinct confirmed dates, not total calendar days. Missing days stay unknown. Unsupported sections are omitted. On missing configuration, consent or failure, retain the clearly labeled browser-local summary. The UI may display “AI-generated summary” only after a validated AI response is connected.

This is a proposed interface, not a claim that the endpoint or AI service exists.
