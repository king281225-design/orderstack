"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { BillingPeriod } from "@prisma/client";
import { PLAN_DEFINITIONS, PLAN_TIERS } from "@/lib/plans";
import { PlanPrice } from "@/components/billing/plan-price";
import { useScrollReveal } from "@/components/landing/use-scroll-reveal";
import { trackEvent } from "@/lib/analytics/track-event";

/**
 * A public, read-only pricing table for the homepage — reuses the same
 * PLAN_DEFINITIONS data as src/components/billing/plan-cards.tsx (the
 * post-login /dashboard/billing page), but deliberately doesn't reuse that
 * component's SubscribeButton/WelcomeCouponForm, since those trigger real
 * Razorpay checkout and need a logged-in tenant. Every CTA here just links
 * to /signup — a visitor picks a plan by creating an account first, exactly
 * how signup already works (it's free; no payment happens at signup).
 */
export function PublicPricingTable() {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");

  // Fires once per page load the first time the pricing section scrolls
  // into view — reuses the same ref useScrollReveal already attaches to
  // the section below, via its own independent IntersectionObserver.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackEvent("pricing_view");
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return (
    <section ref={ref} id="pricing" className="mx-auto max-w-5xl px-4 pb-16">
      <div className={`reveal text-center ${visible ? "is-visible" : ""}`}>
        <h2 className="text-xl font-semibold text-gray-900">Simple, pocket-friendly pricing</h2>
        <p className="mt-1 text-sm text-gray-500">Start with a 7-day free trial — no card required. Pick a plan once you&apos;re ready.</p>
        <div className="mt-4 inline-flex rounded-md border border-gray-300 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setPeriod("MONTHLY");
              trackEvent("pricing_toggle", { billing_period: "MONTHLY" });
            }}
            className={`rounded px-3 py-1 ${period === "MONTHLY" ? "bg-indigo-700 text-white" : "text-gray-600"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => {
              setPeriod("ANNUAL");
              trackEvent("pricing_toggle", { billing_period: "ANNUAL" });
            }}
            className={`rounded px-3 py-1 ${period === "ANNUAL" ? "bg-indigo-700 text-white" : "text-gray-600"}`}
          >
            Annual
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLAN_TIERS.map((tier, i) => {
          const def = PLAN_DEFINITIONS[tier];
          return (
            <div
              key={tier}
              className={`reveal flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md dark:bg-[#241d17] ${visible ? "is-visible" : ""}`}
              style={{ "--reveal-delay": `${i * 100}ms` } as CSSProperties}
            >
              <p className="text-sm font-semibold text-gray-900">{def.label}</p>
              <PlanPrice tier={tier} period={period} large />
              <ul className="mb-1 flex-1 text-xs text-gray-500">
                {def.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <Link
                href="/signup"
                data-ga-event="trial_cta_click"
                data-ga-params={JSON.stringify({ location: "pricing", plan: tier })}
                className="mt-2 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-center text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Start 7-day free trial
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
