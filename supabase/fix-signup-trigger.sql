-- ============================================================================
-- FIX: "Database error saving new user" (HTTP 500) on every signup.
--
-- The handle_new_user trigger runs in the Supabase Auth context, where the
-- search_path does not include `public`, so `user_role` and `profiles` failed to
-- resolve and the whole signup transaction rolled back. Setting search_path and
-- schema-qualifying the type fixes it. Paste this into Supabase → SQL Editor → Run.
-- (Already folded into schema.sql for fresh installs.)
-- ============================================================================
create or replace function handle_new_user() returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'organizer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
