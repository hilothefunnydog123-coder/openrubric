import { NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseServiceClient } from "@/lib/supabase";
import { isGithubConfigured } from "@/lib/github";
import { isAiConfigured } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Tables OpenRubric expects (must match supabase/schema.sql). */
const TABLES = [
  "profiles",
  "hackathons",
  "tracks",
  "submissions",
  "participants",
  "rubric_criteria",
  "judge_assignments",
  "judge_scores",
  "presentation_scores",
  "judge_comments",
  "github_scans",
  "ai_summaries",
  "review_cases",
] as const;

type Schema =
  | { checked: false; reason: string }
  | { checked: true; ready: boolean; present: string[]; missing: string[] };

/** Probe each table; a missing table errors on select, which is how we detect it. */
async function checkSchema(): Promise<Schema> {
  const supabase = await getSupabaseServiceClient();
  if (!supabase) return { checked: false, reason: "No service-role key / Supabase not configured." };

  const present: string[] = [];
  const missing: string[] = [];
  try {
    await Promise.race([
      Promise.all(
        TABLES.map(async (t) => {
          // A real (non-head) select surfaces the "schema cache" error for a table
          // that doesn't exist — head-only counts do NOT, so don't use them here.
          const { error } = await supabase.from(t).select("*").limit(1);
          if (error) missing.push(t);
          else present.push(t);
        }),
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
    ]);
  } catch {
    return { checked: false, reason: "Timed out reaching Supabase." };
  }
  return { checked: true, ready: missing.length === 0, present: present.sort(), missing: missing.sort() };
}

/** GET /api/health — liveness, which integrations are wired, and DB schema status. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    integrations: {
      supabase: isSupabaseConfigured(),
      github: isGithubConfigured(),
      ai: isAiConfigured(),
    },
    schema: await checkSchema(),
  });
}
