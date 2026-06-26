import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { TopNav } from "@/components/app/top-nav";
import { ApprovalsQueue } from "@/components/organizer/approvals-queue";
import { requireRole } from "@/lib/auth";
import { getActiveHackathon } from "@/lib/live-data";

export const metadata: Metadata = { title: "Organizer · Score requests" };
export const dynamic = "force-dynamic";

/** Owner/co-owner approval queue for participant "see your score" requests. */
export default async function OrganizerApprovalsPage() {
  await requireRole("organizer");
  const hackathon = await getActiveHackathon();

  return (
    <AppShell role="organizer">
      <TopNav eyebrow="Organizer" title="Score requests" />
      <div className="mx-auto w-full max-w-wizard px-8 pb-20 pt-6">
        <ApprovalsQueue
          hackathonId={hackathon?.id ?? null}
          scoreVisibility={hackathon?.score_visibility ?? "none"}
        />
      </div>
    </AppShell>
  );
}
