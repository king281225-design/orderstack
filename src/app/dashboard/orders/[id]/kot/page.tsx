import { notFound } from "next/navigation";
import { requireTenantSession } from "@/lib/auth";
import { getOrderForPrint } from "@/lib/data/orders";
import { getTenantById } from "@/lib/data/tenants";
import { KotPrintControls } from "@/components/orders/kot-print-controls";

/**
 * Kitchen Order Ticket slip — always an 80mm thermal roll layout, one per
 * station when ?station=<id|none> is given (only that station's items), or
 * the whole order otherwise. Tenant-scoped like the invoice print page.
 */
export default async function KotSlipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ station?: string }>;
}) {
  const session = await requireTenantSession();
  const [{ id }, { station }] = await Promise.all([params, searchParams]);
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

  return (
    <div className="mx-auto" style={{ maxWidth: "74mm", fontSize: 13 }}>
      <style>{"@page { size: 80mm auto; margin: 3mm; }"}</style>
      <KotPrintControls />
      <div className="text-center">
        <p className="text-base font-bold">{tenant.name}</p>
        <p className="text-lg font-bold">KOT #{order.orderNumber}</p>
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
            <span className="w-8 shrink-0">{i.quantity} ×</span>
            <span>{i.nameSnapshot}</span>
          </li>
        ))}
      </ul>
      {order.notes && (
        <>
          <hr className="my-2 border-dashed border-gray-500" />
          <p className="text-sm">Note: {order.notes}</p>
        </>
      )}
      <hr className="my-2 border-dashed border-gray-500" />
      <p className="text-center text-xs">— end of ticket —</p>
    </div>
  );
}
