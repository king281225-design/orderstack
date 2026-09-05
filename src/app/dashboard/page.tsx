import { requireTenantSession } from "@/lib/auth";
import { listOrdersForTenant } from "@/lib/data/orders";
import { getTenantById } from "@/lib/data/tenants";
import { formatINR } from "@/lib/money";
import { advanceOrderStatusAction, markOrderPaidAction, toggleOpenAction } from "@/app/dashboard/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import type { Order, OrderItem, OrderStatus } from "@prisma/client";

const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PENDING: { to: "ACCEPTED", label: "Accept" },
  ACCEPTED: { to: "PREPARING", label: "Start preparing" },
  PREPARING: { to: "READY", label: "Mark ready" },
  READY: { to: "COMPLETED", label: "Complete" },
};

const CANCELLABLE: OrderStatus[] = ["PENDING", "ACCEPTED", "PREPARING", "READY"];

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-indigo-100 text-indigo-800",
  READY: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-200 text-gray-600",
};

const PAYMENT_METHOD_LABEL = {
  UPI: "UPI",
  COD: "Cash on delivery",
  RAZORPAY: "Online",
} as const;

export default async function DashboardOrdersPage() {
  const session = await requireTenantSession();
  const [orders, tenant] = await Promise.all([
    listOrdersForTenant(session.tenantId),
    getTenantById(session.tenantId),
  ]);

  const active = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");
  const history = orders.filter((o) => o.status === "COMPLETED" || o.status === "CANCELLED");

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh intervalMs={8000} />

      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Restaurant status</p>
          <p className="text-xs text-gray-500">
            Turn this off when you can&apos;t take new orders — customers will see &quot;closed&quot;
            on the storefront.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await toggleOpenAction(!tenant?.isOpen);
          }}
        >
          <button
            type="submit"
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              tenant?.isOpen
                ? "bg-gray-900 text-white hover:bg-gray-700"
                : "bg-green-600 text-white hover:bg-green-500"
            }`}
          >
            {tenant?.isOpen ? "Close restaurant" : "Open restaurant"}
          </button>
        </form>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Active orders ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-gray-500">No active orders right now.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {active.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No completed or cancelled orders yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {history.slice(0, 20).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-2 text-sm"
              >
                <span className="text-gray-700">
                  #{order.orderNumber} · {order.customerName} · {formatINR(order.totalCents)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status]}`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function OrderCard({ order }: { order: Order & { items: OrderItem[] } }) {
  const next = NEXT_STEP[order.status];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-gray-900">#{order.orderNumber}</span>{" "}
          <span className="text-sm text-gray-500">
            {order.customerName} · {order.customerPhone}
          </span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status]}`}>
          {order.status}
        </span>
      </div>

      <ul className="mb-2 text-sm text-gray-700">
        {order.items.map((line) => (
          <li key={line.id}>
            {line.quantity} × {line.nameSnapshot}
          </li>
        ))}
      </ul>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>{order.fulfillmentType === "DELIVERY" ? "Delivery" : "Takeaway"}</span>
        {order.deliveryAddress && <span>{order.deliveryAddress}</span>}
        <span>{PAYMENT_METHOD_LABEL[order.paymentMethod]}</span>
        {order.discountCents > 0 && (
          <span className="text-green-700">
            Coupon {order.couponCode} (−{formatINR(order.discountCents)})
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            order.paymentStatus === "PAID"
              ? "bg-green-100 text-green-700"
              : order.paymentStatus === "FAILED"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
          }`}
        >
          {order.paymentStatus === "PAID" ? "Paid" : order.paymentStatus === "FAILED" ? "Payment failed" : "Unpaid"}
        </span>
        <span className="font-medium text-gray-700">{formatINR(order.totalCents)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {next && (
          <form action={advanceOrderStatusAction.bind(null, order.id, next.to)}>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700"
            >
              {next.label}
            </button>
          </form>
        )}
        {CANCELLABLE.includes(order.status) && (
          <form action={advanceOrderStatusAction.bind(null, order.id, "CANCELLED")}>
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
          </form>
        )}
        {order.paymentStatus === "PENDING" && (
          <form action={markOrderPaidAction.bind(null, order.id)}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              title="Manual reconciliation — mark this order as paid"
            >
              Mark as paid
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
