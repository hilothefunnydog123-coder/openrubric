import type { Metadata } from "next";
import { RoleChoice } from "@/components/app/role-choice";

export const metadata: Metadata = {
  title: "Get started",
  robots: { index: false, follow: false },
};

export default function GetStartedPage() {
  return <RoleChoice />;
}
