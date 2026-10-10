import type { BillingPeriod, PlanTier } from "@prisma/client";

/** Free dashboard trial length — measured from the tenant's createdAt (see src/proxy.ts). */
export const TRIAL_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
/** Bounds for the super-admin's per-tenant trial-length override (Tenant.trialDays). */
export const TRIAL_DAYS_MIN = 1;
export const TRIAL_DAYS_MAX = 365;

/**
 * Trial length in ms for one tenant — TRIAL_DAYS unless the super-admin has
 * set a per-tenant override (Tenant.trialDays, null = platform default).
 */
export function trialMsFor(trialDays: number | null | undefined): number {
  const days = trialDays && trialDays > 0 ? trialDays : TRIAL_DAYS;
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Where a tenant stands against the free trial (same rule src/proxy.ts and
 * the owner dashboard use): a paid/overridden tenant (subscriptionStatus
 * ACTIVE) has no trial clock; otherwise it runs trialMsFor(trialDays) from
 * createdAt.
 */
export function trialState(
  createdAt: Date,
  subscriptionStatus: string,
  now: number,
  trialDays?: number | null,
): { kind: "full" } | { kind: "trial"; daysLeft: number } | { kind: "ended" } {
  if (subscriptionStatus === "ACTIVE") return { kind: "full" };
  const msLeft = createdAt.getTime() + trialMsFor(trialDays) - now;
  return msLeft > 0 ? { kind: "trial", daysLeft: Math.ceil(msLeft / 86_400_000) } : { kind: "ended" };
}

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
 * in sync when either changes. As of 2026-10-03 Advanced and Business include real
 * multi-store support (the "multiStore" feature: a Business account with a
 * store switcher and a central dashboard, src/lib/data/business.ts); the
 * "no device limit" behaviour (src/lib/data/sessions.ts) is separate.
 */
export const PLAN_DEFINITIONS: Record<
  PlanTier,
  {
    label: string;
    /** Monthly price. */
    priceCents: number;
    /** Annual list price — also what the plan renews at after the first year. */
    annualPriceCents: number;
    /** Off the FIRST annual payment only (0 = no promo). Renewal is back at annualPriceCents. */
    annualFirstYearDiscountCents: number;
    features: string[];
    status: "ACTIVE" | "RETIRED";
  }
> = {
  STARTER: {
    label: "Starter",
    priceCents: 49900,
    annualPriceCents: 499900,
    annualFirstYearDiscountCents: 0,
    status: "ACTIVE",
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
    // 2026-10-03: ₹999 off the first year (₹7,999 → ₹7,000); renews at ₹7,999.
    annualFirstYearDiscountCents: 99900,
    status: "ACTIVE",
    features: [
      "Everything in Starter",
      "Coupons",
      "Loyalty points & WhatsApp win-back offers",
      "Analytics dashboard",
      "Multi-store: manage several outlets from one account with a central dashboard",
      "1 device logged in at a time",
    ],
  },
  BUSINESS: {
    label: "Business",
    priceCents: 99900,
    annualPriceCents: 999900,
    annualFirstYearDiscountCents: 0,
    status: "ACTIVE",
    features: [
      "Everything in Advanced",
      "Kitchen display system",
      "Staff logins",
      "Log in from as many devices as you need",
      "Zomato / Swiggy order integration",
    ],
  },
};

export const PLAN_TIERS: PlanTier[] = ["STARTER", "ADVANCED", "BUSINESS"];

export function getPlanPriceCents(tier: PlanTier, period: BillingPeriod): number {
  return period === "ANNUAL" ? PLAN_DEFINITIONS[tier].annualPriceCents : PLAN_DEFINITIONS[tier].priceCents;
}

/**
 * Annual pricing in one place. `firstYearCents` is what is charged on the
 * first annual payment; `renewalCents` what every later year charges. Every
 * display (pricing page, billing page, super-admin) and the Razorpay plan
 * creation read this — never hard-code these figures elsewhere.
 */
export function getAnnualPricing(tier: PlanTier) {
  const def = PLAN_DEFINITIONS[tier];
  const discountCents = Math.min(def.annualFirstYearDiscountCents, def.annualPriceCents);
  return {
    originalCents: def.annualPriceCents,
    discountCents,
    firstYearCents: def.annualPriceCents - discountCents,
    renewalCents: def.annualPriceCents,
    hasFirstYearDiscount: discountCents > 0,
  };
}

/**
 * Actual plan-tier gating (added 2026-09-13 at the user's request — nothing
 * was gated before this). "menu"/"orders"/"tables"/"billing" cover the
 * ₹499 Starter set the user asked for explicitly: menu management, order
 * management, QR table ordering, and the billing/invoice module built the
 * same day. Coupons/analytics move up to Advanced, kitchen/staff to
 * Business — matching PLAN_DEFINITIONS' feature copy above.
 */
export type Feature =
  | "menu"
  | "orders"
  | "tables"
  | "billing"
  | "inventory"
  | "kot"
  | "coupons"
  | "loyalty"
  | "analytics"
  | "kitchen"
  | "staff"
  | "deliveryAggregator"
  | "multiStore";

/** Every gateable feature, in the order the super-admin's per-tenant override panel shows them. */
export const ALL_FEATURES: Feature[] = [
  "menu",
  "orders",
  "tables",
  "billing",
  "inventory",
  "kot",
  "coupons",
  "loyalty",
  "analytics",
  "kitchen",
  "staff",
  "deliveryAggregator",
  "multiStore",
];

export const FEATURE_LABELS: Record<Feature, string> = {
  menu: "Menu management",
  orders: "Order management & billing",
  tables: "QR table ordering",
  billing: "Billing / printable invoices",
  inventory: "Inventory & stock tracking",
  kot: "KOT (kitchen ticket) screen",
  coupons: "Coupons",
  loyalty: "Loyalty points & win-back offers",
  analytics: "Analytics dashboard",
  kitchen: "Kitchen display system",
  staff: "Staff logins",
  deliveryAggregator: "Zomato / Swiggy integration",
  multiStore: "Multi-store (several outlets, one account)",
};

const FEATURES_BY_TIER: Record<PlanTier, ReadonlySet<Feature>> = {
  STARTER: new Set(["menu", "orders", "tables", "billing", "inventory", "kot"]),
  ADVANCED: new Set(["menu", "orders", "tables", "billing", "inventory", "kot", "coupons", "loyalty", "analytics", "multiStore"]),
  BUSINESS: new Set([
    "menu",
    "orders",
    "tables",
    "billing",
    "inventory",
    "kot",
    "coupons",
    "loyalty",
    "analytics",
    "kitchen",
    "staff",
    "deliveryAggregator",
    "multiStore",
  ]),
};

export function tierHasFeature(tier: PlanTier, feature: Feature): boolean {
  return FEATURES_BY_TIER[tier].has(feature);
}

/** Lowest tier that normally includes a feature — shown in the super-admin override panel as a hint (e.g. "Advanced+"). */
export function defaultTierFor(feature: Feature): PlanTier {
  return PLAN_TIERS.find((tier) => FEATURES_BY_TIER[tier].has(feature)) ?? "BUSINESS";
}

/** Tenant.featureOverrides' shape once parsed: Feature -> explicit grant (true) or revoke (false). */
export type FeatureOverrides = Partial<Record<Feature, boolean>>;

/** Safely coerces Tenant.featureOverrides' raw JSON (untrusted — came back from the database) into a typed partial record, dropping anything unrecognized. */
export function parseFeatureOverrides(value: unknown): FeatureOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: FeatureOverrides = {};
  for (const feature of ALL_FEATURES) {
    const v = (value as Record<string, unknown>)[feature];
    if (typeof v === "boolean") out[feature] = v;
  }
  return out;
}

/**
 * The real, per-tenant gate — used everywhere tierHasFeature used to be
 * called directly. An explicit super-admin override (Tenant.featureOverrides,
 * set from /super-admin) always wins; otherwise falls back to the plan
 * tier's normal set.
 */
export function tenantHasFeature(
  tenant: { planTier: PlanTier; featureOverrides?: unknown },
  feature: Feature,
): boolean {
  const overrides = parseFeatureOverrides(tenant.featureOverrides);
  if (feature in overrides) return Boolean(overrides[feature]);
  return tierHasFeature(tenant.planTier, feature);
}
