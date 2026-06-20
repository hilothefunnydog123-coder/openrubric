import { NextResponse } from "next/server";
import { getProjectView } from "@/lib/live-data";

/** GET /api/submissions/[id] — a single submission with its scan + AI summary. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectView(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ submission: project });
}
