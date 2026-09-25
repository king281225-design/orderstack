import Link from "next/link";
import { requireOwnerSession } from "@/lib/auth";
import { getAnalyticsSummary, getTopItems, rangeForPreset } from "@/lib/data/analytics";
import { getTenantById } from "@/lib/data/tenants";
import { formatINR } from "@/lib/money";
import { tierHasFeature, PLAN_DEFINITIONS } from "@/lib/plans";
import { UpgradeRequired } from "@/components/upgrade-required";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
] as const;
type Preset = (typeof PRESETS)[number]["key"];

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  UPI: "UPI",
  COD: "Cash on delivery",
  CARD: "Card",
  RAZORPAY: "Online",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;
  if (!tierHasFeature(tenant.planTier, "analytics")) {
    return <UpgradeRequired feature="Analytics" requiredPlanLabel={PLAN_DEFINITIONS.ADVANCED.label} />;
  }

  const { preset: presetParam, from: fromParam, to: toParam } = await searchParams;

  const now = new Date();
  let preset: Preset | "custom" = "month";
  let range = rangeForPreset("month", now);

  if (fromParam && toParam) {
    const from = new Date(fromParam);
    const to = new Date(toParam);
    to.setHours(23, 59, 59, 999);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      preset = "custom";
      range = { from, to };
    }
  } else if (PRESETS.some((p) => p.key === presetParam)) {
    preset = presetParam as Preset;
    range = rangeForPreset(preset, now);
  }

  const [summary, topItems] = await Promise.all([
    getAnalyticsSummary(session.tenantId, range),
    getTopItems(session.tenantId, range),
  ]);

  const maxDayRevenue = Math.max(1, ...summary.revenueByDay.map((d) => d.revenueCents));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Range:</span>
        {PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`/dashboard/analytics?preset=${p.key}`}
            className={`rounded-md border px-3 py-1 font-medium ${
              preset === p.key
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </Link>
        ))}
        <form action="/dashboard/analytics" className="flex items-center gap-1">
          <input
            type="date"
            name="from"
            defaultValue={preset === "custom" ? fromParam : undefined}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            name="to"
            defaultValue={preset === "custom" ? toParam : undefined}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          />
          <button
            type="submit"
            className={`rounded-md border px-3 py-1 font-medium ${
              preset === "custom"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Custom
          </button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total orders" value={String(summary.totalOrders)} />
        <StatCard label="Total revenue" value={formatINR(summary.totalRevenueCents)} />
        <StatCard label="Avg. order value" value={formatINR(summary.avgOrderCents)} />
        <StatCard
          label="Cancelled"
          value={`${summary.cancelledCount} (${Math.round(summary.cancellationRate * 100)}%)`}
        />
        <StatCard label="Total discounts" value={formatINR(summary.totalDiscountCents)} />
        <StatCard label="Tax/GST collected" value={formatINR(summary.totalTaxCents)} />
        <StatCard label="New customers" value={String(summary.newCustomersCount)} />
        <StatCard
          label="Best day"
          value={summary.bestDay ? `${summary.bestDay.day} · ${formatINR(summary.bestDay.revenueCents)}` : "—"}
        />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Sales trend</h2>
        {summary.revenueByDay.length === 0 ? (
          <p className="text-sm text-gray-500">No orders in this range yet.</p>
        ) : (
          <div className="flex h-40 items-end gap-1 overflow-x-auto">
            {summary.revenueByDay.map((d) => (
              // h-full here is load-bearing: a percentage height on the bar
              // below only resolves against a parent with a *defined*
              // height, and a plain flex-1 child has none (flex-1 only
              // distributes width in a row) — omitting it silently renders
              // every bar at 0px tall. Caught by actually looking at a
              // screenshot, not by any static check.
              <div key={d.day} className="group relative h-full min-w-[6px] flex-1">
                <div
                  className="absolute bottom-0 w-full rounded-t bg-indigo-600"
                  style={{ height: `${Math.max(2, (d.revenueCents / maxDayRevenue) * 100)}%` }}
                  title={`${d.day}: ${formatINR(d.revenueCents)} · ${d.orderCount} order${d.orderCount === 1 ? "" : "s"}`}
                />
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-gray-400">Hover a bar for the day&apos;s total.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Top-selling items</h2>
          {topItems.length === 0 ? (
            <p className="text-sm text-gray-500">No orders in this range yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100 text-sm">
              {topItems.map((item) => (
                <li key={item.name} className="flex justify-between py-1.5">
                  <span>
                    {item.quantity} × {item.name}
                  </span>
                  <span className="text-gray-500">{formatINR(item.revenueCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment methods</h2>
          {summary.paymentMethodCounts.length === 0 ? (
            <p className="text-sm text-gray-500">No orders in this range yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100 text-sm">
              {summary.paymentMethodCounts.map((p) => (
                <li key={p.method} className="flex justify-between py-1.5">
                  <span>{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</span>
                  <span className="text-gray-500">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Order status summary</h2>
          {summary.orderStatusSummary.length === 0 ? (
            <p className="text-sm text-gray-500">No orders in this range yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100 text-sm">
              {summary.orderStatusSummary.map((s) => (
                <li key={s.status} className="flex justify-between py-1.5">
                  <span>{STATUS_LABEL[s.status]}</span>
                  <span className="text-gray-500">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent orders</h2>
        {summary.recentOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders in this range yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100 text-sm">
            {summary.recentOrders.map((o) => (
              <li key={o.id} className="flex justify-between py-1.5">
                <span>
                  #{o.orderNumber} · {o.customerName}
                </span>
                <span className="text-gray-500">{formatINR(o.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
