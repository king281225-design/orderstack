import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { getAnalyticsSummary, getTopItems } from "@/lib/data/analytics";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

const RANGE_OPTIONS = [7, 30, 90] as const;

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  UPI: "UPI",
  COD: "Cash on delivery",
  RAZORPAY: "Online",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await requireTenantSession();
  const { days: daysParam } = await searchParams;
  const days = RANGE_OPTIONS.includes(Number(daysParam) as (typeof RANGE_OPTIONS)[number])
    ? Number(daysParam)
    : 30;

  const [summary, topItems] = await Promise.all([
    getAnalyticsSummary(session.tenantId, days),
    getTopItems(session.tenantId, days),
  ]);

  const maxDayRevenue = Math.max(1, ...summary.revenueByDay.map((d) => d.revenueCents));
  const totalNonCancelled = summary.totalOrders + summary.cancelledCount;
  const cancellationRate =
    totalNonCancelled > 0 ? Math.round((summary.cancelledCount / totalNonCancelled) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Range:</span>
        {RANGE_OPTIONS.map((opt) => (
          <Link
            key={opt}
            href={`/dashboard/analytics?days=${opt}`}
            className={`rounded-md border px-3 py-1 font-medium ${
              days === opt
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Last {opt} days
          </Link>
        ))}
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Orders" value={String(summary.totalOrders)} />
        <StatCard label="Revenue" value={formatINR(summary.totalRevenueCents)} />
        <StatCard label="Avg. order value" value={formatINR(summary.avgOrderCents)} />
        <StatCard label="Cancelled" value={`${summary.cancelledCount} (${cancellationRate}%)`} />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Revenue by day</h2>
        {summary.revenueByDay.length === 0 ? (
          <p className="text-sm text-gray-500">No orders in this range yet.</p>
        ) : (
          <div className="flex h-40 items-end gap-1">
            {summary.revenueByDay.map((d) => (
              // h-full here is load-bearing: a percentage height on the bar
              // below only resolves against a parent with a *defined*
              // height, and a plain flex-1 child has none (flex-1 only
              // distributes width in a row) — omitting it silently renders
              // every bar at 0px tall. Caught by actually looking at a
              // screenshot, not by any static check.
              <div key={d.day} className="group relative h-full flex-1">
                <div
                  className="absolute bottom-0 w-full rounded-t bg-gray-900"
                  style={{ height: `${Math.max(2, (d.revenueCents / maxDayRevenue) * 100)}%` }}
                  title={`${d.day}: ${formatINR(d.revenueCents)} · ${d.orderCount} order${d.orderCount === 1 ? "" : "s"}`}
                />
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-gray-400">Hover a bar for the day&apos;s total.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
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

        <div className="rounded-lg border border-gray-200 bg-white p-4">
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
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
