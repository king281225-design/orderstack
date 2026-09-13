import "server-only";
import { prisma } from "@/lib/prisma";
import { listCustomersForTenant, countNewCustomers } from "@/lib/data/customers";
import type { OrderStatus } from "@prisma/client";

export type DateRange = { from: Date; to: Date };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Range presets for the analytics page's filter — "custom" is handled by the caller passing an explicit DateRange instead. */
export function rangeForPreset(preset: "today" | "week" | "month" | "year", now: Date): DateRange {
  const to = now;
  if (preset === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  if (preset === "week") return { from: new Date(now.getTime() - 7 * DAY_MS), to };
  if (preset === "month") return { from: new Date(now.getTime() - 30 * DAY_MS), to };
  return { from: new Date(now.getTime() - 365 * DAY_MS), to };
}

/**
 * All figures here exclude CANCELLED orders — a cancelled order was never
 * real revenue, and counting it would make "orders" and "revenue" tell
 * inconsistent stories. Everything is computed in application code rather
 * than DB-side date-trunc/GROUP BY, which is fine at launch scale (1–5
 * restaurants, modest order volume) and keeps this portable across
 * whatever database ends up in production. Always scoped by tenantId, and
 * always computed fresh from the Order/OrderItem tables actually saved by
 * checkout/manual-billing — never from anything cached or client-supplied.
 */
export async function getAnalyticsSummary(tenantId: string, range: DateRange) {
  const [orders, statusCounts, customers] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId, createdAt: { gte: range.from, lte: range.to }, status: { not: "CANCELLED" } },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalCents: true,
        subtotalCents: true,
        discountCents: true,
        taxCents: true,
        createdAt: true,
        paymentMethod: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { tenantId, createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
    }),
    listCustomersForTenant(tenantId),
  ]);

  const totalOrders = orders.length;
  const totalRevenueCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
  const totalDiscountCents = orders.reduce((sum, o) => sum + o.discountCents, 0);
  const totalTaxCents = orders.reduce((sum, o) => sum + o.taxCents, 0);
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

  const bestDay = revenueByDay.reduce<{ day: string; revenueCents: number; orderCount: number } | null>(
    (best, d) => (!best || d.revenueCents > best.revenueCents ? d : best),
    null,
  );

  const byPaymentMethod = new Map<string, number>();
  for (const o of orders) {
    byPaymentMethod.set(o.paymentMethod, (byPaymentMethod.get(o.paymentMethod) ?? 0) + 1);
  }

  const orderStatusSummary = statusCounts.map((s) => ({
    status: s.status as OrderStatus,
    count: s._count._all,
  }));

  const cancelledCount = orderStatusSummary.find((s) => s.status === "CANCELLED")?.count ?? 0;
  const totalOrdersIncludingCancelled = orderStatusSummary.reduce((sum, s) => sum + s.count, 0);

  return {
    totalOrders,
    totalRevenueCents,
    avgOrderCents,
    totalDiscountCents,
    totalTaxCents,
    cancelledCount,
    cancellationRate:
      totalOrdersIncludingCancelled > 0 ? cancelledCount / totalOrdersIncludingCancelled : 0,
    revenueByDay,
    bestDay,
    newCustomersCount: countNewCustomers(customers, range.from),
    orderStatusSummary,
    recentOrders: orders.slice(0, 10),
    paymentMethodCounts: Array.from(byPaymentMethod.entries()).map(([method, count]) => ({
      method,
      count,
    })),
  };
}

export async function getTopItems(tenantId: string, range: DateRange, limit = 5) {
  // Per-item revenue is quantity * priceCentsSnapshot *per line*, which
  // Prisma's groupBy _sum can't express (it sums one column at a time, not
  // a per-row product) — fetched and totalled in JS instead. Fine at launch
  // scale; a raw SQL sum would be the move if this table ever got huge.
  const lines = await prisma.orderItem.findMany({
    where: {
      order: { tenantId, createdAt: { gte: range.from, lte: range.to }, status: { not: "CANCELLED" } },
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
