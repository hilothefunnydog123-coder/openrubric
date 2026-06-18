"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * A 6-digit one-time-code input: separate boxes with auto-advance, backspace,
 * arrow-key nav, and full-code paste. Shakes on error, turns green on success.
 * Works the same on mobile (numeric keypad via inputMode) and desktop.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  status = "idle",
  autoFocus = true,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
  status?: "idle" | "error" | "success";
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split("");

  function commit(next: string) {
    onChange(next.replace(/\D/g, "").slice(0, length));
  }

  function handleChange(i: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    const arr = value.split("");
    if (!typed) {
      arr[i] = "";
      commit(arr.join(""));
      return;
    }
    let idx = i;
    for (const c of typed.split("")) {
      if (idx >= length) break;
      arr[idx] = c;
      idx += 1;
    }
    commit(arr.join(""));
    refs.current[Math.min(idx, length - 1)]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      const arr = value.split("");
      if (arr[i]) {
        arr[i] = "";
        commit(arr.join(""));
      } else if (i > 0) {
        arr[i - 1] = "";
        commit(arr.join(""));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (text) {
      commit(text);
      refs.current[Math.min(text.length, length - 1)]?.focus();
    }
  }

  return (
    <motion.div
      className="flex justify-center gap-1.5 sm:gap-2"
      onPaste={handlePaste}
      animate={status === "error" ? { x: [0, -6, 6, -5, 5, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={digits[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && i === 0}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            "h-12 w-10 rounded-xl border bg-surface text-center text-[22px] font-semibold tabular-nums text-ink outline-none transition-colors sm:h-14 sm:w-12",
            status === "error"
              ? "border-signal-high"
              : status === "success"
                ? "border-[#2e8a5e]"
                : "border-line focus:border-accent",
            disabled && "opacity-70",
          )}
        />
      ))}
    </motion.div>
  );
}
