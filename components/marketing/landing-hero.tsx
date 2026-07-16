"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/ui/logo";
import { Reveal } from "@/components/ui/reveal";
import { ProductPreviewPanel } from "./product-preview-panel";
import { ROUTES } from "@/lib/constants";

/**
 * DESIGN.md 4.3-4.6: an inset dark hero panel with ambient corner glow,
 * a floating chip (honest static line), an 800-weight display headline with the
 * payoff phrase in accent, a capture card wired to /request, and the product
 * shown in an app window cropped by the panel's bottom edge.
 */
export function LandingHero() {
  const router = useRouter();
  const [eventName, setEventName] = useState("");

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
        <div className="mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,34px)] text-center">
          {/* live chip: honest static line, gently floating */}
          <Reveal y={10}>
            <div className="chip-float mx-auto mb-8 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/[0.08] py-2 pl-2 pr-5">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white text-ink">
                <LogoMark className="h-[18px] w-[18px]" />
              </span>
              <span className="kicker text-white/60">Open source</span>
              <span className="text-[13.5px] font-bold text-white">
                MIT licensed · self-hostable · $0 forever
              </span>
            </div>
          </Reveal>

          {/* headline: 2 lines max, 800, payoff phrase in accent-light */}
          <Reveal delay={0.1} y={18}>
            <h1 className="mx-auto max-w-[17ch] font-display text-[clamp(2.8rem,6.8vw,5.4rem)] font-extrabold leading-[1] tracking-[-0.04em]">
              Judge hackathons <span className="text-[#9aa4ff]">everyone can trust.</span>
            </h1>
          </Reveal>

          {/* subline: two declarative sentences */}
          <Reveal delay={0.22} y={14}>
            <p className="mx-auto mt-6 max-w-[640px] text-[clamp(17px,1.6vw,20px)] font-medium leading-[1.65] text-white/85">
              OpenRubric imports your submissions and scores every project against{" "}
              <b className="font-bold text-white">one shared rubric</b>. Winners are published with
              evidence anyone can verify.
            </p>
          </Reveal>

          {/* capture card: hackathon name → /request (a real, wired endpoint) */}
          <Reveal delay={0.34} y={14}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goRequest();
              }}
              className="mx-auto mt-9 flex w-full max-w-[520px] items-center gap-2 rounded-[14px] bg-surface p-2 shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
            >
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Your hackathon's name…"
                aria-label="Your hackathon's name"
                className="w-full bg-transparent px-3.5 py-2.5 text-[15px] font-medium text-ink placeholder:text-ink/45"
              />
              <button
                type="submit"
                className="flex-shrink-0 rounded-full bg-ink px-[22px] py-[11px] text-[14px] font-bold text-canvas transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Bring OpenRubric
              </button>
            </form>
          </Reveal>

          {/* text links */}
          <Reveal delay={0.44} y={10}>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[14.5px] font-semibold">
              <Link href={ROUTES.judgeDashboard} className="text-[#9aa4ff] transition-opacity hover:opacity-75">
                Try the judge demo →
              </Link>
              <Link href={ROUTES.video} className="text-[#9aa4ff] transition-opacity hover:opacity-75">
                Watch the demo →
              </Link>
            </div>
          </Reveal>
        </div>

        {/* product shot: the interactive app window, cropped by the panel edge */}
        <div className="mx-auto mt-[clamp(40px,5vw,64px)] w-full max-w-[1180px] px-[clamp(18px,4vw,34px)]">
          <div className="hero-panel-in -mb-10 shadow-[0_-30px_90px_rgba(0,0,0,0.5)] motion-reduce:animate-none">
            <ProductPreviewPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
