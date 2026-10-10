import Link from "next/link";
import { requireOwnerSession } from "@/lib/auth";
import {
  ANALYTICS_PRESETS,
  getAnalyticsReport,
  isAnalyticsPreset,
  listCategoriesForTenants,
  rangeForPreset,
  type AnalyticsPreset,
  type ItemPerf,
} from "@/lib/data/analytics";
import { getTenantById } from "@/lib/data/tenants";
import { formatINR } from "@/lib/money";
import { tenantHasFeature, PLAN_DEFINITIONS } from "@/lib/plans";
import { PAYMENT_SOURCES, PAYMENT_SOURCE_LABEL } from "@/lib/payment-sources";
import { UpgradeRequired } from "@/components/upgrade-required";
import { MenuItemActions } from "@/components/analytics/menu-item-actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type Params = { preset?: string; from?: string; to?: string; category?: string; source?: string };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;
  if (!tenantHasFeature(tenant, "analytics")) {
    return <UpgradeRequired feature="Analytics" requiredPlanLabel={PLAN_DEFINITIONS.ADVANCED.label} />;
  }

  const sp = await searchParams;
  const now = new Date();
  let preset: AnalyticsPreset | "custom" = "last30";
  let range = rangeForPreset("last30", now);

  if (sp.from && sp.to) {
    const from = new Date(sp.from);
    const to = new Date(sp.to);
    to.setHours(23, 59, 59, 999);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      preset = "custom";
      range = { from, to };
    }
  } else if (isAnalyticsPreset(sp.preset)) {
    preset = sp.preset;
    range = rangeForPreset(preset, now);
  }

  const categories = await listCategoriesForTenants([session.tenantId]);
  const category = categories.some((c) => c.id === sp.category) ? sp.category! : "";
  const source = sp.source && sp.source in PAYMENT_SOURCE_LABEL ? sp.source : "";

  const r = await getAnalyticsReport([session.tenantId], range, { categoryId: category || null, paymentSource: source || null });

  // Keeps the current range/filters when switching one control.
  const qs = (over: Record<string, string | undefined>) => {
    const base: Record<string, string | undefined> =
      preset === "custom" ? { from: sp.from, to: sp.to } : { preset };
    const merged = { ...base, category: category || undefined, source: source || undefined, ...over };
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    return u.toString();
  };
  const reportHref = `/api/dashboard/analytics/report?${qs({})}`;
  const maxDayRevenue = Math.max(1, ...r.revenueByDay.map((d) => d.revenueCents));
  const growth = r.salesGrowthPct;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Range:</span>
        {ANALYTICS_PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`/dashboard/analytics?${qs({ preset: p.key, from: undefined, to: undefined })}`}
            className={`rounded-md border px-3 py-1 font-medium ${
              preset === p.key ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </Link>
        ))}
        <form action="/dashboard/analytics" className="flex flex-wrap items-center gap-1">
          <input type="date" name="from" defaultValue={preset === "custom" ? sp.from : undefined} className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
          <span className="text-gray-400">to</span>
          <input type="date" name="to" defaultValue={preset === "custom" ? sp.to : undefined} className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
          {category && <input type="hidden" name="category" value={category} />}
          {source && <input type="hidden" name="source" value={source} />}
          <button
            type="submit"
            className={`rounded-md border px-3 py-1 font-medium ${
              preset === "custom" ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Custom
          </button>
        </form>
      </div>

      <form action="/dashboard/analytics" className="flex flex-wrap items-end gap-3 text-sm">
        {preset === "custom" ? (
          <>
            <input type="hidden" name="from" value={sp.from} />
            <input type="hidden" name="to" value={sp.to} />
          </>
        ) : (
          <input type="hidden" name="preset" value={preset} />
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Payment source
          <select name="source" defaultValue={source} className="rounded-md border border-gray-300 px-2 py-1 text-sm">
            <option value="">All sources</option>
            {PAYMENT_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
            <option value="RAZORPAY">Online (Razorpay)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Category (menu performance)
          <select name="category" defaultValue={category} className="rounded-md border border-gray-300 px-2 py-1 text-sm">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md border border-gray-300 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50">
          Apply filters
        </button>
        <a
          href={reportHref}
          target="_blank"
          rel="noreferrer"
          data-testid="generate-report"
          className="ml-auto rounded-md bg-indigo-600 px-4 py-1.5 font-semibold text-white hover:bg-indigo-700"
        >
          Generate PDF report
        </a>
      </form>

      <Section title="Sales">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Gross sales" value={formatINR(r.grossSalesCents)} hint="Before discounts & tax" />
          <StatCard label="Net sales" value={formatINR(r.netSalesCents)} hint="After discounts, before tax" />
          <StatCard label="Total revenue" value={formatINR(r.totalRevenueCents)} hint="Charged incl. tax" />
          <StatCard
            label="Sales growth"
            value={growth == null ? "—" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
            hint={`vs previous period (${formatINR(r.previousRevenueCents)})`}
          />
          <StatCard label="Total orders" value={String(r.totalOrders)} />
          <StatCard label="Avg. order value" value={formatINR(r.avgOrderCents)} />
          <StatCard label="Items sold" value={String(r.itemsSold)} />
          <StatCard label="Avg. items / order" value={r.avgItemsPerOrder.toFixed(1)} />
          <StatCard label="Total discounts" value={formatINR(r.totalDiscountCents)} />
          <StatCard label="Tax/GST collected" value={formatINR(r.totalTaxCents)} />
          <StatCard label="Best day" value={r.bestDay ? `${r.bestDay.day} · ${formatINR(r.bestDay.revenueCents)}` : "—"} />
          <StatCard
            label="Avg. completion time"
            value={r.avgProcessingMinutes == null ? "—" : `${r.avgProcessingMinutes} min`}
            hint="Approx., completed orders"
          />
        </div>
      </Section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Sales trend</h2>
        {r.revenueByDay.length === 0 ? (
          <p className="text-sm text-gray-500">No orders in this range yet.</p>
        ) : (
          <div className="flex h-40 items-end gap-1 overflow-x-auto">
            {r.revenueByDay.map((d) => (
              // h-full on the wrapper is load-bearing: a percentage height only resolves against a defined-height parent.
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

      <Section title="Orders">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatCard label="Completed" value={String(r.completedCount)} />
          <StatCard label="In progress / pending" value={String(r.pendingOrdersCount)} />
          <StatCard label="Cancelled" value={`${r.cancelledCount} (${Math.round(r.cancellationRate * 100)}%)`} />
          <StatCard label="Refunded" value={String(r.refundedOrdersCount)} />
          <StatCard label="Total (all statuses)" value={String(r.orderStatusSummary.reduce((s, x) => s + x.count, 0))} />
        </div>
      </Section>

      <Section title="Customers">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatCard label="Total customers" value={String(r.customers.total)} hint="Orders with a phone number" />
          <StatCard label="New" value={String(r.customers.new)} />
          <StatCard label="Returning" value={String(r.customers.returning)} />
          <StatCard label="Repeat rate" value={`${r.customers.repeatRatePct.toFixed(0)}%`} />
          <StatCard label="Avg. spend / customer" value={formatINR(r.customers.avgSpendCents)} />
        </div>
      </Section>

      <Section title="Payment source analytics">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total payment received" value={formatINR(r.payments.totalPaidCents)} />
          <StatCard label="Successful payments" value={String(r.payments.successfulCount)} />
          <StatCard label="Pending" value={`${r.payments.pendingCount} · ${formatINR(r.payments.pendingCents)}`} />
          <StatCard label="Failed" value={`${r.payments.failedCount} · ${formatINR(r.payments.failedCents)}`} />
          <StatCard label="Refunded" value={`${r.payments.refundedCount} · ${formatINR(r.payments.refundedCents)}`} />
        </div>
        {r.payments.sources.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No confirmed payments in this range.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
            <table className="w-full text-left text-sm" data-testid="payment-source-table">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Payment source</th>
                  <th className="px-3 py-2 text-right">Transactions</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Share</th>
                  <th className="w-1/3 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {r.payments.sources.map((s) => (
                  <tr key={s.source}>
                    <td className="px-3 py-2">{PAYMENT_SOURCE_LABEL[s.source] ?? s.source}</td>
                    <td className="px-3 py-2 text-right">{s.transactions}</td>
                    <td className="px-3 py-2 text-right">{formatINR(s.amountCents)}</td>
                    <td className="px-3 py-2 text-right">{s.pct.toFixed(1)}%</td>
                    <td className="px-3 py-2">
                      <div className="h-2 rounded bg-gray-100">
                        <div className="h-2 rounded bg-indigo-600" style={{ width: `${Math.max(2, s.pct)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 font-semibold">
                <tr>
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">{r.payments.successfulCount}</td>
                  <td className="px-3 py-2 text-right">{formatINR(r.payments.totalPaidCents)}</td>
                  <td className="px-3 py-2 text-right">100%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-400">
          Counted by the day you confirmed receipt, so it can be tallied against your actual collections. Orders
          confirmed before payment sources existed are grouped by how the customer chose to pay.
        </p>
      </Section>

      <Section title="Menu performance">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PerfList title="Best-selling" items={r.menu.best} editable />
          <PerfList title="Average-selling" items={r.menu.average} editable />
          <PerfList title="Least-selling" items={r.menu.least} editable />
          <PerfList title="Not sold in this period" items={r.menu.notSold} zero editable />
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
          <h3 className="px-3 pt-3 text-sm font-semibold text-gray-900">Category performance</h3>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-right">Units</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.menu.categoryPerformance.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-gray-500">
                    No item sales in this range.
                  </td>
                </tr>
              )}
              {r.menu.categoryPerformance.map((c) => (
                <tr key={c.category}>
                  <td className="px-3 py-2">{c.category}</td>
                  <td className="px-3 py-2 text-right">{c.quantity}</td>
                  <td className="px-3 py-2 text-right">{formatINR(c.revenueCents)}</td>
                  <td className="px-3 py-2 text-right">{c.contributionPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Order status summary</h2>
        {r.orderStatusSummary.length === 0 ? (
          <p className="text-sm text-gray-500">No orders in this range yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100 text-sm">
            {r.orderStatusSummary.map((s) => (
              <li key={s.status} className="flex justify-between py-1.5">
                <span>{STATUS_LABEL[s.status] ?? s.status}</span>
                <span className="text-gray-500">{s.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent orders</h2>
        {r.recentOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders in this range yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100 text-sm">
            {r.recentOrders.map((o) => (
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900 sm:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function PerfList({ title, items, zero, editable }: { title: string; items: ItemPerf[]; zero?: boolean; editable?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]" data-testid={`perf-${title}`}>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing here.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100 text-sm">
          {items.map((i) => (
            <li key={i.key} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
              <span>
                <span className="font-medium">{i.name}</span> —{" "}
                {zero ? "0 units sold during the selected period" : `${i.quantity} unit${i.quantity === 1 ? "" : "s"} sold · ${formatINR(i.revenueCents)}`}
                {i.isAvailable === false && <span className="ml-1 text-xs text-amber-600">(hidden)</span>}
              </span>
              {editable && i.itemId && i.inCatalog && <MenuItemActions itemId={i.itemId} isAvailable={i.isAvailable !== false} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
