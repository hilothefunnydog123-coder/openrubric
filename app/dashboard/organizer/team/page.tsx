import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { TopNav } from "@/components/app/top-nav";
import { OrganizerTeamPanel } from "@/components/organizer/organizer-team-panel";
import { requireRole } from "@/lib/auth";
import { getActiveHackathon } from "@/lib/live-data";
import { getSupabaseServiceClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Organizer · Team" };
export const dynamic = "force-dynamic";

interface OrganizerRow {
  email: string;
  status: "pending" | "approved";
  created_at: string;
}

async function listOrganizers(hackathonId: string): Promise<OrganizerRow[]> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return [];
  const { data } = await sb
    .from("invitations")
    .select("email, status, created_at")
    .eq("hackathon_id", hackathonId)
    .eq("role", "organizer")
    .order("created_at", { ascending: true });
  return (data ?? []).map((r: { email: string; status: string; created_at: string }) => ({
    email: r.email,
    status: r.status === "accepted" ? "approved" : "pending",
    created_at: r.created_at,
  }));
}

export default async function OrganizerTeamPage() {
  await requireRole("organizer");
  const hackathon = await getActiveHackathon();
  const organizers = hackathon ? await listOrganizers(hackathon.id) : [];

  return (
    <AppShell role="organizer">
      <TopNav eyebrow="Organizer" title="Team" />
      <div className="mx-auto w-full max-w-wizard px-8 pb-20 pt-6">
        <OrganizerTeamPanel hackathonId={hackathon?.id ?? null} initial={organizers} />
      </div>
    </AppShell>
  );
}
