"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/ui/logo";
import { Reveal, SplitWords } from "@/components/ui/reveal";
import { Magnetic, ScrollTilt, Spotlight } from "@/components/ui/motion-fx";
import { ProductPreviewPanel } from "./product-preview-panel";
import { ROUTES } from "@/lib/constants";

/**
 * DESIGN.md 4.3-4.6: an inset dark hero panel with ambient corner glow,
 * a floating chip (honest static line), an 800-weight display headline with the
 * payoff phrase in accent, a capture card wired to /request, and the product
 * shown in an app window cropped by the panel's bottom edge.
 *
 * The panel is built as five stacked layers, back to front:
 *   1. base radial glow (inline style, the DESIGN.md corner wash)
 *   2. rubric grid — graph paper at the literal scale of a rubric, radially masked
 *   3. two drifting aurora blobs (16s / 19s, transform-only)
 *   4. three light beams travelling down grid lines, staggered
 *   5. a pointer-tracked spotlight, plus film grain over everything
 * All five are decorative and pointer-events-none; content sits at z-10.
 */
export function LandingHero() {
  const router = useRouter();
  const [eventName, setEventName] = useState("");
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const onMaximizedChange = useCallback((v: boolean) => setPreviewMaximized(v), []);

  function goRequest() {
    const q = eventName.trim();
    router.push(q ? `${ROUTES.request}?hackathon=${encodeURIComponent(q)}` : ROUTES.request);
  }

  return (
    <section className="bg-canvas p-[clamp(10px,1.4vw,18px)]">
      <div
        className="relative mx-auto max-w-[1560px] overflow-hidden rounded-[clamp(18px,2.4vw,30px)] bg-ink pt-[clamp(58px,7vw,92px)] text-canvas"
        style={{
          background:
            "radial-gradient(52% 42% at 12% 96%, rgba(93,95,239,0.40), transparent 70%)," +
            "radial-gradient(46% 38% at 88% 92%, rgba(10,157,99,0.28), transparent 70%)," +
            "radial-gradient(60% 34% at 50% 0%, rgba(255,255,255,0.05), transparent 70%)," +
            "#0a0a0c",
        }}
      >
        {/* 2 — rubric grid */}
        <div aria-hidden className="bg-rubric-grid mask-radial pointer-events-none absolute inset-0" />

        {/* 3 — drifting aurora */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="aurora-a absolute -top-[18%] left-[8%] h-[560px] w-[720px] rounded-full opacity-[0.55] blur-[90px]"
            style={{ background: "radial-gradient(circle, rgba(93,95,239,0.45), transparent 68%)" }}
          />
          <div
            className="aurora-b absolute -bottom-[22%] right-[4%] h-[520px] w-[640px] rounded-full opacity-50 blur-[100px]"
            style={{ background: "radial-gradient(circle, rgba(10,157,99,0.38), transparent 68%)" }}
          />
        </div>

        {/* 4 — beams travelling down grid lines */}
        <div aria-hidden className="mask-fade-b pointer-events-none absolute inset-0 overflow-hidden">
          {[
            { left: "18%", delay: "0s", duration: "7s" },
            { left: "50%", delay: "2.4s", duration: "9s" },
            { left: "81%", delay: "4.1s", duration: "8s" },
          ].map((b) => (
            <span
              key={b.left}
              className="beam-y absolute top-0 h-[26%] w-px bg-[linear-gradient(to_bottom,transparent,rgba(154,164,255,0.85),transparent)]"
              style={{ left: b.left, animationDelay: b.delay, animationDuration: b.duration }}
            />
          ))}
        </div>

        {/* 5 — cursor spotlight + grain */}
        <Spotlight size={620} color="rgba(154,164,255,0.13)" />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
        />

        <div className="relative z-10 mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,34px)] text-center">
          {/* live chip: honest static line, gently floating */}
          <Reveal y={10}>
            <div className="chip-float mx-auto mb-8 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/[0.08] py-2 pl-2 pr-5 backdrop-blur-sm">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white text-ink">
                <LogoMark className="h-[18px] w-[18px]" />
              </span>
              <span className="kicker text-white/60">Open source</span>
              <span className="text-[13.5px] font-bold text-white">
                MIT licensed · self-hostable · $0 forever
              </span>
            </div>
          </Reveal>

          {/* headline: each word rises out of its own clip mask; the payoff phrase
              carries a slow light sweep instead of the default accent italic. */}
          <h1 className="mx-auto max-w-[17ch] font-display text-[clamp(2.8rem,6.8vw,5.4rem)] font-extrabold leading-[1] tracking-[-0.04em]">
            <SplitWords
              text="Judge hackathons *everyone can trust.*"
              delay={0.12}
              gap={0.055}
              emClassName="text-sheen"
            />
          </h1>

          {/* subline: two declarative sentences */}
          <Reveal delay={0.42} y={14}>
            <p className="mx-auto mt-6 max-w-[640px] text-[clamp(17px,1.6vw,20px)] font-medium leading-[1.65] text-white/85">
              OpenRubric imports your submissions and scores every project against{" "}
              <b className="font-bold text-white">one shared rubric</b>. Winners are published with
              evidence anyone can verify.
            </p>
          </Reveal>

          {/* capture card: hackathon name → /request (a real, wired endpoint) */}
          <Reveal delay={0.54} y={14}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goRequest();
              }}
              className="mx-auto mt-9 flex w-full max-w-[520px] items-center gap-2 rounded-[14px] bg-surface p-2 shadow-[0_24px_70px_rgba(0,0,0,0.45)] ring-1 ring-white/10 transition-shadow duration-500 focus-within:shadow-[0_24px_80px_rgba(93,95,239,0.45)]"
            >
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Your hackathon's name…"
                aria-label="Your hackathon's name"
                className="w-full bg-transparent px-3.5 py-2.5 text-[15px] font-medium text-ink placeholder:text-ink/45"
              />
              <Magnetic strength={0.28} className="flex-shrink-0">
                <button
                  type="submit"
                  className="rounded-full bg-ink px-[22px] py-[11px] text-[14px] font-bold text-canvas transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Bring OpenRubric
                </button>
              </Magnetic>
            </form>
          </Reveal>

          {/* text links */}
          <Reveal delay={0.64} y={10}>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[14.5px] font-semibold">
              <Link
                href={ROUTES.judgeDashboard}
                className="group inline-flex items-center gap-1.5 text-[#9aa4ff] transition-opacity hover:opacity-75"
              >
                Try the judge demo
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href={ROUTES.video}
                className="group inline-flex items-center gap-1.5 text-[#9aa4ff] transition-opacity hover:opacity-75"
              >
                Watch the demo
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </Reveal>
        </div>

        {/* product shot: the interactive app window, standing up out of the page as
            you scroll, cropped by the panel edge. */}
        <div className="relative z-10 mx-auto mt-[clamp(40px,5vw,64px)] w-full max-w-[1180px] px-[clamp(18px,4vw,34px)]">
          <ScrollTilt
            className="-mb-10 shadow-[0_-30px_90px_rgba(0,0,0,0.5)]"
            deg={9}
            frozen={previewMaximized}
          >
            <ProductPreviewPanel onMaximizedChange={onMaximizedChange} />
          </ScrollTilt>
        </div>
      </div>
    </section>
  );
}
