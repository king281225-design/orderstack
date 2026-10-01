import "server-only";
import { prisma } from "@/lib/prisma";
import type { DeliveryPlatform } from "@prisma/client";

/**
 * One (tenant, platform) link to Dyno (DynoAPIs) — see the
 * DynoRestaurantLink schema comment for why this is per-platform rather
 * than a single id on Tenant (a restaurant's Zomato id and Swiggy id are
 * different values, confirmed by reading Dyno's real client source).
 */

/** Webhook lookup — see src/app/api/dyno/, the only place a raw restaurantId from an inbound call becomes a tenantId (there's no session on these requests). */
export async function getTenantByDynoRestaurantId(externalId: string) {
  const link = await prisma.dynoRestaurantLink.findUnique({ where: { externalId }, include: { tenant: true } });
  return link?.tenant ?? null;
}

export async function listDynoRestaurantLinks(tenantId: string) {
  return prisma.dynoRestaurantLink.findMany({ where: { tenantId } });
}

export class DynoRestaurantIdTakenError extends Error {}

/** Owner-set Dyno restaurant id for one platform (/dashboard/integrations). */
export async function setDynoRestaurantLink(tenantId: string, platform: DeliveryPlatform, externalId: string) {
  const normalized = externalId.trim();
  const existing = await prisma.dynoRestaurantLink.findUnique({ where: { externalId: normalized } });
  if (existing && existing.tenantId !== tenantId) {
    throw new DynoRestaurantIdTakenError(`"${normalized}" is already connected to another restaurant.`);
  }
  return prisma.dynoRestaurantLink.upsert({
    where: { tenantId_platform: { tenantId, platform } },
    create: { tenantId, platform, externalId: normalized },
    update: { externalId: normalized },
  });
}

export async function removeDynoRestaurantLink(tenantId: string, platform: DeliveryPlatform) {
  await prisma.dynoRestaurantLink.deleteMany({ where: { tenantId, platform } });
}
