import { MarketingNav } from "@/components/marketing/marketing-nav";
import { LandingHero } from "@/components/marketing/landing-hero";
import { TrustTicker } from "@/components/marketing/trust-ticker";
import { ProofStrip } from "@/components/marketing/proof-strip";
import { DarkProductSection } from "@/components/marketing/dark-product-section";
import { ReviewSignals } from "@/components/marketing/review-signals";
import { ActMechanism } from "@/components/marketing/act-mechanism";
import { OfferPanel } from "@/components/marketing/offer-panel";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollProgress } from "@/components/ui/motion-fx";

/**
 * DESIGN.md page anatomy, in exact order:
 * announcement bar + header (MarketingNav) → hero panel → ticker → proof strip →
 * act 01 proof → act 02 signature → act 03 mechanism → offer panel → footer.
 * Everything else (video, pricing, docs) lives in the footer catalog.
 */
export default function HomePage() {
  return (
    <>
      <ScrollProgress />
      <MarketingNav />
      <main>
        <LandingHero />
        <TrustTicker />
        <ProofStrip />
        <DarkProductSection id="product" />
        <ReviewSignals />
        <ActMechanism id="docs" />
        <OfferPanel />
      </main>
      <SiteFooter />
    </>
  );
}
