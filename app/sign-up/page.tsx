import type { Metadata } from "next";
import { AuthCard } from "@/components/app/auth-card";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; email?: string }>;
}) {
  const { invite, email } = await searchParams;
  return <AuthCard mode="sign-up" invite={invite} inviteEmail={email} />;
}
