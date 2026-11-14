# WholeStory

WholeStory turns scattered symptoms into a clear, evidence-linked story for a healthcare appointment. It combines natural voice/text logging, optional structured forms, explicit cycle context, and concise clinician briefs. No account is required inside the app; the current private Sites host has an owner sign-in gate.

**“These patterns may be worth discussing with a healthcare professional. This tool does not diagnose endometriosis or replace medical care.”**

- [Private live app](https://wholestory-journal.ingeniouscondor8.chatgpt.site)
- [Private source repository](https://github.com/cwaldecknts/wholestory)
- [Combined product and source rationale](docs/PRODUCT.md)

## Run locally

Node.js 22.13+; tested with Node 26.8.1.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. If the environment cannot start a filesystem watcher, use `npm run build && npm start` instead.

Optional: set server-side `OPENAI_API_KEY` and `OPENAI_MODEL` (default `gpt-4.1-mini`) in `.env.local`, then restart. Never put the key in a `NEXT_PUBLIC` variable or commit it. Manual entry, forms, browser voices, demos, analytics, and PDF generation need no API key.

```sh
npm test
npm run typecheck
npm run build
npm start
```

## Voice: choose before speaking

1. Open the microphone or typed entry flow.
2. In **A voice that feels right to you**, choose an available browser voice and select **Preview voice**. Adjust the pace if you like. Previews use a fixed, non-medical sentence.
3. Select **Use this voice** to enable replies. No voice is chosen automatically, and there is no fallback to a different/default voice. The choice is remembered locally; each new session starts muted.
4. Choose **Start recording**, describe the entry, and stop. Review manually or consent to AI extraction. The single optional follow-up can be read aloud, replayed, skipped, or answered with **Answer by voice**.
5. Review and save. **Stop speaking** interrupts a reply or preview. Unchecking **Read replies aloud** mutes replies, including late AI results.

Starting a recording stops playback; playing a preview stops recording. Source dictation and follow-up dictation have separate targets and append to existing words. Device/browser voices vary in quality and availability. Browser speech services may process audio or spoken text externally; the interface discloses this before activation. No raw audio is stored. The app does not claim to use a premium AI voice service: these are voices provided by the user's browser/system.

## The merged symptom workflow

Speak, type, or expand the optional form. Capture only what you know: cycle day and period-start date, pain severity/location, bleeding, fatigue, gastrointestinal symptoms, pain with sex/bowel movements/urination, interventions, reported effects, and daily-life impact. Form answers become exact, editable quoted statements. Relative timing is not converted into a guessed cycle date, and qualitative severity is not converted into a numeric score.

Review extracted/manual details and source quotations, answer or skip at most one follow-up, and save to IndexedDB. Editing source text clears old extracted details. Follow-up answers remain verbatim in the entry rather than being silently reclassified.

**Your story** offers dated entries, edits/deletion, symptom filters, and a 30-day calendar. Unlogged days are separate from explicitly symptom-free reports.

**Insights** shows distinct logged-day counts and links each observation to its source entries. Cycle charts use only explicit cycle days/start dates and numeric scores; gaps remain unknown, no 28-day cycle is assumed, and recurring observations need at least two documented cycles. The highest explicit pain score is shown when multiple entries share a cycle day. Suggested appointment questions are selected deterministically from documented categories; users can add their own questions.

**Doctor brief** combines computed counts, selected recurring observations, dated patient context, an editable patient statement, and selected questions. Review is required before PDF export or print. The summary stays compact; the optional appendix lists all computed categories and dated quotations. Larger journals can span additional pages rather than losing evidence. Correct factual claims by editing their source entries.

## Synthetic demos

**Try demo** opens three separate fictional personas, each spanning 56 days with two explicitly recorded fictional cycles and unlogged days:

- **Maya:** cyclical pain, bowel symptoms, fatigue, and missed classes.
- **Alex:** persistent pain beyond period days, gastrointestinal/urinary symptoms, and cancelled activities.
- **Jules:** mild cramps, little functional disruption, and reported relief after interventions, without claiming causation.

The banner labels **SYNTHETIC DEMO DATA**. New entries made in demo mode belong to that persona. Switching personas does not mix their counts or personal records. The first build's older demo records remain in storage but are separate from these personas. Export a backup before importing overlapping IDs; imports update matching IDs atomically after validating the full file.

## Privacy and clinical context

Entries stay in this browser's IndexedDB. This is not encrypted medical storage; clearing browser data can erase it. No analytics or raw audio storage. Settings provide JSON import/export, individual deletion, and all-local-data deletion. AI extraction requires explicit consent; only the current entry text is sent to OpenAI, with `store:false`. This does not claim the provider retains no data under its service policies. Previous entries are not transmitted. No sensitive content is logged by the application.

An always-available care section provides general emergency/urgent-care guidance linked to [NHS pelvic-pain guidance](https://www.nhs.uk/symptoms/pelvic-pain/). It is not an automated triage assessment; absence of a prompt must not be taken as reassurance. [WHO](https://www.who.int/news-room/fact-sheets/detail/endometriosis) and [ESHRE](https://www.eshre.eu/guideline/endometriosis) inform general symptom/context categories. NICE and ACOG are linked as additional resources, with automated access limitations documented in the product notes.

No diagnostic model, disease probability, treatment recommendation, or causal effectiveness claim. We did not reproduce/administer/score EHP-30, use restricted KI EndoLIST patient files, or train a model. Current personas are original fictional records rather than Synthea output. Exact-quote validation verifies provenance, not clinical truth or semantic correctness; user review remains essential.

## Deployment and GitHub

The repository stores source; the working app is hosted separately on Sites. GitHub Pages cannot run this application's server-side AI endpoint.

For Vercel, import `cwaldecknts/wholestory`, use the Next.js preset, and configure server secrets. A Node host uses `npm run build` then `npm start`. Use HTTPS for speech features. The key-enabled endpoint needs authenticated rate limiting/abuse protection before a broad public release.

For Sites, `npm run build:sites` packages Next's actual prerendered single route, client assets, and the same extraction handler into a Worker at `dist/server/index.js`. `.openai/hosting.json` retains Site identity. Rebuild/update the adapter if adding server routes or changing Next's asset layout. Publish through the Sites source workflow and keep the existing access audience. Runtime API keys belong in secret environment settings, followed by redeployment.

## Modules and checks

- `app/page.tsx`: views and entry workflow.
- `hooks/use-spoken-replies.ts`, `components/voice-picker.tsx`: chosen voice previews, playback, mute, cancellation.
- `components/structured-details.tsx`: source-attributed optional form.
- `lib/model.ts`, `lib/cycles.ts`: schemas, exact quotation/numeric validation, distinct-day counts, recurring observations and source links.
- `lib/storage.ts`: IndexedDB and validated atomic import.
- `lib/demo.ts`: separate fictional personas.
- `lib/pdf.ts`: deterministic report generation and evidence appendix.
- `lib/server-extract.ts`: consent-gated server extraction.
- `components/safety-section.tsx`, `lib/clinical-context.ts`: sourced general context and care guidance.

33 automated tests cover counts, missing data, source attribution, numeric/cycle consistency, storage, AI consent/failure, form entry, persona isolation, cycle recurrence, PDF layout, and voice selection/preview/mute/answer routing. TypeScript and production builds are checked. Browser speech recognition and audio quality still need testing on each target device; automated tests mock speech engines, and no live OpenAI extraction was made without a configured key.

Next priorities: patient/clinical and accessibility review, encrypted backups, clinician-reviewed questions, more flexible report date ranges, and a separately consented higher-quality voice provider if browser previews do not meet expectations.
