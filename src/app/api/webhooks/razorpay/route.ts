import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { setPaymentStatusByRazorpayOrderId } from "@/lib/data/orders";

/**
 * Server-to-server payment confirmation from Razorpay — the authoritative
 * source of truth for paymentStatus (the client-side verification in
 * verifyRazorpayPaymentAction is the fast path for immediate UX, but a
 * closed tab or dropped connection means it may never run).
 *
 * Configure this URL (https://yourdomain.com/api/webhooks/razorpay) in the
 * Razorpay dashboard under Settings > Webhooks, subscribed to at least
 * payment.captured and payment.failed, with RAZORPAY_WEBHOOK_SECRET set to
 * match. Not wired up anywhere yet — there's no deployed domain for
 * Razorpay to call, and no webhook secret has been provided.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const payment = event?.payload?.payment?.entity;

  if (!payment?.order_id) {
    return NextResponse.json({ ok: true }); // nothing to do, but don't fail the webhook
  }

  if (event.event === "payment.captured" || event.event === "payment.authorized") {
    await setPaymentStatusByRazorpayOrderId(payment.order_id, "PAID", payment.id);
  } else if (event.event === "payment.failed") {
    await setPaymentStatusByRazorpayOrderId(payment.order_id, "FAILED");
  }

  return NextResponse.json({ ok: true });
}
