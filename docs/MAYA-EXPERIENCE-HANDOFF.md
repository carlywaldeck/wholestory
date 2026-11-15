# Maya experience handoff

Branch `carly/maya-experience` starts from the combined Elya branch and keeps the existing visual language. It removes the sticky fictional-history banner and multi-persona selector, keeps a compact Demo Maya label, and opens a single prepared Maya demo directly on Outlook.

The outlook uses one heading and date, a short readout of actual returned model estimates, compact per-symptom rows and an optional methodology disclosure. Wearable-supported targets are named only when the personal learner selected them. No risk label or probability was manually changed to make the demo look better. The revised seed has high fatigue/bloating and low pelvic-pain/bowel estimates. Real-user predictive reliability remains unproven.

The first-load snapshot avoids recomputing six months of history on a visitor's device. Existing outdated fictional bundles are archived before replacement; current demo edits are preserved. Personal journals and learning ledgers are unchanged. Browser first-load testing on a fresh origin measured approximately 0.8 seconds from demo click to populated outlook; this is one local measurement, not a production performance guarantee.

Appointment Brief adds a short local monthly overview. Monthly section generation was moved into `lib/monthly-brief.ts`, with exports preserved for existing callers. Optional AI appointment highlights use `/api/appointment-summary`, requiring explicit consent and a configured server OpenAI key. The language model selects indices into locally verified source statements, never arbitrary narrative. Server and client verify that statement wording and source references remain unchanged. Highlights are supplemental onscreen; the existing PDF remains the source-linked local report. A missing key or provider failure leaves the report usable. Live provider execution is not verified in the local environment because no local OpenAI key is configured.

Sites packaging includes public demo assets and standalone section HTML routes. Runtime server secrets must remain in Sites environment settings; `.env.local` is never committed. The Supabase project URL and publishable key are built into the public browser client as intended, with RLS required. No personal journal was uploaded during implementation.

Demo selection persists in session storage so reloading a report does not silently switch to the personal journal. Exit demo and full local reset clear this flag. A regression test verifies restoration directly on the report route.
