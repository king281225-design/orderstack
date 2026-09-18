import type { Metadata } from "next";
import { BUSINESS_NAME } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "BhojSetu's refund and cancellation policy for platform subscriptions.",
  alternates: { canonical: "/refund" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{children}</div>
    </section>
  );
}

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Refund & Cancellation Policy</h1>
      <p className="mt-2 text-xs text-gray-500">Last updated: 2026-09-17</p>

      <Section title="Platform subscription">
        <p>
          This policy covers your BhojSetu platform subscription (the fee your restaurant
          pays to use BhojSetu) — not the food orders your customers place with you.
        </p>
        <p>
          You may cancel your subscription at any time from your dashboard&apos;s billing page.
          Cancellation stops future billing; it does not retroactively refund the current
          billing period unless required by law.
        </p>
        <p>
          If you believe you were charged in error, contact us within 7 days of the charge and
          we&apos;ll review it.
        </p>
      </Section>

      <Section title="Customer food orders">
        <p>
          BhojSetu is ordering infrastructure for restaurants — it is not a marketplace that
          holds customer payments. Refunds or cancellations for a specific food order (wrong
          item, late delivery, quality issue, etc.) are between the customer and the
          restaurant they ordered from, not BhojSetu.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Billing questions — see our{" "}
          <a href="/contact" className="text-indigo-600 hover:underline dark:text-indigo-400">
            Contact Us
          </a>{" "}
          page. BhojSetu is operated by {BUSINESS_NAME}.
        </p>
      </Section>
    </div>
  );
}
