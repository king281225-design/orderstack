"use client";

import { useState } from "react";
import type { BillingPeriod } from "@prisma/client";
import { PLAN_DEFINITIONS, PLAN_TIERS, getPlanPriceCents } from "@/lib/plans";
import { formatINR } from "@/lib/money";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { WelcomeCouponForm } from "@/components/billing/welcome-coupon-form";

/**
 * Owns the Monthly/Annual toggle for the "Choose a plan" section — a client
 * component since the selected period is pure UI state, not anything that
 * needs a server round-trip until Subscribe is actually clicked.
 * WELCOME100 (see WelcomeCouponForm) only ever discounts the monthly price
 * (it's a one-time "first month" purchase, not a recurring subscription
 * itself — see src/lib/data/tenants.ts's own comment) so it's shown only
 * while Monthly is selected, to avoid implying it applies to an annual plan.
 */
export function PlanCards({
  keyId,
  restaurantName,
  welcomeCouponEligible,
}: {
  keyId: string;
  restaurantName: string;
  welcomeCouponEligible: boolean;
}) {
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");

  return (
    <section>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Choose a plan</h3>
        <div className="flex rounded-md border border-gray-300 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setPeriod("MONTHLY")}
            className={`rounded px-3 py-1 ${period === "MONTHLY" ? "bg-indigo-600 text-white" : "text-gray-600"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setPeriod("ANNUAL")}
            className={`rounded px-3 py-1 ${period === "ANNUAL" ? "bg-indigo-600 text-white" : "text-gray-600"}`}
          >
            Annual
          </button>
        </div>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        Pick a plan and pay for it yourself, billed automatically via Razorpay —{" "}
        {period === "ANNUAL" ? "once a year" : "every month"}. Your plan only changes once payment
        actually goes through — picking one here doesn&apos;t charge anything until you complete the
        checkout.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PLAN_TIERS.map((tier) => {
          const def = PLAN_DEFINITIONS[tier];
          const priceCents = getPlanPriceCents(tier, period);
          return (
            <div
              key={tier}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4"
            >
              <p className="text-sm font-semibold text-gray-900">{def.label}</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatINR(priceCents)}
                <span className="text-xs font-normal text-gray-500">
                  {period === "ANNUAL" ? " /year" : " /month"}
                </span>
              </p>
              <ul className="mb-1 flex-1 text-xs text-gray-500">
                {def.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <SubscribeButton
                keyId={keyId}
                restaurantName={restaurantName}
                tier={tier}
                period={period}
                label={`Subscribe to ${def.label} (${period === "ANNUAL" ? "Annual" : "Monthly"})`}
              />
              {welcomeCouponEligible && period === "MONTHLY" && (
                <WelcomeCouponForm keyId={keyId} restaurantName={restaurantName} tier={tier} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
