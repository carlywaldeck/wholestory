# WholeStory

A weekend MVP for private, evidence-first symptom documentation. Next.js App Router, React, TypeScript, Tailwind CSS, a shadcn-style button, Lucide, Recharts, Zod, IndexedDB (`idb`), and jsPDF.

## Run locally

Use Node.js 22.13+ (tested here with Node 26.8.1).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. No account or API key is needed for manual entries, demo history, insights, or reports. Optional: set `OPENAI_API_KEY` on the **server** and `OPENAI_MODEL` (default `gpt-4.1-mini`). Never use a NEXT_PUBLIC variable for the secret. Restart the dev server after changing environment variables.

```sh
npm test
npm run typecheck
npm run build
npm start
```

## Try the primary flow

1. Choose **Try demo** for 24 fictional logged days across a 30-day window. The banner labels synthetic data. Demo and personal records are separate; entries created while in demo mode are synthetic.
2. Choose **I'd rather type**, describe your experience, and choose **Review manually**, or explicitly consent to AI extraction if configured.
3. In manual review, add only supported structured details and paste exact source quotes. Review AI fields the same way. Editing source text resets extracted details.
4. Answer or skip the single optional question. **Save now** works without answering. Follow-up answers remain in the entry's verbatim text; they are not automatically classified or assigned severity.
5. Open **Your story**, filter symptoms, use the 30-day calendar, edit or delete entries. Unlogged days are labeled separately from explicitly symptom-free entries.
6. Open **Insights**, click a count, and inspect the supporting entries and exact quotations.
7. Open **Doctor brief**, review claims, edit source entries if needed, add your own statement and clinician questions, then check the review box and download a PDF. The optional appendix contains dated quotations. The month-long MVP uses a compact first-page summary and a separate optional evidence appendix. Larger journals can span pages.
8. Privacy & settings supports JSON export/import and all-data deletion. Import validates the complete file before writing; matching IDs are updated. Export a backup before importing an overlapping journal.

## Deploy

### Vercel / standard Node hosting

Import this folder as a Next.js project. Build with `npm run build`; start with `npm start` on a Node host. Set server-side `OPENAI_API_KEY` and optional `OPENAI_MODEL` in the host's secret settings. Use HTTPS for microphone support. A Vercel deployment uses its native Next.js runtime without the Sites adapter.

### Sites

`npm run build:sites` compiles the real Next prerendered home route and its client assets into `dist/server/index.js`, together with the same server extraction handler. The app has a single URL and client-side views, so no Next server routing is needed in this adapter. Assets are embedded in the Worker to avoid an external storage binding. Rebuild this adapter when adding routes or changing the Next asset layout. `.openai/hosting.json` retains Site identity. Use the Sites source packaging/publishing workflow, then add the API key as a secret runtime environment variable and redeploy. New publication is private by default.

## Modules

- `app/page.tsx`: responsive home, entry review, timeline, calendar, evidence drawer, brief and privacy settings.
- `lib/model.ts`: Zod schemas, exact quote validation, distinct-day calculations, evidence-linked report claims.
- `lib/storage.ts`: IndexedDB persistence, atomic validated import, edit/delete.
- `lib/server-extract.ts`: consent-gated, server-only structured extraction; no sensitive content logging.
- `lib/demo.ts`: explicitly synthetic history with unlogged and symptom-free days.
- `worker/` and `scripts/build-worker.mjs`: Sites hosting adapter.

Brand name is centralized as `BRAND` in `app/page.tsx`; update layout metadata, README, and database/export names if renaming the product.

## Privacy, clinical context, and limits

Entries remain in browser-local IndexedDB. This is not encrypted medical storage and no HIPAA compliance is claimed. Clearing browser data removes entries. No analytics or raw voice recordings are saved. Browser speech recognition can send audio to a browser-vendor service; the interface discloses this before activation. Text is sent to OpenAI only after consent and an extraction click. Provider requests use `store:false`; this does not claim that the provider retains no data under its service policies. Previous journal history is not transmitted.

No diagnosis, disease probabilities, causal claims, or treatment recommendations. Educational source links: [NICE NG73](https://www.nice.org.uk/guidance/ng73/chapter/recommendations) and [ACOG diagnosis guidance](https://www.acog.org/clinical/clinical-guidance/clinical-practice-guideline/articles/2026/03/diagnosis-of-endometriosis). These pages restricted automated access during development; clinical review remains necessary. Question categories cover impact, timing, and menstrual context, rather than implementing a diagnostic algorithm.

Counts reflect explicit reviewed structured fields, not a scan of all free text. Exact quote validation verifies provenance, not clinical truth or semantic correctness; user review is essential. No numeric severity is inferred. AI errors retain editable text and permit manual review. Speech support varies by browser; text always works. Longitudinal statistical trends and menstrual correlation analysis are deliberately not inferred from the small demo sample. Reports use deterministic claims and editable patient text rather than AI prose. The endpoint has text limits, same-origin checks, a provider timeout, and no content logs; add authenticated rate limits and abuse protection before making an API-key-enabled deployment broadly public.

## Next priorities

1. Clinical and accessibility review with patients; test on actual iOS/Android speech engines.
2. Meaningful longitudinal comparisons with transparent eligibility and source links.
3. Extract follow-up answers into reviewed, attributed fields without another question.
4. Better report range controls, custom questions, and patient-editable narrative sections.
5. Production abuse controls, consent audit UX, encrypted backups, and a documented privacy policy.

## Verification in this build

16 automated tests cover distinct-day symptom/impact counts, missing versus symptom-free days, exact source validation, empty data, atomic import, editing/deletion, consent and AI fallback, PDF pagination, the manual UI journey, demo isolation, and report review gating. TypeScript and optimized Next/Sites builds pass. The production localhost preview was checked on desktop and a 390px mobile viewport. A fictional manual entry saved with its exact quote; a demo insight opened its four source entries; a reviewed brief downloaded successfully. The development watcher failed in this sandbox, so the production server was used for visual QA. The private hosted URL requires an owner sign-in. Real microphone recognition remains untested. No live OpenAI call was made without a configured key.

Private preview: https://wholestory-journal.ingeniouscondor8.chatgpt.site
