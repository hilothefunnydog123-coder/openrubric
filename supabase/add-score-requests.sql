-- ============================================================================
-- Migration: score-request approval flow + per-hackathon ownership link.
--
-- Run this in the Supabase SQL editor. DDL cannot run through the service-role
-- key, so this is a manual step (same as add-github-readme.sql). Idempotent —
-- safe to re-run. The app degrades gracefully until this is applied: score
-- requests just acknowledge without persisting, and ownership falls back to the
-- hackathon's created_by.
-- ============================================================================

-- Per-hackathon ownership. The creator is 'owner'; accepted co-organizers become
-- 'co_owner'. This is what lets "owner AND co-owners can approve" be answerable.
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

-- A participant's request to see their own project's score. An owner approves or
-- denies and chooses how much detail to reveal (detail_level, set at decision).
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

-- Per-hackathon default for how much score detail is shared once a request is
-- approved. 'none' means approval still gates and nothing is revealed by default.
alter table hackathons add column if not exists score_visibility text not null default 'none';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'hackathons_score_visibility_chk') then
    alter table hackathons add constraint hackathons_score_visibility_chk
      check (score_visibility in ('none', 'score_only', 'score_rubric', 'score_rubric_feedback'));
  end if;
end $$;

-- keep score_requests.updated_at honest (set_updated_at() is defined in schema.sql)
drop trigger if exists score_requests_updated_at on score_requests;
create trigger score_requests_updated_at before update on score_requests
  for each row execute function set_updated_at();

-- RLS on, no policy → service-role only (deny-by-default), matching judge_assignments / feedback.
alter table hackathon_collaborators enable row level security;
alter table score_requests          enable row level security;
