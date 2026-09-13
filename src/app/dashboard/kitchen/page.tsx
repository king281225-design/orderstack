import { requireTenantSession } from "@/lib/auth";
import { listOrdersForTenant } from "@/lib/data/orders";
import { getTenantById } from "@/lib/data/tenants";
import { AutoRefresh } from "@/components/auto-refresh";
import { KitchenAdvanceButton } from "@/components/orders/kitchen-advance-button";
import { nowMs } from "@/lib/time";
import { tierHasFeature, PLAN_DEFINITIONS } from "@/lib/plans";
import { UpgradeRequired } from "@/components/upgrade-required";
import type { Order, OrderItem, OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * A wall-mounted-monitor-friendly view of the same active orders as the
 * regular dashboard — same data, same advanceOrderStatusAction, just a
 * Kanban layout with much larger text instead of a single stacked list,
 * meant to be glanced at from across a kitchen rather than read up close.
 * No new schema, no new server actions.
 */
const COLUMNS: { status: OrderStatus; title: string; next?: { to: OrderStatus; label: string } }[] = [
  { status: "PENDING", title: "New", next: { to: "ACCEPTED", label: "Accept" } },
  { status: "ACCEPTED", title: "Accepted", next: { to: "PREPARING", label: "Start preparing" } },
  { status: "PREPARING", title: "Preparing", next: { to: "READY", label: "Ready" } },
  { status: "READY", title: "Ready", next: { to: "COMPLETED", label: "Served" } },
];

export default async function KitchenDisplayPage() {
  const session = await requireTenantSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;
  if (!tierHasFeature(tenant.planTier, "kitchen")) {
    return <UpgradeRequired feature="Kitchen display" requiredPlanLabel={PLAN_DEFINITIONS.BUSINESS.label} />;
  }

  const orders = await listOrdersForTenant(session.tenantId, [
    "PENDING",
    "ACCEPTED",
    "PREPARING",
    "READY",
  ]);
  const now = nowMs();

  return (
    <div className="min-h-[70vh] rounded-lg bg-gray-950 p-6 text-white">
      <AutoRefresh intervalMs={5000} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const columnOrders = orders.filter((o) => o.status === col.status);
          return (
            <div key={col.status} className="flex flex-col gap-3">
              <h2 className="text-lg font-bold uppercase tracking-wide text-gray-400">
                {col.title} <span className="text-gray-600">({columnOrders.length})</span>
              </h2>
              <div className="flex flex-col gap-3">
                {columnOrders.map((order) => (
                  <KitchenCard key={order.id} order={order} next={col.next} now={now} />
                ))}
                {columnOrders.length === 0 && (
                  <p className="text-sm text-gray-600">Nothing here.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KitchenCard({
  order,
  next,
  now,
}: {
  order: Order & { items: OrderItem[] };
  next?: { to: OrderStatus; label: string };
  now: number;
}) {
  const elapsedMin = Math.max(0, Math.round((now - order.createdAt.getTime()) / 60000));

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-2xl font-bold">#{order.orderNumber}</span>
        <span className="text-sm font-medium text-gray-400">{elapsedMin}m ago</span>
      </div>
      <p className="mb-2 text-sm text-gray-400">
        {order.fulfillmentType === "DINE_IN"
          ? `Table ${order.tableLabel}`
          : order.fulfillmentType === "DELIVERY"
            ? "Delivery"
            : "Takeaway"}
      </p>
      <ul className="mb-3 flex flex-col gap-1 text-lg">
        {order.items.map((line) => (
          <li key={line.id}>
            <span className="font-bold">{line.quantity}×</span> {line.nameSnapshot}
          </li>
        ))}
      </ul>
      {next && <KitchenAdvanceButton orderId={order.id} to={next.to} label={next.label} />}
    </div>
  );
}
