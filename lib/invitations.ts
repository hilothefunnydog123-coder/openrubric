import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase";

/**
 * Accept a judge/co-organizer invitation: mark it accepted, pin the accepting user's
 * profile to the invited role, and (for judges) create their assignments for every
 * submission in the hackathon. Idempotent — safe to call more than once (the email
 * verify flow, the OAuth callback, and the welcome screen all call it).
 *
 * `email` is the address of the user accepting (their session email). It falls back to
 * the invited email, so the typed-code flow still works before a session exists.
 */
export interface AcceptResult {
  ok: boolean;
  role?: "judge" | "organizer";
  hackathon_id?: string | null;
  error?: string;
}

export async function acceptInvitation(token: string, email?: string | null): Promise<AcceptResult> {
  const service = await getSupabaseServiceClient();
  if (!service) return { ok: false, error: "Server not configured." };

  const { data: invite, error } = await service
    .from("invitations")
    .select("id, email, hackathon_id, status, role, invited_by")
    .eq("token", token)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!invite) return { ok: false, error: "Invalid invite." };

  await service
    .from("invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  const role: "judge" | "organizer" = invite.role === "organizer" ? "organizer" : "judge";
  const lookupEmail = (email || invite.email).toLowerCase();
  const { data: profile } = await service.from("profiles").select("id").eq("email", lookupEmail).maybeSingle();

  if (profile) {
    await service.from("profiles").update({ role }).eq("id", profile.id);
    // Co-organizer: link them as a co-owner of this hackathon so they can approve
    // score requests. Idempotent; tolerates the table not being migrated yet.
    if (role === "organizer" && invite.hackathon_id) {
      await service.from("hackathon_collaborators").upsert(
        { hackathon_id: invite.hackathon_id, user_id: profile.id, role: "co_owner" },
        { onConflict: "hackathon_id,user_id", ignoreDuplicates: true },
      );
    }
    if (role === "judge" && invite.hackathon_id) {
      const { data: subs } = await service
        .from("submissions")
        .select("id, track_id")
        .eq("hackathon_id", invite.hackathon_id);
      if (subs?.length) {
        await service.from("judge_assignments").upsert(
          subs.map((s) => ({
            hackathon_id: invite.hackathon_id,
            judge_id: profile.id,
            submission_id: s.id,
            track_id: s.track_id,
          })),
          { onConflict: "judge_id,submission_id", ignoreDuplicates: true },
        );
      }
    }
  }

  // Notify the host that a co-organizer accepted (best-effort; never blocks accept).
  if (role === "organizer" && invite.invited_by) {
    try {
      const { sendHostNotificationEmail } = await import("@/lib/mailer");
      const { data: host } = await service
        .from("profiles")
        .select("email")
        .eq("id", invite.invited_by)
        .maybeSingle();
      const { data: hk } = invite.hackathon_id
        ? await service.from("hackathons").select("name").eq("id", invite.hackathon_id).maybeSingle()
        : { data: null };
      if (host?.email) {
        await sendHostNotificationEmail(host.email, {
          subject: `${lookupEmail} joined as a co-organizer`,
          heading: "Co-organizer joined",
          body: `${lookupEmail} accepted your invitation and is now a co-organizer${hk?.name ? ` on ${hk.name}` : ""}.`,
        });
      }
    } catch {
      /* notification is best-effort */
    }
  }

  return { ok: true, role, hackathon_id: invite.hackathon_id };
}
