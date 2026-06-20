import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app/app-shell";
import { TopNav } from "@/components/app/top-nav";
import { Button } from "@/components/ui/button";
import { DevpostImportForm } from "@/components/organizer/devpost-import-form";
import { ManualSubmissionForm } from "@/components/organizer/manual-submission-form";
import { requireRole } from "@/lib/auth";
import { getActiveHackathon } from "@/lib/live-data";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Import submissions" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireRole("organizer");
  const hackathon = await getActiveHackathon();
  return (
    <AppShell role="organizer">
      <TopNav
        eyebrow="Organizer"
        title="Import submissions"
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href={ROUTES.organize}>Open setup wizard</Link>
          </Button>
        }
      />
      <div className="mx-auto w-full max-w-wizard px-8 pb-20 pt-8">
        <div className="rounded-[16px] border border-line bg-surface p-7">
          <h2 className="mb-1 text-[19px] font-semibold tracking-[-0.01em]">
            Pull in your submissions
          </h2>
          <p className="mb-6 text-sm text-dim">
            Import from a public Devpost URL, upload a CSV, or add projects by hand. You can edit
            everything later.
          </p>
          <DevpostImportForm hackathonId={hackathon?.id ?? null} />
        </div>

        <div className="mt-5">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            Didn&apos;t scrape? Add it by hand
          </div>
          <ManualSubmissionForm hackathonId={hackathon?.id ?? null} />
        </div>
      </div>
    </AppShell>
  );
}
