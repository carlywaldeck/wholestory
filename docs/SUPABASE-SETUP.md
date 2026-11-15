# Supabase journal setup

## Scope

Optional email sign-in and manual personal journal backup/restore. Demo profiles never upload. Wearable records and prospective learning ledgers remain local. This is not automatic multi-device model sync or conflict-resolving journal sync. Existing local-only usage works without configuration.

## Create and configure the project

1. Create a free Supabase project in your own account. Keep the database password private.
2. In SQL Editor, run `supabase/migrations/202611140001_personal_journal.sql` from this branch. It creates a personal-only table with per-user row-level security. Do not disable RLS.
3. Add the project's URL and publishable key to the local `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Never use a service-role key, secret key or database password in public variables. `.env.local` must stay uncommitted. Public variables require rebuilding/restarting the app.

4. In Authentication URL Configuration, set the app's actual origin as Site URL and allow its `/settings` redirect. For the current preview this is `http://127.0.0.1:3017/settings`. Configure the eventual public HTTPS origin separately when deployed. Do not use broad production redirect wildcards.
5. Enable email authentication. The built-in email sender may restrict recipients and sending frequency; verify current project settings before a demo. Custom SMTP can be required for sending to other participants. Supabase documentation: https://supabase.com/docs/guides/auth/auth-email and https://supabase.com/docs/reference/javascript/auth-signinwithotp
6. Restart the app. Open Settings → Account & cloud journal. Request a sign-in link using your own email. No email is sent until a user presses that button.

## What users approve

No automatic upload occurs on page load, sign-in or journal save. The user checks the upload consent box and presses Upload personal journal. This transmits personal journal text and structured symptoms to the configured Supabase project. Upload replaces cloud records with matching IDs. Download only imports missing IDs; it does not overwrite local edits. Up to 1,000 entries are supported per action in this preview.

Delete cloud journal removes remote journal entries, not local entries or the Supabase Auth account. Existing local reset controls remove local data only. Sign-out retains local entries; use a private device. Cloud deletion is an explicit two-step UI action.

## Required live verification

No Supabase project was available during implementation. Unit tests verify filtering, account-scoped requests, unknown auth handling and restore behavior with mocks; they do not verify live authentication or database policies. Before using real health information, test with fictional engineering entries in two test accounts: each account sees only its own rows, unauthenticated requests cannot read or write, a forged other-user ID is rejected, and cloud deletion works. Confirm that demo profiles never upload. Review deployment data handling and access controls; no compliance or encryption guarantee is made by this integration.

## Maya demonstration

Home now includes Explore Maya’s demo. It loads the existing isolated synthetic history; Outlook shows computed risk bands and Learning progress. The first replay may take time. Later loads reuse the stored demo learner. Journal edits and the source-linked brief remain fictional. Save as PDF was verified in the local browser. The current brief is deterministic and explicitly labels AI generation unavailable.
