import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { importDevpostProjects } from "@/lib/import-pipeline";

export const runtime = "nodejs";

const schema = z.object({
  hackathon_id: z.string().uuid(),
  source: z.string().optional().default("import"),
  projects: z
    .array(
      z.object({
        project_name: z.string().min(1),
        team_name: z.string().optional().default(""),
        track: z.string().optional().default(""),
        description: z.string().optional().default(""),
        repo_url: z.string().optional().nullable(),
        devpost_url: z.string().optional().nullable(),
        live_url: z.string().optional().nullable(),
        video_url: z.string().optional().nullable(),
        screenshots: z.array(z.string()).optional().default([]),
        built_with: z.array(z.string()).optional().default([]),
        members: z
          .array(
            z.object({
              name: z.string(),
              username: z.string().optional(),
              profile_url: z.string().optional(),
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .min(1),
});

/** POST /api/submissions/import — persist imported projects as submissions + participants. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 503 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: "Missing service-role key." }, { status: 503 });

  const { hackathon_id, source, projects } = parsed.data;

  // Idempotent import (dedup + insert + participants) lives in the shared pipeline, so
  // the organizer UI and the background cron behave identically.
  const out = await importDevpostProjects(service, hackathon_id, source, projects);
  if (out.error) {
    return NextResponse.json({ ok: false, error: out.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, imported: out.imported, submissions: out.submissions });
}
