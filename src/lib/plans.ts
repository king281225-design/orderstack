import type { PlanTier } from "@prisma/client";

/**
 * Pricing the user gave directly: Starter ₹499, Advanced ₹999, Business
 * ₹1999. This is what a restaurant pays *us* to use the platform — a
 * separate concern from a restaurant's own menu prices.
 *
 * Feature lists here double as the actual gate (see FEATURES_BY_TIER below,
 * updated 2026-09-13 at the user's request) — keep this copy and that map
 * in sync when either changes.
 */
export const PLAN_DEFINITIONS: Record<
  PlanTier,
  { label: string; priceCents: number; features: string[] }
> = {
  STARTER: {
    label: "Starter",
    priceCents: 49900,
    features: [
      "Menu management",
      "Order management & billing (invoices, printable bills)",
      "QR table ordering",
      "UPI QR / Cash on delivery checkout",
    ],
  },
  ADVANCED: {
    label: "Advanced",
    priceCents: 99900,
    features: ["Everything in Starter", "Coupons", "Analytics dashboard"],
  },
  BUSINESS: {
    label: "Business",
    priceCents: 199900,
    features: ["Everything in Advanced", "Kitchen display system", "Staff logins"],
  },
};

export const PLAN_TIERS: PlanTier[] = ["STARTER", "ADVANCED", "BUSINESS"];

/**
 * Actual plan-tier gating (added 2026-09-13 at the user's request — nothing
 * was gated before this). "menu"/"orders"/"tables"/"billing" cover the
 * ₹499 Starter set the user asked for explicitly: menu management, order
 * management, QR table ordering, and the billing/invoice module built the
 * same day. Coupons/analytics move up to Advanced, kitchen/staff to
 * Business — matching PLAN_DEFINITIONS' feature copy above.
 */
export type Feature = "menu" | "orders" | "tables" | "billing" | "coupons" | "analytics" | "kitchen" | "staff";

const FEATURES_BY_TIER: Record<PlanTier, ReadonlySet<Feature>> = {
  STARTER: new Set(["menu", "orders", "tables", "billing"]),
  ADVANCED: new Set(["menu", "orders", "tables", "billing", "coupons", "analytics"]),
  BUSINESS: new Set(["menu", "orders", "tables", "billing", "coupons", "analytics", "kitchen", "staff"]),
};

export function tierHasFeature(tier: PlanTier, feature: Feature): boolean {
  return FEATURES_BY_TIER[tier].has(feature);
}
