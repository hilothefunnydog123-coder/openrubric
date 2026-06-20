import { NextResponse } from "next/server";
import { reviewResolveSchema } from "@/lib/validators";
import { isSupabaseConfigured, getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/review-cases/[id]/resolve — record an organizer's decision on a review
 * case. Resolving a high-priority case is what unblocks a project for an award; the
 * decision is always the organizer's, never automatic.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = reviewResolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!isSupabaseConfigured() || !UUID.test(id)) {
    return NextResponse.json({ error: "Review case not found" }, { status: 404 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const { data, error } = await service
    .from("review_cases")
    .update({
      status: parsed.data.status,
      organizer_notes: parsed.data.organizer_notes || null,
      final_decision: parsed.data.final_decision || null,
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Review case not found" }, { status: 404 });

  return NextResponse.json({ review_case: data });
}
