-- Lets admins add and remove other admins from the Admins tab in the app.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.

create or replace function public.admin_list_admins()
returns table (user_id uuid, email text, name text, added_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
#variable_conflict use_column
begin
  if not public.is_app_admin() then raise exception 'not an admin'; end if;
  return query
    select a.user_id, u.email::text,
      coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', split_part(u.email::text, '@', 1))::text,
      a.added_at
    from public.app_admins a join auth.users u on u.id = a.user_id
    order by a.added_at;
end $$;

create or replace function public.admin_add_admin(target_email text)
returns text language plpgsql volatile security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_app_admin() then raise exception 'not an admin'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(target_email));
  if uid is null then return 'no_account'; end if;
  insert into public.app_admins (user_id) values (uid) on conflict do nothing;
  return 'added';
end $$;

create or replace function public.admin_remove_admin(target uuid)
returns text language plpgsql volatile security definer set search_path = public, auth as $$
begin
  if not public.is_app_admin() then raise exception 'not an admin'; end if;
  if target = auth.uid() then return 'cannot_remove_self'; end if;
  delete from public.app_admins where user_id = target;
  return 'removed';
end $$;

revoke all on function public.admin_list_admins() from public, anon;
revoke all on function public.admin_add_admin(text) from public, anon;
revoke all on function public.admin_remove_admin(uuid) from public, anon;
grant execute on function public.admin_list_admins() to authenticated;
grant execute on function public.admin_add_admin(text) to authenticated;
grant execute on function public.admin_remove_admin(uuid) to authenticated;
