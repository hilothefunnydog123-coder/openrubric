import { NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/hackathons/[id] — a hackathon with its tracks + rubric criteria. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured() || !UUID.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const [{ data: hackathon }, { data: tracks }, { data: criteria }] = await Promise.all([
    service.from("hackathons").select("*").eq("id", id).maybeSingle(),
    service.from("tracks").select("*").eq("hackathon_id", id).order("name", { ascending: true }),
    service.from("rubric_criteria").select("*").eq("hackathon_id", id).order("sort_order", { ascending: true }),
  ]);
  if (!hackathon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ hackathon, tracks: tracks ?? [], criteria: criteria ?? [] });
}

const toTs = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * PATCH /api/hackathons/[id] — update a hackathon. Accepts a small Devpost-only patch
 * (auto-import) OR a full edit from the setup wizard (basics + tracks + criteria).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !UUID.test(id)) {
    return NextResponse.json({ ok: true, demo: true });
  }
  const body = await req.json().catch(() => ({}));
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 500 });

  // Build the update from whatever fields were sent (partial edit is fine).
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.website_url === "string") update.website_url = body.website_url.trim() || null;
  if (typeof body.devpost_url === "string") update.devpost_url = body.devpost_url.trim() || null;
  if (typeof body.logo_url === "string") update.logo_url = body.logo_url.trim() || null;
  if (typeof body.timezone === "string") update.timezone = body.timezone.trim() || null;
  if (typeof body.judges_per_project === "number")
    update.judges_per_project = Math.min(3, Math.max(1, Math.round(body.judges_per_project)));
  if (
    typeof body.score_visibility === "string" &&
    ["none", "score_only", "score_rubric", "score_rubric_feedback"].includes(body.score_visibility)
  )
    update.score_visibility = body.score_visibility;
  if ("start_time" in body) update.start_time = toTs(body.start_time);
  if ("submission_deadline" in body) update.submission_deadline = toTs(body.submission_deadline);
  if ("judging_deadline" in body) update.judging_deadline = toTs(body.judging_deadline);

  if (Object.keys(update).length) {
    let { error } = await service.from("hackathons").update(update).eq("id", id);
    // logo_url / timezone / judges_per_project / score_visibility are newer — retry without
    // them if unmigrated.
    if (error && /logo_url|timezone|judges_per_project|score_visibility/.test(error.message)) {
      delete update.logo_url;
      delete update.timezone;
      delete update.judges_per_project;
      delete update.score_visibility;
      ({ error } = await service.from("hackathons").update(update).eq("id", id));
    }
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Replace tracks if provided (only when it's a full edit, not the devpost-only patch).
  if (Array.isArray(body.tracks)) {
    const names = (body.tracks as unknown[]).map((t) => String(t).trim()).filter(Boolean);
    await service.from("tracks").delete().eq("hackathon_id", id);
    if (names.length) await service.from("tracks").insert(names.map((name) => ({ hackathon_id: id, name })));
  }

  // Replace rubric criteria if provided.
  if (Array.isArray(body.criteria)) {
    const rows = (body.criteria as { name?: string; max?: number }[])
      .filter((c) => c.name && c.max)
      .map((c, i) => ({ hackathon_id: id, name: String(c.name), max_points: Number(c.max), sort_order: i }));
    await service.from("rubric_criteria").delete().eq("hackathon_id", id);
    if (rows.length) await service.from("rubric_criteria").insert(rows);
  }

  return NextResponse.json({ ok: true });
}
