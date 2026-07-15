import { cn } from "@/lib/utils";

/**
 * OpenRubric logo mark, a 2×2 rubric grid with one blue square (brief: "option 2").
 * Three cells are outlined in `currentColor` so the mark adapts to dark/light
 * surfaces; the one accent cell stays deep blue. No gavel, scales, or judge icon.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("h-[22px] w-[22px]", className)}
    >
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="3" width="8" height="8" rx="2" fill="#2563EB" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  wordmark = true,
}: {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      {wordmark && (
        <span className="text-[18px] font-semibold tracking-[-0.02em]">OpenRubric</span>
      )}
    </span>
  );
}
