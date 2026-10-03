import type { BillingPeriod, PlanTier } from "@prisma/client";
import { getAnnualPricing, getPlanPriceCents } from "@/lib/plans";
import { formatINR } from "@/lib/money";

/**
 * One place that renders a plan's price, including the first-year annual
 * promo (struck-through list price, discounted price, "Save ₹X", renewal
 * price). Every figure comes from src/lib/plans.ts — nothing is hard-coded
 * here. `firstYearEligible` is false for a store that already got the promo.
 */
export function PlanPrice({
  tier,
  period,
  firstYearEligible = true,
  large = false,
}: {
  tier: PlanTier;
  period: BillingPeriod;
  firstYearEligible?: boolean;
  large?: boolean;
}) {
  const size = large ? "text-2xl" : "text-lg";
  if (period === "ANNUAL") {
    const p = getAnnualPricing(tier);
    if (p.hasFirstYearDiscount && firstYearEligible) {
      return (
        <div data-testid={`price-${tier}-annual`}>
          <p className="text-sm text-gray-400 line-through">{formatINR(p.originalCents)}/year</p>
          <p className={`${size} font-semibold text-gray-900`}>
            {formatINR(p.firstYearCents)}
            <span className="text-xs font-normal text-gray-500"> /year</span>
          </p>
          <p className="text-xs font-semibold text-green-700">Save {formatINR(p.discountCents)} on your first year</p>
          <p className="text-[11px] text-gray-500">Renews at {formatINR(p.renewalCents)}/year</p>
        </div>
      );
    }
  }
  return (
    <p className={`${size} font-semibold text-gray-900`} data-testid={`price-${tier}-${period.toLowerCase()}`}>
      {formatINR(getPlanPriceCents(tier, period))}
      <span className="text-xs font-normal text-gray-500">{period === "ANNUAL" ? " /year" : " /month"}</span>
    </p>
  );
}
