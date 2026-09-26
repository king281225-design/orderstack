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
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { PLAN_DEFINITIONS, PLAN_TIERS } from "@/lib/plans";

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

const FAQS = [
  {
    q: "What is BhojSetu?",
    a: "A complete ordering platform for restaurants — a public menu page for your customers, a live order dashboard for your team, and a kitchen/staff/billing toolkit behind it. You get a real storefront link (bhojsetu.in/r/your-restaurant) in minutes.",
  },
  {
    q: "How do customers place an order — do they need to download an app?",
    a: "No app needed. Customers open your storefront link (or scan a table QR code for dine-in), browse your menu, and check out in the browser. They can pay via UPI QR code or cash on delivery.",
  },
  {
    q: "How do I get my own restaurant set up?",
    a: "Sign up, add your menu (type items in by hand, upload a photo/PDF of your paper menu, or let AI read it in for you), set your brand colors and logo, and your storefront is live.",
  },
  {
    q: "Can I use this for dine-in with table QR codes?",
    a: "Yes — generate a QR code per table from your dashboard. Scanning it opens your menu with the table number pre-filled at checkout, no typing needed.",
  },
  {
    q: "What does it cost?",
    a: "Plans start at ₹499/month (menu, orders & billing, QR table ordering, inventory & stock tracking, KOT tickets, UPI/COD checkout), with Advanced and Business tiers adding coupons, analytics, a kitchen display, and staff logins as you grow. Every new account starts with a 7-day free trial — no credit card required.",
  },
  {
    q: "Is my restaurant's data kept separate from other restaurants?",
    a: "Yes — every restaurant's menu, orders, and customers are fully isolated at the database level. Nothing is ever shared or mixed between restaurants.",
  },
  {
    q: "Does this work with my POS system or kitchen printer?",
    a: "There's no separate POS terminal to buy — bills, invoices, and KOT (kitchen order tickets, split by station) print straight from your browser to any printer you already use, including thermal/receipt printers, right from your Orders and Billing pages. If you need a deeper integration with a specific POS system, get in touch and we'll see what's possible.",
  },
];

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
