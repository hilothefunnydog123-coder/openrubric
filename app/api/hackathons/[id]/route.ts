import { NextResponse } from "next/server";
import { DEMO_HACKATHON, DEMO_TRACKS, DEFAULT_CRITERIA } from "@/lib/demo-data";
import { isSupabaseConfigured, getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/hackathons/[id] — a hackathon with its tracks + rubric criteria. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== DEMO_HACKATHON.id && isSupabaseConfigured()) {
    // Live lookup would go here.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    hackathon: DEMO_HACKATHON,
    tracks: DEMO_TRACKS,
    criteria: DEFAULT_CRITERIA,
    demo: !isSupabaseConfigured(),
  });
}

/** PATCH /api/hackathons/[id] — update editable fields (currently the Devpost URL). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !UUID.test(id)) {
    return NextResponse.json({ ok: true, demo: true });
  }
  const body = await req.json().catch(() => ({}));
  const devpostUrl = typeof body.devpost_url === "string" ? body.devpost_url.trim() : null;

  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 500 });

  const { error } = await service
    .from("hackathons")
    .update({ devpost_url: devpostUrl || null })
    .eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, devpost_url: devpostUrl || null });
}
