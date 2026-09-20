import Link from "next/link";
import { listTenantsWithStats, getPlatformStats, getBillingSummary } from "@/lib/data/tenants";
import { formatINR } from "@/lib/money";
import { AddRestaurantForm } from "@/components/super-admin/add-restaurant-form";
import { PlanSelect } from "@/components/super-admin/plan-select";
import { BillingPeriodSelect } from "@/components/super-admin/billing-period-select";
import { SelectAllCheckbox } from "@/components/super-admin/select-all";
import { AccessToggle, StatusToggle, ManageButtons } from "@/components/super-admin/tenant-controls";
import { formatDate, timeAgo, paidUntilNote } from "@/components/super-admin/format";
import { AutoRefresh } from "@/components/auto-refresh";
import { nowMs } from "@/lib/time";
import { PLAN_DEFINITIONS, PLAN_TIERS } from "@/lib/plans";
import type { PlanTier } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; status?: string; plan?: string; page?: string; deleted?: string };

const TONE = {
  ok: "text-green-700",
  soon: "text-amber-700",
  expired: "text-red-600",
} as const;

export default async function SuperAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status === "ACTIVE" || sp.status === "SUSPENDED" ? sp.status : undefined;
  const plan = PLAN_TIERS.includes(sp.plan as PlanTier) ? (sp.plan as PlanTier) : undefined;
  const now = nowMs();

  const [list, stats, billing] = await Promise.all([
    listTenantsWithStats({ q, status, plan, page: Number(sp.page) || 1 }),
    getPlatformStats(),
    getBillingSummary(now),
  ]);
  const filtered = Boolean(q || status || plan);
  const deleted = Number(sp.deleted) || 0;

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (plan) params.set("plan", plan);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/super-admin?${qs}` : "/super-admin";
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Live view: re-runs this page's loaders so new signups/orders show up on their own. */}
      <AutoRefresh intervalMs={10000} />

      {deleted > 0 && (
        <p role="status" className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">
          Deleted {deleted} restaurant{deleted === 1 ? "" : "s"}.
        </p>
      )}

      <section aria-label="Platform overview" className="flex flex-col gap-3">
        <SectionTitle>Platform</SectionTitle>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Restaurants" value={String(stats.tenantCount)} sub={`${stats.activeCount} active · ${stats.suspendedCount} suspended`} />
          <StatCard label="New signups" value={String(stats.newTenants7d)} sub="last 7 days" />
          <StatCard label="Orders" value={String(stats.orderCount)} sub={`${stats.orders24h} in the last 24h`} />
          <StatCard label="Order revenue" value={formatINR(stats.revenueCents)} sub={`${formatINR(stats.revenue24hCents)} in the last 24h`} />
        </div>
      </section>

      <section aria-label="Customers and billing" className="flex flex-col gap-3">
        <SectionTitle>
          Customers &amp; billing
          <span className="ml-2 text-xs font-normal normal-case tracking-normal text-gray-500">
            Starter {billing.byTier.STARTER} · Advanced {billing.byTier.ADVANCED} · Business {billing.byTier.BUSINESS}
          </span>
        </SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Monthly plans" value={String(billing.monthly)} sub="paying customers" tone="good" />
          <StatCard label="Annual plans" value={String(billing.annual)} sub="paying customers" tone="good" />
          <StatCard
            label="Period not set"
            value={String(billing.periodNotSet)}
            sub={billing.periodNotSet ? "full access, set monthly/annual below" : "all recorded"}
            tone={billing.periodNotSet ? "warn" : undefined}
          />
          <StatCard label="On free trial" value={String(billing.onTrial)} sub="7-day trial running" />
          <StatCard label="Trial ended" value={String(billing.trialEnded)} sub="not paid — locked out" tone={billing.trialEnded ? "warn" : undefined} />
          <StatCard label="Est. monthly revenue" value={formatINR(billing.mrrCents)} sub="annual counted ÷ 12" tone="good" />
        </div>
        {(billing.paidUntilSoon > 0 || billing.paidUntilExpired > 0) && (
          <p className="text-sm text-gray-600">
            {billing.paidUntilExpired > 0 && <span className="mr-4 font-medium text-red-600">{billing.paidUntilExpired} past their paid-until date</span>}
            {billing.paidUntilSoon > 0 && <span className="font-medium text-amber-700">{billing.paidUntilSoon} renewing within 7 days</span>}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <details className="group rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-900">
            ＋ Add a restaurant
          </summary>
          <div className="border-t border-gray-100 p-2">
            <AddRestaurantForm />
          </div>
        </details>
        <details className="group rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-900">
            Plan pricing
          </summary>
          <div className="grid grid-cols-1 gap-3 border-t border-gray-100 p-4 sm:grid-cols-3">
            {PLAN_TIERS.map((tier) => {
              const def = PLAN_DEFINITIONS[tier];
              return (
                <div key={tier}>
                  <p className="text-sm font-semibold text-gray-900">{def.label}</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatINR(def.priceCents)}
                    <span className="text-xs font-normal text-gray-500">/mo</span>
                  </p>
                  <p className="text-xs text-gray-400">or {formatINR(def.annualPriceCents)}/yr</p>
                </div>
              );
            })}
          </div>
        </details>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle>
            Restaurants{" "}
            <span className="ml-1 text-sm font-normal normal-case tracking-normal text-gray-500">
              {list.total}
              {filtered ? " matching" : ""}
            </span>
          </SectionTitle>
          {/* Plain GET form: filters live in the URL, so they survive the live refresh and can be bookmarked. */}
          <form method="get" action="/super-admin" className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search name, link or owner email"
              aria-label="Search restaurants"
              className="w-64 rounded-md border border-gray-300 bg-white px-3 py-1.5 focus:border-indigo-600 focus:outline-none dark:bg-[#241d17]"
            />
            <select
              name="status"
              defaultValue={status ?? ""}
              aria-label="Filter by status"
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 focus:border-indigo-600 focus:outline-none dark:bg-[#241d17]"
            >
              <option value="">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select
              name="plan"
              defaultValue={plan ?? ""}
              aria-label="Filter by plan"
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 focus:border-indigo-600 focus:outline-none dark:bg-[#241d17]"
            >
              <option value="">Any plan</option>
              {PLAN_TIERS.map((t) => (
                <option key={t} value={t}>
                  {PLAN_DEFINITIONS[t].label}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700">
              Search
            </button>
            {filtered && (
              <Link href="/super-admin" className="text-gray-500 hover:underline">
                Clear
              </Link>
            )}
          </form>
        </div>

        {/* Row checkboxes point here via form="bulk-delete" (forms can't nest inside the table rows' own forms). */}
        <form id="bulk-delete" method="get" action="/super-admin/delete" className="flex items-center gap-3 text-sm">
          <button
            type="submit"
            className="rounded-md border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50"
          >
            Delete selected…
          </button>
          <span className="text-gray-500">Tick restaurants below, then review on the next screen before anything is deleted.</span>
        </form>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-[#241d17]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5">
                <th className="w-8 px-3 py-2.5">
                  <SelectAllCheckbox />
                </th>
                <th className="px-3 py-2.5">Restaurant</th>
                <th className="px-3 py-2.5">Plan &amp; billing</th>
                <th className="px-3 py-2.5">Access</th>
                <th className="px-3 py-2.5">Orders</th>
                <th className="px-3 py-2.5">Activity</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.tenants.map((t) => {
                const paid = t.paidUntil ? paidUntilNote(t.paidUntil, now) : null;
                return (
                  <tr key={t.id} className="border-b border-gray-100 align-top last:border-0 hover:bg-indigo-50/30 dark:hover:bg-white/5">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        name="id"
                        value={t.id}
                        form="bulk-delete"
                        aria-label={`Select ${t.name}`}
                        className="h-4 w-4 cursor-pointer accent-indigo-600"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/super-admin/restaurants/${t.id}`} className="font-semibold text-gray-900 hover:underline">
                        {t.name}
                      </Link>
                      <div className="text-xs text-gray-500">
                        <a href={`/r/${t.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
                          /r/{t.slug}
                        </a>
                      </div>
                      <div className="text-xs text-gray-500">{t.ownerEmail ?? "no owner login"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <PlanSelect tenantId={t.id} planTier={t.planTier} />
                        <BillingPeriodSelect tenantId={t.id} period={t.billingPeriod} />
                        {paid && <span className={`text-xs font-medium ${TONE[paid.tone]}`}>{paid.text}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <AccessToggle
                        tenantId={t.id}
                        subscriptionStatus={t.subscriptionStatus}
                        createdAt={t.createdAt}
                        now={now}
                      />
                      {t.subscriptionStatus === "ACTIVE" && (
                        <div className="mt-1 text-xs text-gray-400">
                          {t.razorpaySubscriptionId ? "via Razorpay" : t._count.subscriptionPurchases > 0 ? "one-time payment" : "manual"}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="font-medium text-gray-900">{t.orderCount} orders</div>
                      <div className="text-xs text-gray-500">{formatINR(t.revenueCents)}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-600">
                      <div>Joined {formatDate(t.createdAt)}</div>
                      <div className="text-gray-500">Last order {t.lastOrderAt ? timeAgo(t.lastOrderAt, now) : "—"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-end gap-1.5">
                        <ManageButtons tenantId={t.id} />
                        <div className="flex items-center gap-3">
                          <Link href={`/super-admin/restaurants/${t.id}`} className="text-xs font-medium text-indigo-700 hover:underline">
                            Details
                          </Link>
                          <StatusToggle tenantId={t.id} status={t.status} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.tenants.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    {filtered ? "No restaurants match these filters." : "No restaurants yet — add the first one above."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {list.pageCount > 1 && (
          <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
            {list.page > 1 ? (
              <Link href={pageHref(list.page - 1)} className="rounded-md border border-gray-300 bg-white px-3 py-1 hover:border-indigo-400 dark:bg-[#241d17]">
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-gray-500">
              Page {list.page} of {list.pageCount}
            </span>
            {list.page < list.pageCount ? (
              <Link href={pageHref(list.page + 1)} className="rounded-md border border-gray-300 bg-white px-3 py-1 hover:border-indigo-400 dark:bg-[#241d17]">
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{children}</h2>;
}

const TONE_RING = {
  good: "border-green-200",
  warn: "border-amber-300 bg-amber-50/60",
} as const;

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: keyof typeof TONE_RING }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-[#241d17] ${tone ? TONE_RING[tone] : "border-gray-200"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
