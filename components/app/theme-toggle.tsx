"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

/**
 * Light/dark switch for the dashboard. Two looks:
 *  - "full" (default): a labeled row, used in the sidebar footer.
 *  - "icon": a compact square button, used in the grading workspace top bar.
 */
export function ThemeToggle({ variant = "full" }: { variant?: "full" | "icon" }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Light mode" : "Dark mode";
  const Icon = isDark ? Sun : Moon;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className="flex h-9 w-9 items-center justify-center rounded-control border border-line bg-surface text-dim transition-colors hover:border-ink hover:text-ink"
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13.5px] font-medium text-dim transition-colors hover:bg-sunken hover:text-ink",
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}
