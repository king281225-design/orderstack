import type { PlanTier } from "@prisma/client";

/**
 * Pricing the user gave directly: Starter ₹499, Advanced ₹999, Business
 * ₹1999. This is what a restaurant pays *us* to use the platform — a
 * separate concern from a restaurant's own menu prices.
 *
 * Feature lists here are informational copy only (shown in super-admin),
 * not enforced anywhere in the app yet — which existing modules (coupons?
 * analytics? kitchen display?) should actually be gated behind which tier
 * wasn't specified, so nothing has been locked behind a paywall. Flag this
 * to the user before treating any tier as actually restricting access.
 */
export const PLAN_DEFINITIONS: Record<
  PlanTier,
  { label: string; priceCents: number; features: string[] }
> = {
  STARTER: {
    label: "Starter",
    priceCents: 49900,
    features: ["Menu management", "Order dashboard", "UPI QR / Cash on delivery"],
  },
  ADVANCED: {
    label: "Advanced",
    priceCents: 99900,
    features: ["Everything in Starter", "Coupons", "QR table ordering", "Analytics dashboard"],
  },
  BUSINESS: {
    label: "Business",
    priceCents: 199900,
    features: [
      "Everything in Advanced",
      "Kitchen display system",
      "Staff logins",
      "Online payment (Razorpay)",
    ],
  },
};

export const PLAN_TIERS: PlanTier[] = ["STARTER", "ADVANCED", "BUSINESS"];
