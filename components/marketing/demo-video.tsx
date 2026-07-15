import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * Framed product-demo video player. Reused on the landing page (after the hero) and on
 * the dedicated /video page. `controls` + `preload="metadata"` so the ~38MB file only
 * downloads when a visitor actually presses play (and the narration audio is preserved).
 */
export function DemoVideo({
  eyebrow = "Product demo",
  heading = "See OpenRubric in action.",
  sub,
  className = "",
}: {
  eyebrow?: string;
  heading?: string;
  sub?: string;
  className?: string;
}) {
  return (
    <section className={`bg-canvas ${className}`}>
      <div className="container-marketing py-[72px]">
        <div className="mb-9 text-center">
          <Eyebrow className="mb-3">{eyebrow}</Eyebrow>
          <h2 className="mx-auto max-w-[22ch] font-serif text-[clamp(28px,4vw,46px)] font-normal leading-[1.05] tracking-[-0.015em]">
            {heading}
          </h2>
          {sub && (
            <p className="mx-auto mt-3.5 max-w-[52ch] text-[16px] leading-[1.6] text-ink/75">{sub}</p>
          )}
        </div>

        <div className="mx-auto max-w-[940px]">
          <div className="overflow-hidden rounded-[18px] border border-line bg-black shadow-[0_24px_70px_rgba(20,18,14,0.16)] transition-shadow duration-500 hover:shadow-[0_32px_90px_rgba(20,18,14,0.24)]">
            <video
              src="/openrubricdemo.mp4"
              controls
              playsInline
              preload="metadata"
              className="block aspect-video w-full bg-black object-contain"
            >
              Your browser doesn&apos;t support embedded video.{" "}
              <a href="/openrubricdemo.mp4" className="underline">
                Download the demo
              </a>
              .
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}
