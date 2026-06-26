import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listProjectsForHackathon } from "@/lib/live-data";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/hackathons/[id]/projects — lightweight project list for the score-request picker. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !UUID.test(id)) return NextResponse.json({ projects: [] });
  return NextResponse.json({ projects: await listProjectsForHackathon(id) });
}
