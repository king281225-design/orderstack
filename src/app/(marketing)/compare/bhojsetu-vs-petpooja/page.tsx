import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/shared/faq-accordion";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { PLAN_DEFINITIONS } from "@/lib/plans";
import { formatINR } from "@/lib/money";

export const metadata: Metadata = {
  title: "BhojSetu vs Petpooja",
  description:
    "How BhojSetu compares to Petpooja for restaurant ordering and billing — transparent flat pricing vs a quote-only full POS system, and who each one actually fits.",
  alternates: { canonical: "/compare/bhojsetu-vs-petpooja" },
  openGraph: {
    type: "website",
    title: "BhojSetu vs Petpooja — Restaurant Ordering & Billing Compared",
    description:
      "An honest comparison: BhojSetu's transparent, flat-fee direct-ordering platform vs Petpooja's full quote-only restaurant POS system.",
    url: `${SITE_URL}/compare/bhojsetu-vs-petpooja`,
  },
};

const ROWS: { label: string; bhojsetu: string; petpooja: string }[] = [
  { label: "Published pricing", bhojsetu: `Yes — plans from ${formatINR(PLAN_DEFINITIONS.STARTER.priceCents)}/month, listed on our own pricing page`, petpooja: "Not published — you book a demo and get a custom quote from their sales team" },
  { label: "Setup", bhojsetu: "Self-serve sign-up, live in minutes", petpooja: "Sales-assisted onboarding via a demo call" },
  { label: "Hardware required", bhojsetu: "None — runs in any phone/browser, owner and customer alike", petpooja: "A dedicated POS terminal (Android tablet or Windows PC) for billing" },
  { label: "Per-order commission", bhojsetu: "None — flat monthly fee regardless of order volume", petpooja: "None on its own billing, though third-party aggregator integrations are separate" },
  { label: "Core focus", bhojsetu: "Direct customer ordering — public menu link, QR table ordering, UPI/COD checkout", petpooja: "In-house POS/billing — KOT, table management, inventory, staff, and reporting" },
  { label: "Online ordering / QR menu", bhojsetu: "Built in, the product's main focus", petpooja: "Available as part of the broader POS suite" },
  { label: "Inventory & payroll", bhojsetu: "Not offered — out of scope by design", petpooja: "Included — raw-material tracking, low-stock alerts, staff attendance" },
  { label: "Best fit", bhojsetu: "Cafes and restaurants that want a direct ordering channel fast, without hardware or a sales call", petpooja: "Larger or multi-outlet restaurants that need a full in-house POS, inventory, and staff-management system" },
];

const FAQS = [
  {
    q: "Is BhojSetu cheaper than Petpooja?",
    a: `BhojSetu's pricing is published and starts at ${formatINR(PLAN_DEFINITIONS.STARTER.priceCents)}/month. Petpooja doesn't publish pricing publicly — you get a quote after a demo call, and several independent reviews report meaningful hardware and setup costs on top of the subscription. Because Petpooja's real cost depends on your specific deal, the fairest comparison is that BhojSetu's cost is transparent upfront and Petpooja's isn't.`,
  },
  {
    q: "Does BhojSetu have inventory management like Petpooja?",
    a: "No — BhojSetu is deliberately focused on the ordering and billing side (menu, orders, invoices, QR table ordering) rather than being a full restaurant ERP. If you need raw-material inventory tracking and staff payroll in the same system, Petpooja's broader suite covers that; BhojSetu doesn't try to.",
  },
  {
    q: "Do I need to buy a POS terminal to use BhojSetu?",
    a: "No. BhojSetu runs entirely in a browser — your dashboard works from any phone, tablet, or computer, and customers order from their own phone by scanning a QR code or visiting your link. Petpooja, like most traditional POS systems, is built around a dedicated billing terminal.",
  },
  {
    q: "Can I switch from Petpooja to BhojSetu?",
    a: "Yes — sign up, rebuild your menu (by hand, by uploading a photo of your existing menu, or with AI-assisted import), and your storefront is live. There's no contract lock-in on BhojSetu's side to worry about; check your own Petpooja agreement for any notice period on theirs.",
  },
  {
    q: "Which one should I actually pick?",
    a: "If you mainly want a fast, affordable way for customers to order directly (dine-in QR, takeaway, delivery) without buying hardware, BhojSetu fits that directly. If you're running a larger operation that needs in-house billing hardware, inventory, and payroll all in one system, Petpooja's broader POS suite is built for that — the two aren't solving quite the same problem.",
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

export default function BhojSetuVsPetpoojaPage() {
  return (
    <div className="pb-16">
      <JsonLd data={faqJsonLd} />

      <div className="mx-auto max-w-3xl px-4 pt-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{SITE_NAME} vs Petpooja</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          These aren&apos;t quite the same product, and pretending otherwise wouldn&apos;t be useful to you. Here&apos;s an
          honest look at what each one actually does, so you can tell which one fits your restaurant.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl px-4">
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Petpooja</strong> is a full restaurant point-of-sale and management suite — billing, KOT, table
          management, inventory, staff attendance, and dozens of integrations, typically run from a dedicated POS
          terminal and set up through a sales-assisted demo. It&apos;s built for restaurants that want one system
          running their entire back-of-house operation.
        </p>
        <p className="mt-4 text-gray-700 dark:text-gray-300">
          <strong>{SITE_NAME}</strong> is a direct-ordering platform — a public menu link, QR table ordering,
          UPI/COD checkout, and a live order dashboard, with no hardware to buy and self-serve sign-up. It&apos;s built
          for restaurants that want customers ordering directly, fast, without taking on a full POS project.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl overflow-x-auto px-4">
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-gray-200 text-sm dark:border-white/10">
          <thead>
            <tr className="bg-gray-50 dark:bg-white/5">
              <th className="p-3 text-left font-semibold text-gray-900 dark:text-white">&nbsp;</th>
              <th className="p-3 text-left font-semibold text-gray-900 dark:text-white">{SITE_NAME}</th>
              <th className="p-3 text-left font-semibold text-gray-900 dark:text-white">Petpooja</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.label} className={i % 2 === 1 ? "bg-gray-50/50 dark:bg-white/[0.02]" : ""}>
                <td className="p-3 align-top font-medium text-gray-900 dark:text-white">{row.label}</td>
                <td className="p-3 align-top text-gray-700 dark:text-gray-300">{row.bhojsetu}</td>
                <td className="p-3 align-top text-gray-700 dark:text-gray-300">{row.petpooja}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-500">
          Petpooja doesn&apos;t publish pricing or a full public feature list, so the details above reflect what&apos;s
          publicly documented on their own site and independent reviews as of September 2026 — confirm current
          specifics directly with Petpooja before deciding.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl px-4">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Frequently asked questions</h2>
        <FaqAccordion faqs={FAQS} columns={2} />
      </div>

      <div className="mx-auto mt-12 max-w-3xl px-4">
        <div className="rounded-xl border border-gray-200 bg-indigo-50 p-6 text-center dark:border-gray-700 dark:bg-indigo-500/10">
          <p className="font-medium text-gray-900 dark:text-white">
            Want to see BhojSetu without booking a demo call?
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Sign up free and your storefront is live in minutes — see it before you decide.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
            >
              Get started free
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
