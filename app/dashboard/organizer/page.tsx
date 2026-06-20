import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { OrganizerDashboard } from "@/components/organizer/organizer-dashboard";
import { requireRole } from "@/lib/auth";
import {
  countHackathonJudges,
  getActiveHackathon,
  listProjectViews,
  listReviewCases,
} from "@/lib/live-data";

export const metadata: Metadata = { title: "Organizer · Dashboard" };
export const dynamic = "force-dynamic";

export default async function OrganizerDashboardPage() {
  await requireRole("organizer");
  const hackathon = await getActiveHackathon();
  const [projects, reviewCases, judgeCount] = hackathon
    ? await Promise.all([
        listProjectViews(hackathon.id),
        listReviewCases(hackathon.id),
        countHackathonJudges(hackathon.id),
      ])
    : [[], [], 0];
  return (
    <AppShell role="organizer">
      <OrganizerDashboard
        projects={projects}
        reviewCases={reviewCases}
        hackathonId={hackathon?.id ?? null}
        devpostUrl={hackathon?.devpost_url ?? null}
        submissionDeadline={hackathon?.submission_deadline ?? null}
        judgeCount={judgeCount}
      />
    </AppShell>
  );
}
