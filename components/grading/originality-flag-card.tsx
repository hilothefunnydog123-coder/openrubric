import { cn } from "@/lib/utils";
import type { GithubScan } from "@/lib/types";

/**
 * Review signals, framed as questions, never accusations. The closing line is
 * fixed copy: "This is a signal, not a verdict." (see lib/github language policy).
 */
export function OriginalityFlagCard({ scan }: { scan: GithubScan }) {
  return (
    <div className="mb-3.5 rounded-[13px] border border-line bg-surface p-4">
      <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
        Review signals
      </div>
      <div className="flex flex-col gap-2.5">
        {scan.flags_json.map((f, i) => (
          <div key={`${f.label}-${i}`} className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] text-[11px] font-bold",
                f.ok
                  ? "bg-[rgba(46,138,94,0.1)] text-signal-clean"
                  : "bg-[rgba(168,121,31,0.12)] text-signal-review",
              )}
              aria-hidden
            >
              {f.ok ? "✓" : "!"}
            </span>
            <span className="text-[12.5px] text-ink">{f.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3.5 rounded-[9px] border border-line-soft bg-raised px-3 py-2.5">
        <div className="text-[12px] leading-[1.5] text-dim">{scan.summary}</div>
        <div className="mt-2 font-mono text-[10px] text-faint">This is a signal, not a verdict.</div>
      </div>
    </div>
  );
}
