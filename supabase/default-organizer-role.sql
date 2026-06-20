-- ============================================================================
-- OpenRubric — make ORGANIZER the default role for self-serve signups.
--
-- Anyone who signs up / signs in on their own (email or Google/GitHub OAuth) should
-- become an ORGANIZER and get the "create a hackathon" flow. Judges only ever arrive
-- through an invite link — the invite-accept route explicitly pins their role to
-- 'judge', so this default never makes an invited judge an organizer.
--
-- Safe to run multiple times. Paste into Supabase → SQL Editor → Run.
-- ============================================================================

-- 1) New profiles default to organizer at the column level.
alter table public.profiles alter column role set default 'organizer';

-- 2) The signup trigger fills role from signup metadata, else organizer (was 'judge').
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
