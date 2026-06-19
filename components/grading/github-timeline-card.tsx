import type { GithubScan, ReviewPriority } from "@/lib/types";

const TONE_DOT: Record<ReviewPriority, string> = {
  clean: "bg-signal-clean",
  light: "bg-signal-review-dot",
  needs: "bg-signal-review-dot",
  high: "bg-signal-high-dot",
};

export function GitHubTimelineCard({ scan }: { scan: GithubScan }) {
  return (
    <div className="mb-3.5 rounded-[13px] border border-line bg-surface p-4">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
          GitHub timeline
        </span>
      </div>
      <div>
        {scan.timeline_json.map((ev, i) => (
          <div key={`${ev.label}-${i}`} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              <span className={`mt-[3px] h-2 w-2 rounded-full ${TONE_DOT[ev.tone]}`} />
              {i < scan.timeline_json.length - 1 && <span className="w-px flex-1 bg-line" />}
            </div>
            <div className="pb-3.5">
              <div className="text-[12.5px] font-medium text-ink">{ev.label}</div>
              <div className="mt-0.5 font-mono text-[10.5px] text-faint">{ev.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
