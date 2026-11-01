-- Email Amber on every new sign-up. Run AFTER deploying the notify-signup Edge Function and setting its secrets.
-- Replace PASTE_THE_SAME_WEBHOOK_SECRET with the WEBHOOK_SECRET value you set on the function.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_signup()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://aaphstteuujdgmyiztet.supabase.co/functions/v1/notify-signup',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', 'PASTE_THE_SAME_WEBHOOK_SECRET'),
    body := jsonb_build_object('record', jsonb_build_object(
      'email', new.email, 'created_at', new.created_at,
      'raw_user_meta_data', new.raw_user_meta_data, 'raw_app_meta_data', new.raw_app_meta_data))
  );
  return new;
exception when others then
  return new;  -- never block a sign-up because the email failed
end $$;

drop trigger if exists on_auth_user_created_notify on auth.users;
create trigger on_auth_user_created_notify
  after insert on auth.users
  for each row execute function public.notify_signup();
