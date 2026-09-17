import { requireTenantSession } from "@/lib/auth";
import { listCustomersForTenant } from "@/lib/data/customers";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const session = await requireTenantSession();
  const customers = await listCustomersForTenant(session.tenantId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Customers ({customers.length})</h2>
        {customers.length > 0 && (
          <a
            href="/api/dashboard/customers/export"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </a>
        )}
      </div>
      {customers.length === 0 ? (
        <p className="text-sm text-gray-500">No customers yet — they&apos;ll show up here once orders come in.</p>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            Points: 1 point per ₹10 spent, for your own reference — not yet redeemable at checkout. Repeat
            customers (3+ orders) are flagged so you can reward them manually, e.g. with a coupon.
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Orders</th>
                  <th className="px-4 py-2">Total spent</th>
                  <th className="px-4 py-2">Points</th>
                  <th className="px-4 py-2">Last order</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.phone} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {c.name}
                      {c.orderCount >= 3 && (
                        <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          🔁 Repeat
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{c.phone}</td>
                    <td className="px-4 py-2 text-gray-500">{c.email ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-600">{c.orderCount}</td>
                    <td className="px-4 py-2 text-gray-600">{formatINR(c.totalSpentCents)}</td>
                    <td className="px-4 py-2 text-gray-600">{c.loyaltyPoints}</td>
                    <td className="px-4 py-2 text-gray-500">{c.lastOrderAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
