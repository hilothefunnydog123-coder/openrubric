import type { AiSummary } from "@/lib/types";
import { TechIcon } from "@/components/ui/tech-icon";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">{label}</div>
      <div className="text-[13.5px] leading-[1.5] text-ink">{children}</div>
    </div>
  );
}

/** Always-visible judge aid. An overview, never a score or a verdict. */
export function AIProjectSummaryCard({ ai }: { ai: AiSummary }) {
  return (
    <div className="mb-4 rounded-[14px] border border-line bg-surface p-5">
      <div className="mb-3.5 flex items-center gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent">
          AI Quick Summary
        </span>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
        <Field label="What it does">{ai.what || "-"}</Field>
        <Field label="Who it helps">{ai.who || "-"}</Field>
        <Field label="How it works">{ai.how || "-"}</Field>
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">Tech stack</div>
          <div className="flex flex-wrap gap-1.5">
            {(ai.tech ?? []).length === 0 && <span className="text-[12.5px] text-faint">-</span>}
            {(ai.tech ?? []).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-dim"
              >
                <TechIcon name={t} className="h-3 w-3" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 border-t border-line-soft pt-3.5 sm:flex-row sm:gap-[18px]">
        <div className="flex-1">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-signal-clean">
            Strongest part
          </div>
          <div className="text-[13px] leading-[1.5] text-ink">{ai.strengths_json?.[0] ?? "-"}</div>
        </div>
        <div className="flex-1">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-signal-review">
            Worth asking about
          </div>
          <div className="text-[13px] leading-[1.5] text-ink">{ai.weaknesses_json?.[0] ?? "-"}</div>
        </div>
      </div>
    </div>
  );
}
