-- ============================================================================
-- OpenRubric — store the hackathon's timezone so commit times show in local time.
--
-- GitHub commit timestamps are stored in UTC. The organizer picks the event's IANA
-- timezone (e.g. "America/Los_Angeles") during setup, and the judging view renders
-- every commit time in that zone. Safe to run multiple times.
-- ============================================================================
alter table hackathons add column if not exists timezone text;
