-- ============================================================================
-- OpenRubric — how many judges score each project (their scores are averaged into
-- the final score). Default 1. Safe to run multiple times. Run in the Supabase SQL editor.
-- (Already folded into schema.sql for fresh installs.)
-- ============================================================================
alter table hackathons add column if not exists judges_per_project integer not null default 1;
