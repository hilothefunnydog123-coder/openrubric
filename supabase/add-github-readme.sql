-- ============================================================================
-- OpenRubric — store the repo's GitHub README so judges see the real README
-- text in the grading view (and the AI summary can actually read it).
-- Safe to run multiple times. Paste into Supabase → SQL Editor → Run.
-- (Already folded into schema.sql for fresh installs.)
-- ============================================================================
alter table github_scans add column if not exists readme_md text;
