import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import type { BillingPeriod, PlanTier, SubscriptionStatus, Prisma } from "@prisma/client";
import { PLAN_DEFINITIONS, getPlanPriceCents, TRIAL_MS } from "@/lib/plans";
import {
  createRazorpayPlan,
  createRazorpaySubscription,
  cancelRazorpaySubscription,
  verifySubscriptionSignature,
  createRazorpayOrder,
  verifyCheckoutSignature,
  fetchRazorpayPlan,
} from "@/lib/payments/razorpay";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 2 && slug.length <= 60;
}

export async function setTenantQrCardDesign(tenantId: string, design: Prisma.InputJsonValue) {
  await prisma.tenant.update({ where: { id: tenantId }, data: { qrCardDesign: design } });
}

/** Live signup availability check — the submit path still re-checks (and the DB unique index is the real guard). */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  return !existing;
}

/** Public storefront lookup — the only place a raw slug from a URL becomes a tenantId. */
export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } });
}

export async function getTenantById(id: string) {
  return prisma.tenant.findUnique({ where: { id } });
}

/** Custom-domain storefront lookup — see src/proxy.ts, the only place a raw Host header becomes a tenantId. */
export async function getTenantByCustomDomain(domain: string) {
  return prisma.tenant.findUnique({ where: { customDomain: domain.toLowerCase() } });
}

/**
 * The one-time 15-minute dashboard trial (see src/proxy.ts) — a narrow
 * select, since this runs on every owner/staff dashboard request. Timer is
 * wall-clock time since the tenant row was created (Tenant.createdAt), not
 * literal cumulative "active" seconds excluding idle/closed-tab time — that
 * would need client heartbeat pings and materially more machinery for the
 * same practical effect on a restaurant actually using the dashboard in one
 * sitting, so this simpler, standard SaaS-trial definition was used instead.
 * subscriptionStatus === "ACTIVE" is the one and only "already paid" signal
 * anywhere in this schema (see startTenantSubscription/webhook handlers) —
 * a super-admin's manual planTier assignment never sets it, so an
 * admin-onboarded restaurant is just as subject to this trial as a
 * self-serve one unless its owner actually pays.
 */
export async function getTenantTrialStatus(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subscriptionStatus: true, createdAt: true },
  });
}

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function isValidDomain(domain: string): boolean {
  return DOMAIN_RE.test(domain) && domain.length <= 253;
}

export class DomainTakenError extends Error {}

/**
 * Owner-set custom domain (src/app/dashboard/branding). Only meaningful once
 * this app is deployed to a public host and the owner points a CNAME at it —
 * see the customDomain comment on the Tenant model — but the uniqueness rule
 * and the lookup itself (getTenantByCustomDomain) are real right now.
 */
export async function setTenantCustomDomain(tenantId: string, domain: string | null) {
  const normalized = domain ? domain.trim().toLowerCase() : null;
  if (normalized) {
    if (!isValidDomain(normalized)) {
      throw new Error("That doesn't look like a valid domain (e.g. orders.yourrestaurant.com).");
    }
    const existing = await prisma.tenant.findUnique({ where: { customDomain: normalized } });
    if (existing && existing.id !== tenantId) {
      throw new DomainTakenError(`"${normalized}" is already connected to another restaurant.`);
    }
  }
  return prisma.tenant.update({ where: { id: tenantId }, data: { customDomain: normalized } });
}

/** For the new-order owner-notification email — the tenant's OWNER login (not staff). */
export async function getOwnerEmail(tenantId: string): Promise<string | null> {
  const owner = await prisma.user.findFirst({
    where: { tenantId, role: "OWNER" },
    select: { email: true },
  });
  return owner?.email ?? null;
}

/** Public, unauthenticated — feeds sitemap.ts. Only real, crawlable storefronts. */
export async function listActiveTenantSlugsForSitemap() {
  return prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true, updatedAt: true },
  });
}

export const SUPER_ADMIN_PAGE_SIZE = 25;

export type TenantListQuery = {
  q?: string;
  status?: "ACTIVE" | "SUSPENDED";
  plan?: PlanTier;
  page?: number;
};

/**
 * Super-admin only — deliberately NOT tenant-scoped (this is the one view that
 * spans every restaurant), so callers must gate on requireRole("SUPER_ADMIN").
 * Search matches name, slug, or any of the restaurant's login emails.
 */
export async function listTenantsWithStats(query: TenantListQuery = {}) {
  const q = query.q?.trim();
  const where: Prisma.TenantWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.plan ? { planTier: query.plan } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { slug: { contains: q } },
            { users: { some: { email: { contains: q } } } },
          ],
        }
      : {}),
  };

  const total = await prisma.tenant.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / SUPER_ADMIN_PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page ?? 1), pageCount);

  const tenants = await prisma.tenant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * SUPER_ADMIN_PAGE_SIZE,
    take: SUPER_ADMIN_PAGE_SIZE,
    include: {
      _count: { select: { orders: true, subscriptionPurchases: true } },
      users: {
        where: { role: "OWNER" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { email: true, name: true },
      },
    },
  });

  const ids = tenants.map((t) => t.id);
  const [revenueByTenant, lastOrderByTenant] = await Promise.all([
    prisma.order.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: ids }, status: { not: "CANCELLED" } },
      _sum: { totalCents: true },
    }),
    prisma.order.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: ids } },
      _max: { createdAt: true },
    }),
  ]);
  const revenueMap = new Map(revenueByTenant.map((r) => [r.tenantId, r._sum.totalCents ?? 0]));
  const lastOrderMap = new Map(lastOrderByTenant.map((r) => [r.tenantId, r._max.createdAt]));

  return {
    total,
    page,
    pageCount,
    tenants: tenants.map(({ users, ...t }) => ({
      ...t,
      ownerEmail: users[0]?.email ?? null,
      ownerName: users[0]?.name ?? null,
      orderCount: t._count.orders,
      revenueCents: revenueMap.get(t.id) ?? 0,
      lastOrderAt: lastOrderMap.get(t.id) ?? null,
    })),
  };
}

export async function getPlatformStats() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [tenantCount, activeCount, newTenants, orderCount, orders24h, revenue, revenue24h] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalCents: true },
    }),
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" }, createdAt: { gte: dayAgo } },
      _sum: { totalCents: true },
    }),
  ]);
  return {
    tenantCount,
    activeCount,
    suspendedCount: tenantCount - activeCount,
    newTenants7d: newTenants,
    orderCount,
    orders24h,
    revenueCents: revenue._sum.totalCents ?? 0,
    revenue24hCents: revenue24h._sum.totalCents ?? 0,
  };
}

/**
 * Everything the super-admin detail page shows for one restaurant. Same
 * caveat as above: cross-tenant by design, super-admin callers only.
 */
export async function getTenantDetailForAdmin(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      },
    },
  });
  if (!tenant) return null;

  const [orderCount, revenue, categoryCount, itemCount, customerPhones, recentOrders, openTickets, purchaseCount] =
    await Promise.all([
      prisma.order.count({ where: { tenantId } }),
      prisma.order.aggregate({
        where: { tenantId, status: { not: "CANCELLED" } },
        _sum: { totalCents: true },
      }),
      prisma.category.count({ where: { tenantId } }),
      prisma.item.count({ where: { tenantId } }),
      prisma.order.findMany({ where: { tenantId, customerPhone: { not: "" } }, distinct: ["customerPhone"], select: { customerPhone: true } }),
      prisma.order.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          fulfillmentType: true,
          paymentMethod: true,
          paymentStatus: true,
          status: true,
          source: true,
          totalCents: true,
          createdAt: true,
        },
      }),
      prisma.supportTicket.findMany({
        where: { tenantId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true, subject: true, priority: true, status: true, createdAt: true },
      }),
      prisma.subscriptionPurchase.count({ where: { tenantId } }),
    ]);

  return {
    tenant,
    orderCount,
    revenueCents: revenue._sum.totalCents ?? 0,
    categoryCount,
    itemCount,
    customerCount: customerPhones.length,
    recentOrders,
    openTickets,
    purchaseCount,
  };
}

/** Super-admin manual billing record — for customers paying outside Razorpay, or to correct what it recorded. */
export async function setTenantBilling(
  tenantId: string,
  input: { billingPeriod: BillingPeriod | null; paidUntil: Date | null },
) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { billingPeriod: input.billingPeriod, paidUntil: input.paidUntil },
  });
}

/** Everything a delete confirmation needs to show — what would be lost. */
export async function getTenantsForDeletion(ids: string[]) {
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { orders: true, items: true, users: true } },
      users: { where: { role: "OWNER" }, take: 1, select: { email: true } },
    },
  });
  const revenue = await prisma.order.groupBy({
    by: ["tenantId"],
    where: { tenantId: { in: ids }, status: { not: "CANCELLED" } },
    _sum: { totalCents: true },
  });
  const revenueMap = new Map(revenue.map((r) => [r.tenantId, r._sum.totalCents ?? 0]));
  return tenants.map(({ users, ...t }) => ({
    ...t,
    ownerEmail: users[0]?.email ?? null,
    revenueCents: revenueMap.get(t.id) ?? 0,
  }));
}

/**
 * PERMANENTLY deletes restaurants and, through the schema's cascades, their
 * logins, menus, orders, order history, coupons, tickets etc. Uploaded images
 * in object storage are not touched. Super-admin only.
 */
export async function deleteTenants(ids: string[]): Promise<number> {
  const res = await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
  return res.count;
}

export type BillingSummary = {
  monthly: number;
  annual: number;
  periodNotSet: number;
  onTrial: number;
  trialEnded: number;
  suspended: number;
  byTier: Record<PlanTier, number>;
  /** Monthly-equivalent recurring revenue, in cents — annual plans at 1/12. Only counts tenants with a recorded billing period. */
  mrrCents: number;
  paidUntilSoon: number;
  paidUntilExpired: number;
};

/** Customers-by-plan/billing rollup for the super-admin header. Reads a few columns of every tenant — fine at this scale. */
export async function getBillingSummary(now: number): Promise<BillingSummary> {
  const all = await prisma.tenant.findMany({
    select: {
      status: true,
      planTier: true,
      subscriptionStatus: true,
      billingPeriod: true,
      paidUntil: true,
      createdAt: true,
    },
  });
  const out: BillingSummary = {
    monthly: 0,
    annual: 0,
    periodNotSet: 0,
    onTrial: 0,
    trialEnded: 0,
    suspended: 0,
    byTier: { STARTER: 0, ADVANCED: 0, BUSINESS: 0 },
    mrrCents: 0,
    paidUntilSoon: 0,
    paidUntilExpired: 0,
  };
  const week = 7 * 24 * 60 * 60 * 1000;
  for (const t of all) {
    if (t.status === "SUSPENDED") {
      out.suspended++;
      continue;
    }
    out.byTier[t.planTier]++;
    if (t.subscriptionStatus === "ACTIVE") {
      if (t.billingPeriod === "MONTHLY") {
        out.monthly++;
        out.mrrCents += getPlanPriceCents(t.planTier, "MONTHLY");
      } else if (t.billingPeriod === "ANNUAL") {
        out.annual++;
        out.mrrCents += Math.round(getPlanPriceCents(t.planTier, "ANNUAL") / 12);
      } else {
        out.periodNotSet++;
      }
      if (t.paidUntil) {
        const left = t.paidUntil.getTime() - now;
        if (left < 0) out.paidUntilExpired++;
        else if (left < week) out.paidUntilSoon++;
      }
    } else if (t.createdAt.getTime() + TRIAL_MS > now) {
      out.onTrial++;
    } else {
      out.trialEnded++;
    }
  }
  return out;
}

export class SlugTakenError extends Error {}
export class EmailTakenError extends Error {}

/**
 * Create a restaurant plus its first owner login in one go. Used from two
 * places: the super-admin "add a restaurant" form (admin-assisted), and the
 * public /signup form (self-serve) — this function itself doesn't check
 * roles; the caller decides who's allowed to invoke it.
 */
export async function createTenantWithOwner(input: {
  slug: string;
  name: string;
  ownerEmail: string;
  ownerPassword: string;
  /** Self-serve signups default closed until the owner has set up a menu; admin-created ones default open. */
  isOpen?: boolean;
}) {
  if (!isValidSlug(input.slug)) {
    throw new Error("Slug must be lowercase letters, numbers, and hyphens only.");
  }

  const [existingSlug, existingEmail] = await Promise.all([
    prisma.tenant.findUnique({ where: { slug: input.slug } }),
    prisma.user.findUnique({ where: { email: input.ownerEmail } }),
  ]);
  if (existingSlug) throw new SlugTakenError(`Slug "${input.slug}" is already in use.`);
  if (existingEmail) throw new EmailTakenError(`Email "${input.ownerEmail}" is already in use.`);

  const passwordHash = await hashPassword(input.ownerPassword);

  return prisma.tenant.create({
    data: {
      slug: input.slug,
      name: input.name,
      isOpen: input.isOpen ?? true,
      users: {
        create: {
          email: input.ownerEmail,
          passwordHash,
          role: "OWNER",
        },
      },
    },
    include: { users: true },
  });
}

export async function setTenantStatus(tenantId: string, status: "ACTIVE" | "SUSPENDED") {
  return prisma.tenant.update({ where: { id: tenantId }, data: { status } });
}

export async function updateTenantBranding(
  tenantId: string,
  data: {
    name?: string;
    tagline?: string | null;
    logoUrl?: string | null;
    colorPrimary?: string;
    colorSecondary?: string;
    colorAccent?: string;
    colorHeaderText?: string;
    colorCardBackground?: string;
    upiId?: string | null;
    googleReviewUrl?: string | null;
    googleRating?: number | null;
    googleReviewCount?: number | null;
    instagramUrl?: string | null;
    facebookUrl?: string | null;
    gstRate?: number | null;
    businessAddress?: string | null;
    gstin?: string | null;
    businessState?: string | null;
  },
) {
  return prisma.tenant.update({ where: { id: tenantId }, data });
}

export async function setTenantOpen(tenantId: string, isOpen: boolean) {
  return prisma.tenant.update({ where: { id: tenantId }, data: { isOpen } });
}

/**
 * Delivery-zone settings (src/components/delivery-zone-form.tsx) — all
 * three null together means the feature is off and checkout behaves
 * exactly as it did before this existed. A radius without a location (or
 * vice versa) is meaningless, so the caller is expected to send either all
 * three or none; this function itself just stores whatever it's given.
 */
export async function updateDeliveryZone(
  tenantId: string,
  data: { latitude: number | null; longitude: number | null; deliveryRadiusKm: number | null },
) {
  return prisma.tenant.update({ where: { id: tenantId }, data });
}

/**
 * Super-admin-only manual plan assignment — still the primary mechanism even
 * now that real recurring billing exists below (dormant until Razorpay keys
 * are set): assigning a tier here doesn't by itself start a subscription,
 * the owner does that from /dashboard/billing.
 */
export async function setTenantPlan(tenantId: string, planTier: PlanTier) {
  return prisma.tenant.update({ where: { id: tenantId }, data: { planTier } });
}

/**
 * Super-admin-only manual override of the "has this tenant ever paid"
 * signal — bypasses both the 15-minute dashboard trial gate (src/proxy.ts,
 * which only exempts subscriptionStatus === "ACTIVE") and the real Razorpay
 * payment flow. Exists for demo/test tenants that need permanent dashboard
 * access without a real transaction — same spirit as setTenantPlan's manual
 * assignment above, just for the trial-gate signal instead of the tier.
 * Deliberately separate from cancelTenantSubscription/the webhook path:
 * this never touches razorpaySubscriptionId, so flipping it off again
 * cannot accidentally cancel a real subscription that doesn't exist here.
 */
export async function setTenantSubscriptionOverride(tenantId: string, active: boolean) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { subscriptionStatus: active ? "ACTIVE" : "NONE" },
  });
}

/**
 * Looks up (or lazily creates) the Razorpay Plan object for a tier. Plans
 * are a Razorpay-side resource shared across every tenant on that tier, not
 * per-tenant — created once via the API and cached in RazorpayPlan so
 * subscribing a tenant never creates a duplicate.
 *
 * Self-heals a stale cache entry: a cached plan id only exists on whichever
 * Razorpay *account* created it. If RAZORPAY_KEY_ID/KEY_SECRET are ever
 * swapped to a different account (as happened 2026-09-14, moving off an
 * account Razorpay rejected for this business) the old plan id genuinely
 * doesn't exist under the new account, and creating a subscription against
 * it fails. Verified with a real fetch rather than guessing from an error
 * string, since Razorpay's SDK throws a plain object either way (see
 * extractRazorpayErrorMessage) and matching on message text would be
 * fragile.
 */
export async function getOrCreateRazorpayPlanId(tier: PlanTier, period: BillingPeriod = "MONTHLY"): Promise<string> {
  const cached = await prisma.razorpayPlan.findUnique({ where: { tier_period: { tier, period } } });
  if (cached) {
    try {
      await fetchRazorpayPlan(cached.planId);
      return cached.planId;
    } catch {
      await prisma.razorpayPlan.delete({ where: { tier_period: { tier, period } } });
    }
  }

  const def = PLAN_DEFINITIONS[tier];
  const plan = await createRazorpayPlan({
    name: `BhojSetu ${def.label} (${period === "ANNUAL" ? "Annual" : "Monthly"})`,
    amountCents: getPlanPriceCents(tier, period),
    period: period === "ANNUAL" ? "yearly" : "monthly",
    interval: 1,
  });
  await prisma.razorpayPlan.create({ data: { tier, period, planId: plan.id } });
  return plan.id;
}

/** from + one billing period (calendar month / year). */
export function addBillingPeriod(from: Date, period: BillingPeriod): Date {
  const d = new Date(from);
  if (period === "ANNUAL") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

/**
 * The billing fields to write when a Razorpay subscription activates or is
 * charged. paidUntil is set to now + period rather than added on top of the
 * old value: Razorpay fires both `activated` and `charged` for the first
 * payment, and adding would double-extend it.
 */
function activatedBillingFields(tenant: {
  pendingBillingPeriod: BillingPeriod | null;
  billingPeriod: BillingPeriod | null;
}) {
  const period = tenant.pendingBillingPeriod ?? tenant.billingPeriod;
  return period
    ? { billingPeriod: period, pendingBillingPeriod: null, paidUntil: addBillingPeriod(new Date(), period) }
    : { pendingBillingPeriod: null };
}

/**
 * Starts a real recurring Razorpay subscription for a tier the owner chose
 * on /dashboard/billing — NOT the tenant's existing planTier, which might
 * just be the unpaid STARTER default or a super-admin manual override. The
 * chosen tier is stashed in pendingPlanTier; planTier itself only changes
 * once payment is actually confirmed (see verifyAndActivateSubscription and
 * setSubscriptionStatusByRazorpaySubscriptionId below) — so a tenant is
 * never shown as "on" a paid plan it hasn't paid for.
 */
export async function startTenantSubscription(tenantId: string, tier: PlanTier, period: BillingPeriod = "MONTHLY") {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Restaurant not found.");

  const planId = await getOrCreateRazorpayPlanId(tier, period);
  // Razorpay subscriptions require a fixed number of billing cycles, not
  // "until cancelled" — 120 monthly cycles / 10 annual cycles (10 years
  // either way) stand in for indefinite; renew/replace manually if BhojSetu
  // is still running past that, which is a real limit worth revisiting well
  // before it's hit.
  const subscription = await createRazorpaySubscription(planId, period === "ANNUAL" ? 10 : 120);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      razorpaySubscriptionId: subscription.id,
      subscriptionStatus: "NONE",
      pendingPlanTier: tier,
      pendingBillingPeriod: period,
    },
  });

  return subscription;
}

/** Client-side verification after the owner completes the checkout widget — the fast path for immediate UX. */
export async function verifyAndActivateSubscription(
  tenantId: string,
  razorpaySubscriptionId: string,
  razorpayPaymentId: string,
  signature: string,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.razorpaySubscriptionId !== razorpaySubscriptionId) {
    throw new Error("Subscription mismatch — refusing to activate.");
  }
  if (!verifySubscriptionSignature(razorpaySubscriptionId, razorpayPaymentId, signature)) {
    throw new Error("Could not verify payment signature.");
  }
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      subscriptionStatus: "ACTIVE",
      planTier: tenant.pendingPlanTier ?? tenant.planTier,
      pendingPlanTier: null,
      ...activatedBillingFields(tenant),
    },
  });
}

/** Webhook path (src/app/api/webhooks/razorpay) — the authoritative source of truth, same role it plays for one-time payments. */
export async function setSubscriptionStatusByRazorpaySubscriptionId(
  razorpaySubscriptionId: string,
  status: SubscriptionStatus,
): Promise<void> {
  const tenant = await prisma.tenant.findFirst({ where: { razorpaySubscriptionId } });
  if (!tenant) return;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data:
      status === "ACTIVE"
        ? {
            subscriptionStatus: status,
            planTier: tenant.pendingPlanTier ?? tenant.planTier,
            pendingPlanTier: null,
            ...activatedBillingFields(tenant),
          }
        : { subscriptionStatus: status },
  });
}

export async function cancelTenantSubscription(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.razorpaySubscriptionId) return;
  await cancelRazorpaySubscription(tenant.razorpaySubscriptionId);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { subscriptionStatus: "CANCELLED", pendingPlanTier: null, pendingBillingPeriod: null },
  });
}

// ---------------------------------------------------------------------------
// WELCOME100 — ₹100 off a tenant's first ever paid plan purchase, any tier.
//
// Deliberately separate from the tenant-scoped Coupon model (src/lib/data/
// coupons.ts): that model discounts a restaurant's own customer orders, this
// discounts a restaurant paying *us* for the plan itself — a platform-level
// concern with its own eligibility rule (once per tenant, first purchase
// only, never applied automatically). Applied via a one-time Razorpay order
// (not the recurring Subscription flow startTenantSubscription uses above)
// — Razorpay Subscriptions bill a Plan's fixed recurring price with no
// built-in way to discount just the first cycle via the API, so the
// discounted "first purchase" is its own one-time payment; the owner starts
// the normal recurring Subscribe flow afterward (at full price) whenever
// they're ready for month two. See CLAUDE.md for the fuller rationale.
//
// Originally Starter-only (2026-09-13 build); widened the same day to all
// three tiers at the user's explicit request — the discount amount and
// once-per-tenant rule are unchanged, only the "STARTER only" restriction
// was removed.
export const WELCOME_COUPON_CODE = "WELCOME100";
export const WELCOME_COUPON_DISCOUNT_CENTS = 10_000; // ₹100

export class WelcomeCouponInvalidError extends Error {}
export class WelcomeCouponAlreadyUsedError extends Error {}

export function previewWelcomeCouponDiscount(tier: PlanTier) {
  const originalPriceCents = PLAN_DEFINITIONS[tier].priceCents;
  const discountCents = Math.min(WELCOME_COUPON_DISCOUNT_CENTS, originalPriceCents);
  return { originalPriceCents, discountCents, finalPriceCents: originalPriceCents - discountCents };
}

/** Re-checked from scratch on every call — a client-side preview is never trusted for what's actually charged. */
export async function validateWelcomeCoupon(tenantId: string, rawCode: string, tier: PlanTier) {
  if (rawCode.trim().toUpperCase() !== WELCOME_COUPON_CODE) {
    throw new WelcomeCouponInvalidError("That coupon code isn't valid.");
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Restaurant not found.");
  if (tenant.welcomeCouponRedeemedAt) {
    throw new WelcomeCouponAlreadyUsedError("WELCOME100 has already been used on this account.");
  }
  if (tenant.subscriptionStatus === "ACTIVE") {
    throw new WelcomeCouponInvalidError(
      "WELCOME100 is only for a first plan purchase — this account already has an active paid subscription.",
    );
  }
  return previewWelcomeCouponDiscount(tier);
}

/** Starts the discounted one-time payment for whichever tier the owner picked. pendingPlanTier is stashed the same way startTenantSubscription does. */
export async function startDiscountedPlanPurchase(tenantId: string, couponCode: string, tier: PlanTier) {
  const { originalPriceCents, discountCents, finalPriceCents } = await validateWelcomeCoupon(
    tenantId,
    couponCode,
    tier,
  );
  const receipt = `welcome100-${tenantId}-${Date.now()}`;
  const order = await createRazorpayOrder(finalPriceCents, receipt);
  await prisma.tenant.update({ where: { id: tenantId }, data: { pendingPlanTier: tier } });
  return { order, originalPriceCents, discountCents, finalPriceCents };
}

/**
 * Verifies the Razorpay checkout signature (never trust the client's own
 * "it succeeded" callback without this) then activates the plan and records
 * the permanent purchase-ledger entry — original price, discount, coupon
 * code, and final amount paid, per the coupon's own requirement. Idempotent:
 * a retried verification call (e.g. the browser re-firing the handler) is a
 * no-op once welcomeCouponRedeemedAt is already set, so the discount can
 * never be double-applied.
 */
export async function verifyAndActivateDiscountedPlanPurchase(
  tenantId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): Promise<void> {
  if (!verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, signature)) {
    throw new Error("Could not verify payment signature.");
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Restaurant not found.");
  if (tenant.welcomeCouponRedeemedAt) return;
  // The tier being purchased is whatever startDiscountedPlanPurchase stashed
  // here — never re-derived from anything client-supplied, same spirit as
  // verifying the payment signature itself rather than trusting the client.
  const tier = tenant.pendingPlanTier;
  if (!tier) throw new Error("No pending discounted plan purchase found for this restaurant.");

  const { originalPriceCents, discountCents, finalPriceCents } = previewWelcomeCouponDiscount(tier);

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenantId },
      data: {
        planTier: tier,
        subscriptionStatus: "ACTIVE",
        pendingPlanTier: null,
        billingPeriod: "MONTHLY",
        paidUntil: addBillingPeriod(new Date(), "MONTHLY"),
        welcomeCouponRedeemedAt: new Date(),
      },
    }),
    prisma.subscriptionPurchase.create({
      data: {
        tenantId,
        tier,
        originalPriceCents,
        discountCents,
        couponCode: WELCOME_COUPON_CODE,
        finalPriceCents,
        razorpayOrderId,
        razorpayPaymentId,
      },
    }),
  ]);
}

export async function updateTenantMenuDocument(
  tenantId: string,
  data: { menuDocumentUrl: string | null; menuDocumentType: string | null },
) {
  return prisma.tenant.update({ where: { id: tenantId }, data });
}
