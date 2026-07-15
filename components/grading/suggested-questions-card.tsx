"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * AI-generated, product-specific questions for the judge to ask the team. Each row is
 * clickable, click to copy it (handy to paste into the shared notes or read aloud).
 */
export function SuggestedQuestionsCard({ questions }: { questions: string[] }) {
  const [copied, setCopied] = useState<number | null>(null);

  function copy(q: string, i: number) {
    navigator.clipboard
      ?.writeText(q)
      .then(() => {
        setCopied(i);
        setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500);
      })
      .catch(() => {});
  }

  return (
    <div className="mb-4 rounded-[14px] border border-line bg-surface p-5">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-dim">
          Suggested questions
        </div>
        <div className="font-mono text-[10px] text-faint">Click to copy</div>
      </div>
      <div className="mt-2 flex flex-col">
        {questions.map((q, i) => (
          <button
            key={q}
            type="button"
            onClick={() => copy(q, i)}
            className="group flex items-start gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-sunken"
          >
            <span className="mt-0.5 font-mono text-[12px] text-accent">→</span>
            <span className="flex-1 text-[13.5px] leading-[1.5] text-ink">{q}</span>
            <span className="mt-0.5 flex-shrink-0 text-faint">
              {copied === i ? (
                <Check className="h-3.5 w-3.5 text-[#2e8a5e]" strokeWidth={3} />
              ) : (
                <Copy
                  className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                  strokeWidth={2}
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
