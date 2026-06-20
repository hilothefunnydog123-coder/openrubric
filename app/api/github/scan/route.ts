import { NextResponse } from "next/server";
import { z } from "zod";
import { scanRepository, isGithubConfigured } from "@/lib/github";
import { getProjectView, getEventWindowForSubmission } from "@/lib/live-data";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  submission_id: z.string().min(1),
  repo_url: z.string().optional(),
});

/** POST /api/github/scan — scan a repo for review signals (live if GITHUB_TOKEN set). */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "github-scan"), 20, 10_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await getProjectView(parsed.data.submission_id);
  const repoUrl = parsed.data.repo_url ?? project?.repo_url ?? "";
  const listedHandles = project?.participants.map((p) => p.github_username ?? "").filter(Boolean) ?? [];
  const { eventStart, submissionDeadline } = await getEventWindowForSubmission(parsed.data.submission_id);

  const scan = await scanRepository({
    submissionId: parsed.data.submission_id,
    repoUrl,
    eventStart,
    submissionDeadline,
    listedHandles,
  });

  return NextResponse.json({ scan, live: isGithubConfigured() });
}
