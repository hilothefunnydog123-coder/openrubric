import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";

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

  // Map track names → track_ids for this hackathon.
  const { data: tracks } = await service.from("tracks").select("id, name").eq("hackathon_id", hackathon_id);
  const trackId = new Map((tracks ?? []).map((t) => [t.name.toLowerCase(), t.id]));

  const rows = projects.map((p) => ({
    hackathon_id,
    track_id: p.track ? (trackId.get(p.track.toLowerCase()) ?? null) : null,
    project_name: p.project_name,
    team_name: p.team_name ?? "",
    description: p.description ?? "",
    repo_url: p.repo_url || null,
    devpost_url: p.devpost_url || null,
    live_url: p.live_url || null,
    source,
    status: "imported" as const,
  }));

  const { data: inserted, error } = await service
    .from("submissions")
    .insert(rows)
    .select("id, project_name");
  if (error || !inserted) {
    return NextResponse.json({ ok: false, error: error?.message || "Insert failed." }, { status: 500 });
  }

  // Participants (PostgREST preserves insert order, so zip by index).
  const participantRows = inserted.flatMap((sub, i) =>
    (projects[i].members ?? []).map((m) => ({
      submission_id: sub.id,
      name: m.name,
      github_username: m.username || null,
      devpost_profile_url: m.profile_url || null,
    })),
  );
  if (participantRows.length) {
    await service.from("participants").insert(participantRows);
  }

  return NextResponse.json({ ok: true, imported: inserted.length, submissions: inserted });
}
