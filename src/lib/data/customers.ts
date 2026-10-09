import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * A persisted, phone-keyed customer profile (see Customer in prisma/schema.prisma)
 * — replaces deriving this on the fly from Order rows on every page load.
 * Upserted here inside the SAME transaction as createOrder/createManualOrder,
 * whenever the order carries a non-empty customerPhone (a walk-in bill saved
 * without a phone has no identity to group by, same rule the old live-grouping
 * version used). Points accrue at order time using the tenant's own configured
 * rate (Tenant.loyaltyRupeesPerPoint, default ₹10 = 1 point) and are a real
 * running balance from here on — not recomputed from total spend on every read.
 *
 * Existing tenants (orders placed before this shipped) need a one-time
 * backfill — see scripts/backfill-customers.ts.
 */
export async function upsertCustomerForOrder(
  tx: Prisma.TransactionClient,
  tenantId: string,
  order: { customerPhone: string; customerName: string; customerEmail: string | null; totalCents: number; createdAt: Date },
): Promise<void> {
  const phone = order.customerPhone.trim();
  if (!phone) return;

  const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { loyaltyRupeesPerPoint: true } });
  const earnedPoints = loyaltyPointsFor(order.totalCents, tenant?.loyaltyRupeesPerPoint ?? null);

  await tx.customer.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    create: {
      tenantId,
      phone,
      name: order.customerName,
      email: order.customerEmail,
      totalSpentCents: order.totalCents,
      orderCount: 1,
      pointsBalance: earnedPoints,
      firstOrderAt: order.createdAt,
      lastOrderAt: order.createdAt,
    },
    update: {
      // Keep the most recent name/email on file — a repeat customer's latest
      // order is the freshest info we have about them.
      name: order.customerName,
      email: order.customerEmail ?? undefined,
      totalSpentCents: { increment: order.totalCents },
      orderCount: { increment: 1 },
      pointsBalance: { increment: earnedPoints },
      lastOrderAt: order.createdAt,
    },
  });
}

/**
 * ₹ per point — the long-standing default (unchanged from the old
 * display-only placeholder) is ₹10 = 1 point; a tenant can configure its own
 * rate in Settings (Tenant.loyaltyRupeesPerPoint).
 */
function loyaltyPointsFor(totalSpentCents: number, rupeesPerPoint: number | null): number {
  const rate = rupeesPerPoint && rupeesPerPoint > 0 ? rupeesPerPoint : 10;
  return Math.floor(totalSpentCents / 100 / rate);
}

/**
 * Re-settles one order's contribution to its customer's totals after an edit
 * (see updateOrderItems in src/lib/data/orders.ts) — without this, editing a
 * bill's total would leave Customer.totalSpentCents/pointsBalance stuck at
 * whatever the bill totalled when first created. Removes the old total's
 * points, adds the new total's, using the tenant's CURRENT loyalty rate for
 * both sides of the delta (there's no record of what the rate was back when
 * the order was first created, so a rate change mid-flight is an accepted
 * imprecision, same as the backfill script's own note on this).
 */
export async function adjustCustomerForOrderEdit(
  tx: Prisma.TransactionClient,
  tenantId: string,
  order: { customerPhone: string; customerName: string; customerEmail: string | null },
  oldTotalCents: number,
  newTotalCents: number,
): Promise<void> {
  const phone = order.customerPhone.trim();
  if (!phone) return;

  const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { loyaltyRupeesPerPoint: true } });
  const rate = tenant?.loyaltyRupeesPerPoint ?? null;
  const pointsDelta = loyaltyPointsFor(newTotalCents, rate) - loyaltyPointsFor(oldTotalCents, rate);
  const totalDelta = newTotalCents - oldTotalCents;
  if (pointsDelta === 0 && totalDelta === 0) return;

  await tx.customer.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    create: {
      tenantId,
      phone,
      name: order.customerName,
      email: order.customerEmail,
      totalSpentCents: Math.max(0, newTotalCents),
      orderCount: 1,
      pointsBalance: Math.max(0, loyaltyPointsFor(newTotalCents, rate)),
    },
    update: {
      totalSpentCents: { increment: totalDelta },
      pointsBalance: { increment: pointsDelta },
    },
  });
}

/** Always scoped by tenantId — one restaurant's customers never leak into another's list. */
export async function listCustomersForTenant(tenantId: string) {
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    orderBy: { lastOrderAt: "desc" },
  });
  return customers.map((c) => ({
    phone: c.phone,
    name: c.name,
    email: c.email,
    orderCount: c.orderCount,
    totalSpentCents: c.totalSpentCents,
    firstOrderAt: c.firstOrderAt,
    lastOrderAt: c.lastOrderAt,
    loyaltyPoints: c.pointsBalance,
  }));
}

/** Customers who haven't ordered in at least `sinceDays` days — feeds the win-back section on /dashboard/customers. */
export async function listInactiveCustomers(tenantId: string, sinceDays: number) {
  const cutoff = new Date(Date.now() - sinceDays * 86_400_000);
  return prisma.customer.findMany({
    where: { tenantId, lastOrderAt: { lt: cutoff } },
    orderBy: { lastOrderAt: "asc" },
  });
}

/** CSV export for the Customers page — see /api/dashboard/customers/export. */
export function customersToCsv(
  customers: { name: string; phone: string; email: string | null; orderCount: number; totalSpentCents: number; loyaltyPoints: number; lastOrderAt: Date }[],
): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["Name", "Phone", "Email", "Orders", "Total spent (₹)", "Loyalty points", "Last order"];
  const rows = customers.map((c) => [
    c.name,
    c.phone,
    c.email ?? "",
    String(c.orderCount),
    (c.totalSpentCents / 100).toFixed(2),
    String(c.loyaltyPoints),
    c.lastOrderAt.toISOString(),
  ]);
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
}

/** Count of customers whose first-ever order fell within the window — feeds the analytics "new customers" figure. */
export function countNewCustomers(
  customers: { firstOrderAt: Date }[],
  since: Date,
): number {
  return customers.filter((c) => c.firstOrderAt.getTime() >= since.getTime()).length;
}
