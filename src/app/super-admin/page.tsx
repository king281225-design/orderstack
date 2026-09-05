import { listTenantsWithStats, getPlatformStats } from "@/lib/data/tenants";
import { formatINR } from "@/lib/money";
import { AddRestaurantForm } from "@/components/super-admin/add-restaurant-form";
import { setTenantStatusAction } from "@/app/super-admin/actions";

export default async function SuperAdminPage() {
  const [tenants, stats] = await Promise.all([listTenantsWithStats(), getPlatformStats()]);

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-3 gap-4">
        <StatCard label="Restaurants" value={String(stats.tenantCount)} />
        <StatCard label="Orders" value={String(stats.orderCount)} />
        <StatCard label="Revenue" value={formatINR(stats.revenueCents)} />
      </section>

      <AddRestaurantForm />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Restaurants</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">Orders</th>
                <th className="px-4 py-2">Revenue</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-2 text-gray-500">
                    <a href={`/r/${t.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
                      /r/{t.slug}
                    </a>
                  </td>
                  <td className="px-4 py-2">{t.orderCount}</td>
                  <td className="px-4 py-2">{formatINR(t.revenueCents)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form
                      action={setTenantStatusAction.bind(
                        null,
                        t.id,
                        t.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                      )}
                    >
                      <button type="submit" className="text-xs font-medium text-gray-600 hover:underline">
                        {t.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No restaurants yet — add the first one above.
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
