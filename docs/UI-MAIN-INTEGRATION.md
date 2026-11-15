# Main integration: 9997ef7

Integrated into codex/adaptive-journal-questions; no main push or deployment. The pre-merge tree was clean at d3dea69, so no changes required stashing or a new preservation commit.

Ten files conflicted: app/page.tsx; three app journey tests; components/journal-save.test.tsx; components/linen-brief.tsx; components/linen-pages.tsx and .css; scripts/build-worker.mjs; worker/index.ts.

Resolution preserves the approved grouped Settings, prepared feminine voice, adaptive optional questions, source provenance and confirmation before saving. The user explicitly chose to retain review/confirmation while using main's Save entry/Save changes labels. Supabase remains optional, consent-based manual backup, not automatic upload. Its entire validated entry payload preserves the optional journal provenance extension.

Main's single Maya persona, prepared demo, local model progression, demo greeting/persistence, Start my journal/Try Maya's demo, wearable-use explanations, Download report and simplified report are preserved. Monthly report construction uses main's shared lib/monthly-brief.ts with symptom-specific answer context retained. All server endpoints and public assets are packaged; the direct settings/privacy route is included too. New cloud backup is exposed in Privacy and data; wording now distinguishes local copies and optional cloud backup, including separate cloud deletion. No research/model logic was changed to resolve UI overlaps.

Validation: 204 tests pass. TypeScript, webpack production build and Sites packaging pass. The font build required network access to fetch next/font assets. Chrome with fictional data verified personal save through confirmation, prepared Maya selection, local-worker next-day action, restored demo mode on the report route, personal/demo isolation, real Download report PDF, and the cloud-backup Settings entry point. No health-data POSTs, microphone capture or audio playback were used.

Before merging back to main: review the combined PR and manually rehearse approved voice/mobile flows. Live Supabase sign-in/upload/download/delete needs configured project URL/publishable key, deployed migration/RLS and a consenting test account; no live cloud round trip was performed. Optional AI report highlights require usable API credits and explicit consent; they were not invoked. Hosted routes and auth redirects need validation after an approved deployment. Nothing has been deployed or pushed to main by this task.
