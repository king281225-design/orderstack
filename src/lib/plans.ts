import type { BillingPeriod, PlanTier } from "@prisma/client";

/** Free dashboard trial length — measured from the tenant's createdAt (see src/proxy.ts). */
export const TRIAL_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Pricing updated 2026-09-16 at the user's direct request: Starter ₹499/mo
 * (unchanged) + ₹4999/yr, Advanced ₹699/mo (was ₹999) + ₹7999/yr, Business
 * ₹999/mo (was ₹1999) + ₹9999/yr. This is what a restaurant pays *us* to use
 * the platform — a separate concern from a restaurant's own menu prices.
 *
 * `priceCents` is kept as the monthly price (unchanged field name/meaning,
 * so every existing "priceCents" call site — super-admin's plan table,
 * WELCOME100's one-time-discount math — still means what it always meant)
 * with `annualPriceCents` added alongside it for the new annual billing
 * option (see startTenantSubscription's `period` param).
 *
 * Feature lists here double as the actual gate (see FEATURES_BY_TIER below,
 * updated 2026-09-13 at the user's request) — keep this copy and that map
 * in sync when either changes. Business's "multiple outlet access" framing
 * (2026-09-16) is just marketing copy for "no device-limit restriction" —
 * see FEATURES_BY_TIER's own comment and src/lib/data/sessions.ts; it is
 * NOT real multi-location/multi-branch support, confirmed with the user.
 */
export const PLAN_DEFINITIONS: Record<
  PlanTier,
  { label: string; priceCents: number; annualPriceCents: number; features: string[] }
> = {
  STARTER: {
    label: "Starter",
    priceCents: 49900,
    annualPriceCents: 499900,
    features: [
      "Menu management",
      "Order management & billing (invoices, printable bills)",
      "QR table ordering",
      "Inventory & stock tracking with low-stock alerts",
      "KOT (Kitchen Order Ticket) screen & printing, by kitchen station",
      "UPI QR / Cash on delivery checkout",
      "1 device logged in at a time",
    ],
  },
  ADVANCED: {
    label: "Advanced",
    priceCents: 69900,
    annualPriceCents: 799900,
    features: [
      "Everything in Starter",
      "Coupons",
      "Analytics dashboard",
      "1 device logged in at a time",
    ],
  },
  BUSINESS: {
    label: "Business",
    priceCents: 99900,
    annualPriceCents: 999900,
    features: [
      "Everything in Advanced",
      "Kitchen display system",
      "Staff logins",
      "Multiple outlet access — log in from as many devices as you need",
    ],
  },
};

export const PLAN_TIERS: PlanTier[] = ["STARTER", "ADVANCED", "BUSINESS"];

export function getPlanPriceCents(tier: PlanTier, period: BillingPeriod): number {
  return period === "ANNUAL" ? PLAN_DEFINITIONS[tier].annualPriceCents : PLAN_DEFINITIONS[tier].priceCents;
}

/**
 * Actual plan-tier gating (added 2026-09-13 at the user's request — nothing
 * was gated before this). "menu"/"orders"/"tables"/"billing" cover the
 * ₹499 Starter set the user asked for explicitly: menu management, order
 * management, QR table ordering, and the billing/invoice module built the
 * same day. Coupons/analytics move up to Advanced, kitchen/staff to
 * Business — matching PLAN_DEFINITIONS' feature copy above.
 */
export type Feature = "menu" | "orders" | "tables" | "billing" | "inventory" | "kot" | "coupons" | "analytics" | "kitchen" | "staff";

const FEATURES_BY_TIER: Record<PlanTier, ReadonlySet<Feature>> = {
  STARTER: new Set(["menu", "orders", "tables", "billing", "inventory", "kot"]),
  ADVANCED: new Set(["menu", "orders", "tables", "billing", "inventory", "kot", "coupons", "analytics"]),
  BUSINESS: new Set(["menu", "orders", "tables", "billing", "inventory", "kot", "coupons", "analytics", "kitchen", "staff"]),
};

export function tierHasFeature(tier: PlanTier, feature: Feature): boolean {
  return FEATURES_BY_TIER[tier].has(feature);
}
