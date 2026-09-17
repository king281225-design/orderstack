import type { Metadata } from "next";
import { BUSINESS_NAME } from "@/lib/contact";

export const metadata: Metadata = { title: "Privacy Policy · BhojSetu" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
      <p className="mt-2 text-xs text-gray-500">Last updated: 2026-09-17</p>

      <Section title="1. What we collect">
        <p>
          Restaurant accounts: your name, email, and password (stored as a secure hash, never
          in plain text), your restaurant&apos;s menu, branding, and order data.
        </p>
        <p>
          Customer orders placed on a restaurant&apos;s storefront: the phone number, name, and
          delivery address (if given) a customer enters at checkout, and the order itself.
        </p>
      </Section>

      <Section title="2. How data is isolated">
        <p>
          Every restaurant&apos;s menu, orders, and customer data are stored in a database with
          tenant-level isolation enforced at the query level — one restaurant&apos;s data is never
          mixed with or exposed to another restaurant.
        </p>
      </Section>

      <Section title="3. Third parties we use">
        <p>
          <strong>Razorpay</strong> processes subscription payments and, where enabled, online
          order payments — we don&apos;t store your card/bank details ourselves.
        </p>
        <p>
          <strong>Cloudflare R2</strong> stores uploaded images (menu item photos, logos).
        </p>
        <p>We do not sell your data to third parties.</p>
      </Section>

      <Section title="4. Your choices">
        <p>
          You can edit or remove your restaurant&apos;s own menu/branding data at any time from
          your dashboard. To request deletion of your account or data, contact us directly.
        </p>
      </Section>

      <Section title="5. Contact">
        <p>
          Privacy questions or requests — see our{" "}
          <a href="/contact" className="text-indigo-600 hover:underline dark:text-indigo-400">
            Contact Us
          </a>{" "}
          page. BhojSetu is operated by {BUSINESS_NAME}.
        </p>
      </Section>
    </div>
  );
}
