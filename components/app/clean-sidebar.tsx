"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { DEMO_HACKATHON } from "@/lib/demo-data";

type Role = "organizer" | "judge";

interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

const ORG_NAV: NavItem[] = [
  { label: "Dashboard", href: ROUTES.organizerDashboard, badge: "2" },
  { label: "Setup", href: ROUTES.organize },
  { label: "Import", href: ROUTES.organizerImport },
  { label: "Rankings", href: ROUTES.rankings },
];

const JUDGE_NAV: NavItem[] = [{ label: "Projects", href: ROUTES.judgeDashboard }];

export function CleanSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const nav = role === "organizer" ? ORG_NAV : JUDGE_NAV;

  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] flex-shrink-0 flex-col border-r border-line bg-raised md:flex">
      <div className="border-b border-line p-5">
        <Link href={ROUTES.home} className="text-ink">
          <Logo markClassName="h-[20px] w-[20px]" />
        </Link>
        <div className="mt-3.5 flex items-center gap-2 rounded-[9px] border border-line bg-surface p-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-[11px] font-semibold text-canvas">
            BA
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-semibold">{DEMO_HACKATHON.name.replace(" 2026", "")}</div>
            <div className="font-mono text-[10px] text-faint">2026 · live</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3">
        <div className="px-2.5 pb-2 pt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          {role === "organizer" ? "Organizer" : "Judge"}
        </div>
        {nav.map((n) => {
          const active = pathname === n.href;
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
              {n.badge && (
                <span className="rounded-full bg-[rgba(180,69,60,0.08)] px-[7px] py-0.5 font-mono text-[10.5px] text-signal-high">
                  {n.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3.5">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">View as</div>
        <div className="flex rounded-[9px] border border-line bg-surface p-[3px]">
          <Link
            href={ROUTES.organizerDashboard}
            className={cn(
              "flex-1 rounded-md py-1.5 text-center text-[12.5px] font-semibold transition-colors",
              role === "organizer" ? "bg-ink text-canvas" : "text-dim hover:text-ink",
            )}
          >
            Organizer
          </Link>
          <Link
            href={ROUTES.judgeDashboard}
            className={cn(
              "flex-1 rounded-md py-1.5 text-center text-[12.5px] font-semibold transition-colors",
              role === "judge" ? "bg-ink text-canvas" : "text-dim hover:text-ink",
            )}
          >
            Judge
          </Link>
        </div>
      </div>
    </aside>
  );
}
