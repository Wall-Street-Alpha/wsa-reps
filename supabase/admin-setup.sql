-- WSA Reps admin panel. Run once in Supabase: SQL Editor > New query > paste > Run.
-- Then make yourself an admin with the last statement (put in the email you sign in with).
-- Students still only see their own data; these functions only answer for admins.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

create or replace function public.admin_students()
returns table (
  user_id uuid, email text, name text, joined_at timestamptz, last_sign_in_at timestamptz,
  xp int, streak int, best_streak int, last_active_day text, decks int,
  cards_seen int, mastered int, reviews_total int, reviews_7d int,
  good_pct numeric, minutes_total numeric, mocks int, last_review_at timestamptz
)
language plpgsql stable security definer set search_path = public, auth as $$
#variable_conflict use_column
begin
  if not public.is_app_admin() then raise exception 'not an admin'; end if;
  return query
  with prof as (
    select d.user_id as uid, d.value as v from public.user_docs d where d.key = 'profile'
  ),
  logs as (
    select d.user_id as uid, r from public.user_docs d, jsonb_array_elements(d.value->'e') r where d.key like 'lg-%'
  ),
  lstats as (
    select l.uid,
      count(*)::int as n_total,
      (count(*) filter (where to_timestamp((l.r->>0)::bigint / 1000) > now() - interval '7 days'))::int as n_7d,
      round(100.0 * avg(case when (l.r->>2)::int >= 3 then 1 else 0 end), 1) as pct_good,
      round(sum(least((l.r->>3)::numeric, 600000)) / 60000, 1) as mins,
      max(to_timestamp((l.r->>0)::bigint / 1000)) as last_rev
    from logs l group by l.uid
  ),
  sstats as (
    select d.user_id as uid,
      count(*)::int as seen,
      (count(*) filter (where (s.value->>0)::int = 2 and (s.value->>2)::numeric >= 21))::int as mast
    from public.user_docs d, jsonb_each(d.value->'m') s
    where d.key like 'st-%' and (s.value->>0)::int > 0
    group by d.user_id
  )
  select u.id, u.email::text,
    coalesce(nullif(p.v->>'name', ''), u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', split_part(u.email::text, '@', 1))::text,
    u.created_at, u.last_sign_in_at,
    coalesce((p.v->>'xp')::int, 0), coalesce((p.v->>'streak')::int, 0), coalesce((p.v->>'best')::int, 0), (p.v->>'lastDay')::text,
    coalesce(jsonb_array_length(p.v->'decks'), 0)::int, coalesce(ss.seen, 0), coalesce(ss.mast, 0),
    coalesce(ls.n_total, 0), coalesce(ls.n_7d, 0), ls.pct_good, coalesce(ls.mins, 0::numeric),
    coalesce((p.v->>'mocks')::int, 0), ls.last_rev
  from auth.users u
  left join prof p on p.uid = u.id
  left join lstats ls on ls.uid = u.id
  left join sstats ss on ss.uid = u.id
  order by ls.last_rev desc nulls last, u.created_at desc;
end $$;

create or replace function public.admin_student_docs(target uuid)
returns table (key text, value jsonb)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_app_admin() then raise exception 'not an admin'; end if;
  return query
    select d.key, d.value from public.user_docs d
    where d.user_id = target and (d.key = 'profile' or d.key like 'lg-%' or d.key like 'st-%' or d.key like 'dk-%');
end $$;

revoke all on function public.admin_students() from public, anon;
revoke all on function public.admin_student_docs(uuid) from public, anon;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.admin_students() to authenticated;
grant execute on function public.admin_student_docs(uuid) to authenticated;

-- ===== Bank tags: which banks ask each question (admins edit, everyone signed in reads) =====
create table if not exists public.question_tags (
  qhash text primary key,
  question text,
  banks text[] not null default '{}',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.question_tags enable row level security;
drop policy if exists "Signed-in users read question tags" on public.question_tags;
drop policy if exists "Admins add question tags" on public.question_tags;
drop policy if exists "Admins update question tags" on public.question_tags;
drop policy if exists "Admins delete question tags" on public.question_tags;
create policy "Signed-in users read question tags" on public.question_tags for select to authenticated using (true);
create policy "Admins add question tags" on public.question_tags for insert to authenticated with check (public.is_app_admin());
create policy "Admins update question tags" on public.question_tags for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "Admins delete question tags" on public.question_tags for delete to authenticated using (public.is_app_admin());
grant select, insert, update, delete on public.question_tags to authenticated;

-- ===== Observability: product events and client errors =====
create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 60),
  props jsonb not null default '{}' check (pg_column_size(props) < 4000),
  created_at timestamptz not null default now()
);
create index if not exists app_events_created_idx on public.app_events (created_at desc);
alter table public.app_events enable row level security;
drop policy if exists "Users add their own events" on public.app_events;
create policy "Users add their own events" on public.app_events for insert to authenticated with check ((select auth.uid()) = user_id);
grant insert on public.app_events to authenticated;

create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  message text not null check (char_length(message) <= 1000),
  stack text check (char_length(stack) <= 4000),
  url text check (char_length(url) <= 500),
  user_agent text check (char_length(user_agent) <= 400),
  app_version text check (char_length(app_version) <= 40),
  created_at timestamptz not null default now()
);
create index if not exists app_errors_created_idx on public.app_errors (created_at desc);
alter table public.app_errors enable row level security;
drop policy if exists "Users report errors" on public.app_errors;
drop policy if exists "Visitors report errors" on public.app_errors;
create policy "Users report errors" on public.app_errors for insert to authenticated with check (user_id is null or (select auth.uid()) = user_id);
create policy "Visitors report errors" on public.app_errors for insert to anon with check (user_id is null);
grant insert on public.app_errors to authenticated, anon;

create or replace function public.admin_activity(days int default 14)
returns table (day date, active_users int, sign_ups int, sessions int, events int)
language plpgsql stable security definer set search_path = public, auth as $$
#variable_conflict use_column
begin
  if not public.is_app_admin() then raise exception 'not an admin'; end if;
  return query
  with d as (select generate_series((now() - make_interval(days => days - 1))::date, now()::date, interval '1 day')::date as dd)
  select d.dd,
    (select count(distinct e.user_id) from public.app_events e where e.created_at::date = d.dd)::int,
    (select count(*) from auth.users u where u.created_at::date = d.dd)::int,
    (select count(*) from public.app_events e where e.created_at::date = d.dd and e.name = 'session_complete')::int,
    (select count(*) from public.app_events e where e.created_at::date = d.dd)::int
  from d order by d.dd;
end $$;

create or replace function public.admin_event_counts(days int default 7)
returns table (name text, events int, users int)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_app_admin() then raise exception 'not an admin'; end if;
  return query
  select e.name, count(*)::int, count(distinct e.user_id)::int
  from public.app_events e where e.created_at > now() - make_interval(days => days)
  group by e.name order by count(*) desc;
end $$;

create or replace function public.admin_recent_errors(lim int default 50)
returns table (created_at timestamptz, email text, message text, url text, user_agent text, app_version text)
language plpgsql stable security definer set search_path = public, auth as $$
#variable_conflict use_column
begin
  if not public.is_app_admin() then raise exception 'not an admin'; end if;
  return query
  select r.created_at, u.email::text, r.message, r.url, r.user_agent, r.app_version
  from public.app_errors r left join auth.users u on u.id = r.user_id
  order by r.created_at desc limit lim;
end $$;

revoke all on function public.admin_activity(int) from public, anon;
revoke all on function public.admin_event_counts(int) from public, anon;
revoke all on function public.admin_recent_errors(int) from public, anon;
grant execute on function public.admin_activity(int) to authenticated;
grant execute on function public.admin_event_counts(int) to authenticated;
grant execute on function public.admin_recent_errors(int) to authenticated;

-- ===== Friends: invite links and challenges =====
create or replace function public.my_invite_code()
returns text language sql stable as $$ select left(replace(auth.uid()::text, '-', ''), 10) $$;
grant execute on function public.my_invite_code() to authenticated;

create table if not exists public.referrals (
  invitee uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  inviter_code text not null check (char_length(inviter_code) = 10),
  invitee_name text check (char_length(invitee_name) <= 80),
  created_at timestamptz not null default now()
);
alter table public.referrals enable row level security;
drop policy if exists "Users record who invited them" on public.referrals;
drop policy if exists "Inviters see who joined" on public.referrals;
create policy "Users record who invited them" on public.referrals for insert to authenticated
  with check ((select auth.uid()) = invitee and inviter_code <> public.my_invite_code());
create policy "Inviters see who joined" on public.referrals for select to authenticated
  using (inviter_code = public.my_invite_code() or invitee = (select auth.uid()));
grant select, insert on public.referrals to authenticated;

create table if not exists public.challenges (
  id text primary key check (char_length(id) between 8 and 20),
  creator uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creator_name text check (char_length(creator_name) <= 80),
  title text check (char_length(title) <= 120),
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 12 and pg_column_size(questions) < 60000),
  created_at timestamptz not null default now()
);
alter table public.challenges enable row level security;
drop policy if exists "Signed-in users open challenges" on public.challenges;
drop policy if exists "Users create their own challenges" on public.challenges;
create policy "Signed-in users open challenges" on public.challenges for select to authenticated using (true);
create policy "Users create their own challenges" on public.challenges for insert to authenticated with check ((select auth.uid()) = creator);
grant select, insert on public.challenges to authenticated;

create table if not exists public.challenge_results (
  challenge_id text not null references public.challenges(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text check (char_length(name) <= 80),
  score int not null check (score >= 0),
  total int not null check (total > 0),
  seconds int not null default 0,
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
alter table public.challenge_results enable row level security;
drop policy if exists "Signed-in users see challenge results" on public.challenge_results;
drop policy if exists "Users post their own result" on public.challenge_results;
drop policy if exists "Users update their own result" on public.challenge_results;
create policy "Signed-in users see challenge results" on public.challenge_results for select to authenticated using (true);
create policy "Users post their own result" on public.challenge_results for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own result" on public.challenge_results for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.challenge_results to authenticated;

-- Make yourself an admin. Replace the email, then run this line (sign up in the app first).
insert into public.app_admins (user_id)
select id from auth.users where email = 'YOUR_EMAIL_HERE'
on conflict do nothing;
