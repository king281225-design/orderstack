import Link from "next/link";
import { listTenantsWithStats, getPlatformStats } from "@/lib/data/tenants";
import { formatINR } from "@/lib/money";
import { AddRestaurantForm } from "@/components/super-admin/add-restaurant-form";
import { PlanSelect } from "@/components/super-admin/plan-select";
import { AccessToggle, StatusToggle, ManageButtons } from "@/components/super-admin/tenant-controls";
import { formatDate, timeAgo } from "@/components/super-admin/format";
import { AutoRefresh } from "@/components/auto-refresh";
import { nowMs } from "@/lib/time";
import { PLAN_DEFINITIONS, PLAN_TIERS } from "@/lib/plans";
import type { PlanTier } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; status?: string; plan?: string; page?: string };

export default async function SuperAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status === "ACTIVE" || sp.status === "SUSPENDED" ? sp.status : undefined;
  const plan = PLAN_TIERS.includes(sp.plan as PlanTier) ? (sp.plan as PlanTier) : undefined;

  const [list, stats] = await Promise.all([
    listTenantsWithStats({ q, status, plan, page: Number(sp.page) || 1 }),
    getPlatformStats(),
  ]);
  const now = nowMs();
  const filtered = Boolean(q || status || plan);

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

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Restaurants" value={String(stats.tenantCount)} sub={`${stats.activeCount} active · ${stats.suspendedCount} suspended`} />
        <StatCard label="New (7 days)" value={String(stats.newTenants7d)} sub="signups" />
        <StatCard label="Orders" value={String(stats.orderCount)} sub="all time" />
        <StatCard label="Orders (24h)" value={String(stats.orders24h)} sub="last 24 hours" />
        <StatCard label="Revenue" value={formatINR(stats.revenueCents)} sub="all time" />
        <StatCard label="Revenue (24h)" value={formatINR(stats.revenue24hCents)} sub="last 24 hours" />
      </section>

      <AddRestaurantForm />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Plans</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PLAN_TIERS.map((tier) => {
            const def = PLAN_DEFINITIONS[tier];
            return (
              <div key={tier} className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
                <p className="text-sm font-semibold text-gray-900">{def.label}</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {formatINR(def.priceCents)}
                  <span className="text-xs font-normal text-gray-500">/mo</span>
                </p>
                <p className="text-xs text-gray-400">or {formatINR(def.annualPriceCents)}/yr</p>
                <ul className="mt-2 flex flex-col gap-0.5 text-xs text-gray-500">
                  {def.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Restaurants <span className="text-sm font-normal text-gray-500">({list.total}{filtered ? " matching" : ""})</span>
          </h2>
          {/* Plain GET form: filters live in the URL, so they survive the live refresh and can be bookmarked. */}
          <form method="get" action="/super-admin" className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search name, link or owner email"
              aria-label="Search restaurants"
              className="w-64 rounded-md border border-gray-300 px-3 py-1.5 focus:border-indigo-600 focus:outline-none"
            />
            <select
              name="status"
              defaultValue={status ?? ""}
              aria-label="Filter by status"
              className="rounded-md border border-gray-300 px-2 py-1.5 focus:border-indigo-600 focus:outline-none"
            >
              <option value="">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select
              name="plan"
              defaultValue={plan ?? ""}
              aria-label="Filter by plan"
              className="rounded-md border border-gray-300 px-2 py-1.5 focus:border-indigo-600 focus:outline-none"
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

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Restaurant</th>
                <th className="px-4 py-2">Signed up</th>
                <th className="px-4 py-2">Last order</th>
                <th className="px-4 py-2">Orders</th>
                <th className="px-4 py-2">Revenue</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Access</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.tenants.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">
                    <Link href={`/super-admin/restaurants/${t.id}`} className="font-medium text-gray-900 hover:underline">
                      {t.name}
                    </Link>
                    <div className="text-xs text-gray-500">
                      <a href={`/r/${t.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
                        /r/{t.slug}
                      </a>
                    </div>
                    <div className="text-xs text-gray-500">{t.ownerEmail ?? "no owner login"}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-600">{formatDate(t.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                    {t.lastOrderAt ? timeAgo(t.lastOrderAt, now) : "—"}
                  </td>
                  <td className="px-4 py-2">{t.orderCount}</td>
                  <td className="px-4 py-2">{formatINR(t.revenueCents)}</td>
                  <td className="px-4 py-2">
                    <PlanSelect tenantId={t.id} planTier={t.planTier} />
                  </td>
                  <td className="px-4 py-2">
                    <AccessToggle
                      tenantId={t.id}
                      subscriptionStatus={t.subscriptionStatus}
                      createdAt={t.createdAt}
                      now={now}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col items-end gap-1">
                      <ManageButtons tenantId={t.id} />
                      <StatusToggle tenantId={t.id} status={t.status} />
                    </div>
                  </td>
                </tr>
              ))}
              {list.tenants.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                    {filtered ? "No restaurants match these filters." : "No restaurants yet — add the first one above."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {list.pageCount > 1 && (
          <nav className="mt-3 flex items-center justify-between text-sm" aria-label="Pagination">
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
