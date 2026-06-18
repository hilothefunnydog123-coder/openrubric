import { NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseServiceClient, getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CommentDTO {
  id: string;
  submission_id: string;
  judge_id: string;
  comment: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

async function withAuthors(service: NonNullable<Awaited<ReturnType<typeof getSupabaseServiceClient>>>, rows: any[]): Promise<CommentDTO[]> {
  const ids = Array.from(new Set(rows.map((r) => r.judge_id)));
  const authors = new Map<string, { full_name: string; avatar_url: string | null }>();
  if (ids.length) {
    const { data } = await service.from("profiles").select("id, full_name, avatar_url").in("id", ids);
    (data ?? []).forEach((p: any) => authors.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
  }
  return rows.map((r) => ({
    id: r.id,
    submission_id: r.submission_id,
    judge_id: r.judge_id,
    comment: r.comment,
    created_at: r.created_at,
    author_name: authors.get(r.judge_id)?.full_name || "Judge",
    author_avatar: authors.get(r.judge_id)?.avatar_url ?? null,
  }));
}

/** GET /api/comments?submission_id=… — the shared note thread for a submission. */
export async function GET(req: Request) {
  const submissionId = new URL(req.url).searchParams.get("submission_id") ?? "";
  if (!isSupabaseConfigured() || !UUID.test(submissionId)) {
    return NextResponse.json({ comments: [] });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ comments: [] });

  const { data, error } = await service
    .from("judge_comments")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });
  if (error || !data) return NextResponse.json({ comments: [] });

  return NextResponse.json({ comments: await withAuthors(service, data) });
}

/** POST /api/comments — add a note to the thread, attributed to the logged-in judge. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const submissionId: string = body.submission_id ?? "";
  const comment: string = (body.comment ?? "").toString().trim();
  if (!comment) return NextResponse.json({ error: "Empty comment." }, { status: 400 });

  // Identify the real author from the session cookie.
  const server = await getSupabaseServerClient();
  const {
    data: { user },
  } = (await server?.auth.getUser()) ?? { data: { user: null } };

  const real = isSupabaseConfigured() && UUID.test(submissionId) && !!user;
  if (!real) {
    return NextResponse.json({
      comment: {
        id: `demo-${Date.now()}`,
        submission_id: submissionId,
        judge_id: user?.id ?? "demo",
        comment,
        created_at: new Date().toISOString(),
        author_name: (user?.user_metadata?.full_name as string) || "You",
        author_avatar: null,
      },
      demo: true,
    });
  }

  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ error: "Server not configured." }, { status: 500 });

  const { data, error } = await service
    .from("judge_comments")
    .insert({ submission_id: submissionId, judge_id: user!.id, comment, visibility: "panel" })
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });
  }

  const [dto] = await withAuthors(service, [data]);
  return NextResponse.json({ comment: dto, demo: false });
}
