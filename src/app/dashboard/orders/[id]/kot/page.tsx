import { notFound } from "next/navigation";
import { requireTenantSession } from "@/lib/auth";
import { getOrderForPrint } from "@/lib/data/orders";
import { getTenantById } from "@/lib/data/tenants";
import { KotPrintControls } from "@/components/orders/kot-print-controls";
import { ThermalTicketFrame } from "@/components/orders/thermal-ticket-frame";
import { kotCode } from "@/lib/kot";
import { formatINR } from "@/lib/money";
import { DEFAULT_THERMAL_WIDTH, isThermalWidth, thermalContentWidthMm } from "@/lib/print-prefs";

/**
 * Kitchen Order Ticket slip — an 80mm (or ?width=58, see print-prefs.ts)
 * thermal roll layout, one per station when ?station=<id|none> is given
 * (only that station's items), or the whole order otherwise. Tenant-scoped
 * like the invoice print page.
 */
export default async function KotSlipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ station?: string; prices?: string; autoprint?: string; width?: string }>;
}) {
  const session = await requireTenantSession();
  const [{ id }, { station, prices, autoprint, width }] = await Promise.all([params, searchParams]);
  const showPrices = prices !== "0";
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

  const itemsSubtotal = items.reduce((sum, i) => sum + i.priceCentsSnapshot * i.quantity, 0);
  const base = `/dashboard/orders/${id}/kot`;
  const pricesHref = `${base}?${new URLSearchParams({
    ...(station ? { station } : {}),
    ...(showPrices ? { prices: "0" } : {}),
    width: paperWidth,
  }).toString()}`;
  return (
    <div className="mx-auto" style={{ maxWidth: `${thermalContentWidthMm(paperWidth)}mm` }}>
      <KotPrintControls
        billHref={`/dashboard/orders/${id}/print?width=${paperWidth}`}
        pricesHref={pricesHref}
        showPrices={showPrices}
        width={paperWidth}
      />
      <ThermalTicketFrame width={paperWidth} className="kot-ticket" style={{ fontSize: 18 }} autoPrint={autoprint === "1"}>
        <div className="text-center">
          <p className="text-base font-bold">{tenant.name}</p>
          <p className="text-lg font-bold">KOT {kotCode(tenant.name, order.orderNumber)}</p>
          {stationLabel && <p className="font-semibold uppercase">Station: {stationLabel}</p>}
          <p className="text-xs">{order.createdAt.toLocaleString("en-IN")}</p>
        </div>
        <hr className="my-2 border-dashed border-gray-500" />
        <p className="font-semibold">
          {order.fulfillmentType === "DINE_IN"
            ? `DINE-IN${order.tableLabel ? ` — TABLE ${order.tableLabel}` : ""}`
            : order.fulfillmentType === "DELIVERY"
              ? "DELIVERY"
              : "TAKEAWAY"}
        </p>
        <hr className="my-2 border-dashed border-gray-500" />
        {/* Name gets its own full-width line (same text-sm size as the
            rest of the ticket, not a separate smaller/truncated style) —
            squeezing name+qty+price into one row left too little room for
            a real dish name and either cut it off or shrank it to look
            mismatched against the price. Qty on its own line below reads
            clearly for the kitchen regardless of how long the name is. */}
        <ul className="flex flex-col gap-2">
          {items.map((i) => (
            <li key={i.id} className="border-b border-dashed border-gray-300 pb-2 text-sm font-semibold">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 break-words">{i.nameSnapshot}</span>
                {showPrices && <span className="shrink-0">{formatINR(i.priceCentsSnapshot * i.quantity)}</span>}
              </div>
              <p>Qty: {i.quantity}</p>
            </li>
          ))}
        </ul>
        {order.notes && (
          <>
            <hr className="my-2 border-dashed border-gray-500" />
            <p className="text-sm">Note: {order.notes}</p>
          </>
        )}
        {showPrices && (
          <>
            <hr className="my-2 border-dashed border-gray-500" />
            {station && (
              <p className="flex justify-between text-sm">
                <span>Station subtotal</span>
                <span>{formatINR(itemsSubtotal)}</span>
              </p>
            )}
            <p className="flex justify-between text-sm font-bold">
              <span>
                Bill total
                {order.taxCents > 0 ? " (incl. GST)" : ""}
              </span>
              <span>{formatINR(order.totalCents)}</span>
            </p>
          </>
        )}
        <hr className="my-2 border-dashed border-gray-500" />
        <p className="text-center text-xs">— end of ticket —</p>
      </ThermalTicketFrame>
    </div>
  );
}
