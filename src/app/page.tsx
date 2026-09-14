import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BhojSetuLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

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
    a: "Plans start at ₹499/month (menu, orders & billing, QR table ordering, UPI/COD checkout), with Advanced and Business tiers adding coupons, analytics, a kitchen display, and staff logins as you grow.",
  },
  {
    q: "Is my restaurant's data kept separate from other restaurants?",
    a: "Yes — every restaurant's menu, orders, and customers are fully isolated at the database level. Nothing is ever shared or mixed between restaurants.",
  },
];

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard");
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-[#05070d] dark:via-[#0b0f1a] dark:to-[#1e1147]">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-5 px-4 pt-20 pb-16 text-center">
        <BhojSetuLogo markSize={44} textClassName="text-2xl font-semibold text-gray-900" />
        <span className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1 text-xs font-semibold text-white">
          Real ordering for real restaurants
        </span>
        <h1 className="max-w-xl text-3xl font-bold text-gray-900 sm:text-4xl">
          Your restaurant, online in minutes
        </h1>
        <p className="max-w-md text-sm text-gray-600">
          Have a restaurant? Set up your own storefront below. If you&apos;re a customer, use the
          ordering link your restaurant gave you (e.g. <code>/r/your-restaurant</code>).
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700"
          >
            Set up your restaurant
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-gray-300 bg-white dark:bg-[#1e2939] px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Sign in
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="mb-6 text-center text-xl font-semibold text-gray-900">
          Frequently asked questions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-lg border border-gray-200 bg-white dark:bg-[#1e2939] p-4 shadow-sm open:shadow-md open:ring-1 open:ring-indigo-100"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 marker:content-none">
                <span className="flex items-start justify-between gap-2">
                  {faq.q}
                  <span className="mt-0.5 shrink-0 text-indigo-500 transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-sm text-gray-600">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
