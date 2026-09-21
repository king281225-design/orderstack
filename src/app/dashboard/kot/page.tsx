import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { listOrdersForTenant } from "@/lib/data/orders";
import { listStations } from "@/lib/data/inventory";
import { AutoRefresh } from "@/components/auto-refresh";
import { KitchenAdvanceButton } from "@/components/orders/kitchen-advance-button";
import { getTenantById } from "@/lib/data/tenants";
import { kotCode } from "@/lib/kot";
import { formatINR } from "@/lib/money";
import { nowMs } from "@/lib/time";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PENDING: { to: "ACCEPTED", label: "Accept" },
  ACCEPTED: { to: "PREPARING", label: "Start preparing" },
  PREPARING: { to: "READY", label: "Mark ready" },
};

const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: "New",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
};

export default async function KotPage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  const session = await requireTenantSession();
  const { station } = await searchParams;
  const [orders, stations, tenant] = await Promise.all([
    listOrdersForTenant(session.tenantId, ["PENDING", "ACCEPTED", "PREPARING"]),
    listStations(session.tenantId),
    getTenantById(session.tenantId),
  ]);
  const tenantName = tenant?.name ?? "";
  const now = nowMs();

  const selected = station === "none" ? "none" : stations.find((s) => s.id === station)?.id ?? "all";

  // Oldest first — a kitchen works the queue front to back.
  const tickets = [...orders]
    .reverse()
    .map((order) => {
      const items = order.items.filter((i) =>
        selected === "all" ? true : selected === "none" ? !i.stationId : i.stationId === selected,
      );
      return { order, items };
    })
    .filter((t) => t.items.length > 0);

  const tabs = [
    { key: "all", label: "All stations", href: "/dashboard/kot" },
    ...stations.map((s) => ({ key: s.id, label: s.name, href: `/dashboard/kot?station=${s.id}` })),
    { key: "none", label: "Unassigned", href: "/dashboard/kot?station=none" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <AutoRefresh intervalMs={5000} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">KOT — Kitchen Order Tickets</h2>
        {session.role === "OWNER" && (
          <Link href="/dashboard/kot/stations" className="text-sm font-medium text-indigo-600 hover:underline">
            Manage stations →
          </Link>
        )}
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Kitchen station">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`rounded-full border px-3 py-1 text-sm ${
              selected === t.key
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-indigo-400 dark:bg-[#241d17]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tickets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No open tickets{selected === "all" ? "" : " for this station"}. New orders appear here automatically.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map(({ order, items }) => {
            const elapsed = Math.max(0, Math.round((now - order.createdAt.getTime()) / 60000));
            const next = NEXT[order.status];
            const printHref =
              `/dashboard/orders/${order.id}/kot` + (selected !== "all" ? `?station=${selected}` : "");
            return (
              <div key={order.id} className="flex flex-col gap-3 rounded-lg bg-gray-950 p-4 text-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xl font-bold">KOT {kotCode(tenantName, order.orderNumber)}</p>
                    <p className="text-sm text-gray-400">
                      {order.fulfillmentType === "DINE_IN"
                        ? `Dine-in${order.tableLabel ? ` · Table ${order.tableLabel}` : ""}`
                        : order.fulfillmentType === "DELIVERY"
                          ? "Delivery"
                          : "Takeaway"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p className="rounded bg-white/10 px-2 py-0.5 font-semibold text-white">
                      {STATUS_LABEL[order.status]}
                    </p>
                    <p className="mt-1">{elapsed}m ago</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-1.5 border-y border-white/10 py-2">
                  {items.map((i) => (
                    <li key={i.id} className="flex items-baseline justify-between gap-3 text-base">
                      <span>
                        <span className="mr-2 font-bold">{i.quantity} ×</span>
                        {i.nameSnapshot}
                      </span>
                      <span className="shrink-0 text-sm text-gray-300">{formatINR(i.priceCentsSnapshot * i.quantity)}</span>
                      {selected === "all" && i.stationName && (
                        <span className="shrink-0 rounded bg-indigo-500/30 px-1.5 py-0.5 text-[11px] text-indigo-200">
                          {i.stationName}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-gray-400">
                    Bill total
                    {order.discountCents > 0 ? " (after discount)" : ""}
                    {order.taxCents > 0 ? " incl. GST" : ""}
                  </span>
                  <span className="text-lg font-bold">{formatINR(order.totalCents)}</span>
                </div>
                {order.notes && <p className="text-sm text-amber-300">Note: {order.notes}</p>}
                <div className="flex items-center gap-2">
                  <Link
                    href={printHref}
                    target="_blank"
                    className="rounded-md border border-white/30 px-3 py-2 text-sm font-medium hover:bg-white/10"
                  >
                    Print KOT
                  </Link>
                  <Link
                    href={`/dashboard/orders/${order.id}/print`}
                    target="_blank"
                    className="rounded-md border border-white/30 px-3 py-2 text-sm font-medium hover:bg-white/10"
                  >
                    Print bill
                  </Link>
                  <div className="flex-1">
                    {next && <KitchenAdvanceButton orderId={order.id} to={next.to} label={next.label} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
