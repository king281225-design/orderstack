import type { Metadata } from "next";
import { BUSINESS_NAME } from "@/lib/contact";

export const metadata: Metadata = { title: "Terms & Conditions · BhojSetu" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terms & Conditions</h1>
      <p className="mt-2 text-xs text-gray-500">Last updated: 2026-09-17</p>

      <Section title="1. About BhojSetu">
        <p>
          BhojSetu (&quot;we&quot;, &quot;us&quot;, &quot;the platform&quot;) is an online
          restaurant-ordering and management platform operated by {BUSINESS_NAME}. It lets a
          restaurant owner (&quot;you&quot;) create a digital storefront, manage a menu,
          receive and fulfil orders, and manage billing — and lets a restaurant&apos;s own
          customers browse that menu and place orders.
        </p>
      </Section>

      <Section title="2. Accounts">
        <p>
          You must provide accurate information when creating a restaurant account and are
          responsible for the accuracy of your menu, pricing, branding, and any staff logins
          you create under your account. You are responsible for keeping your login
          credentials secure.
        </p>
      </Section>

      <Section title="3. Subscription & billing">
        <p>
          Access to the platform is offered on paid subscription tiers (Starter, Advanced,
          Business), billed monthly or annually. Subscription payments are processed by
          Razorpay, a third-party payment processor — BhojSetu does not store your card or
          bank details. Your plan tier only changes once a payment is actually confirmed.
        </p>
        <p>
          You may cancel your subscription at any time from your dashboard; cancellation
          takes effect at the end of the current billing period unless stated otherwise.
        </p>
      </Section>

      <Section title="4. Your responsibilities">
        <p>
          You are solely responsible for the accuracy of your menu items, prices, and
          descriptions, and for fulfilling orders placed by your customers. BhojSetu provides
          the ordering infrastructure; it is not a party to the sale of food between you and
          your customers.
        </p>
      </Section>

      <Section title="5. Acceptable use">
        <p>
          You may not use the platform for any unlawful purpose, to defraud customers, or to
          attempt to access another restaurant&apos;s data. Each restaurant&apos;s data is isolated from
          every other restaurant on the platform.
        </p>
      </Section>

      <Section title="6. Limitation of liability">
        <p>
          BhojSetu is provided &quot;as is&quot;. To the maximum extent permitted by law, {BUSINESS_NAME}{" "}
          is not liable for indirect or consequential losses arising from your use of the
          platform, including disputes between you and your customers over individual food
          orders.
        </p>
      </Section>

      <Section title="7. Governing law">
        <p>These terms are governed by the laws of India.</p>
      </Section>

      <Section title="8. Contact">
        <p>
          Questions about these terms — see our{" "}
          <a href="/contact" className="text-indigo-600 hover:underline dark:text-indigo-400">
            Contact Us
          </a>{" "}
          page.
        </p>
      </Section>
    </div>
  );
}
