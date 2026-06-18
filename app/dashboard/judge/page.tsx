import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { JudgeDashboard } from "@/components/judge/judge-dashboard";
import { getActiveHackathon, listProjectViews } from "@/lib/live-data";

export const metadata: Metadata = { title: "Judge · Projects" };
export const dynamic = "force-dynamic";

export default async function JudgeDashboardPage() {
  const hackathon = await getActiveHackathon();
  const projects = hackathon ? await listProjectViews(hackathon.id) : [];
  return (
    <AppShell role="judge">
      <JudgeDashboard projects={projects} />
    </AppShell>
  );
}
