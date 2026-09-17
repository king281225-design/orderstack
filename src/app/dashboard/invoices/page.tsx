import Link from "next/link";
import { requireOwnerSession } from "@/lib/auth";
import { listOrdersForTenant } from "@/lib/data/orders";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const session = await requireOwnerSession();
  const orders = await listOrdersForTenant(session.tenantId);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Invoices ({orders.length})</h2>
      <p className="text-sm text-gray-500">
        Every order — storefront or manually billed — gets a unique invoice number. Open one to
        print it (including to a thermal/receipt printer, via the narrow-width toggle on the
        invoice page) or save it as a PDF — no separate POS or kitchen-printer system needed.
      </p>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-500">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Invoice</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Payment</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-gray-900">INV-{o.orderNumber}</td>
                  <td className="px-4 py-2 text-gray-500">{o.createdAt.toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-gray-600">{o.customerName}</td>
                  <td className="px-4 py-2 text-gray-500">{o.source === "MANUAL" ? "Manual bill" : "Storefront"}</td>
                  <td className="px-4 py-2 text-gray-600">{formatINR(o.totalCents)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        o.paymentStatus === "PAID"
                          ? "bg-green-100 text-green-700"
                          : o.paymentStatus === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/dashboard/orders/${o.id}/print`}
                      target="_blank"
                      className="text-xs font-semibold text-gray-700 hover:underline"
                    >
                      Print / PDF ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
