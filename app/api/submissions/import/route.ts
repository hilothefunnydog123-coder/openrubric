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

  // Idempotent import: skip projects already in this hackathon (matched by Devpost URL,
  // else by project name). Lets auto-polling re-run safely without creating duplicates.
  const { data: existing } = await service
    .from("submissions")
    .select("project_name, devpost_url")
    .eq("hackathon_id", hackathon_id);
  const seenDevpost = new Set(
    (existing ?? []).map((e) => e.devpost_url?.toLowerCase()).filter(Boolean) as string[],
  );
  const seenName = new Set((existing ?? []).map((e) => e.project_name.toLowerCase()));
  const fresh = projects.filter((p) =>
    p.devpost_url ? !seenDevpost.has(p.devpost_url.toLowerCase()) : !seenName.has(p.project_name.toLowerCase()),
  );
  if (!fresh.length) {
    return NextResponse.json({ ok: true, imported: 0, submissions: [] });
  }

  // Map track names → track_ids for this hackathon.
  const { data: tracks } = await service.from("tracks").select("id, name").eq("hackathon_id", hackathon_id);
  const trackId = new Map((tracks ?? []).map((t) => [t.name.toLowerCase(), t.id]));

  const rows = fresh.map((p) => ({
    hackathon_id,
    track_id: p.track ? (trackId.get(p.track.toLowerCase()) ?? null) : null,
    project_name: p.project_name,
    team_name: p.team_name ?? "",
    description: p.description ?? "",
    repo_url: p.repo_url || null,
    devpost_url: p.devpost_url || null,
    live_url: p.live_url || null,
    screenshots_json: p.screenshots ?? [],
    built_with_json: p.built_with ?? [],
    source,
    status: "imported" as const,
  }));

  let { data: inserted, error } = await service
    .from("submissions")
    .insert(rows)
    .select("id, project_name");
  // If the newer columns don't exist yet (migration not run), retry without them.
  if (error && /screenshots_json|built_with_json/.test(error.message)) {
    const legacy = rows.map((r) => {
      const copy: Record<string, unknown> = { ...r };
      delete copy.screenshots_json;
      delete copy.built_with_json;
      return copy;
    });
    ({ data: inserted, error } = await service
      .from("submissions")
      .insert(legacy)
      .select("id, project_name"));
  }
  if (error || !inserted) {
    return NextResponse.json({ ok: false, error: error?.message || "Insert failed." }, { status: 500 });
  }

  // Participants (PostgREST preserves insert order, so zip by index).
  const participantRows = inserted.flatMap((sub, i) =>
    (fresh[i].members ?? []).map((m) => ({
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
