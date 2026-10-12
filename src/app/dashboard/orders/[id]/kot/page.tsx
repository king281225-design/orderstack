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
        <ul className="flex flex-col gap-1">
          {items.map((i) => (
            <li key={i.id} className="flex gap-2 text-sm font-semibold">
              {/* w-10 (not w-8) — a bigger font (see globals.css's thermal
                  overrides) needs more room for a 2-digit quantity like
                  "12 ×" to not clip against this fixed-width column. */}
              <span className="w-10 shrink-0">{i.quantity} ×</span>
              {/* min-w-0 is load-bearing: a flex item's default min-width
                  is its own content width, not 0 — without this, a long
                  name + a wide quantity/price combo doesn't push onto a
                  second line, it pushes the whole row past the paper's
                  edge instead. truncate (not break-words/wrap) forces the
                  name onto exactly one line as asked — a name too long for
                  the column ends in "…" rather than wrapping to 2-3 lines. */}
              <span className="kot-item-name min-w-0 flex-1 truncate">{i.nameSnapshot}</span>
              {showPrices && <span className="shrink-0">{formatINR(i.priceCentsSnapshot * i.quantity)}</span>}
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
