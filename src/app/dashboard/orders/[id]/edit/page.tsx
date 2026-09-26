import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantSession } from "@/lib/auth";
import { getOrderForPrint } from "@/lib/data/orders";
import { getTenantById } from "@/lib/data/tenants";
import { listMenuForTenant } from "@/lib/data/menu";
import { listCustomersForTenant } from "@/lib/data/customers";
import { listTables } from "@/lib/data/tables";
import { buildPickableMenu } from "@/lib/pickable-menu-items";
import { ManualOrderForm } from "@/components/orders/manual-order-form";

const PAYMENT_METHOD_LABEL: Record<string, string> = { UPI: "UPI", COD: "Cash", CARD: "Card", RAZORPAY: "Online" };

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireTenantSession();
  const { id } = await params;

  // getOrderForPrint filters by tenantId — an order id from another
  // restaurant simply doesn't match and 404s, never leaking billing data
  // across tenants.
  const order = await getOrderForPrint(session.tenantId, id);
  if (!order) notFound();

  const notEditable = order.status === "COMPLETED" || order.status === "CANCELLED" || order.paymentStatus === "PAID";
  if (notEditable) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Bill #{order.orderNumber}</h2>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {order.paymentStatus === "PAID"
            ? "This bill is already marked paid, so it can't be edited — cancel it and create a new one if something needs to change."
            : "This order is already completed or cancelled, so it can no longer be edited."}
        </p>
        <Link href={`/dashboard/orders/${order.id}/print`} className="text-sm font-semibold text-indigo-700 hover:underline">
          View invoice →
        </Link>
      </div>
    );
  }

  const [categories, tenant, customers, tables] = await Promise.all([
    listMenuForTenant(session.tenantId),
    getTenantById(session.tenantId),
    listCustomersForTenant(session.tenantId),
    listTables(session.tenantId),
  ]);

  const { menuItems, menuCategories } = buildPickableMenu(categories);
  const customerOptions = customers.map((c) => ({ name: c.name, phone: c.phone, email: c.email }));

  const channelText =
    order.fulfillmentType === "DINE_IN"
      ? `${order.tableLabel ? `Table ${order.tableLabel} · ` : ""}Dine-in`
      : order.fulfillmentType === "DELIVERY"
        ? "Delivery"
        : "Takeaway";

  const summary = `#${order.orderNumber} · ${order.customerName}${order.customerPhone ? ` (${order.customerPhone})` : ""} · ${channelText} · ${PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Edit bill #{order.orderNumber}</h2>
      <p className="text-sm text-gray-500">
        Add what the customer ordered on top, or remove a line — this updates the same bill instead of starting a new one.
      </p>
      <ManualOrderForm
        menuItems={menuItems}
        menuCategories={menuCategories}
        customers={customerOptions}
        defaultGstRate={tenant?.gstRate ?? null}
        tables={tables.map((t) => ({ id: t.id, label: t.label, status: t.status }))}
        editOrder={{
          id: order.id,
          summary,
          discountMode: "flat",
          discount: order.discountCents > 0 ? (order.discountCents / 100).toString() : "",
          gstRate: order.gstRatePercent != null ? String(order.gstRatePercent) : "",
          lines: order.items.map((l) => ({
            name: l.nameSnapshot,
            priceRupees: (l.priceCentsSnapshot / 100).toString(),
            quantity: String(l.quantity),
            itemId: l.itemId ?? undefined,
          })),
        }}
      />
    </div>
  );
}
