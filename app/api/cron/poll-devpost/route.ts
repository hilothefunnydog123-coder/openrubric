import { NextResponse } from "next/server";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { scrapeDevpost } from "@/lib/devpost";
import { importDevpostProjects, enrichSubmission } from "@/lib/import-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;
// Always run live — never serve a cached cron response.
export const dynamic = "force-dynamic";

/** How many submissions to scan + summarize per run (keeps us inside maxDuration). */
const MAX_ENRICH_PER_RUN = 12;
/** How many Devpost galleries to sync per run. */
const MAX_HACKATHONS_PER_RUN = 10;

/**
 * GET /api/cron/poll-devpost — the "constantly check until the deadline" job.
 *
 * For every hackathon that has a Devpost URL and whose submission deadline is still in
 * the future, it re-scrapes the public gallery and imports any NEW projects (the import
 * is idempotent, so nothing is duplicated). It then enriches any submission that still
 * lacks an AI summary — newly imported ones plus any stragglers — so the work converges
 * even when a single run can't finish everything.
 *
 * Scheduled by vercel.json. Protected by CRON_SECRET: Vercel Cron sends it as a Bearer
 * token automatically; a manual trigger must pass `Authorization: Bearer <CRON_SECRET>`.
 */
async function runPoll(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 503 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ ok: false, error: "Missing service-role key." }, { status: 503 });
  }

  const nowIso = new Date().toISOString();
  // Open hackathons only: a Devpost URL set + a deadline that hasn't passed.
  const { data: hackathons, error } = await service
    .from("hackathons")
    .select("id, name, devpost_url, submission_deadline")
    .not("devpost_url", "is", null)
    .gt("submission_deadline", nowIso)
    .order("submission_deadline", { ascending: true })
    .limit(MAX_HACKATHONS_PER_RUN);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const report: Record<string, unknown>[] = [];
  let enrichBudget = MAX_ENRICH_PER_RUN;

  for (const h of hackathons ?? []) {
    const entry: Record<string, unknown> = { hackathon: h.name, imported: 0 };
    try {
      // 1) Re-scrape the gallery and import anything new.
      const { projects } = await scrapeDevpost(h.devpost_url as string);
      const mapped = projects.map((p) => ({
        project_name: p.project_name,
        team_name: p.team_name,
        track: "",
        description: p.description,
        repo_url: p.repo_url,
        devpost_url: p.devpost_url,
        live_url: p.live_url,
        video_url: p.video_url,
        screenshots: p.screenshots,
        built_with: p.built_with,
        members: p.members,
      }));
      const imp = await importDevpostProjects(service, h.id, "devpost", mapped);
      entry.imported = imp.imported;
      if (imp.error) entry.importError = imp.error;
    } catch (e) {
      entry.scrapeError = e instanceof Error ? e.message : "scrape failed";
    }

    report.push(entry);
  }

  // 2) Repair pass (deadline-independent): re-enrich any submission whose AI summary is
  // MISSING or DEGRADED. The free-tier rate limit can make a summary fall back to a
  // who/how-less stub during a busy import; this heals it on the next run — even after
  // submissions close — so judges never see a half-populated summary. Bounded per run.
  let repaired = 0;
  if (enrichBudget > 0) {
    const { data: subs } = await service
      .from("submissions")
      .select("id, ai_summaries(submission_id, who, how)");
    const needy = (subs ?? [])
      .filter((s) => {
        const aiRaw = (s as { ai_summaries?: unknown }).ai_summaries;
        const ai = (Array.isArray(aiRaw) ? aiRaw[0] : aiRaw) as { who?: string; how?: string } | null | undefined;
        if (!ai) return true; // no summary at all
        return !String(ai.who ?? "").trim() && !String(ai.how ?? "").trim(); // degraded stub
      })
      .map((s) => s.id)
      .slice(0, enrichBudget);
    for (const id of needy) {
      await enrichSubmission(service, id);
      enrichBudget--;
      repaired++;
    }
  }

  return NextResponse.json({ ok: true, ranAt: nowIso, repaired, hackathons: report });
}

export async function GET(req: Request) {
  return runPoll(req);
}

export async function POST(req: Request) {
  return runPoll(req);
}
