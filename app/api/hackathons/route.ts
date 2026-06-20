import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isSupabaseConfigured,
  getSupabaseServiceClient,
  getSupabaseServerClient,
} from "@/lib/supabase";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(2, "Name your hackathon"),
  website_url: z.string().optional().default(""),
  devpost_url: z.string().optional().default(""),
  logo_url: z.string().optional().default(""),
  start_time: z.string().optional().nullable(),
  submission_deadline: z.string().optional().nullable(),
  judging_deadline: z.string().optional().nullable(),
  timezone: z.string().optional().default(""),
  judges_per_project: z.coerce.number().int().min(1).max(3).optional().default(1),
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
  if (!service) return NextResponse.json({ hackathons: [] });
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

  const baseRow = {
    name: d.name,
    slug,
    website_url: d.website_url || null,
    devpost_url: d.devpost_url || null,
    start_time: toTs(d.start_time),
    submission_deadline: toTs(d.submission_deadline),
    judging_deadline: toTs(d.judging_deadline),
    created_by: createdBy,
  };
  const newCols = {
    logo_url: d.logo_url || null,
    timezone: d.timezone || null,
    judges_per_project: d.judges_per_project ?? 1,
  };
  let { data: hk, error } = await service
    .from("hackathons")
    .insert({ ...baseRow, ...newCols })
    .select("id, slug")
    .single();
  // logo_url / timezone / judges_per_project are newer — retry without them if unmigrated.
  if (error && /logo_url|timezone|judges_per_project/.test(error.message)) {
    ({ data: hk, error } = await service.from("hackathons").insert(baseRow).select("id, slug").single());
  }

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
