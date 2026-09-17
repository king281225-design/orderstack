import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFaq } from "@/components/landing/landing-faq";
import { PublicPricingTable } from "@/components/marketing/public-pricing-table";
import { TrustBadges } from "@/components/marketing/trust-badges";
import { TestimonialsSection, TESTIMONIALS } from "@/components/marketing/testimonials-section";

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
  {
    q: "Does this work with my POS system or kitchen printer?",
    a: "There's no separate POS terminal to buy — bills, invoices, and kitchen tickets print straight from your browser to any printer you already use, including thermal/receipt printers, right from your Orders and Billing pages. If you need a deeper integration with a specific POS system, get in touch and we'll see what's possible.",
  },
];

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-[#0f0b08] dark:via-[#1a120c] dark:to-[#3d1c05]">
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
