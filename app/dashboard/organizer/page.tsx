import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { OrganizerDashboard } from "@/components/organizer/organizer-dashboard";
import { countHackathonJudges, getActiveHackathon, listProjectViews } from "@/lib/live-data";

export const metadata: Metadata = { title: "Organizer · Dashboard" };
export const dynamic = "force-dynamic";

export default async function OrganizerDashboardPage() {
  const hackathon = await getActiveHackathon();
  const projects = hackathon ? await listProjectViews(hackathon.id) : [];
  const judgeCount = hackathon ? await countHackathonJudges(hackathon.id) : 0;
  return (
    <AppShell role="organizer">
      <OrganizerDashboard
        projects={projects}
        hackathonId={hackathon?.id ?? null}
        devpostUrl={hackathon?.devpost_url ?? null}
        judgeCount={judgeCount}
      />
    </AppShell>
  );
}
