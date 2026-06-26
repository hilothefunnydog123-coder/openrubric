-- ============================================================================
-- OpenRubric — Supabase schema
--
-- Run this in the Supabase SQL editor (or `supabase db push`). It mirrors the
-- TypeScript types in lib/types.ts one-to-one. The pivotal constraint is the
-- UNIQUE on judge_scores (submission_id, judge_id, criterion_id): each judge keeps
-- an independent record and can never overwrite another judge. Organizers aggregate.
--
-- RLS is enabled on every table; policies are included at the bottom.
--
-- ── SECURITY MODEL (ALPHA) ──────────────────────────────────────────────────
-- This schema is production-LEVEL but the platform is in ALPHA. The trust model
-- below is deliberate; understand it before opening signups to the public:
--
--  * All privileged writes (imports, scoring autosave, aggregation, invitations,
--    feedback, profile edits) run server-side with the SERVICE-ROLE key, which
--    BYPASSES RLS. The browser only ever needs to: read its own profile, read its
--    own invitations, and read shared judging context (see read_authenticated).
--  * `anon` has NO policies anywhere → unauthenticated clients can read/write
--    nothing directly. Good.
--  * Several tables (judge_assignments, presentation_scores, judge_comments,
--    review_cases, feedback) have RLS ON with NO policy on purpose: they are
--    service-role-only. Deny-by-default is the safest posture and the app does
--    not touch them from the browser.
--  * judge_scores: a judge can read/write ONLY their own rows (own_scores_*).
--  * profiles: anyone authenticated can READ a profile; nobody can UPDATE a
--    profile from the client (role changes etc. go through the service role).
--    This closes a privilege-escalation path (self-promoting to organizer).
--
--  KNOWN ALPHA LIMITATION (tighten for multi-tenant production): the
--  `read_authenticated` policy lets ANY signed-in user read ALL hackathons'
--  submissions, participants (incl. email/github), scans, and AI summaries —
--  not just events they belong to. Fine for a single trusted event / invited
--  judges; for public multi-tenant use, scope these reads to a membership table
--  (e.g. judge_assignments / created_by) before launch.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('organizer', 'judge', 'participant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum ('imported', 'not_scored', 'in_progress', 'finalized');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_priority as enum ('clean', 'light', 'needs', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_status as enum ('open', 'resolved');
exception when duplicate_object then null; end $$;

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        user_role not null default 'organizer',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ── hackathons ──────────────────────────────────────────────────────────────
create table if not exists hackathons (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique not null,
  website_url         text,
  devpost_url         text,
  logo_url            text,
  rules_text          text,
  rubric_text         text,
  start_time          timestamptz,
  submission_deadline timestamptz,
  judging_deadline    timestamptz,
  timezone            text,
  judges_per_project  integer not null default 1,
  created_by          uuid references profiles (id) on delete set null,
  created_at          timestamptz not null default now()
);

-- ── tracks ──────────────────────────────────────────────────────────────────
create table if not exists tracks (
  id            uuid primary key default gen_random_uuid(),
  hackathon_id  uuid not null references hackathons (id) on delete cascade,
  name          text not null,
  description   text
);
create index if not exists tracks_hackathon_idx on tracks (hackathon_id);

-- ── submissions ─────────────────────────────────────────────────────────────
create table if not exists submissions (
  id              uuid primary key default gen_random_uuid(),
  hackathon_id    uuid not null references hackathons (id) on delete cascade,
  track_id        uuid references tracks (id) on delete set null,
  project_name    text not null,
  team_name       text not null default '',
  description     text not null default '',
  repo_url        text,
  devpost_url     text,
  live_url        text,
  demo_video_url  text,
  source_url      text,
  source          text not null default 'manual',
  status          submission_status not null default 'imported',
  screenshots_json  jsonb not null default '[]',
  built_with_json   jsonb not null default '[]',
  created_at      timestamptz not null default now()
);
create index if not exists submissions_hackathon_idx on submissions (hackathon_id);
create index if not exists submissions_track_idx on submissions (track_id);

-- ── participants ────────────────────────────────────────────────────────────
create table if not exists participants (
  id                   uuid primary key default gen_random_uuid(),
  submission_id        uuid not null references submissions (id) on delete cascade,
  name                 text not null,
  email                text,
  github_username      text,
  devpost_profile_url  text
);
create index if not exists participants_submission_idx on participants (submission_id);

-- ── rubric_criteria ─────────────────────────────────────────────────────────
create table if not exists rubric_criteria (
  id            uuid primary key default gen_random_uuid(),
  hackathon_id  uuid not null references hackathons (id) on delete cascade,
  name          text not null,
  description   text not null default '',
  max_points    integer not null check (max_points > 0),
  weight        numeric not null default 1,
  sort_order    integer not null default 0
);
create index if not exists rubric_criteria_hackathon_idx on rubric_criteria (hackathon_id);

-- ── judge_assignments ───────────────────────────────────────────────────────
create table if not exists judge_assignments (
  id            uuid primary key default gen_random_uuid(),
  hackathon_id  uuid not null references hackathons (id) on delete cascade,
  judge_id      uuid not null references profiles (id) on delete cascade,
  submission_id uuid not null references submissions (id) on delete cascade,
  track_id      uuid references tracks (id) on delete set null,
  status        submission_status not null default 'not_scored',
  unique (judge_id, submission_id)
);
create index if not exists judge_assignments_judge_idx on judge_assignments (judge_id);

-- ── judge_scores ────────────────────────────────────────────────────────────
-- One row per (submission, judge, criterion). The UNIQUE keeps judges isolated.
create table if not exists judge_scores (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  judge_id      uuid not null references profiles (id) on delete cascade,
  criterion_id  uuid not null references rubric_criteria (id) on delete cascade,
  score         numeric not null default 0 check (score >= 0),
  comment       text,
  is_final      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (submission_id, judge_id, criterion_id)
);
create index if not exists judge_scores_submission_idx on judge_scores (submission_id);
create index if not exists judge_scores_judge_idx on judge_scores (judge_id);

-- ── presentation_scores ─────────────────────────────────────────────────────
create table if not exists presentation_scores (
  id                     uuid primary key default gen_random_uuid(),
  submission_id          uuid not null references submissions (id) on delete cascade,
  judge_id               uuid not null references profiles (id) on delete cascade,
  clarity                integer not null default 0,
  demo_quality           integer not null default 0,
  technical_explanation  integer not null default 0,
  answers                integer not null default 0,
  confidence             integer not null default 0,
  notes                  text,
  updated_at             timestamptz not null default now(),
  unique (submission_id, judge_id)
);

-- ── judge_comments ──────────────────────────────────────────────────────────
create table if not exists judge_comments (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  judge_id      uuid not null references profiles (id) on delete cascade,
  comment       text not null,
  visibility    text not null default 'organizer',
  created_at    timestamptz not null default now()
);

-- ── github_scans ────────────────────────────────────────────────────────────
create table if not exists github_scans (
  id                    uuid primary key default gen_random_uuid(),
  submission_id         uuid not null references submissions (id) on delete cascade,
  repo_owner            text,
  repo_name             text,
  repo_created_at       timestamptz,
  first_commit_at       timestamptz,
  last_commit_at        timestamptz,
  total_commits         integer not null default 0,
  pre_event_commits     integer not null default 0,
  post_deadline_commits integer not null default 0,
  contributors_json     jsonb not null default '[]',
  timeline_json         jsonb not null default '[]',
  flags_json            jsonb not null default '[]',
  languages_json        jsonb not null default '[]',
  review_priority       review_priority not null default 'clean',
  summary               text,
  readme_md             text,
  created_at            timestamptz not null default now()
);
create index if not exists github_scans_submission_idx on github_scans (submission_id);

-- ── ai_summaries ────────────────────────────────────────────────────────────
create table if not exists ai_summaries (
  id                       uuid primary key default gen_random_uuid(),
  submission_id            uuid not null references submissions (id) on delete cascade,
  summary                  text not null default '',
  what                     text,
  who                      text,
  how                      text,
  tech_json                jsonb not null default '[]',
  strengths_json           jsonb not null default '[]',
  weaknesses_json          jsonb not null default '[]',
  suggested_questions_json jsonb not null default '[]',
  created_at               timestamptz not null default now()
);

-- ── review_cases ────────────────────────────────────────────────────────────
create table if not exists review_cases (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid not null references submissions (id) on delete cascade,
  status          review_status not null default 'open',
  priority        review_priority not null default 'needs',
  reason          text not null default '',
  organizer_notes text,
  final_decision  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists review_cases_submission_idx on review_cases (submission_id);

-- ── column backfill (idempotent) ─────────────────────────────────────────────
-- Folds every post-initial migration into this one file. `create table if not
-- exists` above does NOT add columns to a table that already exists, so these
-- `add column if not exists` statements bring an OLDER database fully up to date.
-- Re-running schema.sql is always safe and leaves any database in the final shape.
alter table hackathons   add column if not exists logo_url            text;
alter table hackathons   add column if not exists timezone            text;
alter table hackathons   add column if not exists judges_per_project  integer not null default 1;
alter table hackathons   add column if not exists score_visibility    text not null default 'none';
alter table submissions  add column if not exists screenshots_json  jsonb not null default '[]';
alter table submissions  add column if not exists built_with_json   jsonb not null default '[]';
alter table github_scans add column if not exists languages_json    jsonb not null default '[]';
alter table github_scans add column if not exists readme_md         text;
alter table ai_summaries add column if not exists what              text;
alter table ai_summaries add column if not exists who               text;
alter table ai_summaries add column if not exists how               text;
alter table ai_summaries add column if not exists tech_json         jsonb not null default '[]';

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists judge_scores_updated_at on judge_scores;
create trigger judge_scores_updated_at before update on judge_scores
  for each row execute function set_updated_at();

drop trigger if exists review_cases_updated_at on review_cases;
create trigger review_cases_updated_at before update on review_cases
  for each row execute function set_updated_at();

-- presentation_scores is upserted on every autosave; keep updated_at honest.
drop trigger if exists presentation_scores_updated_at on presentation_scores;
create trigger presentation_scores_updated_at before update on presentation_scores
  for each row execute function set_updated_at();

-- ============================================================================
-- Row Level Security — starter policies. Adjust to your trust model.
-- ============================================================================
alter table profiles            enable row level security;
alter table hackathons          enable row level security;
alter table tracks              enable row level security;
alter table submissions         enable row level security;
alter table participants        enable row level security;
alter table rubric_criteria     enable row level security;
alter table judge_assignments   enable row level security;
alter table judge_scores        enable row level security;
alter table presentation_scores enable row level security;
alter table judge_comments      enable row level security;
alter table github_scans        enable row level security;
alter table ai_summaries        enable row level security;
alter table review_cases        enable row level security;

-- Authenticated users can read shared judging context.
do $$
declare t text;
begin
  foreach t in array array['hackathons','tracks','submissions','participants','rubric_criteria','github_scans','ai_summaries'] loop
    execute format('drop policy if exists "read_authenticated" on %I;', t);
    execute format('create policy "read_authenticated" on %I for select to authenticated using (true);', t);
  end loop;
end $$;

-- A judge may read/write only their OWN scores.
drop policy if exists "own_scores_select" on judge_scores;
create policy "own_scores_select" on judge_scores for select to authenticated using (judge_id = auth.uid());

drop policy if exists "own_scores_write" on judge_scores;
create policy "own_scores_write" on judge_scores for all to authenticated
  using (judge_id = auth.uid()) with check (judge_id = auth.uid());

-- Everyone authenticated can read a profile.
drop policy if exists "profiles_read" on profiles;
create policy "profiles_read" on profiles for select to authenticated using (true);

-- No client-side profile UPDATE policy ON PURPOSE. All profile edits (name,
-- avatar, role) go through the service-role key server-side. A self-update policy
-- here would let any signed-in user run `update profiles set role='organizer'`
-- from the browser and escalate to organizer — so we drop it and deny by default.
drop policy if exists "profiles_self" on profiles;
-- Belt-and-suspenders: even if a permissive UPDATE policy is re-added later, the
-- role column can never be changed by a normal client.
revoke update (role) on profiles from authenticated, anon;

-- ============================================================================
-- Auth → profile bridge. Every new Supabase user gets a profile row, pulling
-- full_name + role from the sign-up metadata set by the OpenRubric auth form.
-- ============================================================================
-- security definer + an explicit search_path so the public.user_role type and
-- public.profiles table resolve when the trigger runs in the Auth context.
-- Without these, signups fail with "Database error saving new user" (HTTP 500).
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
    -- Validate the role before casting: an unexpected value would otherwise raise
    -- and surface to the user as "Database error saving new user" (HTTP 500).
    case
      when new.raw_user_meta_data ->> 'role' in ('organizer', 'judge', 'participant')
        then (new.raw_user_meta_data ->> 'role')::public.user_role
      else 'organizer'::public.user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- invitations — organizer invites a judge by email. The accept link carries a
-- token; signing up with the invited email assigns the judge role + assignments.
-- ============================================================================
create table if not exists invitations (
  id            uuid primary key default gen_random_uuid(),
  hackathon_id  uuid references hackathons (id) on delete cascade,
  email         text not null,
  role          user_role not null default 'judge',
  token         text unique not null,
  tracks        text[] not null default '{}',
  status        text not null default 'pending', -- pending | accepted
  invited_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz
);
create index if not exists invitations_email_idx on invitations (lower(email));
create index if not exists invitations_token_idx on invitations (token);

alter table invitations enable row level security;
-- Organizers manage invitations they created; the accept flow runs via the
-- service-role key on the server (which bypasses RLS), so no public policy is needed.
drop policy if exists "own_invitations" on invitations;
create policy "own_invitations" on invitations for all to authenticated
  using (invited_by = auth.uid()) with check (invited_by = auth.uid());

-- ============================================================================
-- feedback — feature requests / bug reports / contact notes from the public
-- feedback form. Written via the service-role key on the server, so no public
-- policy is needed (RLS stays on, denying anon/auth direct access).
-- ============================================================================
create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'feature', -- feature | bug | other
  message     text not null,
  email       text,
  name        text,
  user_id     uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists feedback_created_idx on feedback (created_at desc);

alter table feedback enable row level security;

-- ============================================================================
-- hackathon_collaborators — per-hackathon ownership. The creator is 'owner';
-- accepted co-organizers become 'co_owner'. Lets "owner AND co-owners approve"
-- be answerable. Service-role only (RLS on, no policy → deny by default).
-- ============================================================================
create table if not exists hackathon_collaborators (
  id            uuid primary key default gen_random_uuid(),
  hackathon_id  uuid not null references hackathons (id) on delete cascade,
  user_id       uuid not null references profiles (id) on delete cascade,
  role          text not null default 'co_owner' check (role in ('owner', 'co_owner')),
  created_at    timestamptz not null default now(),
  unique (hackathon_id, user_id)
);
create index if not exists hackathon_collaborators_hackathon_idx on hackathon_collaborators (hackathon_id);
create index if not exists hackathon_collaborators_user_idx on hackathon_collaborators (user_id);

alter table hackathon_collaborators enable row level security;

-- ============================================================================
-- score_requests — a participant's request to see their own project's score.
-- An owner approves/denies and sets detail_level (how much to reveal). Written
-- via the service-role key; RLS on, no policy → deny by default.
-- ============================================================================
create table if not exists score_requests (
  id              uuid primary key default gen_random_uuid(),
  hackathon_id    uuid not null references hackathons (id) on delete cascade,
  submission_id   uuid not null references submissions (id) on delete cascade,
  requester_id    uuid references profiles (id) on delete set null,
  requester_email text not null,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  detail_level    text check (detail_level in ('score_only', 'score_rubric', 'score_rubric_feedback')),
  decided_by      uuid references profiles (id) on delete set null,
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (submission_id, requester_email)
);
create index if not exists score_requests_hackathon_idx on score_requests (hackathon_id);
create index if not exists score_requests_status_idx on score_requests (status);

drop trigger if exists score_requests_updated_at on score_requests;
create trigger score_requests_updated_at before update on score_requests
  for each row execute function set_updated_at();

alter table score_requests enable row level security;
