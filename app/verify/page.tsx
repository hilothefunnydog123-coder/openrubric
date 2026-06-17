import type { Metadata } from "next";
import { VerifyExperience } from "@/components/auth/verify-experience";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyExperience token={token} />;
}
