import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal, SplitWords } from "@/components/ui/reveal";
import { ProductPreviewPanel } from "./product-preview-panel";
import { ROUTES } from "@/lib/constants";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-canvas text-ink">
      {/* pastel aurora field, lavender, sky, and a warm peach, slowly drifting */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px]" aria-hidden>
        <div
          className="aurora-a absolute -top-40 left-1/2 h-[560px] w-[860px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(124,108,255,0.16), transparent 70%)",
          }}
        />
        <div
          className="aurora-b absolute -top-24 left-[8%] h-[440px] w-[560px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(96,165,250,0.14), transparent 70%)",
          }}
        />
        <div
          className="aurora-b absolute -top-10 right-[4%] h-[380px] w-[480px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(251,146,110,0.10), transparent 70%)",
          }}
        />
        <div className="bg-grain absolute inset-0 opacity-[0.16] mix-blend-multiply dark:mix-blend-screen dark:opacity-[0.10]" />
      </div>

      {/* hero copy, one clear column: eyebrow, headline, pitch, actions */}
      <div className="container-marketing relative pb-10 pt-[88px]">
        <Reveal y={10}>
          <Eyebrow tone="accent" className="mb-6 tracking-[0.16em]">
            Free · Open Source · Nonprofit
          </Eyebrow>
        </Reveal>
        <h1 className="max-w-[15ch] font-serif text-[clamp(42px,5.6vw,78px)] font-normal leading-[1.04] tracking-[-0.02em]">
          <SplitWords text="Judge hackathons with a system everyone can *trust.*" delay={0.1} />
        </h1>
        <Reveal delay={0.45} y={16}>
          <p className="mt-7 max-w-[56ch] text-[clamp(17px,1.6vw,21px)] font-semibold leading-[1.55] text-ink">
            OpenRubric is the open-source judging platform for hackathons. Import your
            submissions, score every project against one shared rubric, and publish winners
            everyone can verify.
          </p>
        </Reveal>
        <Reveal delay={0.58} y={16}>
          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <Button asChild variant="accent" size="lg" className="rounded-full px-7">
              <Link href={ROUTES.signUp}>Start judging free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="group rounded-full px-7">
              <Link href={ROUTES.judgeDashboard}>
                Try the live demo{" "}
                <span className="inline-block transition-transform duration-300 ease-out group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>

      {/* product panel (a dark app preview, floating on the light canvas).
          Entrance is a CSS keyframe whose last frame is `transform: none`, so the
          panel's position:fixed maximize overlay is never re-anchored. */}
      <div className="container-marketing relative pb-24 pt-14">
        <div className="hero-panel-in motion-reduce:animate-none">
          <ProductPreviewPanel />
        </div>
      </div>
    </section>
  );
}
