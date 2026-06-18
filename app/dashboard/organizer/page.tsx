import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { OrganizerDashboard } from "@/components/organizer/organizer-dashboard";
import { getActiveHackathon, listProjectViews } from "@/lib/live-data";

export const metadata: Metadata = { title: "Organizer · Dashboard" };
export const dynamic = "force-dynamic";

export default async function OrganizerDashboardPage() {
  const hackathon = await getActiveHackathon();
  const projects = hackathon ? await listProjectViews(hackathon.id) : [];
  return (
    <AppShell role="organizer">
      <OrganizerDashboard projects={projects} hackathonId={hackathon?.id ?? null} />
    </AppShell>
  );
}
