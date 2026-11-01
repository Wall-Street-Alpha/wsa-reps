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

-- Make yourself an admin. Replace the email, then run this line (sign up in the app first).
insert into public.app_admins (user_id)
select id from auth.users where email = 'YOUR_EMAIL_HERE'
on conflict do nothing;
