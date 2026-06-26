# OpenRubric — Complete Project Guide

> **One-line summary:** OpenRubric is a proprietary, rubric-first judging
> platform that makes hackathon judging fairer, more transparent, and fully auditable —
> with humans always making the final call. Free to run and evaluate for your own
> hackathon; not free to copy (see LICENSE).

This document is a single, exhaustive reference for understanding **what OpenRubric is,
where to find it, how it works end-to-end, and every capability it ships with.** It is
written so that Claude (or any new contributor) can read this one file and understand the
entire project.

---

## 📌 Quick links

| Resource | Link |
|---|---|
| **GitHub repository** | https://github.com/aaditmehtacoder/openrubric |
| **Live website** | https://openrubric.vercel.app |
| **Demo video** | https://openrubric.vercel.app/video (file: [`public/openrubricdemo.mp4`](public/openrubricdemo.mp4)) |
| **Documentation page** | https://openrubric.vercel.app/docs |
| **Pricing** | https://openrubric.vercel.app/pricing |
| **Support email** | openrubric@gmail.com |
| **License** | Proprietary — evaluation & hackathon-use only; no copying/redistribution (see LICENSE) |

---

## 1. What OpenRubric is

OpenRubric gives hackathon **organizers** a rubric-first judging workspace and gives
**judges** a clean, search-first scoring experience. The core loop is:

1. **Import** submissions from a public Devpost URL, a CSV file, or by hand.
2. **Score** every project against a shared, points-based rubric — each judge keeps an
   **independent** record, and the organizer aggregates the results.
3. **Review** each project's GitHub commit timeline for *signals* (pre-event commits,
   post-deadline activity, missing history) framed as **questions for a human**, never as
   accusations.
4. **Publish** per-track and overall winners — with any high-priority review cases
   resolved first.

### What OpenRubric is NOT

OpenRubric is deliberately **not** a cheating detector and **not** an "AI judge."

> **OpenRubric does not determine cheating or automatically penalize teams. It surfaces
> evidence for human organizers to review.**

- Every **score** is a human judgment.
- Every **award** is made by a person.
- Review signals are **evidence, not verdicts** — the closing line on every signal is,
  literally, *"this is a signal, not a verdict."*
- The system **never auto-deducts points** and the codebase actively **blocks accusatory
  language** (see [§7 GitHub review policy](#7-github-review--the-language-policy)).

### Why it exists

Hackathon judging is often opaque: rubrics live in spreadsheets, judges overwrite each
other, "did they build this during the event?" is a gut call, and winners are announced
with no audit trail. OpenRubric makes the whole process **transparent, consistent, and
exportable**, while keeping every decision in human hands.

---

## 2. The four roles & user flows

OpenRubric models a hackathon as four kinds of people:

### 👤 Organizer
Runs the event. They:
- Go through a **5-step setup wizard** at [`/organize`](https://openrubric.vercel.app/organize)
  (event details → tracks → rubric → judges → review).
- **Import** projects at [`/organizer/import`](https://openrubric.vercel.app/organizer/import)
  via Devpost URL, CSV, or a manual one-project form.
- Invite **judges** (by email) and assign them to **tracks**.
- Watch progress on the **organizer dashboard** at `/dashboard/organizer`.
- See **final rankings + winner guidance** at `/dashboard/organizer/rankings`.
- Resolve **review cases** before any blocked project can win.

### ⚖️ Judge
Scores projects. They:
- Get a **search-first dashboard** at `/dashboard/judge` — find any project fast.
- Open the **grading workspace** at `/judge/project/[id]` to score against the rubric.
- Each judge's scores **autosave** and stay **isolated** from other judges (enforced by a
  uniqueness constraint in the database — one row per judge+submission).
- See **review signals** and the **AI project summary** as context — never as a verdict.

### 🧑‍💻 Participant / Team
Submits and tracks a project. They:
- Submit at [`/submit`](https://openrubric.vercel.app/submit).
- Track their project at `/dashboard/team`.

### 🌐 Public / Visitor
- Landing page at [`/`](https://openrubric.vercel.app).
- Docs, pricing, contact, feedback, terms, and privacy pages.
- The **demo video** at [`/video`](https://openrubric.vercel.app/video).

---

## 3. End-to-end: how a hackathon runs on OpenRubric

```
  ORGANIZER                         OPENRUBRIC                         JUDGE
  ─────────                         ──────────                         ─────
  1. Create event  ───────────────▶ Hackathon + tracks + rubric saved
  2. Import projects ─────────────▶ Devpost / CSV / manual → submissions
                                     │
                                     ├─▶ AI summary generated (per project)
                                     └─▶ GitHub timeline scanned → review priority
  3. Invite judges ───────────────▶ Email invite ──────────────────▶ Accept invite
                                                                       │
                                                                       ▼
                                                          4. Score each project
                                                             against the rubric
                                                             (autosaves, isolated)
                                     │◀──────────────────────────────┘
  5. Review cases  ◀───────────────┤ High-priority signals block winners
     (resolve)                      │
  6. Publish winners ◀─────────────┘ Aggregated, ranked, per-track + overall
```

### Step by step

1. **Create the event.** The organizer wizard collects event details, defines **tracks**
   (e.g. "AI", "Climate"), and builds a **points-based rubric** of criteria (each criterion
   has a max score). Scoring is an **unweighted sum** of per-criterion points; the schema
   keeps a `weight` column reserved for future weighting, but it is not applied today.
   Sensible defaults ship in code: `DEFAULT_CRITERIA`, `DEFAULT_TRACK_NAMES`.

2. **Import submissions.** Three paths, all importing **public metadata only**:
   - **Devpost URL** — `POST /api/import/devpost` scrapes only public project metadata.
   - **CSV** — columns: `project_name, team_name, participant_names, repo_url, devpost_url,
     demo_url, live_url, track, description`.
   - **Manual** — a single-project form (`ManualSubmissionForm` → `/api/submissions/import`).
   - Shared import/enrichment logic lives in [`lib/import-pipeline.ts`](lib/import-pipeline.ts),
     reused by both the UI routes and the auto-poll cron.

3. **Auto-enrichment.** When a project is imported, OpenRubric can:
   - Generate a short **AI summary** of the write-up (`/api/ai/summary`).
   - Run a **GitHub timeline scan** (`/api/github/scan`) → a review priority.

4. **Invite & accept judges.** `/api/judges/invite` emails an invite; `/api/judges/accept`
   onboards them; `/api/judges/track` assigns tracks.

5. **Score.** Judges open the grading workspace, score each criterion, and the scores
   **autosave** (`/api/scores/autosave`) and submit (`/api/scores/submit`). Each judge's
   record is independent.

6. **Aggregate & rank.** `lib/scoring.ts` computes totals, averages across judges, ranks
   projects, and derives per-track and overall winners.

7. **Resolve review cases.** Any project with an unresolved **high-priority** review case
   is **blocked from winning** until an organizer resolves it
   (`/api/review-cases/[id]/resolve`).

8. **Publish.** Rankings page shows final standings with winner guidance; results are
   exportable.

---

## 4. Feature catalog (everything it does)

- **Rubric-first judging** — shared, points-based criteria; consistent scoring across judges.
- **Independent judge records** — judges never overwrite each other; organizer aggregates.
- **Multi-source import** — Devpost URL, CSV upload, manual entry.
- **Automatic Devpost polling** — a cron (`/api/cron/poll-devpost`) pulls new submissions
  on a schedule (deadline-gated, see [`vercel.json`](vercel.json)).
- **GitHub timeline review** — derives **review signals** from real commit history.
- **AI project summaries** — concise, neutral summaries of project write-ups.
- **AI rubric-from-image** — upload a photo of a rubric and AI drafts the criteria
  (`/api/ai/rubric-from-image`).
- **Tracks** — score and award winners per track plus an overall winner.
- **Winner blocking** — high-priority unresolved review cases can't win until resolved.
- **Realtime presence** — "also viewing" indicators per submission (via Supabase Realtime).
- **Search-first judge dashboard** — fast lookup across all projects.
- **Rankings + charts + export** — leaderboards with Recharts visualizations.
- **Email** — judge invites, verification, and feedback via Gmail SMTP (nodemailer).
- **Auth** — Supabase Auth with email verification; role-aware profiles.
- **Light + dark themes** — no-flash toggle; editorial typography.
- **Marketing & legal pages** — landing, docs, pricing, contact, feedback, terms, privacy.
- **Health endpoint** — `GET /api/health` reports integration + schema readiness.
- **Runs on your own infrastructure** — every integration is optional and degrades gracefully.

---

## 5. Architecture & tech stack

| Layer | Choice |
|---|---|
| **Framework** | Next.js 15 (App Router) + React 18 + TypeScript |
| **Styling** | Tailwind CSS + a small shadcn-style component set |
| **Data / auth** | Supabase (Postgres + Auth + Realtime) |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Motion** | Framer Motion (subtle polish only) |
| **Icons** | Lucide (used sparingly) |
| **Email** | Nodemailer (Gmail SMTP) |
| **AI** | OpenAI-compatible `/chat/completions` provider (default: GitHub Models `gpt-4o-mini`) |
| **Integrations** | GitHub REST API · AI provider · Devpost / CSV import |
| **Hosting** | Vercel (edge/SSG for marketing, serverless API routes) |

**Typography:** Newsreader (editorial serif headlines) · Geist (UI) · Geist Mono (labels,
metadata, scores). Light + dark themes driven by ~14 CSS variables in
[`tailwind.config.ts`](tailwind.config.ts) and `app/globals.css`. Full design spec lives in
`design-reference/HANDOFF.md`.

### Project structure

```
app/                 # App Router routes (marketing, auth, organizer, judge, api)
components/
  marketing/         # Landing-page sections + demo video player
  app/               # Shell, sidebar, auth, grading store
  organizer/         # Dashboard, setup wizard, import
  judge/             # Search dashboard + project cards
  grading/           # The judge grading workspace
  rankings/          # Leaderboards + chart + export
  ui/                # Reusable primitives (button, badge, logo, …)
lib/                 # scoring, github, ai, supabase, import-pipeline, validators, types …
supabase/schema.sql  # Postgres schema + Row Level Security
design-reference/    # Original HTML prototypes + full design handoff
public/              # Logos, icon, and the demo video (openrubricdemo.mp4)
```

### Key library files

| File | Responsibility |
|---|---|
| [`lib/scoring.ts`](lib/scoring.ts) | Rubric math, judge status, ranking, track/overall winners, review-case blocking |
| [`lib/github.ts`](lib/github.ts) | Repo URL parsing, timeline scan, **review-priority derivation**, forbidden-language guard |
| [`lib/ai.ts`](lib/ai.ts) | AI summaries via OpenAI-compatible provider; safe fallback summaries |
| [`lib/import-pipeline.ts`](lib/import-pipeline.ts) | Shared Devpost/CSV/manual import + enrichment |
| [`lib/supabase.ts`](lib/supabase.ts) | Supabase client wiring |
| [`lib/rate-limit.ts`](lib/rate-limit.ts) | In-memory rate limiting for GitHub/AI/import routes |
| [`lib/validators.ts`](lib/validators.ts) | Zod schemas for inputs |
| [`lib/mailer.ts`](lib/mailer.ts) | Email (invites, verification, feedback) |
| [`middleware.ts`](middleware.ts) | Keeps the Supabase session fresh |

---

## 6. How scoring works (the math)

Defined in [`lib/scoring.ts`](lib/scoring.ts):

- **`rubricMax(criteria)`** — the maximum total score for the rubric.
- **`totalScore(scores, criteria)`** — a judge's total for one project (sum of per-criterion scores; unweighted).
- **`isComplete` / `judgeStatus`** — whether a judge has finished a project.
- **`averageScore(values)`** — aggregates multiple judges' scores per project.
- **`rankProjects(projects, reviewCases)`** — ranks all projects, taking review-case
  blocking into account.
- **`trackWinners(...)`** and **`suggestedOverallWinner(...)`** — derive per-track winners
  and an overall recommendation.
- **`isBlockedByReview(submissionId, reviewCases)`** — true when an unresolved
  high-priority case prevents a win.

Each judge's scores are stored as a separate row keyed by judge + submission, so judges
stay **isolated** and the organizer sees the aggregate.

---

## 7. GitHub review — the language policy

OpenRubric scans a project's **public** GitHub repo and maps raw commit metrics to a single
**review priority** (in [`lib/github.ts`](lib/github.ts), `deriveReviewPriority`):

| Priority | Meaning | Example trigger |
|---|---|---|
| `clean` | Clean timeline | Normal in-event commit history |
| `light` | Light review | 1–20 pre-event commits |
| `needs` | Needs review | No commit history, or post-deadline activity |
| `high` | High priority | More than 20 pre-event commits |

Every signal is framed as a **question for a human**, e.g.:

> "GitHub timeline shows 9 commits before the hackathon start. This does not prove a rule
> violation, but judges may want to ask which parts were built during the event."

The system **enforces neutral language at the code level**: `FORBIDDEN_LANGUAGE`
(`cheater`, `fraud`, `guilty`, `stolen`, `plagiarized`, `caught`) is blocked by
`assertSafeLanguage()`. A project with an unresolved **high-priority** case **cannot be
marked a winner** until an organizer resolves it.

### Devpost import limitations

Devpost has **no stable public judging API**. OpenRubric imports **only public project
metadata** and **never bypasses authentication or scrapes private data**. If an automatic
import fails, the UI degrades gracefully:

> "Couldn't import automatically. Upload CSV or paste project links manually."

---

## 8. AI summaries

[`lib/ai.ts`](lib/ai.ts) generates concise, neutral project summaries:

- **Default provider:** GitHub Models free tier — `gpt-4o-mini` via
  `https://models.inference.ai.azure.com` (needs a GitHub token with the `models`
  permission).
- **Any OpenAI-compatible provider works** — set `OPENAI_API_KEY`, optionally override
  `OPENAI_BASE_URL`, and pick a model with `AI_MODEL` (works with OpenAI, Azure OpenAI,
  Together, Groq, local Ollama, etc.).
- **Rate-limit aware:** the free tier is limited (~15 req/min, ~150/day). `generateSummary`
  retries on `429`, then **degrades to a clean short summary** (`cleanSummary`) derived from
  the write-up — never a raw dump.
- **Vision:** `gpt-4o-mini` is vision-capable, powering **AI rubric-from-image**.

> AI is **context for judges**, never a scorer or a verdict.

---

## 9. API reference

All routes work against live Supabase data when configured. Selected endpoints:

```
# Hackathons
POST /api/hackathons                  GET  /api/hackathons/[id]

# Import
POST /api/import/devpost              POST /api/submissions/import
POST /api/cron/poll-devpost          (scheduled Devpost auto-poll)

# Submissions
POST /api/submissions                 GET  /api/submissions/search
GET  /api/submissions/[id]            POST /api/submissions/[id]/process
POST /api/submissions/[id]/rescan

# Scoring
POST /api/scores/autosave             POST /api/scores/submit
GET  /api/rankings/[hackathonId]

# GitHub review
POST /api/github/scan                 GET  /api/github/scan/[submissionId]

# AI
POST /api/ai/summary                  POST /api/ai/rubric-from-image

# Review cases
POST /api/review-cases/[id]/resolve

# Judges
POST /api/judges/invite               POST /api/judges/accept
POST /api/judges/track

# Auth & profile
POST /api/auth/register               POST /api/auth/send-verification
POST /api/auth/verify                 POST /api/auth/verify-code
GET/POST /api/profile                 POST /api/profile/avatar

# Misc
POST /api/feedback                    POST /api/comments
POST /api/upload/logo                 POST /api/validate-url
GET  /api/health
```

---

## 10. Running & self-hosting

### Quickstart

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Scripts

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

Node version: **22.x** (see `.nvmrc` / `package.json` engines).

### Environment variables

Copy the template and fill in only what you need — **every variable is optional**, and each
unlocks one capability:

```bash
cp .env.example .env.local
```

| Variable | Enables |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth, database, realtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side imports & aggregation (never sent to the browser) |
| `GITHUB_TOKEN` | Live GitHub timeline scans (read-only PAT; no scopes for public repos) |
| `GITHUB_API_MODEL_KEY` / `OPENAI_API_KEY` + `OPENAI_BASE_URL` + `AI_MODEL` | AI summaries |
| Gmail SMTP credentials | Email invites / verification / feedback |
| `APIFY_TOKEN` | Devpost import helper |
| `CRON_SECRET` | Protects the scheduled Devpost poll in production |
| `NEXT_PUBLIC_APP_URL` | Correct absolute URLs / OG metadata |
| `NEXT_PUBLIC_GITHUB_URL` | Override the repo link in the UI |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Override the support email |

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) — it creates every
   table, the `judge_scores` uniqueness constraint (keeps judges isolated), starter Row
   Level Security policies, and an `auth.users → profiles` trigger so each sign-up gets a
   profile with its role.
3. Put the project URL + anon key in `.env.local`. The app detects them automatically;
   `middleware.ts` keeps the session fresh and the auth forms use real Supabase Auth.

> **Incremental migrations (existing deployments).** A fresh `schema.sql` already
> includes every table. If you provisioned the database before a feature shipped, run
> the matching migration in the Supabase SQL editor — DDL can't run through the
> service-role key, so each is a manual, idempotent (safe to re-run) step:
>
> | Migration | Adds | Feature |
> |---|---|---|
> | [`supabase/add-score-requests.sql`](supabase/add-score-requests.sql) | `hackathon_collaborators`, `score_requests`, `hackathons.score_visibility` | "See your score" request/approval flow + per-hackathon co-owners |
> | [`supabase/add-github-readme.sql`](supabase/add-github-readme.sql) | `github_scans.readme_md` | Caches fetched READMEs (display works without it) |
>
> Each feature degrades gracefully until its migration is applied (score requests just
> acknowledge without persisting; ownership falls back to `hackathons.created_by`).

### Scaling to ~250 participants

- **Use the pooled connection** (Supavisor, port `6543`, transaction mode) to avoid
  connection exhaustion under concurrent scoring.
- **Indexes + RLS are already in `schema.sql`** — the hot path (one judge scoring one
  project) is a single indexed upsert.
- **Rate limiting** ([`lib/rate-limit.ts`](lib/rate-limit.ts)) protects external APIs; swap
  the in-memory Map for Upstash Redis / Vercel KV for multi-instance deploys.
- **Supabase Pro** raises connection + Realtime limits for headroom during a live event.
- Deploy on **Vercel** so static/SSG pages serve from the edge automatically.

---

## 11. Ethics & design principles

OpenRubric is built to make judging **more transparent and fairer**, not to automate
accusations:

- **Human final decisions.** No score and no award is made by software.
- **Evidence, not verdicts.** Review signals surface questions; humans decide.
- **No accusatory language.** Forbidden words are blocked in code.
- **No auto-penalties.** The system never deducts points on its own.
- **Public data only.** It never bypasses authentication or scrapes private data.
- **Transparent & exportable.** Results can be inspected and exported.
- **Self-hostable for evaluation.** Proprietary license; runs on your own infrastructure.

> **OpenRubric does not determine cheating or automatically penalize teams. It surfaces
> evidence for human organizers to review. Self-hostable. Transparent. Exportable. Human
> final decisions.**

---

## 12. License & credits

**Proprietary** — see [`LICENSE`](LICENSE). You may install and run OpenRubric to evaluate it
and to operate or participate in a hackathon. Copying, redistribution, modification, and
building a competing product are **not** permitted. All rights reserved by the author.

- **Repository:** https://github.com/aaditmehtacoder/openrubric
- **Live site:** https://openrubric.vercel.app
- **Demo video:** https://openrubric.vercel.app/video
- **Contact:** openrubric@gmail.com
