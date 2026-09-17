import "server-only";
import { prisma } from "@/lib/prisma";

/** Called from the public storefront (src/app/r/[slug]/actions.ts) — no auth, scoped only by tenantId. */
export async function createWaiterCall(tenantId: string, tableLabel: string) {
  return prisma.waiterCall.create({ data: { tenantId, tableLabel } });
}

export async function listPendingWaiterCalls(tenantId: string) {
  return prisma.waiterCall.findMany({
    where: { tenantId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
}

/** Owner/staff dashboard action — tenant-scoped, and a no-op if already acknowledged (harmless double-click). */
export async function acknowledgeWaiterCall(tenantId: string, id: string) {
  return prisma.waiterCall.updateMany({
    where: { id, tenantId, status: "PENDING" },
    data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
  });
}
