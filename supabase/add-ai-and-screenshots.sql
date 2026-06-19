-- ============================================================================
-- OpenRubric — add descriptive AI fields + project screenshots.
-- Safe to run multiple times (IF NOT EXISTS). Run in the Supabase SQL editor.
-- ============================================================================

-- The AI summary now keeps the full breakdown a judge sees:
-- what it does / who it helps / how it works / tech stack.
alter table ai_summaries add column if not exists what      text;
alter table ai_summaries add column if not exists who       text;
alter table ai_summaries add column if not exists how       text;
alter table ai_summaries add column if not exists tech_json jsonb not null default '[]';

-- Screenshots scraped from the public Devpost gallery (array of image URLs).
alter table submissions add column if not exists screenshots_json jsonb not null default '[]';

-- Devpost "Built With" tech tags — the real stack (used for tech-stack logos).
alter table submissions add column if not exists built_with_json jsonb not null default '[]';

-- GitHub language breakdown for the repo: [{ name, pct }].
alter table github_scans add column if not exists languages_json jsonb not null default '[]';
