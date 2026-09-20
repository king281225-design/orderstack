import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantDetailForAdmin } from "@/lib/data/tenants";
import { formatINR } from "@/lib/money";
import { PlanSelect } from "@/components/super-admin/plan-select";
import { AccessToggle, StatusToggle, ManageButtons } from "@/components/super-admin/tenant-controls";
import { formatDate, formatDateTime } from "@/components/super-admin/format";
import { AutoRefresh } from "@/components/auto-refresh";
import { nowMs } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getTenantDetailForAdmin(id);
  if (!detail) notFound();
  const { tenant: t } = detail;
  const now = nowMs();
  const owners = t.users.filter((u) => u.role === "OWNER");
  const staff = t.users.filter((u) => u.role !== "OWNER");

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervalMs={10000} />

      <Link href="/super-admin" className="text-sm text-gray-500 hover:underline">
        ← All restaurants
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{t.name}</h2>
          <p className="mt-1 text-sm text-gray-500">
            <a href={`/r/${t.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
              /r/{t.slug}
            </a>
            {t.customDomain && <> · {t.customDomain}</>} · signed up {formatDate(t.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              t.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
            }`}
          >
            {t.status}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              t.isOpen ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
            }`}
          >
            {t.isOpen ? "Open for orders" : "Closed"}
          </span>
          <PlanSelect tenantId={t.id} planTier={t.planTier} />
          <AccessToggle tenantId={t.id} subscriptionStatus={t.subscriptionStatus} createdAt={t.createdAt} now={now} />
          <StatusToggle tenantId={t.id} status={t.status} />
          <ManageButtons tenantId={t.id} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="Orders" value={String(detail.orderCount)} />
        <Stat label="Revenue" value={formatINR(detail.revenueCents)} />
        <Stat label="Customers" value={String(detail.customerCount)} />
        <Stat label="Menu items" value={String(detail.itemCount)} sub={`${detail.categoryCount} categories`} />
        <Stat label="Open tickets" value={String(detail.openTickets.length)} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Logins">
          <ul className="flex flex-col gap-2 text-sm">
            {[...owners, ...staff].map((u) => (
              <li key={u.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  <a href={`mailto:${u.email}`} className="font-medium text-gray-900 hover:underline">
                    {u.email}
                  </a>
                  {u.name && <span className="text-gray-500"> · {u.name}</span>}
                </span>
                <span className="text-xs text-gray-500">
                  {u.role === "OWNER" ? "Owner" : "Staff"} · added {formatDate(u.createdAt)}
                </span>
              </li>
            ))}
            {t.users.length === 0 && <li className="text-gray-500">No logins.</li>}
          </ul>
        </Card>

        <Card title="Business details">
          <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
            <Row label="Tagline" value={t.tagline} />
            <Row label="Address" value={t.businessAddress} />
            <Row label="GSTIN" value={t.gstin} />
            <Row label="UPI ID" value={t.upiId} />
            <Row label="Custom domain" value={t.customDomain} />
            <Row label="Subscription" value={t.subscriptionStatus} />
          </dl>
        </Card>
      </section>

      {detail.openTickets.length > 0 && (
        <Card title="Open support tickets">
          <ul className="flex flex-col gap-1 text-sm">
            {detail.openTickets.map((k) => (
              <li key={k.id} className="flex justify-between gap-3">
                <Link href="/super-admin/support" className="hover:underline">
                  {k.subject}
                </Link>
                <span className="text-xs text-gray-500">
                  {k.priority} · {k.status} · {formatDateTime(k.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          Recent orders <span className="text-sm font-normal text-gray-500">(latest 20 of {detail.orderCount})</span>
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Placed</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Payment</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {detail.recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {o.orderNumber}
                    {o.source === "MANUAL" && <span className="ml-1 text-xs font-normal text-gray-400">manual</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-600">{formatDateTime(o.createdAt)}</td>
                  <td className="px-4 py-2">
                    {o.customerName}
                    <div className="text-xs text-gray-500">{o.customerPhone}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{o.fulfillmentType}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {o.paymentMethod} · {o.paymentStatus}
                  </td>
                  <td className="px-4 py-2">{o.status}</td>
                  <td className="px-4 py-2 text-right">{formatINR(o.totalCents)}</td>
                </tr>
              ))}
              {detail.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="break-words text-gray-900">{value || <span className="text-gray-400">—</span>}</dd>
    </>
  );
}
