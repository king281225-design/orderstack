import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/shared/faq-accordion";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { PLAN_DEFINITIONS } from "@/lib/plans";
import { formatINR } from "@/lib/money";

export const metadata: Metadata = {
  title: "BhojSetu vs DineOpen",
  description:
    "How BhojSetu compares to DineOpen for restaurant ordering and billing — a focused direct-ordering platform vs a broader AI-driven restaurant operating system.",
  alternates: { canonical: "/compare/bhojsetu-vs-dineopen" },
  openGraph: {
    type: "website",
    title: "BhojSetu vs DineOpen — Restaurant Ordering & Billing Compared",
    description:
      "An honest comparison: BhojSetu's flat-fee direct-ordering platform vs DineOpen's broader, AI-agent-driven restaurant operating system.",
    url: `${SITE_URL}/compare/bhojsetu-vs-dineopen`,
  },
};

const ROWS: { label: string; bhojsetu: string; dineopen: string }[] = [
  {
    label: "Published pricing",
    bhojsetu: `Yes — flat plans from ${formatINR(PLAN_DEFINITIONS.STARTER.priceCents)}/month, every plan has the same core (menu, orders, billing, QR tables, inventory, KOT)`,
    dineopen: "Yes — tiered plans starting around ₹300/month for a single outlet, scaling up for multi-outlet chains; higher tiers unlock more of the AI/automation features",
  },
  {
    label: "Core focus",
    bhojsetu: "A direct ordering + billing platform: public menu link, QR table ordering, GST billing/KOT, and inventory, built to get a restaurant taking its own orders fast",
    dineopen: "A broader \"restaurant operating system\": cloud POS, an AI agent that takes orders by voice/chat, a waiter app, table reservations, and loyalty, aimed at automating more of front-of-house",
  },
  {
    label: "AI voice/chat ordering",
    bhojsetu: "Not offered — ordering is menu-browse-and-tap, by design, to keep the customer side simple with nothing to configure",
    dineopen: "A real, advertised differentiator — an AI agent that can take an order or answer a question by voice or chat",
  },
  {
    label: "Hardware required",
    bhojsetu: "None — dashboard and storefront both run in any phone/browser",
    dineopen: "None advertised either — also positioned as phone/tablet/laptop-based, no dedicated POS terminal required",
  },
  {
    label: "Setup",
    bhojsetu: "Self-serve sign-up, live in minutes, 7-day free trial",
    dineopen: "Self-serve with a 30-day free trial advertised on their site",
  },
  {
    label: "Inventory & KOT",
    bhojsetu: "Included in every plan from Starter — stock tracking with low-stock alerts and KOT tickets routed by kitchen station",
    dineopen: "Included per DineOpen's own feature list — inventory management and a kitchen display system",
  },
  {
    label: "Best fit",
    bhojsetu: "A cafe or restaurant that wants a fast, flat-fee direct ordering + billing channel without extra automation to configure",
    dineopen: "A restaurant or small chain that specifically wants AI-driven front-of-house automation (voice ordering, a waiter app, reservations) alongside billing",
  },
];

const FAQS = [
  {
    q: "Is BhojSetu cheaper than DineOpen?",
    a: `Both publish pricing, which is unusual in this market — most competitors don't. BhojSetu's flat plans start at ${formatINR(PLAN_DEFINITIONS.STARTER.priceCents)}/month with the full core feature set (menu, orders, billing, QR tables, inventory, KOT) at every tier. DineOpen's entry tier is advertised around ₹300/month but is scoped to a single outlet, with more of its AI/automation feature set gated to higher tiers — so the fair comparison depends on which specific features you need, not just the headline number. Check both pricing pages directly before deciding.`,
  },
  {
    q: "Does BhojSetu have AI voice ordering like DineOpen?",
    a: "No — that's a genuine feature DineOpen has that BhojSetu doesn't. BhojSetu's AI features are on the owner's side instead (AI-assisted menu import from a photo of a paper menu, AI-assisted stock entry from a supplier bill) rather than an AI agent that takes the customer's order.",
  },
  {
    q: "Which one should I actually pick?",
    a: "If you want a fast, flat-fee way for customers to order directly and for your team to bill, run KOT, and track stock — without extra automation to configure — BhojSetu is built for exactly that. If you specifically want AI-driven front-of-house features like voice ordering or a waiter app as part of the package, DineOpen's broader system is built around that.",
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

export default function BhojSetuVsDineOpenPage() {
  return (
    <div className="pb-16">
      <JsonLd data={faqJsonLd} />

      <div className="mx-auto max-w-3xl px-4 pt-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{SITE_NAME} vs DineOpen</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Both publish real pricing, which already puts them ahead of most of this market&apos;s quote-only
          competitors. Here&apos;s where they actually differ, so you can tell which one fits your restaurant.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl px-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>DineOpen</strong> positions itself as a broader restaurant operating system — cloud POS, an
          AI agent that takes orders by voice or chat, a waiter app, table reservations, loyalty, and
          analytics, with plans scaling from a single outlet up to multi-location chains.
        </p>
        <p className="mt-4 text-gray-700 dark:text-gray-300">
          <strong>{SITE_NAME}</strong> is a focused direct-ordering and billing platform — a public menu
          link, QR table ordering, GST-ready billing and KOT, and inventory, all included at every plan tier,
          with no hardware and self-serve sign-up.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl overflow-x-auto px-4">
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200 text-sm dark:border-white/10">
          <thead>
            <tr className="bg-gray-50 dark:bg-white/5">
              <th className="p-3 text-left font-semibold text-gray-900 dark:text-white">&nbsp;</th>
              <th className="p-3 text-left font-semibold text-gray-900 dark:text-white">{SITE_NAME}</th>
              <th className="p-3 text-left font-semibold text-gray-900 dark:text-white">DineOpen</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.label} className={i % 2 === 1 ? "bg-gray-50/50 dark:bg-white/[0.02]" : ""}>
                <td className="p-3 align-top font-medium text-gray-900 dark:text-white">{row.label}</td>
                <td className="p-3 align-top text-gray-700 dark:text-gray-300">{row.bhojsetu}</td>
                <td className="p-3 align-top text-gray-700 dark:text-gray-300">{row.dineopen}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-500">
          DineOpen details above reflect what&apos;s published on their own site as of October 2026 — confirm
          current specifics directly with DineOpen before deciding, especially which features sit behind
          which plan tier.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl px-4">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Frequently asked questions</h2>
        <FaqAccordion faqs={FAQS} columns={2} />
      </div>

      <div className="mx-auto mt-12 max-w-3xl px-4">
        <div className="rounded-xl border border-gray-200 bg-indigo-50 p-6 text-center dark:border-gray-700 dark:bg-indigo-500/10">
          <p className="font-medium text-gray-900 dark:text-white">
            Want the simpler, flat-fee option?
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Start a 7-day free trial (no card required) and your storefront is live in minutes.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
            >
              Start 7-day free trial
            </Link>
            <Link
              href="/pricing"
              className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:border-indigo-400 dark:border-gray-600 dark:text-gray-300"
            >
              See full pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
