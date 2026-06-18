import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isSupabaseConfigured,
  getSupabaseServiceClient,
  getSupabaseServerClient,
} from "@/lib/supabase";
import { DEMO_HACKATHON } from "@/lib/demo-data";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(2, "Name your hackathon"),
  website_url: z.string().optional().default(""),
  devpost_url: z.string().optional().default(""),
  start_time: z.string().optional().nullable(),
  submission_deadline: z.string().optional().nullable(),
  judging_deadline: z.string().optional().nullable(),
  tracks: z.array(z.string().min(1)).default([]),
  criteria: z
    .array(z.object({ name: z.string().min(1), max: z.coerce.number().int().positive() }))
    .default([]),
});

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
const toTs = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** GET /api/hackathons — list hackathons (live when Supabase is configured). */
export async function GET() {
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ hackathons: [DEMO_HACKATHON], demo: true });
  const { data, error } = await service
    .from("hackathons")
    .select("id, name, slug, start_time, submission_deadline, judging_deadline, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ hackathons: data, demo: false });
}

/** POST /api/hackathons — create a hackathon with its tracks + rubric criteria. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 503 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ ok: false, error: "Missing service-role key." }, { status: 503 });
  }

  // Attribute ownership to the signed-in organizer when there's a session.
  let createdBy: string | null = null;
  const server = await getSupabaseServerClient();
  if (server) {
    const { data } = await server.auth.getUser();
    createdBy = data.user?.id ?? null;
  }

  const d = parsed.data;
  const slug = `${slugify(d.name) || "hackathon"}-${Math.random().toString(36).slice(2, 7)}`;

  const { data: hk, error } = await service
    .from("hackathons")
    .insert({
      name: d.name,
      slug,
      website_url: d.website_url || null,
      devpost_url: d.devpost_url || null,
      start_time: toTs(d.start_time),
      submission_deadline: toTs(d.submission_deadline),
      judging_deadline: toTs(d.judging_deadline),
      created_by: createdBy,
    })
    .select("id, slug")
    .single();

  if (error || !hk) {
    return NextResponse.json({ ok: false, error: error?.message || "Insert failed." }, { status: 500 });
  }

  if (d.tracks.length) {
    await service.from("tracks").insert(d.tracks.map((name) => ({ hackathon_id: hk.id, name })));
  }
  if (d.criteria.length) {
    await service.from("rubric_criteria").insert(
      d.criteria.map((c, i) => ({
        hackathon_id: hk.id,
        name: c.name,
        max_points: c.max,
        sort_order: i,
      })),
    );
  }

  return NextResponse.json({ ok: true, id: hk.id, slug: hk.slug });
}
