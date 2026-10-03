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
 *
 * Colour is functional: each column has one accent (header dot, card edge,
 * quantities, action button) and the waiting-time chip turns amber then red.
 * All text is white/near-white on dark slate for contrast.
 */
const COLUMNS: {
  status: OrderStatus;
  title: string;
  accent: string;
  next?: { to: OrderStatus; label: string };
}[] = [
  { status: "PENDING", title: "New", accent: "#fbbf24", next: { to: "ACCEPTED", label: "Accept" } },
  { status: "ACCEPTED", title: "Accepted", accent: "#38bdf8", next: { to: "PREPARING", label: "Start preparing" } },
  { status: "PREPARING", title: "Preparing", accent: "#fb923c", next: { to: "READY", label: "Ready" } },
  { status: "READY", title: "Ready", accent: "#4ade80", next: { to: "COMPLETED", label: "Served" } },
];

export default async function KitchenDisplayPage() {
  const session = await requireTenantSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;
  if (!tierHasFeature(tenant.planTier, "kitchen")) {
    return <UpgradeRequired feature="Kitchen display" requiredPlanLabel={PLAN_DEFINITIONS.BUSINESS.label} />;
  }

  const orders = await listOrdersForTenant(session.tenantId, ["PENDING", "ACCEPTED", "PREPARING", "READY"]);
  const now = nowMs();

  return (
    <div className="min-h-[70vh] rounded-2xl bg-[#0b1220] p-3 text-slate-50 sm:p-6">
      <AutoRefresh intervalMs={5000} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const columnOrders = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="flex flex-col gap-3" aria-label={col.title}>
              <h2 className="flex items-center gap-2.5 border-b border-slate-700 pb-2 text-xl font-extrabold uppercase tracking-wider text-slate-100">
                <span className="size-3 rounded-full" style={{ backgroundColor: col.accent }} />
                {col.title}
                <span
                  className="ml-auto rounded-full px-2.5 py-0.5 text-base font-bold text-slate-950"
                  style={{ backgroundColor: col.accent }}
                >
                  {columnOrders.length}
                </span>
              </h2>
              <div className="flex flex-col gap-3">
                {columnOrders.map((order) => (
                  <KitchenCard key={order.id} order={order} next={col.next} accent={col.accent} now={now} />
                ))}
                {columnOrders.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-base text-slate-400">
                    Nothing here.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function KitchenCard({
  order,
  next,
  accent,
  now,
}: {
  order: Order & { items: OrderItem[] };
  next?: { to: OrderStatus; label: string };
  accent: string;
  now: number;
}) {
  const elapsedMin = Math.max(0, Math.round((now - order.createdAt.getTime()) / 60000));
  const timeCls =
    elapsedMin >= 20
      ? "bg-red-500 text-white"
      : elapsedMin >= 10
        ? "bg-amber-400 text-slate-950"
        : "bg-emerald-400 text-slate-950";
  const typeText =
    order.fulfillmentType === "DINE_IN"
      ? `Table ${order.tableLabel ?? "—"}`
      : order.fulfillmentType === "DELIVERY"
        ? "Delivery"
        : "Takeaway";

  return (
    <div
      className="rounded-2xl border border-slate-700 border-l-[10px] bg-slate-800 p-4 shadow-lg"
      style={{ borderLeftColor: accent }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="ds-mono text-3xl font-bold tracking-tight text-white">#{order.orderNumber}</span>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${timeCls}`}>{elapsedMin}m</span>
      </div>
      <p className="mb-3 inline-block rounded-md bg-slate-700 px-2.5 py-1 text-sm font-bold uppercase tracking-wide text-slate-100">
        {typeText}
      </p>
      <ul className="mb-3 flex flex-col gap-1.5 text-xl font-semibold leading-snug text-white">
        {order.items.map((line) => (
          <li key={line.id} className="flex gap-2">
            <span className="ds-mono min-w-[2.2rem] font-bold" style={{ color: accent }}>
              {line.quantity}×
            </span>
            <span>{line.nameSnapshot}</span>
          </li>
        ))}
      </ul>
      {order.notes && (
        <p className="mb-3 rounded-lg bg-amber-300/15 px-3 py-2 text-base font-medium text-amber-200">Note: {order.notes}</p>
      )}
      {next && <KitchenAdvanceButton orderId={order.id} to={next.to} label={next.label} accent={accent} />}
    </div>
  );
}
