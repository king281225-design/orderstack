import "server-only";
import { prisma } from "@/lib/prisma";
import { effectivePaymentSource, isPaymentSource } from "@/lib/payment-sources";

export type DateRange = { from: Date; to: Date };

const DAY_MS = 24 * 60 * 60 * 1000;

export const ANALYTICS_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "year", label: "This year" },
] as const;
export type AnalyticsPreset = (typeof ANALYTICS_PRESETS)[number]["key"];

export function isAnalyticsPreset(value: unknown): value is AnalyticsPreset {
  return ANALYTICS_PRESETS.some((p) => p.key === value);
}

/**
 * Range presets for the analytics filter ("custom" is handled by the caller
 * passing an explicit DateRange). Day/month boundaries use the server's local
 * midnight, the same convention the Orders board's "today" figures use.
 */
export function rangeForPreset(preset: AnalyticsPreset, now: Date): DateRange {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  switch (preset) {
    case "today":
      return { from: startOfToday, to: now };
    case "yesterday":
      return { from: new Date(startOfToday.getTime() - DAY_MS), to: new Date(startOfToday.getTime() - 1) };
    case "last7":
      return { from: new Date(startOfToday.getTime() - 6 * DAY_MS), to: now };
    case "last30":
      return { from: new Date(startOfToday.getTime() - 29 * DAY_MS), to: now };
    case "thisMonth":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "lastMonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, -1),
      };
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
  }
}

export type AnalyticsFilters = {
  /** Only product/category performance is narrowed to this category (Category.id). */
  categoryId?: string | null;
  /** Narrow sales + payments to orders whose payment source resolves to this key. */
  paymentSource?: string | null;
};

export type SourceRow = { source: string; transactions: number; amountCents: number };

export type ItemPerf = {
  key: string;
  itemId: string | null;
  name: string;
  categoryName: string;
  isAvailable: boolean | null;
  inCatalog: boolean;
  quantity: number;
  revenueCents: number;
  contributionPct: number;
};

function emptyDay() {
  return { revenueCents: 0, orderCount: 0 };
}

/**
 * One call that computes everything the analytics page, the PDF report and
 * the central business dashboard show. `tenantIds` MUST come from a verified
 * session (the active store, or the stores of the session's own business) —
 * never from a request parameter. Everything is computed in application code
 * from the Order/OrderItem tables, as before (fine at current scale).
 *
 * Conventions:
 *  - CANCELLED orders and REFUNDED-payment orders are excluded from sales
 *    figures (never real revenue); refunds are reported separately.
 *  - grossSales = sum of subtotals (before discount/tax); netSales = gross −
 *    discounts (before tax); totalRevenue = what was charged (net + tax).
 *  - Payment figures reconcile against paidAt (when the money was confirmed),
 *    falling back to createdAt for orders paid before paidAt existed.
 */
export async function getAnalyticsReport(tenantIds: string[], range: DateRange, filters: AnalyticsFilters = {}) {
  const spanMs = Math.max(1, range.to.getTime() - range.from.getTime());
  const prevRange: DateRange = { from: new Date(range.from.getTime() - spanMs), to: new Date(range.from.getTime() - 1) };
  const sourceFilter = filters.paymentSource && (isPaymentSource(filters.paymentSource) || filters.paymentSource === "RAZORPAY" || filters.paymentSource === "AGGREGATOR") ? filters.paymentSource : null;

  const orderSelect = {
    id: true,
    tenantId: true,
    orderNumber: true,
    customerName: true,
    customerPhone: true,
    totalCents: true,
    subtotalCents: true,
    discountCents: true,
    taxCents: true,
    createdAt: true,
    updatedAt: true,
    paidAt: true,
    paymentMethod: true,
    paymentStatus: true,
    paymentSource: true,
    status: true,
  } as const;

  const [ordersRaw, prevOrdersRaw, paidRaw, lines, catalog, tenants, identified] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId: { in: tenantIds }, createdAt: { gte: range.from, lte: range.to } },
      select: orderSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { tenantId: { in: tenantIds }, createdAt: { gte: prevRange.from, lte: prevRange.to }, status: { not: "CANCELLED" }, paymentStatus: { not: "REFUNDED" } },
      select: { totalCents: true, paymentMethod: true, paymentSource: true },
    }),
    prisma.order.findMany({
      where: {
        tenantId: { in: tenantIds },
        paymentStatus: "PAID",
        OR: [
          { paidAt: { gte: range.from, lte: range.to } },
          { paidAt: null, createdAt: { gte: range.from, lte: range.to } },
        ],
      },
      select: { tenantId: true, totalCents: true, paymentMethod: true, paymentSource: true },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          tenantId: { in: tenantIds },
          createdAt: { gte: range.from, lte: range.to },
          status: { not: "CANCELLED" },
          paymentStatus: { not: "REFUNDED" },
        },
      },
      select: {
        itemId: true,
        nameSnapshot: true,
        quantity: true,
        priceCentsSnapshot: true,
        order: { select: { tenantId: true, paymentMethod: true, paymentSource: true } },
      },
    }),
    prisma.item.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { id: true, tenantId: true, name: true, isAvailable: true, categoryId: true, category: { select: { name: true } } },
    }),
    prisma.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true, slug: true } }),
    // Every identified customer order, all-time — needed to know who is new vs returning.
    prisma.order.findMany({
      where: { tenantId: { in: tenantIds }, status: { not: "CANCELLED" }, customerPhone: { not: "" } },
      select: { customerPhone: true, totalCents: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const matchesSource = (o: { paymentMethod: string; paymentSource: string | null }) =>
    !sourceFilter || effectivePaymentSource(o) === sourceFilter;

  // ---- Sales -------------------------------------------------------------
  const allInRange = ordersRaw.filter(matchesSource);
  const salesOrders = allInRange.filter((o) => o.status !== "CANCELLED" && o.paymentStatus !== "REFUNDED");
  const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);

  const totalOrders = salesOrders.length;
  const totalRevenueCents = sum(salesOrders, (o) => o.totalCents);
  const grossSalesCents = sum(salesOrders, (o) => o.subtotalCents);
  const totalDiscountCents = sum(salesOrders, (o) => o.discountCents);
  const totalTaxCents = sum(salesOrders, (o) => o.taxCents);
  const netSalesCents = grossSalesCents - totalDiscountCents;
  const avgOrderCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;

  const prevRevenueCents = sum(prevOrdersRaw.filter(matchesSource), (o) => o.totalCents);
  const salesGrowthPct = prevRevenueCents > 0 ? ((totalRevenueCents - prevRevenueCents) / prevRevenueCents) * 100 : null;

  const itemsSold = sum(
    lines.filter((l) => matchesSource(l.order)),
    (l) => l.quantity,
  );

  const byDay = new Map<string, { revenueCents: number; orderCount: number }>();
  for (const o of salesOrders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    const e = byDay.get(day) ?? emptyDay();
    e.revenueCents += o.totalCents;
    e.orderCount += 1;
    byDay.set(day, e);
  }
  const revenueByDay = Array.from(byDay.entries())
    .map(([day, v]) => ({ day, ...v }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const bestDay = revenueByDay.reduce<(typeof revenueByDay)[number] | null>(
    (best, d) => (!best || d.revenueCents > best.revenueCents ? d : best),
    null,
  );

  // ---- Order statuses ----------------------------------------------------
  const statusCounts = new Map<string, number>();
  for (const o of allInRange) statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1);
  const orderStatusSummary = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));
  const cancelledCount = statusCounts.get("CANCELLED") ?? 0;
  const completedCount = statusCounts.get("COMPLETED") ?? 0;
  const pendingOrdersCount = (statusCounts.get("PENDING") ?? 0) + (statusCounts.get("ACCEPTED") ?? 0) + (statusCounts.get("PREPARING") ?? 0) + (statusCounts.get("READY") ?? 0);
  const refundedOrdersCount = allInRange.filter((o) => o.paymentStatus === "REFUNDED").length;
  const cancellationRate = allInRange.length > 0 ? cancelledCount / allInRange.length : 0;

  // Approximate: order creation to its last update, for completed orders only
  // (there is no dedicated completedAt column). Ignores anything over a day
  // (an order marked complete long after the fact isn't a prep time).
  const durations = allInRange
    .filter((o) => o.status === "COMPLETED")
    .map((o) => o.updatedAt.getTime() - o.createdAt.getTime())
    .filter((ms) => ms >= 0 && ms < DAY_MS);
  const avgProcessingMinutes = durations.length ? Math.round(sum(durations, (d) => d) / durations.length / 60000) : null;

  // ---- Payments ------------------------------------------------------------
  const paid = paidRaw.filter(matchesSource);
  const bySource = new Map<string, SourceRow>();
  for (const o of paid) {
    const key = effectivePaymentSource(o);
    const row = bySource.get(key) ?? { source: key, transactions: 0, amountCents: 0 };
    row.transactions += 1;
    row.amountCents += o.totalCents;
    bySource.set(key, row);
  }
  const paymentSources = Array.from(bySource.values()).sort((a, b) => b.amountCents - a.amountCents);
  const totalPaidCents = sum(paymentSources, (r) => r.amountCents);
  const paymentSourcePct = paymentSources.map((r) => ({
    ...r,
    pct: totalPaidCents > 0 ? (r.amountCents / totalPaidCents) * 100 : 0,
  }));
  const pendingPayments = allInRange.filter((o) => o.status !== "CANCELLED" && o.paymentStatus === "PENDING");
  const failedPayments = allInRange.filter((o) => o.paymentStatus === "FAILED");
  const refunded = allInRange.filter((o) => o.paymentStatus === "REFUNDED");
  const payments = {
    totalPaidCents,
    successfulCount: paid.length,
    pendingCount: pendingPayments.length,
    pendingCents: sum(pendingPayments, (o) => o.totalCents),
    failedCount: failedPayments.length,
    failedCents: sum(failedPayments, (o) => o.totalCents),
    refundedCount: refunded.length,
    refundedCents: sum(refunded, (o) => o.totalCents),
    sources: paymentSourcePct,
  };

  // ---- Customers -----------------------------------------------------------
  type Cust = { first: Date; ordersBefore: number; inRange: number; spentInRange: number };
  const custs = new Map<string, Cust>();
  for (const o of identified) {
    const c = custs.get(o.customerPhone) ?? { first: o.createdAt, ordersBefore: 0, inRange: 0, spentInRange: 0 };
    if (o.createdAt < range.from) c.ordersBefore += 1;
    else if (o.createdAt <= range.to) {
      c.inRange += 1;
      c.spentInRange += o.totalCents;
    }
    custs.set(o.customerPhone, c);
  }
  const active = Array.from(custs.values()).filter((c) => c.inRange > 0);
  const newCustomers = active.filter((c) => c.ordersBefore === 0).length;
  const returningCustomers = active.filter((c) => c.ordersBefore > 0 || c.inRange > 1).length;
  const customersSummary = {
    total: active.length,
    new: newCustomers,
    returning: returningCustomers,
    repeatRatePct: active.length ? (returningCustomers / active.length) * 100 : 0,
    avgSpendCents: active.length ? Math.round(sum(active, (c) => c.spentInRange) / active.length) : 0,
  };

  // ---- Menu performance ------------------------------------------------------
  const catalogById = new Map(catalog.map((i) => [i.id, i]));
  const catalogByName = new Map<string, (typeof catalog)[number]>();
  for (const i of catalog) catalogByName.set(`${i.tenantId}:${i.name.trim().toLowerCase()}`, i);

  const perf = new Map<string, ItemPerf>();
  const categoryFilter = filters.categoryId || null;
  for (const l of lines) {
    if (!matchesSource(l.order)) continue;
    const cat =
      (l.itemId ? catalogById.get(l.itemId) : undefined) ??
      catalogByName.get(`${l.order.tenantId}:${l.nameSnapshot.trim().toLowerCase()}`);
    if (categoryFilter && cat?.categoryId !== categoryFilter) continue;
    const key = cat ? `i:${cat.id}` : `n:${l.nameSnapshot.trim().toLowerCase()}`;
    const row =
      perf.get(key) ??
      ({
        key,
        itemId: cat?.id ?? null,
        name: cat?.name ?? l.nameSnapshot,
        categoryName: cat?.category.name ?? "Custom / not on menu",
        isAvailable: cat?.isAvailable ?? null,
        inCatalog: Boolean(cat),
        quantity: 0,
        revenueCents: 0,
        contributionPct: 0,
      } satisfies ItemPerf);
    row.quantity += l.quantity;
    row.revenueCents += l.quantity * l.priceCentsSnapshot;
    perf.set(key, row);
  }
  // Catalog items nobody bought in this range.
  const notSold: ItemPerf[] = [];
  for (const i of catalog) {
    if (categoryFilter && i.categoryId !== categoryFilter) continue;
    if (!perf.has(`i:${i.id}`)) {
      notSold.push({
        key: `i:${i.id}`,
        itemId: i.id,
        name: i.name,
        categoryName: i.category.name,
        isAvailable: i.isAvailable,
        inCatalog: true,
        quantity: 0,
        revenueCents: 0,
        contributionPct: 0,
      });
    }
  }
  const sold = Array.from(perf.values()).sort((a, b) => b.quantity - a.quantity || b.revenueCents - a.revenueCents);
  const totalLineRevenue = sum(sold, (s) => s.revenueCents);
  for (const s of sold) s.contributionPct = totalLineRevenue > 0 ? (s.revenueCents / totalLineRevenue) * 100 : 0;

  // Split the sold items into thirds (capped at 5 each) so a small menu never
  // lists the same dish as both best- and least-selling.
  const TOP_N = 5;
  const k = Math.min(TOP_N, Math.max(1, Math.ceil(sold.length / 3)));
  const best = sold.slice(0, k);
  const rest = sold.slice(k);
  const least = [...rest].sort((a, b) => a.quantity - b.quantity || a.revenueCents - b.revenueCents).slice(0, Math.min(k, rest.length));
  const leastKeys = new Set(least.map((l) => l.key));
  const meanQty = sold.length ? sum(sold, (s) => s.quantity) / sold.length : 0;
  const average = rest
    .filter((r) => !leastKeys.has(r.key))
    .sort((a, b) => Math.abs(a.quantity - meanQty) - Math.abs(b.quantity - meanQty))
    .slice(0, TOP_N);

  const catPerf = new Map<string, { category: string; quantity: number; revenueCents: number; contributionPct: number }>();
  for (const s of sold) {
    const c = catPerf.get(s.categoryName) ?? { category: s.categoryName, quantity: 0, revenueCents: 0, contributionPct: 0 };
    c.quantity += s.quantity;
    c.revenueCents += s.revenueCents;
    catPerf.set(s.categoryName, c);
  }
  const categoryPerformance = Array.from(catPerf.values())
    .map((c) => ({ ...c, contributionPct: totalLineRevenue > 0 ? (c.revenueCents / totalLineRevenue) * 100 : 0 }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  // ---- Per store (central dashboard / PDF) --------------------------------
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));
  const byStore = tenantIds.map((id) => {
    const os = salesOrders.filter((o) => o.tenantId === id);
    const srcs = new Map<string, SourceRow>();
    for (const o of paid.filter((p) => p.tenantId === id)) {
      const key = effectivePaymentSource(o);
      const r = srcs.get(key) ?? { source: key, transactions: 0, amountCents: 0 };
      r.transactions += 1;
      r.amountCents += o.totalCents;
      srcs.set(key, r);
    }
    return {
      tenantId: id,
      name: tenantMap.get(id)?.name ?? "Store",
      slug: tenantMap.get(id)?.slug ?? "",
      orders: os.length,
      revenueCents: sum(os, (o) => o.totalCents),
      paymentSources: Array.from(srcs.values()).sort((a, b) => b.amountCents - a.amountCents),
    };
  });

  return {
    range,
    totalOrders,
    totalRevenueCents,
    grossSalesCents,
    netSalesCents,
    avgOrderCents,
    totalDiscountCents,
    totalTaxCents,
    itemsSold,
    avgItemsPerOrder: totalOrders > 0 ? itemsSold / totalOrders : 0,
    salesGrowthPct,
    previousRevenueCents: prevRevenueCents,
    cancelledCount,
    completedCount,
    pendingOrdersCount,
    refundedOrdersCount,
    cancellationRate,
    avgProcessingMinutes,
    revenueByDay,
    bestDay,
    orderStatusSummary,
    recentOrders: salesOrders.slice(0, 10),
    payments,
    customers: customersSummary,
    menu: { best, average, least, notSold, all: sold, categoryPerformance },
    byStore,
  };
}

export type AnalyticsReport = Awaited<ReturnType<typeof getAnalyticsReport>>;

/** Categories for the report/analytics filter dropdown (tenant-scoped). */
export async function listCategoriesForTenants(tenantIds: string[]) {
  return prisma.category.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
