-- ============================================================================
-- OpenRubric seed — "Bay Area AI Hacks 2026" demo hackathon.
-- Run AFTER schema.sql (Supabase SQL editor or `supabase db reset`). Mirrors
-- lib/demo-data.ts so a fresh project shows real, judgeable data. Idempotent:
-- safe to re-run (uses fixed UUIDs + ON CONFLICT).
-- ============================================================================

begin;

-- Hackathon
insert into hackathons (id, name, slug, website_url, devpost_url, rubric_text, start_time, submission_deadline, judging_deadline)
values ('11111111-1111-1111-1111-111111111111', 'Bay Area AI Hacks 2026', 'bay-area-ai-hacks-2026',
        'bayareaaihacks.org', 'bayareaaihacks.devpost.com',
        'Impact & Problem Quality (15), User Empathy (10), Technical Execution (20), Design & User Experience (12), Creativity & Originality (12), Pitch & Demo Clarity (10), Theme Alignment (6), Technical Understanding (15).',
        '2026-02-14T09:00:00-08:00', '2026-02-16T18:00:00-08:00', '2026-02-17T20:00:00-08:00')
on conflict (id) do nothing;

-- Tracks
insert into tracks (id, hackathon_id, name, description) values
  ('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Overall', 'Best project across the entire event.'),
  ('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Health AI', 'AI applied to health and care.'),
  ('22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Education', 'Tools that help people learn.'),
  ('22222222-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Developer Tools', 'Software that helps engineers.'),
  ('22222222-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Social Impact', 'Projects serving a community need.')
on conflict (id) do nothing;

-- Rubric criteria (canonical 100-point OpenRubric default)
insert into rubric_criteria (id, hackathon_id, name, description, max_points, weight, sort_order) values
  ('33333333-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Impact & Problem Quality', 'How real and important the problem is, and how meaningfully the project moves the needle on it.', 15, 1, 0),
  ('33333333-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'User Empathy', 'Evidence the team understands who they are building for and what those people actually need.', 10, 1, 1),
  ('33333333-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Technical Execution', 'Engineering depth and how much of the product actually works end to end.', 20, 1, 2),
  ('33333333-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Design & User Experience', 'Clarity, polish, and usability of the experience.', 12, 1, 3),
  ('33333333-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Creativity & Originality', 'Originality of the idea and the approach taken.', 12, 1, 4),
  ('33333333-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Pitch & Demo Clarity', 'Quality of the demo and how clearly the team''s story lands.', 10, 1, 5),
  ('33333333-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Theme Alignment', 'How well the project fits the hackathon''s theme and prompt.', 6, 1, 6),
  ('33333333-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Technical Understanding', 'How well the team understands and can explain what they actually built.', 15, 1, 7)
on conflict (id) do nothing;

-- Submissions
insert into submissions (id, hackathon_id, track_id, project_name, team_name, description, repo_url, devpost_url, live_url, demo_video_url, source, status) values
  ('44444444-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'Lighthouse', 'Team Beacon', 'A triage assistant for rural clinics that routes patient intake photos to the right specialist using an offline-first PWA.', 'github.com/team-beacon/lighthouse', 'devpost.com/software/lighthouse', 'lighthouse-demo.vercel.app', 'youtu.be/demo', 'devpost', 'finalized'),
  ('44444444-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002', 'MediScan', 'Team Vitals', 'Phone-camera skin-condition pre-screening with a referral hand-off to local dermatologists.', 'github.com/team-vitals/mediscan', 'devpost.com/software/mediscan', 'mediscan.app', 'youtu.be/demo2', 'devpost', 'in_progress'),
  ('44444444-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003', 'StudyForge', 'Team Forge', 'Turns lecture recordings into spaced-repetition decks and auto-graded practice problems.', 'github.com/team-forge/studyforge', 'devpost.com/software/studyforge', 'studyforge.io', 'youtu.be/demo3', 'devpost', 'in_progress'),
  ('44444444-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000005', 'CampusLoop', 'Team Loop', 'A mutual-aid board connecting students with surplus dining-hall meals to those who need them.', 'github.com/team-loop/campusloop', 'devpost.com/software/campusloop', 'campusloop.app', 'youtu.be/demo4', 'devpost', 'finalized'),
  ('44444444-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000004', 'CodePilot', 'Team Pilot', 'An IDE companion that explains unfamiliar codebases and drafts onboarding docs from the repo.', 'github.com/team-pilot/codepilot', 'devpost.com/software/codepilot', 'codepilot.dev', 'youtu.be/demo5', 'devpost', 'in_progress')
on conflict (id) do nothing;

-- Participants
insert into participants (submission_id, name, github_username) values
  ('44444444-0000-0000-0000-000000000001', 'Dana Okafor', 'danaok'),
  ('44444444-0000-0000-0000-000000000001', 'Liam Reyes', 'lreyes'),
  ('44444444-0000-0000-0000-000000000001', 'Sora Tan', 'soratan'),
  ('44444444-0000-0000-0000-000000000002', 'Noah Berg', 'noahb'),
  ('44444444-0000-0000-0000-000000000002', 'Ivy Chen', 'ivyc'),
  ('44444444-0000-0000-0000-000000000003', 'Mara Quill', 'maraq'),
  ('44444444-0000-0000-0000-000000000004', 'Priscilla Ade', 'pade'),
  ('44444444-0000-0000-0000-000000000005', 'Sam Ortiz', 'sortiz')
on conflict do nothing;

-- GitHub scans (review signals — never verdicts)
insert into github_scans (submission_id, repo_owner, repo_name, total_commits, pre_event_commits, post_deadline_commits, review_priority, summary) values
  ('44444444-0000-0000-0000-000000000001', 'team-beacon', 'lighthouse', 142, 0, 0, 'clean', 'All 142 commits fall inside the event window across 3 contributors. Nothing here needs review.'),
  ('44444444-0000-0000-0000-000000000002', 'team-vitals', 'mediscan', 96, 0, 6, 'needs', 'GitHub timeline shows 6 commits after the submission deadline. This does not prove a rule violation, but judges may want to ask what changed after submission.'),
  ('44444444-0000-0000-0000-000000000003', 'team-forge', 'studyforge', 88, 0, 0, 'light', 'Repo was created before the event but the first code commit lands inside the window. Likely a pre-created placeholder repo — a light review.'),
  ('44444444-0000-0000-0000-000000000004', 'team-loop', 'campusloop', 73, 0, 0, 'clean', 'Clean timeline. All activity is inside the event window.'),
  ('44444444-0000-0000-0000-000000000005', 'team-pilot', 'codepilot', 210, 38, 0, 'high', 'GitHub timeline shows 38 commits before the hackathon start. This does not prove a rule violation, but judges should ask which parts were built during the event before any award.')
on conflict do nothing;

-- AI summaries (a judge aid, never a score)
insert into ai_summaries (submission_id, summary, strengths_json, weaknesses_json, suggested_questions_json) values
  ('44444444-0000-0000-0000-000000000001', 'A triage assistant for rural clinics that routes patient intake photos to the right specialist.', '["The offline-first sync is genuinely robust — works with intermittent connectivity."]', '["How the model was evaluated for clinical safety is not documented in the repo."]', '["Which part was built during the hackathon?","What was the hardest technical challenge?"]'),
  ('44444444-0000-0000-0000-000000000005', 'An IDE companion that explains unfamiliar codebases and drafts onboarding docs from the repo.', '["The cited file references make answers trustworthy."]', '["Several commits predate the hackathon start — judges may want to ask which parts were built during the event."]', '["Which part was built during the hackathon?"]')
on conflict do nothing;

-- Open review cases (organizer queue)
insert into review_cases (submission_id, status, priority, reason) values
  ('44444444-0000-0000-0000-000000000005', 'open', 'high', '38 pre-event commits'),
  ('44444444-0000-0000-0000-000000000002', 'open', 'needs', '6 commits after deadline')
on conflict do nothing;

commit;
