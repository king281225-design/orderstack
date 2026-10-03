import "server-only";
import { prisma } from "@/lib/prisma";
import { isValidSlug, SlugTakenError } from "@/lib/data/tenants";
import { tierHasFeature } from "@/lib/plans";

/**
 * Multi-store (Business plan) access control.
 *
 * Security model: the session's `tenantId` is the *active* store, and every
 * existing page/action keeps scoping by it. The only way to change it is
 * `switchStoreAction`, which calls `assertOwnerCanAccessStore` — a fresh
 * database check that (1) the user owns a Business and (2) the target store
 * belongs to that same Business. Nothing here trusts a store id coming from
 * the client, and "all stores" analytics only ever widen to the stores the
 * database says belong to the session user's own Business.
 */

export class BusinessAccessError extends Error {}
export class MultiStoreNotAllowedError extends Error {}

export async function getBusinessForOwner(userId: string) {
  return prisma.business.findUnique({
    where: { ownerUserId: userId },
    include: {
      tenants: {
        select: { id: true, name: true, slug: true, status: true, planTier: true, isOpen: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/** Stores the owner may switch between (home store alone when they have no Business yet). */
export async function listAccessibleStores(userId: string, activeTenantId: string) {
  const business = await getBusinessForOwner(userId);
  if (business && business.tenants.some((t) => t.id === activeTenantId)) return { business, stores: business.tenants };
  const t = await prisma.tenant.findUnique({
    where: { id: activeTenantId },
    select: { id: true, name: true, slug: true, status: true, planTier: true, isOpen: true, createdAt: true },
  });
  return { business: null, stores: t ? [t] : [] };
}

/** Throws unless `userId` owns a Business that contains `tenantId`. Returns the store. */
export async function assertOwnerCanAccessStore(userId: string, tenantId: string) {
  const business = await prisma.business.findUnique({ where: { ownerUserId: userId }, select: { id: true } });
  if (!business) throw new BusinessAccessError("No business account.");
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, businessId: business.id },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!tenant) throw new BusinessAccessError("That store is not part of your business.");
  return tenant;
}

/**
 * True when `userId` may act on `tenantId`: it is their own home store, or a
 * store of the Business they own. Checked on every dashboard render so a store
 * removed from a business (or a forged token) stops working immediately.
 */
export async function verifyActiveStoreAccess(userId: string, tenantId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
  if (!user) return false;
  if (user.tenantId === tenantId) return true;
  const business = await prisma.business.findUnique({ where: { ownerUserId: userId }, select: { id: true } });
  if (!business) return false;
  return (await prisma.tenant.count({ where: { id: tenantId, businessId: business.id } })) > 0;
}

/**
 * The set of store ids a report/analytics call may cover. `wantAll` only
 * widens to the owner's own Business stores; any other case (including a
 * super-admin "managing" session, or a user who isn't the Business owner)
 * stays on the single active store.
 */
export async function resolveStoreScope(activeTenantId: string, userId: string, wantAll: boolean) {
  const business = await prisma.business.findUnique({
    where: { ownerUserId: userId },
    select: { id: true, name: true, tenants: { select: { id: true } } },
  });
  const inBusiness = business?.tenants.some((t) => t.id === activeTenantId) ?? false;
  if (wantAll && business && inBusiness) {
    return { tenantIds: business.tenants.map((t) => t.id), businessName: business.name, isAll: true };
  }
  return { tenantIds: [activeTenantId], businessName: inBusiness ? business!.name : null, isAll: false };
}

/**
 * Adds another store to the owner's Business, creating the Business the
 * first time. Only offered on a plan with the multiStore feature (Business
 * plan), checked against the *active* store's tier here, server-side. The
 * new store is its own Tenant with its own plan/billing/trial (starts like
 * any new store); the owner is not duplicated as a user — they switch into
 * it with the store switcher.
 */
export async function createStoreForBusiness(
  ownerUserId: string,
  activeTenantId: string,
  input: { name: string; slug: string },
) {
  const active = await prisma.tenant.findUnique({
    where: { id: activeTenantId },
    select: { id: true, name: true, planTier: true, businessId: true },
  });
  if (!active) throw new BusinessAccessError("Store not found.");
  if (!tierHasFeature(active.planTier, "multiStore")) {
    throw new MultiStoreNotAllowedError("Adding stores needs the Advanced or Business plan.");
  }
  const name = input.name.trim();
  if (!name) throw new Error("Store name is required.");
  if (!isValidSlug(input.slug)) throw new Error("Slug must be lowercase letters, numbers, and hyphens only.");
  if (await prisma.tenant.findUnique({ where: { slug: input.slug } })) {
    throw new SlugTakenError(`Slug "${input.slug}" is already in use.`);
  }

  return prisma.$transaction(async (tx) => {
    let business = await tx.business.findUnique({ where: { ownerUserId } });
    if (business) {
      // The active store must really be in this owner's business.
      if (active.businessId !== business.id) throw new BusinessAccessError("Store is not part of your business.");
    } else {
      const owner = await tx.user.findUnique({ where: { id: ownerUserId }, select: { role: true, tenantId: true } });
      if (!owner || owner.role !== "OWNER" || owner.tenantId !== activeTenantId) {
        throw new BusinessAccessError("Only the store owner can start a business account.");
      }
      business = await tx.business.create({ data: { name: active.name, ownerUserId } });
      await tx.tenant.update({ where: { id: activeTenantId }, data: { businessId: business.id } });
    }
    return tx.tenant.create({
      data: { slug: input.slug, name, isOpen: false, businessId: business.id },
      select: { id: true, slug: true, name: true },
    });
  });
}

/** Enable/disable a store in the owner's business (disabled = SUSPENDED: the public page and ordering stop). */
export async function setBusinessStoreStatus(ownerUserId: string, tenantId: string, status: "ACTIVE" | "SUSPENDED") {
  await assertOwnerCanAccessStore(ownerUserId, tenantId);
  return prisma.tenant.update({ where: { id: tenantId }, data: { status } });
}

export async function renameBusinessStore(ownerUserId: string, tenantId: string, name: string) {
  await assertOwnerCanAccessStore(ownerUserId, tenantId);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Store name is required.");
  return prisma.tenant.update({ where: { id: tenantId }, data: { name: trimmed } });
}
