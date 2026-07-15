import { CleanSidebar } from "./clean-sidebar";
import { DashboardFrame } from "./dashboard-frame";
import { getActiveHackathon } from "@/lib/live-data";

/** Sidebar + scrollable main column. Used by all dashboard screens (not grading). */
export async function AppShell({
  role,
  children,
}: {
  role: "organizer" | "judge";
  children: React.ReactNode;
}) {
  // Until a hackathon exists, the organizer's other tabs stay locked, there's
  // nothing to show yet. The sidebar chip reflects the real event (or "no event yet").
  const hackathon = await getActiveHackathon();

  return (
    <DashboardFrame>
      <CleanSidebar
        role={role}
        hasHackathon={Boolean(hackathon)}
        hackathonName={hackathon?.name ?? null}
        hackathonLogo={hackathon?.logo_url ?? null}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </DashboardFrame>
  );
}
