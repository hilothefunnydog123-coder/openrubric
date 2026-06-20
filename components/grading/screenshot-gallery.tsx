"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Screenshot grid with a click-to-open lightbox. In the lightbox you can page through
 * every screenshot with the on-screen arrows or the ← / → keys, and close with Esc,
 * the ✕, or by clicking the backdrop.
 */
export function ScreenshotGallery({ shots, name }: { shots: string[]; name: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(null), []);
  const go = useCallback(
    (dir: 1 | -1) =>
      setOpen((i) => (i === null ? i : (i + dir + shots.length) % shots.length)),
    [shots.length],
  );

  // Keyboard nav while the lightbox is open.
  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    document.addEventListener("keydown", onKey);
    // Lock background scroll while open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, go]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shots.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(i)}
            className="group block cursor-zoom-in overflow-hidden rounded-[10px] border border-line"
            aria-label={`Open ${name} screenshot ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${name} screenshot ${i + 1}`}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {mounted &&
        open !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={close}
            role="dialog"
            aria-modal="true"
          >
            {/* close */}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            {/* prev */}
            {shots.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous screenshot"
                className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shots[open]}
              alt={`${name} screenshot ${open + 1}`}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[88vh] max-w-[88vw] rounded-[10px] object-contain shadow-2xl"
            />

            {/* next */}
            {shots.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Next screenshot"
                className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* counter */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 font-mono text-[12px] text-white">
              {open + 1} / {shots.length}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
