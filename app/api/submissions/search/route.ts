import { NextResponse } from "next/server";
import { getActiveHackathon, listProjectViews } from "@/lib/live-data";

/** GET /api/submissions/search?q=&track=  — case-insensitive search over live submissions. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();
  const track = (searchParams.get("track") ?? "").toLowerCase().trim();

  const hackathon = await getActiveHackathon();
  const projects = hackathon ? await listProjectViews(hackathon.id) : [];

  const results = projects.filter((p) => {
    const matchesQuery =
      !q ||
      p.project_name.toLowerCase().includes(q) ||
      p.team_name.toLowerCase().includes(q) ||
      p.track.toLowerCase().includes(q) ||
      p.participants.some((part) => part.name.toLowerCase().includes(q));
    const matchesTrack = !track || p.track.toLowerCase() === track;
    return matchesQuery && matchesTrack;
  }).map((p) => ({
    id: p.id,
    project_name: p.project_name,
    team_name: p.team_name,
    track: p.track,
    review_priority: p.scan.review_priority,
  }));

  return NextResponse.json({ query: q, count: results.length, results });
}
