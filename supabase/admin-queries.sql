-- WSA Reps: queries for watching how people use the app.
-- Run in Supabase: SQL Editor > New query. These read every user's data, so only run them in the dashboard.
-- Review log rows are [time_ms, card_id, rating 1-4, duration_ms, key_point_coverage, xp, mode, previous_state].

-- 1. Sign-ups and last sign-in
select email, created_at, last_sign_in_at
from auth.users
order by created_at desc;

-- 2. Each person's XP, streak and last active day
select u.email,
       (p.value->>'xp')::int        as xp,
       (p.value->>'streak')::int    as streak,
       (p.value->>'best')::int      as best_streak,
       p.value->>'lastDay'          as last_active_day,
       jsonb_array_length(p.value->'decks') as decks
from public.user_docs p
join auth.users u on u.id = p.user_id
where p.key = 'profile'
order by p.updated_at desc;

-- 3. Reviews per person in the last 30 days, with share rated Good or Easy
select u.email,
       count(*) as reviews,
       round(100.0 * avg(case when (r->>2)::int >= 3 then 1 else 0 end), 1) as pct_good_or_easy,
       round(sum((r->>3)::numeric) / 60000, 1) as minutes
from public.user_docs d
join auth.users u on u.id = d.user_id,
     jsonb_array_elements(d.value->'e') r
where d.key like 'lg-%'
  and to_timestamp((r->>0)::bigint / 1000) > now() - interval '30 days'
group by u.email
order by reviews desc;

-- 4. Daily active users and reviews per day
select to_timestamp((r->>0)::bigint / 1000)::date as day,
       count(distinct d.user_id) as active_users,
       count(*) as reviews
from public.user_docs d,
     jsonb_array_elements(d.value->'e') r
where d.key like 'lg-%'
group by day
order by day desc;

-- 5. Decks people imported
select u.email, deck->>'name' as deck, (deck->>'count')::int as cards,
       to_timestamp((deck->>'createdAt')::bigint / 1000) as imported_at
from public.user_docs p
join auth.users u on u.id = p.user_id,
     jsonb_array_elements(p.value->'decks') deck
where p.key = 'profile' and deck->>'id' <> 'starter'
order by imported_at desc;

-- 6. Mock interviews completed per person
select u.email, (p.value->>'mocks')::int as mock_interviews
from public.user_docs p
join auth.users u on u.id = p.user_id
where p.key = 'profile'
order by mock_interviews desc nulls last;
