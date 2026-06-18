import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GradingWorkspace } from "@/components/grading/grading-workspace";
import { DEFAULT_CRITERIA, getProject } from "@/lib/demo-data";
import {
  getHackathonIdForSubmission,
  getProjectView,
  listRubricCriteria,
} from "@/lib/live-data";

export const dynamic = "force-dynamic";

/** Live submission first; fall back to demo data for the seeded demo ids. */
async function resolve(id: string) {
  return (await getProjectView(id)) ?? getProject(id) ?? null;
}

/** Live rubric for the submission's hackathon; demo rubric if there isn't one. */
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
  const project = await resolve(id);
  if (!project) notFound();
  const criteria = await resolveCriteria(id);
  return <GradingWorkspace project={project} criteria={criteria} />;
}
