-- Custom Drip Chennai — tell sign-up when an email already has an account
-- Run in the Supabase SQL Editor AFTER 0012_print_placements.sql.
--
-- Sign-up asks this first, so someone who already signed up (with a password or Google) is
-- told to sign in or use Forgot password instead of being sent a code. An email that
-- started sign-up but never entered its code doesn't count, so they can simply start again.
-- Only the server (service role) may call it.

create or replace function public.email_has_account(p_email text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(trim(p_email))
      and email_confirmed_at is not null
  );
$$;

revoke all on function public.email_has_account(text) from public, anon, authenticated;
grant execute on function public.email_has_account(text) to service_role;

notify pgrst, 'reload schema';
