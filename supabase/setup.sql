-- One-time setup for WSA Reps accounts. Paste into Supabase: SQL Editor > New query > Run.
create table if not exists public.user_docs (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_docs enable row level security;

create policy "Users read their own docs" on public.user_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their own docs" on public.user_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own docs" on public.user_docs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their own docs" on public.user_docs
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_docs to authenticated;
