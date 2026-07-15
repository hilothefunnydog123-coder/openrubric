import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { OrganizerSetupWizard } from "@/components/organizer/organizer-setup-wizard";
import { requireRole } from "@/lib/auth";
import { getActiveHackathon, listTrackNames, listRubricCriteria } from "@/lib/live-data";

export const metadata: Metadata = { title: "Set up judging" };
export const dynamic = "force-dynamic";

export default async function OrganizePage() {
  await requireRole("organizer");
  // If a hackathon already exists, load it so setup opens pre-filled (edit mode)
  // instead of a blank form, nothing has to be re-entered.
  const hackathon = await getActiveHackathon();
  const existing = hackathon
    ? {
        hackathon,
        tracks: await listTrackNames(hackathon.id),
        criteria: (await listRubricCriteria(hackathon.id)).map((c) => ({ name: c.name, max: c.max_points })),
      }
    : null;

  return (
    <AppShell role="organizer">
      <OrganizerSetupWizard existing={existing} />
    </AppShell>
  );
}
