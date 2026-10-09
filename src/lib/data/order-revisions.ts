import "server-only";
import { prisma } from "@/lib/prisma";

export type OrderRevisionSnapshot = {
  items: { name: string; priceCents: number; quantity: number; itemId: string | null }[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  gstRatePercent: number | null;
  totalCents: number;
};

/** Per-order edit history, newest first — see OrderRevision's schema comment. */
export async function listRevisionsForOrder(tenantId: string, orderId: string) {
  return prisma.orderRevision.findMany({
    where: { tenantId, orderId },
    orderBy: { createdAt: "desc" },
  });
}

/** Tenant-wide "all recent edits" feed — lets an owner see what staff changed without opening each order. */
export async function listRecentRevisionsForTenant(tenantId: string, limit = 50) {
  return prisma.orderRevision.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { order: { select: { orderNumber: true } } },
  });
}

/** Count of revisions on one order — cheap existence check for the "History" link. */
export async function countRevisionsForOrder(tenantId: string, orderId: string): Promise<number> {
  return prisma.orderRevision.count({ where: { tenantId, orderId } });
}
