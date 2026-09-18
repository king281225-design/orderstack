import type { Metadata } from "next";
import Link from "next/link";
import { PublicPricingTable } from "@/components/marketing/public-pricing-table";
import { FaqAccordion } from "@/components/shared/faq-accordion";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { PLAN_DEFINITIONS, PLAN_TIERS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "BhojSetu pricing: flat monthly plans starting at ₹499 — no per-order commission. Menu, orders, billing, and QR table ordering included on every plan.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    title: "BhojSetu Pricing — Plans from ₹499/month, No Per-Order Commission",
    description:
      "Flat monthly pricing for restaurant ordering software in India — menu, orders, billing, and QR table ordering, with no commission taken per order.",
    url: `${SITE_URL}/pricing`,
  },
};

const PRICING_FAQS = [
  {
    q: "Does BhojSetu take a commission per order?",
    a: "No. BhojSetu charges a flat monthly (or annual) subscription fee based on your plan — never a percentage of your order value. Customers pay you directly via UPI QR code or cash on delivery.",
  },
  {
    q: "Can I try it before paying?",
    a: "Yes — every new restaurant account gets a 7-day free trial of the full dashboard (menu setup, branding, order flow), with no credit card required. Subscribe to a plan when you're ready to keep going.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, from your dashboard's billing page at any time. Cancellation stops future billing; see our refund and cancellation policy for the full details.",
  },
  {
    q: "What's the difference between the plans?",
    a: "Every plan includes menu management, order management with billing/invoices, QR table ordering, inventory & stock tracking, KOT (kitchen order tickets), and UPI/COD checkout. Advanced adds coupons and analytics; Business adds a kitchen display and staff logins.",
  },
  {
    q: "Is there a setup fee or contract?",
    a: "No setup fee and no long-term contract — plans are billed monthly or annually and can be cancelled at any time.",
  },
];

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${SITE_NAME} — Restaurant Ordering Platform`,
  description: "Restaurant ordering, menu, billing, and QR table ordering software for restaurants in India.",
  brand: { "@type": "Brand", name: SITE_NAME },
  offers: PLAN_TIERS.map((tier) => {
    const def = PLAN_DEFINITIONS[tier];
    return {
      "@type": "Offer",
      name: `${def.label} plan`,
      price: (def.priceCents / 100).toFixed(2),
      priceCurrency: "INR",
      url: `${SITE_URL}/pricing`,
      priceValidUntil: "2027-12-31",
    };
  }),
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PRICING_FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function PricingPage() {
  return (
    <div className="pb-16">
      <JsonLd data={productJsonLd} />
      <JsonLd data={faqJsonLd} />

      <div className="mx-auto max-w-3xl px-4 pt-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          BhojSetu Pricing — Flat Monthly Plans, No Per-Order Commission
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Most restaurant ordering software in India takes a cut of every order. BhojSetu doesn&apos;t — pick a plan,
          pay a flat monthly fee, and keep 100% of what your customers pay you.
        </p>
      </div>

      <PublicPricingTable />

      <div className="mx-auto max-w-3xl px-4">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Frequently asked questions</h2>
        <FaqAccordion faqs={PRICING_FAQS} columns={2} />

        <p className="mt-8 text-sm text-gray-500">
          Questions about a plan? See our{" "}
          <Link href="/contact" className="text-indigo-600 hover:underline dark:text-indigo-400">
            Contact Us
          </Link>{" "}
          page, or read the{" "}
          <Link href="/refund" className="text-indigo-600 hover:underline dark:text-indigo-400">
            refund &amp; cancellation policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
