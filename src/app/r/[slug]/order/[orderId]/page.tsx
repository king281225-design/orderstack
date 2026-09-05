import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/data/tenants";
import { getOrderForTenant } from "@/lib/data/orders";
import { buildUpiQr } from "@/lib/upi";
import { formatINR } from "@/lib/money";
import { getRazorpayKeyId } from "@/lib/payments/razorpay";
import { OrderStatusView } from "@/components/storefront/order-status-view";
import { RazorpayPayNowButton } from "@/components/storefront/razorpay-pay-now-button";

const PAYMENT_METHOD_LABEL = {
  UPI: "UPI",
  COD: "Cash on delivery",
  RAZORPAY: "Paid online",
} as const;

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

      {order.paymentMethod === "RAZORPAY" &&
        order.paymentStatus === "PENDING" &&
        order.razorpayOrderId &&
        order.status !== "CANCELLED" && (
          <section className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center">
            <p className="text-sm font-medium text-gray-900">Payment not completed</p>
            <p className="text-xs text-gray-500">
              Looks like the payment window was closed before finishing. You can try again below.
            </p>
            <RazorpayPayNowButton
              slug={slug}
              orderId={order.id}
              razorpayOrderId={order.razorpayOrderId}
              keyId={getRazorpayKeyId() ?? ""}
              amountCents={order.totalCents}
              restaurantName={tenant.name}
              customerName={order.customerName}
              customerPhone={order.customerPhone}
            />
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
        <div className="mt-2 border-t border-gray-100 pt-2 text-sm">
          {order.discountCents > 0 && (
            <>
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatINR(order.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Coupon {order.couponCode}</span>
                <span>−{formatINR(order.discountCents)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatINR(order.totalCents)}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {order.fulfillmentType === "DELIVERY" ? `Delivery to ${order.deliveryAddress}` : "Takeaway"} ·{" "}
          {PAYMENT_METHOD_LABEL[order.paymentMethod]}
          {order.paymentMethod === "RAZORPAY" &&
            ` (${order.paymentStatus === "PAID" ? "paid" : order.paymentStatus === "FAILED" ? "failed" : "pending"})`}
        </p>
      </section>
    </div>
  );
}
