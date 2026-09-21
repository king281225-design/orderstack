import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { getTodayOrderStats, listOrdersForTenant } from "@/lib/data/orders";
import { getTenantById } from "@/lib/data/tenants";
import { formatINR } from "@/lib/money";
import { nowMs } from "@/lib/time";
import { AutoRefresh } from "@/components/auto-refresh";
import { OrderCardFooter } from "@/components/orders/order-card-footer";
import type { Order, OrderItem, OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type OrderWithItems = Order & { items: OrderItem[] };

/** An order waiting this long without being accepted gets flagged. */
const ATTENTION_MINUTES = 15;

const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string; tone: "accent" | "dark" | "green" }>> = {
  PENDING: { to: "ACCEPTED", label: "Accept order →", tone: "accent" },
  ACCEPTED: { to: "PREPARING", label: "Start preparing →", tone: "accent" },
  PREPARING: { to: "READY", label: "Mark ready →", tone: "dark" },
  READY: { to: "COMPLETED", label: "Serve · Complete ✓", tone: "green" },
};

const CANCELLABLE: OrderStatus[] = ["PENDING", "ACCEPTED", "PREPARING", "READY"];

const PAYMENT_METHOD_LABEL = { UPI: "UPI", COD: "Cash", RAZORPAY: "online" } as const;

const COLUMNS = [
  { key: "new", label: "New", dot: "#c87a1e", statuses: ["PENDING", "ACCEPTED"] as OrderStatus[] },
  { key: "preparing", label: "Preparing", dot: "#2f6feD", statuses: ["PREPARING"] as OrderStatus[] },
  { key: "ready", label: "Ready", dot: "#1e7a4c", statuses: ["READY"] as OrderStatus[] },
] as const;
type ColumnKey = (typeof COLUMNS)[number]["key"];

const CHANNELS = [
  { key: "all", label: "All channels", type: null },
  { key: "dine_in", label: "Dine-in", type: "DINE_IN" },
  { key: "takeaway", label: "Takeaway", type: "TAKEAWAY" },
  { key: "delivery", label: "Delivery", type: "DELIVERY" },
] as const;

type Search = { q?: string; channel?: string; view?: string; status?: string };

function href(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/dashboard?${s}` : "/dashboard";
}

function minutesSince(order: Order, now: number) {
  return Math.max(0, Math.floor((now - order.createdAt.getTime()) / 60000));
}

function timeAgo(minutes: number) {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ${minutes % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function inr0(cents: number) {
  return `₹${Math.round(cents / 100).toLocaleString("en-IN")}`;
}

export default async function DashboardOrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireTenantSession();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const channel = CHANNELS.find((c) => c.key === sp.channel) ?? CHANNELS[0];
  const view = sp.view === "list" ? "list" : "board";
  const mobileColumn: ColumnKey = COLUMNS.find((c) => c.key === sp.status)?.key ?? "new";

  const [orders, tenant, stats] = await Promise.all([
    listOrdersForTenant(session.tenantId),
    getTenantById(session.tenantId),
    getTodayOrderStats(session.tenantId),
  ]);
  const now = nowMs();

  const needle = q.replace(/^#/, "").toLowerCase();
  const matches = (o: OrderWithItems) =>
    (!channel.type || o.fulfillmentType === channel.type) &&
    (!needle ||
      String(o.orderNumber).includes(needle) ||
      o.customerName.toLowerCase().includes(needle) ||
      o.customerPhone.toLowerCase().includes(needle));

  const isActive = (o: OrderWithItems) => o.status !== "COMPLETED" && o.status !== "CANCELLED";
  const activeAll = orders.filter(isActive);
  // Oldest first — the order that has waited longest sits on top.
  const active = activeAll.filter(matches).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const history = orders.filter((o) => !isActive(o) && matches(o)).slice(0, 20);

  const attentionCount = activeAll.filter(
    (o) => o.status === "PENDING" && minutesSince(o, now) >= ATTENTION_MINUTES,
  ).length;

  const byColumn = (key: ColumnKey) => {
    const col = COLUMNS.find((c) => c.key === key)!;
    return active.filter((o) => col.statuses.includes(o.status));
  };

  const vsYesterday =
    stats.ordersYesterday > 0
      ? Math.round(((stats.ordersToday - stats.ordersYesterday) / stats.ordersYesterday) * 100)
      : null;

  const base = { q: q || undefined, channel: channel.key === "all" ? undefined : channel.key, view: view === "list" ? "list" : undefined };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AutoRefresh intervalMs={8000} />

      {/* KPI STRIP — desktop */}
      <div className="hidden shrink-0 gap-3.5 px-7 pb-1 pt-[18px] md:flex">
        <Kpi label="Orders today" value={String(stats.ordersToday)}>
          {vsYesterday === null ? (
            <span className="text-[var(--ds-muted)]">No orders yesterday</span>
          ) : (
            <span className={vsYesterday >= 0 ? "font-semibold text-[#1e7a4c]" : "font-semibold text-[#9a4a1f]"}>
              {vsYesterday >= 0 ? "↑" : "↓"} {Math.abs(vsYesterday)}% vs yesterday
            </span>
          )}
        </Kpi>
        <Kpi label="Revenue today" value={inr0(stats.revenueTodayCents)}>
          <span className="text-[var(--ds-muted)]">
            {stats.ordersToday > 0 ? `Avg ticket ${inr0(stats.revenueTodayCents / stats.ordersToday)}` : "No sales yet"}
          </span>
        </Kpi>
        <Kpi label="In progress" value={String(activeAll.length)}>
          <span className="text-[var(--ds-muted)]">
            {activeAll.filter((o) => o.status === "PENDING" || o.status === "ACCEPTED").length} new ·{" "}
            {activeAll.filter((o) => o.status === "PREPARING").length} preparing ·{" "}
            {activeAll.filter((o) => o.status === "READY").length} ready
          </span>
        </Kpi>
        <Kpi label="Needs attention" value={String(attentionCount)} attention={attentionCount > 0}>
          <span className={attentionCount > 0 ? "text-[#9a4a1f]" : "text-[var(--ds-muted)]"}>
            Waiting &gt; {ATTENTION_MINUTES} min
          </span>
        </Kpi>
      </div>

      {/* KPI STRIP — mobile */}
      <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-1 pt-3 md:hidden">
        <div className="min-w-[108px] shrink-0 rounded-xl border border-[var(--ds-border-soft)] bg-[var(--ds-surface)] px-3 py-2.5">
          <div className="text-[10.5px] font-semibold text-[var(--ds-muted)]">Today</div>
          <div className="ds-mono text-lg font-semibold">{stats.ordersToday} orders</div>
        </div>
        <div
          className={`min-w-[108px] shrink-0 rounded-xl border px-3 py-2.5 ${
            attentionCount > 0
              ? "border-[#f4d8c6] bg-[#fdf1ec] text-[#9a4a1f]"
              : "border-[var(--ds-border-soft)] bg-[var(--ds-surface)]"
          }`}
        >
          <div className={`text-[10.5px] font-semibold ${attentionCount > 0 ? "" : "text-[var(--ds-muted)]"}`}>Attention</div>
          <div className="ds-mono text-lg font-semibold">{attentionCount} waiting</div>
        </div>
        <div className="min-w-[108px] shrink-0 rounded-xl border border-[var(--ds-border-soft)] bg-[var(--ds-surface)] px-3 py-2.5">
          <div className="text-[10.5px] font-semibold text-[var(--ds-muted)]">Revenue</div>
          <div className="ds-mono text-lg font-semibold">{inr0(stats.revenueTodayCents)}</div>
        </div>
      </div>

      {/* FILTER ROW — desktop: channel chips + board/list switch */}
      <div className="hidden shrink-0 items-center gap-2 px-7 pb-2.5 pt-3.5 md:flex">
        {CHANNELS.map((c) => (
          <Link
            key={c.key}
            href={href({ ...base, channel: c.key === "all" ? undefined : c.key })}
            className={`rounded-full px-3.5 py-[7px] text-[12.5px] font-semibold ${
              channel.key === c.key
                ? "bg-[#221b14] text-[#fbf8f3] dark:bg-[#f5efe6] dark:text-[#221b14]"
                : "border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text-2)] hover:bg-[var(--ds-chip)]"
            }`}
          >
            {c.label}
          </Link>
        ))}
        {q && (
          <Link href={href({ ...base, q: undefined })} className="ml-1 text-xs font-semibold text-[var(--ds-accent)] hover:underline">
            Clear search “{q}” ✕
          </Link>
        )}
        <div className="flex-1" />
        <span className="text-xs text-[var(--ds-muted)]">{view === "board" ? "Board view" : "List view"}</span>
        <div className="flex items-center rounded-lg bg-[var(--ds-chip)] p-[3px]">
          <Link
            href={href({ ...base, view: undefined })}
            aria-label="Board view"
            aria-current={view === "board" ? "true" : undefined}
            className={`grid h-6 w-[26px] place-items-center rounded-md ${view === "board" ? "bg-[var(--ds-surface)] text-[var(--ds-text)] shadow-[0_1px_2px_rgba(34,20,10,0.1)]" : "text-[var(--ds-muted)]"}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="18" rx="1" />
            </svg>
          </Link>
          <Link
            href={href({ ...base, view: "list" })}
            aria-label="List view"
            aria-current={view === "list" ? "true" : undefined}
            className={`grid h-6 w-[26px] place-items-center rounded-md ${view === "list" ? "bg-[var(--ds-surface)] text-[var(--ds-text)] shadow-[0_1px_2px_rgba(34,20,10,0.1)]" : "text-[var(--ds-muted)]"}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </Link>
        </div>
      </div>

      {/* FILTER CHIPS — mobile: one status column at a time */}
      <div className="flex shrink-0 gap-[7px] overflow-x-auto px-4 pb-2.5 pt-3 md:hidden">
        {COLUMNS.map((c) => {
          const count = byColumn(c.key).length;
          const on = mobileColumn === c.key;
          return (
            <Link
              key={c.key}
              href={href({ ...base, status: c.key === "new" ? undefined : c.key })}
              className={`shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-semibold ${
                on
                  ? "bg-[#221b14] text-[#fbf8f3] dark:bg-[#f5efe6] dark:text-[#221b14]"
                  : "border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text-2)]"
              }`}
            >
              {c.label} · {count}
            </Link>
          );
        })}
      </div>

      {/* BOARD / LIST + HISTORY */}
      <div className="flex min-h-0 flex-1 gap-4 px-4 pb-24 pt-1 md:px-7 md:pb-6">
        {view === "board" ? (
          <>
            {COLUMNS.map((col) => {
              const list = byColumn(col.key);
              return (
                <section
                  key={col.key}
                  aria-label={`${col.label} orders`}
                  className={`${mobileColumn === col.key ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col md:flex md:rounded-2xl md:bg-[var(--ds-column)]`}
                >
                  <div className="hidden items-center gap-2 px-4 pb-2.5 pt-3.5 md:flex">
                    <span className="size-[9px] rounded-full" style={{ background: col.dot }} />
                    <span className="text-[13.5px] font-bold">{col.label}</span>
                    <span className="ds-mono rounded-full bg-[#e7dcc9] px-2 py-px text-[11.5px] font-bold text-[#6b5e48]">{list.length}</span>
                  </div>
                  <div className="ds-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto md:px-3 md:pb-3">
                    {list.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[var(--ds-border)] px-3 py-8 text-center text-[13px] text-[var(--ds-muted)]">
                        {q || channel.type ? "No matching orders." : `No ${col.label.toLowerCase()} orders.`}
                      </p>
                    ) : (
                      list.map((o) => (
                        <OrderCard key={o.id} order={o} now={now} deliveryRadiusKm={tenant?.deliveryRadiusKm ?? null} />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </>
        ) : (
          <section aria-label="Active orders" className="ds-scroll min-h-0 flex-1 overflow-y-auto">
            {active.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--ds-border)] px-3 py-10 text-center text-[13px] text-[var(--ds-muted)]">
                {q || channel.type ? "No matching orders." : "No active orders right now."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {active.map((o) => (
                  <OrderCard key={o.id} order={o} now={now} deliveryRadiusKm={tenant?.deliveryRadiusKm ?? null} showStatus />
                ))}
              </div>
            )}
          </section>
        )}

        {/* RECENT HISTORY — right sidebar on wide screens */}
        <aside className="hidden min-h-0 w-[268px] shrink-0 flex-col xl:flex">
          <HistoryList history={history} />
        </aside>
      </div>

      {/* RECENT HISTORY — below the board on smaller screens */}
      <div className="px-4 pb-24 md:px-7 md:pb-8 xl:hidden">
        <HistoryList history={history} />
      </div>

      {/* NEW ORDER — floating button on phones */}
      <Link
        href="/dashboard/orders/new"
        aria-label="New order"
        className="fixed bottom-6 right-[18px] z-20 grid size-14 place-items-center rounded-full bg-[var(--ds-accent)] text-[#fff8f1] shadow-[0_6px_16px_rgba(34,20,10,0.28)] md:hidden print:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </div>
  );
}

function Kpi({
  label,
  value,
  attention,
  children,
}: {
  label: string;
  value: string;
  attention?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex-1 rounded-[14px] border px-[18px] py-3.5 ${
        attention ? "border-[#f4d8c6] bg-[#fdf1ec]" : "border-[var(--ds-border-soft)] bg-[var(--ds-surface)]"
      }`}
    >
      <div className={`text-xs font-semibold ${attention ? "text-[#9a4a1f]" : "text-[var(--ds-muted)]"}`}>{label}</div>
      <div className={`ds-mono mt-[3px] text-[26px] font-semibold ${attention ? "text-[#9a4a1f]" : ""}`}>{value}</div>
      <div className="mt-0.5 text-[11.5px]">{children}</div>
    </div>
  );
}

function HistoryList({ history }: { history: OrderWithItems[] }) {
  return (
    <>
      <div className="px-1 pb-2.5 pt-3.5 text-[13.5px] font-bold">Recent history</div>
      <div className="ds-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {history.length === 0 ? (
          <p className="text-[13px] text-[var(--ds-muted)]">No completed or cancelled orders yet.</p>
        ) : (
          history.map((o) => (
            <div key={o.id} className="flex flex-col gap-1 rounded-xl bg-[var(--ds-column)] px-3 py-[11px]">
              <div className="flex items-center justify-between">
                <span className="ds-mono text-xs font-semibold">#{o.orderNumber}</span>
                <span
                  className={`rounded-full px-[7px] py-0.5 text-[10px] font-bold ${
                    o.status === "COMPLETED" ? "bg-[#dcefe0] text-[#1e7a4c]" : "bg-[#e7dcc9] text-[#6b5e48]"
                  }`}
                >
                  {o.status}
                </span>
              </div>
              <span className="text-xs text-[var(--ds-chip-text)]">
                {o.customerName} · {formatINR(o.totalCents)}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function OrderCard({
  order,
  now,
  deliveryRadiusKm,
  showStatus,
}: {
  order: OrderWithItems;
  now: number;
  /** The tenant's *current* radius setting — compared against the distance recorded at order time (see Order.deliveryDistanceKm). */
  deliveryRadiusKm: number | null;
  showStatus?: boolean;
}) {
  const minutes = minutesSince(order, now);
  const needsAttention = order.status === "PENDING" && minutes >= ATTENTION_MINUTES;
  const next = NEXT_STEP[order.status];

  const timeBadge =
    order.status === "READY"
      ? { text: "Ready", cls: "bg-[#eaf6ec] text-[#1e7a4c]" }
      : needsAttention
        ? { text: timeAgo(minutes), cls: "bg-[#fdf1ec] text-[#9a4a1f]" }
        : order.status === "PREPARING"
          ? { text: timeAgo(minutes), cls: "bg-[#eaf1fe] text-[#2f6fed]" }
          : { text: timeAgo(minutes), cls: "bg-[var(--ds-chip)] text-[var(--ds-muted)]" };

  const channelText =
    order.fulfillmentType === "DINE_IN"
      ? `${order.tableLabel ? `Table ${order.tableLabel} · ` : ""}Dine-in`
      : order.fulfillmentType === "DELIVERY"
        ? "Delivery"
        : "Takeaway";

  const method = PAYMENT_METHOD_LABEL[order.paymentMethod];
  const payment =
    order.paymentStatus === "PAID"
      ? { text: order.paymentMethod === "RAZORPAY" ? "Paid online" : `Paid · ${method}`, cls: "bg-[#eaf6ec] text-[#1e7a4c]" }
      : order.paymentStatus === "FAILED"
        ? { text: "Payment failed", cls: "bg-[#fdf0f0] text-[#b23b3b]" }
        : { text: `Unpaid · ${method}`, cls: "bg-[#fdf1ec] text-[#9a4a1f]" };

  const outsideZone =
    order.deliveryDistanceKm != null && deliveryRadiusKm != null && order.deliveryDistanceKm > deliveryRadiusKm;

  const border = needsAttention
    ? "border-[1.5px] border-[#f0b27a]"
    : order.status === "READY"
      ? "border border-[#c7e4ce]"
      : "border border-[var(--ds-border-soft)]";

  const chip = "rounded-md px-2 py-[3px] text-[11px] font-semibold";

  return (
    <article
      className={`flex flex-col gap-2.5 rounded-[14px] bg-[var(--ds-surface)] p-3.5 shadow-[0_1px_3px_rgba(34,20,10,0.06)] ${border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="ds-mono text-[13px] font-semibold">#{order.orderNumber}</div>
          <div className="mt-0.5 truncate text-[13.5px] font-semibold">{order.customerName}</div>
          {order.customerPhone && <div className="text-[11.5px] text-[var(--ds-muted)]">{order.customerPhone}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-[3px] text-[11px] font-bold ${timeBadge.cls}`}>{timeBadge.text}</span>
          {showStatus && (
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--ds-muted)]">
              {order.status === "PENDING" ? "New" : order.status}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`${chip} bg-[var(--ds-chip)] text-[var(--ds-chip-text)]`}>{channelText}</span>
        <span className={`${chip} ${payment.cls}`}>{payment.text}</span>
        {order.status === "ACCEPTED" && <span className={`${chip} bg-[#eaf1fe] text-[#2f6fed]`}>Accepted</span>}
        {order.source === "MANUAL" && <span className={`${chip} bg-[var(--ds-chip)] text-[var(--ds-chip-text)]`}>Manual bill</span>}
        {order.discountCents > 0 && (
          <span className={`${chip} bg-[#eaf6ec] text-[#1e7a4c]`}>
            {order.couponCode ? `${order.couponCode} ` : "Discount "}−{formatINR(order.discountCents)}
          </span>
        )}
      </div>

      <div className="text-[12.5px] leading-normal text-[var(--ds-text-2)]">
        {order.items.map((i) => `${i.quantity} × ${i.nameSnapshot}`).join(" · ")}
      </div>

      {(order.deliveryAddress || order.deliveryDistanceKm != null || order.notes) && (
        <div className="flex flex-col gap-0.5 text-[11.5px] text-[var(--ds-muted)]">
          {order.deliveryAddress && <span>{order.deliveryAddress}</span>}
          {order.deliveryDistanceKm != null && (
            <span className={outsideZone ? "font-semibold text-[#9a4a1f]" : undefined}>
              {outsideZone ? "⚠ " : ""}
              {order.deliveryDistanceKm.toFixed(1)}km away{outsideZone ? ` (outside ${deliveryRadiusKm}km zone)` : ""}
            </span>
          )}
          {order.notes && <span>Note: {order.notes}</span>}
        </div>
      )}

      <OrderCardFooter
        orderId={order.id}
        totalText={formatINR(order.totalCents)}
        next={next ? { to: next.to, label: next.label } : undefined}
        tone={next?.tone ?? "accent"}
        cancellable={CANCELLABLE.includes(order.status)}
        paymentPending={order.paymentStatus === "PENDING"}
      />
    </article>
  );
}
