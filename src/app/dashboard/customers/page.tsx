import { requireTenantSession } from "@/lib/auth";
import { listCustomersForTenant } from "@/lib/data/customers";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const session = await requireTenantSession();
  const customers = await listCustomersForTenant(session.tenantId);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Customers ({customers.length})</h2>
      {customers.length === 0 ? (
        <p className="text-sm text-gray-500">No customers yet — they&apos;ll show up here once orders come in.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Orders</th>
                <th className="px-4 py-2">Total spent</th>
                <th className="px-4 py-2">Last order</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.phone} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-2 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-2 text-gray-500">{c.email ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-600">{c.orderCount}</td>
                  <td className="px-4 py-2 text-gray-600">{formatINR(c.totalSpentCents)}</td>
                  <td className="px-4 py-2 text-gray-500">{c.lastOrderAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
