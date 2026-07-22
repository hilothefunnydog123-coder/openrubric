import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ROUTES, SITE } from "@/lib/constants";

/**
 * DESIGN.md 4.10: the full catalog lives here so the page above can be about
 * one thing.
 */
const COLUMNS: { heading: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Judge demo", href: ROUTES.judgeDashboard },
      { label: "Demo video", href: ROUTES.video },
      { label: "Bring us to your event", href: ROUTES.request },
      { label: "Pricing", href: ROUTES.pricing },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Docs", href: ROUTES.docs },
      { label: "GitHub", href: SITE.githubUrl, external: true },
      { label: "Report an issue", href: ROUTES.feedback },
      { label: "Contact", href: ROUTES.contact },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: ROUTES.terms },
      { label: "Privacy", href: ROUTES.privacy },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-canvas">
      <div className="mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,34px)] pb-10 pt-[clamp(40px,5vw,64px)]">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_0.8fr]">
          <div>
            <Link href={ROUTES.home} className="text-ink">
              <Logo />
            </Link>
            <p className="mt-4 max-w-[30ch] text-[14px] font-medium leading-[1.6] text-ink">
              Open judging infrastructure for fairer hackathons.
            </p>
            <p className="kicker mt-5 text-ink/70">MIT licensed · Self-hostable · Nonprofit</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="kicker mb-4 text-ink/70">{col.heading}</p>
              <ul className="flex flex-col gap-2.5 text-[14px] font-semibold text-ink">
                {col.links.map((l) =>
                  l.external ? (
                    <li key={l.label}>
                      <a href={l.href} target="_blank" rel="noreferrer" className="link-underline">
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link href={l.href} className="link-underline">
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-12 border-t border-line pt-6 text-[11.5px] font-medium leading-[1.6] text-ink/70">
          OpenRubric surfaces evidence about submissions, including public GitHub activity, so
          organizers can ask better questions. It never makes accusations or final decisions, and
          it stores only what organizers import. © {new Date().getFullYear()} OpenRubric.
        </p>
      </div>

      {/* The wordmark as architecture: set at viewport scale, clipped by the page
          edge and faded out at the bottom. Decorative only — the real logo and
          site name are already above, so this is aria-hidden. */}
      <div aria-hidden className="relative overflow-hidden">
        <div className="mask-fade-b select-none px-[clamp(18px,4vw,34px)]">
          <span className="block translate-y-[0.18em] whitespace-nowrap text-center font-display text-[clamp(3.5rem,15.5vw,15rem)] font-extrabold leading-[0.78] tracking-[-0.055em] text-ink/[0.07]">
            OpenRubric
          </span>
        </div>
      </div>
    </footer>
  );
}
