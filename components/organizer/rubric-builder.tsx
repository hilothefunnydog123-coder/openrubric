"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageDrop } from "@/components/ui/use-image-drop";

export interface DraftCriterion {
  name: string;
  max: number;
}

/**
 * Rubric builder. Start from the OpenRubric default, edit criteria by hand, or upload a
 * photo / screenshot of an existing rubric and let the vision model turn it into scorable
 * criteria. Each row is an editable name + max points; the total updates live.
 */
export function RubricBuilder({
  criteria,
  onChange,
}: {
  criteria: DraftCriterion[];
  onChange: (next: DraftCriterion[]) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drop = useImageDrop((file) => void generateFromImage(file));

  function update(i: number, patch: Partial<DraftCriterion>) {
    onChange(criteria.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  /** Upload a rubric photo → vision model → criteria. Replaces the current list. */
  async function generateFromImage(file: File) {
    setGenerating(true);
    setError(null);
    setNote(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ai/rubric-from-image", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !Array.isArray(data.criteria) || data.criteria.length === 0) {
        setError(typeof data.error === "string" ? data.error : "Couldn't read a rubric from that image.");
        return;
      }
      const next: DraftCriterion[] = data.criteria.map((c: { name: string; max: number }) => ({
        name: String(c.name),
        max: Number(c.max) || 0,
      }));
      onChange(next);
      const total = next.reduce((a, c) => a + c.max, 0);
      setNote(`Generated ${next.length} criteria (${total} pts) from your image, edit anything below.`);
    } catch {
      setError("Network error reading that image. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  const total = criteria.reduce((a, c) => a + (c.max || 0), 0);

  return (
    <div>
      {/* AI: generate a rubric from a photo */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        {...drop.dropProps}
        disabled={generating}
        className={cn(
          "mb-4 flex w-full items-center gap-3 rounded-[12px] border border-dashed px-4 py-3.5 text-left transition-colors",
          drop.dragging ? "border-accent bg-accent-soft" : "border-line hover:border-ink",
          generating && "opacity-70",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-line bg-raised",
            drop.dragging ? "text-accent" : "text-ink",
          )}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" strokeWidth={1.8} />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
            <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            {generating ? "Reading your rubric…" : "Generate from a photo"}
          </div>
          <div className="mt-0.5 text-[12px] text-dim">
            Drag &amp; drop or click, upload a picture of your rubric and we&apos;ll turn it into criteria.
          </div>
        </div>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void generateFromImage(f);
          e.target.value = "";
        }}
      />

      {note && <p className="mb-3 font-mono text-[11.5px] text-signal-clean">{note}</p>}
      {error && <p className="mb-3 font-mono text-[11.5px] text-signal-high">{error}</p>}

      <div className="mb-[18px] flex items-center justify-between">
        <span className="text-[13px] text-dim">Add the criteria judges score against.</span>
        <span className="font-mono text-[11px] text-faint">Total: {total} pts</span>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-line">
        {criteria.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-faint">
            No criteria yet, add your first below, or generate them from a photo.
          </div>
        ) : (
          criteria.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 border-b border-line-softer px-4 py-3 last:border-b-0"
            >
              <input
                value={c.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="flex-1 border-none bg-transparent text-sm font-medium outline-none"
                aria-label="Criterion name"
              />
              <div className="flex items-center gap-1.5">
                <input
                  value={c.max}
                  onChange={(e) => update(i, { max: Number(e.target.value) || 0 })}
                  inputMode="numeric"
                  className="w-[46px] rounded-[7px] border border-line bg-raised px-2 py-1.5 text-right font-mono text-[13px] outline-none focus:border-accent"
                  aria-label="Max points"
                />
                <span className="font-mono text-[12px] text-faint">pts</span>
                <button
                  type="button"
                  onClick={() => onChange(criteria.filter((_, idx) => idx !== i))}
                  className="ml-1 text-faint transition-colors hover:text-signal-high"
                  aria-label={`Remove ${c.name}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange([...criteria, { name: "New criterion", max: 10 }])}
        className="mt-3 w-full rounded-[11px] border border-dashed border-line px-4 py-3 text-left text-[13.5px] font-semibold transition-colors hover:border-ink"
      >
        + Add a criterion
      </button>
    </div>
  );
}
