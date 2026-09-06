import "server-only";
import { Resend } from "resend";
import { formatINR } from "@/lib/money";
import type { Order, OrderItem } from "@prisma/client";

/**
 * Email order notifications — built now, dormant until real credentials
 * exist (same pattern as Razorpay: gate on an env var, do nothing without
 * it). Chose Resend over other providers because it's the simplest to
 * integrate (one API key, a small SDK) and has a real free tier — nobody
 * asked for a specific provider, so this is a judgment call, flagged here
 * rather than picked silently.
 *
 * Real caveat that only matters once RESEND_API_KEY is actually set: unless
 * RESEND_FROM_EMAIL is also set to an address on a domain verified in the
 * Resend dashboard, this falls back to Resend's sandbox sender
 * ("onboarding@resend.dev"), which Resend only allows delivering to the
 * account's own verified email — not arbitrary customers/owners. Real
 * delivery to real inboxes needs a verified sending domain, which is a
 * separate thing from the per-restaurant "custom domains" feature.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");
  return new Resend(apiKey);
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "OrderStack <onboarding@resend.dev>";
}

type OrderForEmail = Order & { items: OrderItem[] };

function orderItemsHtml(order: OrderForEmail): string {
  return order.items
    .map((line) => `<li>${line.quantity} × ${line.nameSnapshot} — ${formatINR(line.priceCentsSnapshot * line.quantity)}</li>`)
    .join("");
}

/** Fire-and-forget from the caller's point of view — never throws, never blocks placing the order. */
export async function sendOwnerNewOrderEmail(
  ownerEmail: string,
  restaurantName: string,
  order: OrderForEmail,
): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    await getClient().emails.send({
      from: getFromAddress(),
      to: ownerEmail,
      subject: `New order #${order.orderNumber} — ${restaurantName}`,
      html: `
        <p>New order #${order.orderNumber} from ${order.customerName} (${order.customerPhone}).</p>
        <ul>${orderItemsHtml(order)}</ul>
        <p><strong>Total: ${formatINR(order.totalCents)}</strong></p>
        <p>${order.fulfillmentType === "DELIVERY" ? `Delivery to: ${order.deliveryAddress}` : order.fulfillmentType === "DINE_IN" ? `Table ${order.tableLabel}` : "Takeaway"}</p>
      `,
    });
  } catch (err) {
    console.error("sendOwnerNewOrderEmail failed:", err);
  }
}

/** Same fire-and-forget contract — only called when the customer actually gave an email at checkout. */
export async function sendCustomerOrderConfirmationEmail(
  customerEmail: string,
  restaurantName: string,
  order: OrderForEmail,
): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    await getClient().emails.send({
      from: getFromAddress(),
      to: customerEmail,
      subject: `Order #${order.orderNumber} confirmed — ${restaurantName}`,
      html: `
        <p>Thanks, ${order.customerName} — ${restaurantName} received your order.</p>
        <ul>${orderItemsHtml(order)}</ul>
        <p><strong>Total: ${formatINR(order.totalCents)}</strong></p>
        <p>We'll keep you updated as it's prepared.</p>
      `,
    });
  } catch (err) {
    console.error("sendCustomerOrderConfirmationEmail failed:", err);
  }
}
