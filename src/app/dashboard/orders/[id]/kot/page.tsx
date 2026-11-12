import { notFound } from "next/navigation";
import { requireTenantSession } from "@/lib/auth";
import { getOrderForPrint } from "@/lib/data/orders";
import { getTenantById } from "@/lib/data/tenants";
import { KotPrintControls } from "@/components/orders/kot-print-controls";
import { ThermalTicketFrame } from "@/components/orders/thermal-ticket-frame";
import { formatKotTimestamp } from "@/lib/kot";
import { DEFAULT_THERMAL_WIDTH, isThermalWidth, thermalContentWidthMm } from "@/lib/print-prefs";
import type { KotTicketData } from "@/lib/escpos";

/**
 * Kitchen Order Ticket slip — an 80mm (or ?width=58, see print-prefs.ts)
 * thermal roll layout, one per station when ?station=<id|none> is given
 * (only that station's items), or the whole order otherwise. Tenant-scoped
 * like the invoice print page. Never shows prices/totals — the kitchen
 * only needs dish names and quantities, not what the customer is billed.
 */
export default async function KotSlipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ station?: string; autoprint?: string; width?: string }>;
}) {
  const session = await requireTenantSession();
  const [{ id }, { station, autoprint, width }] = await Promise.all([params, searchParams]);
  const paperWidth = isThermalWidth(width) ? width : DEFAULT_THERMAL_WIDTH;
  const [order, tenant] = await Promise.all([
    getOrderForPrint(session.tenantId, id),
    getTenantById(session.tenantId),
  ]);
  if (!order || !tenant) notFound();

  const items = order.items.filter((i) =>
    !station ? true : station === "none" ? !i.stationId : i.stationId === station,
  );
  if (items.length === 0) notFound();
  const stationLabel = station ? (station === "none" ? "Unassigned" : items[0].stationName ?? "Station") : null;

  // Plain data only (no Dates/Prisma objects) — crosses into client components.
  const kotData: KotTicketData = {
    orderNumber: order.orderNumber,
    dateLabel: formatKotTimestamp(order.createdAt),
    stationLabel,
    fulfillmentType: order.fulfillmentType,
    tableLabel: order.tableLabel,
    items: items.map((i) => ({ nameSnapshot: i.nameSnapshot, quantity: i.quantity })),
    notes: order.notes,
  };
  const forceWidth = isThermalWidth(width) ? width : undefined;

  return (
    <div className="mx-auto" style={{ maxWidth: `${thermalContentWidthMm(paperWidth)}mm` }}>
      <KotPrintControls
        billHref={`/dashboard/orders/${id}/print?width=${paperWidth}`}
        forceWidth={forceWidth}
        kotData={kotData}
      />
      <ThermalTicketFrame
        width={paperWidth}
        className="kot-ticket"
        style={{ fontSize: 18 }}
        autoPrint={autoprint === "1"}
        forceWidth={forceWidth}
        kotData={kotData}
      >
        {/* Plain "Label: value" header block + one "Name (qty)" line per
            item — matches the simple thermal-KOT layout restaurant owners
            already know from other POS printers, rather than the earlier
            centered/bordered ticket design. */}
        <div className="text-sm">
          <p>KOT No: {order.orderNumber}</p>
          <p>Date: {formatKotTimestamp(order.createdAt)}</p>
          <p>Bill No: {order.orderNumber}</p>
          {stationLabel && <p>Station: {stationLabel}</p>}
          {order.fulfillmentType === "DINE_IN" ? (
            <p>Table: {order.tableLabel ?? "-"}</p>
          ) : (
            <p>Type: {order.fulfillmentType === "DELIVERY" ? "Delivery" : "Takeaway"}</p>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-1.5 text-sm font-semibold">
          {items.map((i) => (
            <p key={i.id} className="break-words">
              {i.nameSnapshot} ({i.quantity})
            </p>
          ))}
        </div>
        {order.notes && <p className="mt-4 text-sm">Note: {order.notes}</p>}
      </ThermalTicketFrame>
    </div>
  );
}
