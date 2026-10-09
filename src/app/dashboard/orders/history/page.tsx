import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { listRecentRevisionsForTenant } from "@/lib/data/order-revisions";
import type { OrderRevisionSnapshot } from "@/lib/data/order-revisions";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Tenant-wide "all recent edits" feed — ungated by plan tier (unlike
 * coupons/analytics/etc.) since this is meant to be visible on every plan;
 * lets an owner see what staff changed without opening each order one by one.
 */
export default async function AllOrderHistoryPage() {
  const session = await requireTenantSession();
  const revisions = await listRecentRevisionsForTenant(session.tenantId);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Recent bill edits</h2>
      <p className="text-sm text-gray-500">Every change made to an already-created bill, across every device — see what staff changed, and when.</p>

      {revisions.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:bg-[#241d17]">
          No edits yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Bill</th>
                <th className="px-4 py-2">Edited by</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((rev) => {
                const before = rev.beforeSnapshot as unknown as OrderRevisionSnapshot;
                const after = rev.afterSnapshot as unknown as OrderRevisionSnapshot;
                return (
                  <tr key={rev.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/dashboard/orders/${rev.orderId}/history`} className="font-medium text-indigo-700 hover:underline">
                        #{rev.order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{rev.editedByName ?? "Unknown"}</td>
                    <td className="px-4 py-2 text-gray-500">{rev.reason ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {formatINR(before.totalCents)} → {formatINR(after.totalCents)}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{rev.createdAt.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
