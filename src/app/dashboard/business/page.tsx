import Link from "next/link";
import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { getBusinessForOwner, resolveStoreScope } from "@/lib/data/business";
import {
  ANALYTICS_PRESETS,
  getAnalyticsReport,
  isAnalyticsPreset,
  rangeForPreset,
  type AnalyticsPreset,
} from "@/lib/data/analytics";
import { formatINR } from "@/lib/money";
import { PLAN_DEFINITIONS, tenantHasFeature } from "@/lib/plans";
import { PAYMENT_SOURCE_LABEL } from "@/lib/payment-sources";
import { UpgradeRequired } from "@/components/upgrade-required";
import { AddStoreForm } from "@/components/business/add-store-form";
import { StoreRowActions } from "@/components/business/store-row-actions";

export const dynamic = "force-dynamic";

export default async function BusinessDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;

  const business = session.impersonatorId ? null : await getBusinessForOwner(session.sub);
  const canUse = tenantHasFeature(tenant, "multiStore") || Boolean(business);
  if (!canUse) {
    return <UpgradeRequired feature="Multi-store central dashboard" requiredPlanLabel={PLAN_DEFINITIONS.ADVANCED.label} />;
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

  const scope = await resolveStoreScope(session.tenantId, session.sub, true);
  const report = await getAnalyticsReport(scope.tenantIds, range);
  const stores = business?.tenants ?? [];
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const activeStores = stores.filter((s) => s.status === "ACTIVE").length;
  const reportQs = new URLSearchParams(
    preset === "custom" ? { from: sp.from!, to: sp.to!, scope: "all" } : { preset, scope: "all" },
  );

  return (
    <div className="flex flex-col gap-6" data-testid="business-dashboard">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{business ? business.name : tenant.name} — central dashboard</h2>
        <p className="text-sm text-gray-500">All your stores in one place. Use the store switcher (top bar) to manage a single store.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Range:</span>
        {ANALYTICS_PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`/dashboard/business?preset=${p.key}`}
            className={`rounded-md border px-3 py-1 font-medium ${
              preset === p.key ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </Link>
        ))}
        <form action="/dashboard/business" className="flex flex-wrap items-center gap-1">
          <input type="date" name="from" defaultValue={preset === "custom" ? sp.from : undefined} className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
          <span className="text-gray-400">to</span>
          <input type="date" name="to" defaultValue={preset === "custom" ? sp.to : undefined} className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
          <button className="rounded-md border border-gray-300 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50">Custom</button>
        </form>
        {tenantHasFeature(tenant, "analytics") && (
          <a
            href={`/api/dashboard/analytics/report?${reportQs.toString()}`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto rounded-md bg-indigo-600 px-4 py-1.5 font-semibold text-white hover:bg-indigo-700"
          >
            All-stores PDF report
          </a>
        )}
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total stores" value={String(Math.max(stores.length, 1))} />
        <Stat label="Active stores" value={String(business ? activeStores : tenant.status === "ACTIVE" ? 1 : 0)} />
        <Stat label="Combined revenue" value={formatINR(report.totalRevenueCents)} />
        <Stat label="Total orders" value={String(report.totalOrders)} />
        <Stat label="Total customers" value={String(report.customers.total)} />
        <Stat label="Total payments received" value={formatINR(report.payments.totalPaidCents)} />
        <Stat label="Payment transactions" value={String(report.payments.successfulCount)} />
        <Stat label="Avg. order value" value={formatINR(report.avgOrderCents)} />
      </section>

      <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
        <h3 className="px-4 pt-3 text-sm font-semibold text-gray-900">Store-wise performance</h3>
        <table className="w-full text-left text-sm" data-testid="store-table">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Store</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Orders</th>
              <th className="px-4 py-2 text-right">Revenue</th>
              <th className="px-4 py-2">Payment sources</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {report.byStore.map((s) => {
              const meta = storeById.get(s.tenantId);
              return (
                <tr key={s.tenantId}>
                  <td className="px-4 py-2 font-medium">
                    {s.name}
                    {s.tenantId === session.tenantId && (
                      <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">current</span>
                    )}
                    <div className="text-xs font-normal text-gray-400">/r/{s.slug}</div>
                  </td>
                  <td className="px-4 py-2">{meta?.status === "SUSPENDED" ? "Disabled" : "Active"}</td>
                  <td className="px-4 py-2 text-right">{s.orders}</td>
                  <td className="px-4 py-2 text-right">{formatINR(s.revenueCents)}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {s.paymentSources.length === 0
                      ? "—"
                      : s.paymentSources.map((p) => `${PAYMENT_SOURCE_LABEL[p.source] ?? p.source}: ${formatINR(p.amountCents)}`).join(" · ")}
                  </td>
                  <td className="px-4 py-2">
                    {business && (
                      <StoreRowActions storeId={s.tenantId} status={meta?.status ?? "ACTIVE"} isActive={s.tenantId === session.tenantId} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Combined payment sources</h3>
        {report.payments.sources.length === 0 ? (
          <p className="text-sm text-gray-500">No confirmed payments in this range.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {report.payments.sources.map((s) => (
              <li key={s.source} className="flex justify-between py-1.5">
                <span>{PAYMENT_SOURCE_LABEL[s.source] ?? s.source}</span>
                <span className="text-gray-600">
                  {s.transactions} · {formatINR(s.amountCents)} · {s.pct.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
        <h3 className="mb-1 text-sm font-semibold text-gray-900">Add a store</h3>
        <p className="mb-3 text-xs text-gray-500">
          Each store has its own menu, orders, staff, inventory and subscription. You sign in once and switch between them.
        </p>
        {tenantHasFeature(tenant, "multiStore") ? (
          <AddStoreForm />
        ) : (
          <p className="text-sm text-gray-500">Adding stores needs the Advanced or Business plan on the current store.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900 sm:text-2xl">{value}</p>
    </div>
  );
}
