import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * All figures here exclude CANCELLED orders — a cancelled order was never
 * real revenue, and counting it would make "orders" and "revenue" tell
 * inconsistent stories. Everything is computed in application code rather
 * than DB-side date-trunc/GROUP BY, which is fine at launch scale (1–5
 * restaurants, modest order volume) and keeps this portable across
 * whatever database ends up in production.
 */
export async function getAnalyticsSummary(tenantId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [orders, cancelledCount] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId, createdAt: { gte: since }, status: { not: "CANCELLED" } },
      select: { totalCents: true, createdAt: true, paymentMethod: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.count({ where: { tenantId, createdAt: { gte: since }, status: "CANCELLED" } }),
  ]);

  const totalOrders = orders.length;
  const totalRevenueCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
  const avgOrderCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;

  const byDay = new Map<string, { revenueCents: number; orderCount: number }>();
  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    const existing = byDay.get(day) ?? { revenueCents: 0, orderCount: 0 };
    existing.revenueCents += o.totalCents;
    existing.orderCount += 1;
    byDay.set(day, existing);
  }
  const revenueByDay = Array.from(byDay.entries())
    .map(([day, v]) => ({ day, ...v }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const byPaymentMethod = new Map<string, number>();
  for (const o of orders) {
    byPaymentMethod.set(o.paymentMethod, (byPaymentMethod.get(o.paymentMethod) ?? 0) + 1);
  }

  return {
    totalOrders,
    totalRevenueCents,
    avgOrderCents,
    cancelledCount,
    revenueByDay,
    paymentMethodCounts: Array.from(byPaymentMethod.entries()).map(([method, count]) => ({
      method,
      count,
    })),
  };
}

export async function getTopItems(tenantId: string, days: number, limit = 5) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Per-item revenue is quantity * priceCentsSnapshot *per line*, which
  // Prisma's groupBy _sum can't express (it sums one column at a time, not
  // a per-row product) — fetched and totalled in JS instead. Fine at launch
  // scale; a raw SQL sum would be the move if this table ever got huge.
  const lines = await prisma.orderItem.findMany({
    where: {
      order: { tenantId, createdAt: { gte: since }, status: { not: "CANCELLED" } },
    },
    select: { nameSnapshot: true, quantity: true, priceCentsSnapshot: true },
  });

  const byName = new Map<string, { quantity: number; revenueCents: number }>();
  for (const line of lines) {
    const existing = byName.get(line.nameSnapshot) ?? { quantity: 0, revenueCents: 0 };
    existing.quantity += line.quantity;
    existing.revenueCents += line.quantity * line.priceCentsSnapshot;
    byName.set(line.nameSnapshot, existing);
  }

  return Array.from(byName.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}
