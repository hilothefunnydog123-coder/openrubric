"use client";

import { useTheme } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

/**
 * Outer dashboard wrapper that applies the `.dark` class (scoped, marketing stays
 * light). `bg-canvas` on the same element resolves to the dark canvas when `.dark` is
 * present, so the whole shell + sidebar recolor from the CSS variables.
 */
export function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  // `text-ink` on the SAME element as `.dark` re-resolves the inherited text color to the
  // dark-mode foreground at this boundary, otherwise descendants without an explicit text
  // class keep inheriting the (dark) color computed up at <body>, and stay invisible.
  return (
    <div className={cn("flex min-h-screen bg-canvas text-ink", theme === "dark" && "dark")}>
      {children}
    </div>
  );
}
