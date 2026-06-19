import { NextResponse } from "next/server";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { scanRepository } from "@/lib/github";
import { generateSummary } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/submissions/[id]/process — run a real GitHub scan + AI summary for a
 * submission and persist them to github_scans + ai_summaries. Idempotent: replaces
 * any prior scan/summary for the submission.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 503 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: "Missing service-role key." }, { status: 503 });

  const { data: sub, error } = await service
    .from("submissions")
    .select("*") // '*' so optional columns (built_with_json) don't error pre-migration
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!sub) return NextResponse.json({ ok: false, error: "Submission not found." }, { status: 404 });

  const { data: hk } = await service
    .from("hackathons")
    .select("start_time, submission_deadline")
    .eq("id", sub.hackathon_id)
    .maybeSingle();

  const result: { scan?: string; summary?: boolean } = {};

  // 1) GitHub scan → github_scans
  if (sub.repo_url) {
    try {
      const scan = await scanRepository({
        submissionId: sub.id,
        repoUrl: sub.repo_url,
        eventStart: hk?.start_time ?? new Date(0).toISOString(),
        submissionDeadline: hk?.submission_deadline ?? new Date().toISOString(),
      });
      await service.from("github_scans").delete().eq("submission_id", sub.id);
      const scanBase = {
        submission_id: sub.id,
        repo_owner: scan.repo_owner,
        repo_name: scan.repo_name,
        repo_created_at: scan.repo_created_at || null,
        first_commit_at: scan.first_commit_at || null,
        last_commit_at: scan.last_commit_at || null,
        total_commits: scan.total_commits,
        pre_event_commits: scan.pre_event_commits,
        post_deadline_commits: scan.post_deadline_commits,
        contributors_json: scan.contributors_json,
        timeline_json: scan.timeline_json,
        flags_json: scan.flags_json,
        review_priority: scan.review_priority,
        summary: scan.summary,
      };
      // languages_json is newer; if that column is missing, retry without it.
      const { error: scanErr } = await service
        .from("github_scans")
        .insert({ ...scanBase, languages_json: scan.languages_json ?? [] });
      if (scanErr) await service.from("github_scans").insert(scanBase);
      result.scan = scan.review_priority;
    } catch (e) {
      result.scan = `error: ${e instanceof Error ? e.message : "scan failed"}`;
    }
  }

  // 2) AI summary → ai_summaries
  try {
    const ai = await generateSummary({
      submissionId: sub.id,
      projectName: sub.project_name,
      description: sub.description,
      repoUrl: sub.repo_url,
    });
    // Prefer Devpost's real "Built With" tags for the tech stack (they map to real
    // logos); fall back to the AI's inferred tech only when Devpost gave us nothing.
    const builtWith: string[] = Array.isArray(sub.built_with_json) ? sub.built_with_json : [];
    if (builtWith.length) ai.tech = builtWith.slice(0, 8);
    await service.from("ai_summaries").delete().eq("submission_id", sub.id);
    const base = {
      submission_id: sub.id,
      summary: ai.what || ai.summary,
      strengths_json: ai.strengths_json,
      weaknesses_json: ai.weaknesses_json,
      suggested_questions_json: ai.suggested_questions_json,
    };
    // Full row keeps the descriptive fields; if those columns don't exist yet
    // (migration not run), fall back to the legacy row so the summary still saves.
    const { error: aiErr } = await service
      .from("ai_summaries")
      .insert({ ...base, what: ai.what, who: ai.who, how: ai.how, tech_json: ai.tech });
    if (aiErr) await service.from("ai_summaries").insert(base);
    result.summary = true;
  } catch {
    result.summary = false;
  }

  return NextResponse.json({ ok: true, ...result });
}
