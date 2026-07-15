import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GradingWorkspace } from "@/components/grading/grading-workspace";
import { getViewer } from "@/lib/auth";
import { fetchReadme } from "@/lib/github";
import { ROUTES } from "@/lib/constants";
import { DEFAULT_CRITERIA } from "@/lib/demo-data";
import {
  getHackathonIdForSubmission,
  getHackathonTimezone,
  getProjectView,
  listRubricCriteria,
} from "@/lib/live-data";

export const dynamic = "force-dynamic";

/** The live submission, or null if it doesn't exist. */
async function resolve(id: string) {
  return (await getProjectView(id)) ?? null;
}

/** Live rubric for the submission's hackathon; the default template if none is saved yet. */
async function resolveCriteria(submissionId: string) {
  const hackathonId = await getHackathonIdForSubmission(submissionId);
  if (!hackathonId) return DEFAULT_CRITERIA;
  const criteria = await listRubricCriteria(hackathonId);
  return criteria.length ? criteria : DEFAULT_CRITERIA;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await resolve(id);
  return { title: project ? `Grade · ${project.project_name}` : "Grade project" };
}

export default async function GradeProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, viewer, timezone] = await Promise.all([
    resolve(id),
    getViewer(),
    getHackathonTimezone(id),
  ]);
  if (!project) notFound();
  const criteria = await resolveCriteria(id);

  // The repo's real README, prefer the value cached on the scan, otherwise fetch it
  // live from GitHub so judges always see it even before the scan column is populated.
  const readme =
    project.scan.readme_md ||
    (project.repo_url ? await fetchReadme(project.repo_url) : null);

  // Organizers can review a project but never enter the judge scoring flow, and "back"
  // returns them to their own dashboard, not the judge's project list.
  const viewerRole = viewer?.role === "organizer" ? "organizer" : "judge";
  const backHref = viewerRole === "organizer" ? ROUTES.organizerDashboard : ROUTES.judgeDashboard;

  return (
    <GradingWorkspace
      project={project}
      criteria={criteria}
      viewerRole={viewerRole}
      backHref={backHref}
      timezone={timezone}
      readme={readme}
    />
  );
}
