import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/data/tenants";
import { getOrderForTenant } from "@/lib/data/orders";
import { buildUpiQr } from "@/lib/upi";
import { formatINR } from "@/lib/money";
import { OrderStatusView } from "@/components/storefront/order-status-view";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();

  const order = await getOrderForTenant(tenant.id, orderId);
  if (!order) notFound();

  const showQr = order.paymentMethod === "UPI" && Boolean(tenant.upiId) && order.status !== "CANCELLED";
  const qr = showQr
    ? await buildUpiQr({
        upiId: tenant.upiId!,
        payeeName: tenant.name,
        amountCents: order.totalCents,
        note: `Order #${order.orderNumber}`,
      })
    : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Order #{order.orderNumber}</h1>
        <p className="text-sm text-gray-500">Thanks, {order.customerName} — we&apos;ll keep this updated.</p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <OrderStatusView slug={slug} orderId={order.id} initialStatus={order.status} />
      </section>

      {qr && (
        <section className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-sm font-medium text-gray-900">Pay via UPI</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.qrDataUrl} alt="UPI payment QR code" className="h-56 w-56" />
          <p className="text-sm text-gray-600">{formatINR(order.totalCents)} to {tenant.upiId}</p>
          <p className="text-xs text-gray-400">Scan with any UPI app, or pay cash if you&apos;d rather.</p>
        </section>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Order details</h2>
        <ul className="flex flex-col divide-y divide-gray-100 text-sm">
          {order.items.map((line) => (
            <li key={line.id} className="flex justify-between py-1.5">
              <span>
                {line.quantity} × {line.nameSnapshot}
              </span>
              <span>{formatINR(line.priceCentsSnapshot * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-sm font-semibold">
          <span>Total</span>
          <span>{formatINR(order.totalCents)}</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {order.fulfillmentType === "DELIVERY" ? `Delivery to ${order.deliveryAddress}` : "Takeaway"} ·{" "}
          {order.paymentMethod === "UPI" ? "UPI" : "Cash on delivery"}
        </p>
      </section>
    </div>
  );
}
