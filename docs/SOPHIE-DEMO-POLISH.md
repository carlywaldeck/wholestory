# Sophie demo polish — November 15

Scope: fictional Sophie (internal persona `maya`) only, except the explicitly requested homepage subtitle. Forecasting algorithms and real-profile save/load functions are unchanged.

## Seed and chronology

- `research/prepare_sophie_demo.ts` produces versioned `public/demos/maya-learning-v3.json` from the existing synthetic research seed using the actual unchanged learner.
- November 1–13: pelvic pain on 1, 2, 3, 12, 13; fatigue on 1, 10–13; bloating on 2, 10–13. November 14 starts with fictional fatigue/bloating and unknown impact.
- Historical daily impact: Missed activities on November 2 and 13, Slowed me down on November 12, explicit No change on the remaining earlier days. November 14 has no default impact answer.
- The requested two clusters inside a 14-day window use an intentionally short, irregular fictional cycle: recorded previous onset October 31; scenario next onset November 15. This is not a representative clinical pattern. The future onset is never passed as known model input.
- Remove and replay affected synthetic snapshots from October 20 onward in chronological order, using only earlier reports at issuance. Earlier unchanged seed snapshots are retained. November 14 fatigue and bloating remain High risk as computed, not scripted labels; pelvic pain also computes High risk. Later outcomes occur after issuance.
- Demo cache revision changes archive older fictional runs before loading the new seed. Personal storage keys and profiles are unchanged; older assets remain available in Git.

## Journal and report

- Current seeded Sophie entry opens empty for a new typed/voice check-in. Earlier seed entries use short natural wording. No default negative symptom list or daily-life answer is copied into a new check-in.
- Review/save preserves the actual follow-up impact answer. Unanswered impact remains unknown.
- Sophie brief gets a computed three-sentence overview, symptom counts with logged-day denominators, and one closed Show dates disclosure containing source links and absence details. Real reports retain their existing rendering.
- Copy/print and the demo PDF include the computed overview. The PDF symptom table uses the same denominators. PDFs retain their existing printable source/absence details because paper has no disclosure control.
- New optional `LinenBrief.sophieDemo` prop defaults false; only demo rendering enables it. No wearable contracts or forecasting code changed.

## Validation

- 253 tests pass in America/Los_Angeles, including a full simulated Ellie speech flow and a full typed Sophie flow through review, calendar, saved date, and monthly brief; actual learner executes for saving.
- Existing fresh personal-profile and UTC-rollover tests pass unchanged.
- Browser typed rehearsal confirms an empty starter, explicit Missed activities answer, saved November 14, and overview impact count increasing from 3 to 4 days. Show dates opens and closes with working source anchors.
- Native live microphone input is not automated or re-recorded; speech callbacks and voice flow are covered with simulated fictional transcripts.
- Typecheck and webpack production build pass. Sites worker packaging succeeds. A generated two-page Sophie PDF was rendered and checked for readable counts, summary, and page boundaries.
