"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { Logo, LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

type Role = "organizer" | "judge";

interface NavItem {
  label: string;
  href: string;
}

// Setup is always available; the rest unlock once a hackathon exists.
const ORG_NAV: NavItem[] = [
  { label: "Dashboard", href: ROUTES.organizerDashboard },
  { label: "Setup", href: ROUTES.organize },
  { label: "Import", href: ROUTES.organizerImport },
  { label: "Team", href: ROUTES.organizerTeam },
  { label: "Score requests", href: ROUTES.organizerApprovals },
  { label: "Rankings", href: ROUTES.rankings },
];

const JUDGE_NAV: NavItem[] = [{ label: "Projects", href: ROUTES.judgeDashboard }];

export function CleanSidebar({
  role,
  hasHackathon = false,
  hackathonName = null,
  hackathonLogo = null,
}: {
  role: Role;
  hasHackathon?: boolean;
  hackathonName?: string | null;
  hackathonLogo?: string | null;
}) {
  const pathname = usePathname();
  const nav = role === "organizer" ? ORG_NAV : JUDGE_NAV;

  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] flex-shrink-0 flex-col border-r border-line bg-raised md:flex">
      <div className="border-b border-line p-5">
        <Link href={ROUTES.home} className="text-ink">
          <Logo markClassName="h-[20px] w-[20px]" />
        </Link>
        <div className="mt-3.5 flex items-center gap-2 rounded-[9px] border border-line bg-surface p-2.5">
          {hackathonLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hackathonLogo}
              alt={hackathonName ?? "Hackathon"}
              className="h-6 w-6 flex-shrink-0 rounded-md object-cover"
            />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-canvas">
              <LogoMark className="h-3.5 w-3.5" />
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-semibold">
              {hackathonName ?? "OpenRubric"}
            </div>
            <div className="font-mono text-[10px] text-faint">
              {hackathonName ? "Live event" : "No event yet"}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3">
        <div className="px-2.5 pb-2 pt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          {role === "organizer" ? "Organizer" : "Judge"}
        </div>
        {nav.map((n) => {
          const active = pathname === n.href;
          // Everything but Setup is locked until the organizer creates a hackathon.
          const locked = role === "organizer" && !hasHackathon && n.href !== ROUTES.organize;

          if (locked) {
            return (
              <div
                key={n.href}
                title="Create your hackathon first"
                className="mb-0.5 flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13.5px] font-medium text-faint/60"
              >
                <span>{n.label}</span>
                <span className="flex-1" />
                <Lock className="h-3.5 w-3.5 text-faint/60" strokeWidth={2} />
              </div>
            );
          }

          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13.5px] transition-colors",
                active ? "bg-sunken font-semibold text-ink" : "font-medium text-dim hover:bg-sunken",
              )}
            >
              <span>{n.label}</span>
              <span className="flex-1" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
