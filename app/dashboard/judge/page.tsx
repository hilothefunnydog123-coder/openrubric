import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { JudgeDashboard } from "@/components/judge/judge-dashboard";
import { requireRole } from "@/lib/auth";
import {
  getActiveHackathon,
  listProjectViews,
  listRubricCriteria,
  listTracks,
  listJudgeAssignmentTracks,
} from "@/lib/live-data";
import { DEFAULT_CRITERIA } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Judge · Projects" };
export const dynamic = "force-dynamic";

export default async function JudgeDashboardPage() {
  const viewer = await requireRole("judge");
  const hackathon = await getActiveHackathon();
  const [projects, criteria, tracks, assignmentTracks] = hackathon
    ? await Promise.all([
        listProjectViews(hackathon.id),
        listRubricCriteria(hackathon.id),
        listTracks(hackathon.id),
        viewer ? listJudgeAssignmentTracks(viewer.id, hackathon.id) : Promise.resolve({}),
      ])
    : [[], [], [], {} as Record<string, string | null>];
  // Fall back to the default rubric so status is sensible before a rubric is saved.
  const rubric = criteria.length ? criteria : DEFAULT_CRITERIA;
  return (
    <AppShell role="judge">
      <JudgeDashboard
        projects={projects}
        criteria={rubric}
        tracks={tracks}
        assignmentTracks={assignmentTracks}
        hackathonId={hackathon?.id ?? null}
      />
    </AppShell>
  );
}
