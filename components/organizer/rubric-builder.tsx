"use client";

export interface DraftCriterion {
  name: string;
  max: number;
}

/**
 * Simple rubric builder — no pasting, no parsing. Just add criteria and set points.
 * Each row is an editable name + max points; the total updates live.
 */
export function RubricBuilder({
  criteria,
  onChange,
}: {
  criteria: DraftCriterion[];
  onChange: (next: DraftCriterion[]) => void;
}) {
  function update(i: number, patch: Partial<DraftCriterion>) {
    onChange(criteria.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  const total = criteria.reduce((a, c) => a + (c.max || 0), 0);

  return (
    <div>
      <div className="mb-[18px] flex items-center justify-between">
        <span className="text-[13px] text-dim">Add the criteria judges score against.</span>
        <span className="font-mono text-[11px] text-faint">Total: {total} pts</span>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-line">
        {criteria.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-faint">
            No criteria yet — add your first below.
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
        className="mt-3 w-full rounded-[11px] border border-dashed border-[#D6D1C6] px-4 py-3 text-left text-[13.5px] font-semibold transition-colors hover:border-ink"
      >
        + Add a criterion
      </button>
    </div>
  );
}
