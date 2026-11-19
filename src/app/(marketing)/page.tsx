import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFaq } from "@/components/landing/landing-faq";
import { PublicPricingTable } from "@/components/marketing/public-pricing-table";
import { TrustBadges } from "@/components/marketing/trust-badges";
import { TestimonialsSection, TESTIMONIALS } from "@/components/marketing/testimonials-section";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL, SITE_NAME, ORG_JSON_LD_ID } from "@/lib/site";
import { PLAN_DEFINITIONS, PLAN_TIERS } from "@/lib/plans";
import { HOME_FAQS as FAQS } from "@/lib/home-faqs";

// The homepage previously had no metadata of its own, silently inheriting
// the root layout's generic default — the single most-visited, most-linked
// page on the site was the one page without its own tuned title/description.
// title.absolute bypasses the root's "%s · BhojSetu" template so the brand
// name leads once, not twice (this is the one page people search for by
// brand name — "bhojsetu" — so it belongs at the front, not appended twice).
const HOME_TITLE = "BhojSetu — Restaurant Ordering & Billing Software for India";
const HOME_DESCRIPTION =
  "BhojSetu is an all-in-one restaurant platform for India — online menu, QR table ordering, KOT, billing and inventory, with UPI/COD checkout. 7-day free trial.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

// Prices are read from the same PLAN_DEFINITIONS the real /pricing page and
// checkout flow use — never hand-typed here, so this can't quietly drift out
// of sync with an actual price change. No aggregateRating: there's no real,
// verifiable review dataset behind this site yet, and schema.org ratings
// are meant to reflect genuine collected reviews, not be invented for SEO.
const planPrices = PLAN_TIERS.map((tier) => PLAN_DEFINITIONS[tier].priceCents / 100);
const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: HOME_DESCRIPTION,
  areaServed: "IN",
  publisher: { "@id": ORG_JSON_LD_ID },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    lowPrice: Math.min(...planPrices),
    highPrice: Math.max(...planPrices),
    offerCount: planPrices.length,
  },
};

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-[#0f0b08] dark:via-[#1a120c] dark:to-[#3d1c05]">
      <JsonLd data={faqJsonLd} />
      <JsonLd data={softwareAppJsonLd} />
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <LandingHero />
      <LandingFeatures />
      <PublicPricingTable />
      <TrustBadges />
      <TestimonialsSection testimonials={TESTIMONIALS} />
      <LandingFaq faqs={FAQS} />
    </div>
  );
}
