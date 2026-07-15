import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal, SplitWords } from "@/components/ui/reveal";
import { ProductPreviewPanel } from "./product-preview-panel";
import { ROUTES } from "@/lib/constants";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-canvas text-ink">
      {/* ambient glow field — two slow-drifting blobs + a whisper of grain */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px]" aria-hidden>
        <div
          className="aurora-a absolute -top-40 left-1/2 h-[560px] w-[840px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(37,99,235,0.10), transparent 70%)",
          }}
        />
        <div
          className="aurora-b absolute -top-24 left-[12%] h-[420px] w-[560px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(37,99,235,0.05), transparent 70%)",
          }}
        />
        <div className="bg-grain absolute inset-0 opacity-[0.16] mix-blend-multiply dark:mix-blend-screen dark:opacity-[0.10]" />
      </div>

      {/* hero copy */}
      <div className="container-marketing relative pb-10 pt-[84px]">
        <Reveal y={10}>
          <Eyebrow tone="accent" className="mb-6 tracking-[0.16em]">
            Open Source
          </Eyebrow>
        </Reveal>
        <div className="grid items-end gap-12 lg:grid-cols-[1.35fr_1fr]">
          <h1 className="max-w-[14ch] font-serif text-[clamp(40px,5.4vw,74px)] font-normal leading-[1.04] tracking-[-0.02em]">
            <SplitWords text="Judge hackathons with a system everyone can *trust.*" delay={0.1} />
          </h1>
          <div className="pb-2">
            <Reveal delay={0.45} y={16}>
              <p className="mb-7 max-w-[42ch] text-[17px] leading-[1.55] text-dim">
                Import Devpost projects, paste your rubric, let judges score live, and review
                GitHub timelines before winners are announced.
              </p>
            </Reveal>
            <Reveal delay={0.58} y={16}>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={ROUTES.signUp}>Get started</Link>
                </Button>
                <Button asChild variant="outline" className="group">
                  <Link href={ROUTES.judgeDashboard}>
                    Try judge demo{" "}
                    <span className="inline-block transition-transform duration-300 ease-out group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* product panel (a dark app preview, floating on the light canvas).
          Entrance is a CSS keyframe whose last frame is `transform: none`, so the
          panel's position:fixed maximize overlay is never re-anchored. */}
      <div className="container-marketing relative pb-24 pt-6">
        <div className="hero-panel-in motion-reduce:animate-none">
          <ProductPreviewPanel />
        </div>
      </div>
    </section>
  );
}
