import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import type { PlanTier } from "@prisma/client";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 2 && slug.length <= 60;
}

/** Public storefront lookup — the only place a raw slug from a URL becomes a tenantId. */
export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } });
}

export async function getTenantById(id: string) {
  return prisma.tenant.findUnique({ where: { id } });
}

/** For the new-order owner-notification email — the tenant's OWNER login (not staff). */
export async function getOwnerEmail(tenantId: string): Promise<string | null> {
  const owner = await prisma.user.findFirst({
    where: { tenantId, role: "OWNER" },
    select: { email: true },
  });
  return owner?.email ?? null;
}

export async function listTenantsWithStats() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true } },
    },
  });

  const revenueByTenant = await prisma.order.groupBy({
    by: ["tenantId"],
    where: { status: { not: "CANCELLED" } },
    _sum: { totalCents: true },
  });
  const revenueMap = new Map(revenueByTenant.map((r) => [r.tenantId, r._sum.totalCents ?? 0]));

  return tenants.map((t) => ({
    ...t,
    orderCount: t._count.orders,
    revenueCents: revenueMap.get(t.id) ?? 0,
  }));
}

export async function getPlatformStats() {
  const [tenantCount, orderCount, revenue] = await Promise.all([
    prisma.tenant.count(),
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalCents: true },
    }),
  ]);
  return {
    tenantCount,
    orderCount,
    revenueCents: revenue._sum.totalCents ?? 0,
  };
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
    upiId?: string | null;
  },
) {
  return prisma.tenant.update({ where: { id: tenantId }, data });
}

export async function setTenantOpen(tenantId: string, isOpen: boolean) {
  return prisma.tenant.update({ where: { id: tenantId }, data: { isOpen } });
}

/**
 * Super-admin-only, manual for now — see the PlanTier comment in schema.prisma
 * for why this isn't wired to real recurring billing yet.
 */
export async function setTenantPlan(tenantId: string, planTier: PlanTier) {
  return prisma.tenant.update({ where: { id: tenantId }, data: { planTier } });
}

export async function updateTenantMenuDocument(
  tenantId: string,
  data: { menuDocumentUrl: string | null; menuDocumentType: string | null },
) {
  return prisma.tenant.update({ where: { id: tenantId }, data });
}
