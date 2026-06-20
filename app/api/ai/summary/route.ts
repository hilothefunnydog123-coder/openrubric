import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSummary, isAiConfigured } from "@/lib/ai";
import { getProjectView } from "@/lib/live-data";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  submission_id: z.string().min(1),
  project_name: z.string().optional(),
  description: z.string().optional(),
  repo_url: z.string().optional(),
});

/** POST /api/ai/summary — generate a judge-facing project summary (live if GITHUB_API_MODEL_KEY set). */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "ai-summary"), 20, 10_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await getProjectView(parsed.data.submission_id);
  const summary = await generateSummary({
    submissionId: parsed.data.submission_id,
    projectName: parsed.data.project_name ?? project?.project_name ?? "Project",
    description: parsed.data.description ?? project?.description ?? "",
    repoUrl: parsed.data.repo_url ?? project?.repo_url ?? null,
  });

  return NextResponse.json({ summary, live: isAiConfigured() });
}
