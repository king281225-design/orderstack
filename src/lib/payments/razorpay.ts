import "server-only";
import crypto from "crypto";
import Razorpay from "razorpay";

/**
 * Razorpay integration — built now, dormant until real credentials are set.
 * With RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET unset (the default), the checkout
 * page simply doesn't show the "pay online" option (see
 * src/app/r/[slug]/checkout/page.tsx) — no broken button, no silent failure.
 * Once real test or live keys are added to .env, it appears automatically;
 * nothing else needs to change.
 */
export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Safe to expose to the client — Razorpay's checkout widget requires the key id client-side. */
export function getRazorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID ?? null;
}

function getClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set.");
  }
  return new Razorpay({ key_id, key_secret });
}

/** amountCents is paise, same unit Razorpay expects — no conversion needed. */
export async function createRazorpayOrder(amountCents: number, receipt: string) {
  const client = getClient();
  return client.orders.create({
    amount: amountCents,
    currency: "INR",
    receipt,
  });
}

/**
 * Verifies the signature Razorpay's checkout widget hands back to the
 * client on successful payment (HMAC-SHA256 of "orderId|paymentId", keyed by
 * the account's key secret — see Razorpay's payment-verification docs).
 * This is the fast path for immediate UX; the webhook below is the
 * authoritative one in case the browser never calls back.
 */
export function verifyCheckoutSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return safeHexEqual(expected, signature);
}

/** Verifies the `X-Razorpay-Signature` header on an incoming webhook request against the raw body. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeHexEqual(expected, signature);
}

function safeHexEqual(expectedHex: string, givenHex: string): boolean {
  try {
    const a = Buffer.from(expectedHex, "hex");
    const b = Buffer.from(givenHex, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
