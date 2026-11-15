-- Apply in your own project's SQL editor. No real or fictional records are seeded.
create table if not exists public.elya_journal_entries (
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_id text not null check (length(entry_id) between 1 and 100),
 payload jsonb not null,
 primary key(user_id, entry_id),
 constraint personal_entries_only check (
  coalesce(jsonb_typeof(payload) = 'object'
  and payload->'demo' = 'false'::jsonb
  and not (payload ? 'persona')
  and payload->>'id' = entry_id, false)
 )
);
alter table public.elya_journal_entries enable row level security;
revoke all on public.elya_journal_entries from anon;
grant select, insert, update, delete on public.elya_journal_entries to authenticated;
drop policy if exists "Read own journal" on public.elya_journal_entries;
create policy "Read own journal" on public.elya_journal_entries for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Insert own journal" on public.elya_journal_entries;
create policy "Insert own journal" on public.elya_journal_entries for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own journal" on public.elya_journal_entries;
create policy "Update own journal" on public.elya_journal_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Delete own journal" on public.elya_journal_entries;
create policy "Delete own journal" on public.elya_journal_entries for delete to authenticated using ((select auth.uid()) = user_id);
