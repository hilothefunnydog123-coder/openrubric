import type { Metadata } from "next";
import { RoleChoice } from "@/components/app/role-choice";
import { JudgeWelcome } from "@/components/app/judge-welcome";
import { getInvitationByToken } from "@/lib/live-data";

export const metadata: Metadata = {
  title: "Get started",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  // Arrived from a judge invite link → tailored "you're a judge for X" welcome.
  if (invite) {
    const invitation = await getInvitationByToken(invite);
    if (invitation) {
      return (
        <JudgeWelcome
          token={invitation.token}
          hackathonName={invitation.hackathon_name}
          inviterName={invitation.inviter_name}
        />
      );
    }
  }

  // Everyone else organizes, judges only ever arrive via an invite.
  return <RoleChoice />;
}
