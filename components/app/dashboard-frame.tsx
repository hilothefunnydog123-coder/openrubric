"use client";

import { useTheme } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

/**
 * Outer dashboard wrapper that applies the `.dark` class (scoped — marketing stays
 * light). `bg-canvas` on the same element resolves to the dark canvas when `.dark` is
 * present, so the whole shell + sidebar recolor from the CSS variables.
 */
export function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className={cn("flex min-h-screen bg-canvas", theme === "dark" && "dark")}>{children}</div>
  );
}
