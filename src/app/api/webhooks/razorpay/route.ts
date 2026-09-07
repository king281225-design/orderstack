import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { setPaymentStatusByRazorpayOrderId } from "@/lib/data/orders";
import { setSubscriptionStatusByRazorpaySubscriptionId } from "@/lib/data/tenants";

/**
 * Server-to-server confirmation from Razorpay — the authoritative source of
 * truth for both one-time payment status and subscription status (the
 * client-side verification paths in verifyRazorpayPaymentAction and
 * verifyAndActivateSubscription are the fast paths for immediate UX, but a
 * closed tab or dropped connection means either may never run).
 *
 * Configure this URL (https://yourdomain.com/api/webhooks/razorpay) in the
 * Razorpay dashboard under Settings > Webhooks, subscribed to at least
 * payment.captured, payment.failed, subscription.activated,
 * subscription.charged, subscription.pending, subscription.halted,
 * subscription.cancelled, and subscription.completed, with
 * RAZORPAY_WEBHOOK_SECRET set to match. Not wired up anywhere yet — there's
 * no deployed domain for Razorpay to call, and no webhook secret has been
 * provided.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  // Subscription lifecycle events (recurring billing, src/lib/data/tenants.ts)
  // — event names per Razorpay's own Subscriptions webhook docs. Not wired
  // up in Razorpay's dashboard any more than the payment events below are —
  // same two blockers (no real keys yet, no deployed public URL).
  const subscription = event?.payload?.subscription?.entity;
  if (subscription?.id) {
    if (event.event === "subscription.activated" || event.event === "subscription.charged") {
      await setSubscriptionStatusByRazorpaySubscriptionId(subscription.id, "ACTIVE");
    } else if (event.event === "subscription.pending" || event.event === "subscription.halted") {
      await setSubscriptionStatusByRazorpaySubscriptionId(subscription.id, "PAST_DUE");
    } else if (event.event === "subscription.cancelled" || event.event === "subscription.completed") {
      await setSubscriptionStatusByRazorpaySubscriptionId(subscription.id, "CANCELLED");
    }
    return NextResponse.json({ ok: true });
  }

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
