import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ProductPreviewPanel } from "./product-preview-panel";
import { ROUTES } from "@/lib/constants";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-canvas text-ink">
      {/* subtle accent glow for depth (works in both themes) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(37,99,235,0.07), transparent 70%)",
        }}
        aria-hidden
      />

      {/* hero copy */}
      <div className="container-marketing relative pb-10 pt-[84px]">
        <Eyebrow tone="accent" className="mb-6 tracking-[0.16em]">
          Open Source
        </Eyebrow>
        <div className="grid items-end gap-12 lg:grid-cols-[1.35fr_1fr]">
          <h1 className="max-w-[14ch] font-serif text-[clamp(40px,5.4vw,74px)] font-normal leading-[1.02] tracking-[-0.015em]">
            Judge hackathons with a system everyone can trust.
          </h1>
          <div className="pb-2">
            <p className="mb-7 max-w-[42ch] text-[17px] leading-[1.55] text-dim">
              Import Devpost projects, paste your rubric, let judges score live, and review GitHub
              timelines before winners are announced.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={ROUTES.signUp}>Get started</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={ROUTES.judgeDashboard}>Try judge demo →</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* product panel (a dark app preview, floating on the light canvas) */}
      <div className="container-marketing relative pb-24 pt-6">
        <ProductPreviewPanel />
      </div>
    </section>
  );
}
