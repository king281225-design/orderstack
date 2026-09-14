import "server-only";
import { Resend } from "resend";
import nodemailer, { type Transporter } from "nodemailer";
import { formatINR } from "@/lib/money";
import type { Order, OrderItem } from "@prisma/client";

/**
 * Email sending — two interchangeable backends, both dormant until real
 * credentials exist (same "gate on an env var, do nothing without it"
 * pattern as Razorpay/AI-menu-import elsewhere in this codebase):
 *
 * - Resend (original backend): RESEND_API_KEY (+ optional RESEND_FROM_EMAIL).
 * - SMTP (added 2026-09-14, at the user's request — a plain mailbox, e.g.
 *   one created through the host's own email panel, or Gmail with an app
 *   password): SMTP_HOST + SMTP_USER + SMTP_PASS (+ optional SMTP_PORT,
 *   SMTP_SECURE, SMTP_FROM). Uses `nodemailer`, which speaks standard SMTP
 *   to any provider — no vendor-specific SDK needed.
 *
 * SMTP is checked first only because it's the newer, more likely-to-be-set
 * path per the user's own request; if both happen to be configured, SMTP
 * wins and Resend is simply unused. Every call site below is unchanged —
 * they just call send(), which picks whichever backend is actually
 * configured.
 */
export function isEmailConfigured(): boolean {
  return isSmtpConfigured() || isResendConfigured();
}

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getFromAddress(): string {
  return process.env.SMTP_FROM || process.env.RESEND_FROM_EMAIL || "BhojSetu <onboarding@resend.dev>";
}

let smtpTransporter: Transporter | null = null;
function getSmtpTransporter(): Transporter {
  if (smtpTransporter) return smtpTransporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS are not set.");
  const port = Number(process.env.SMTP_PORT || 587);
  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    // Port 465 is implicit-TLS by convention; anything else (587, 25)
    // starts plaintext and upgrades via STARTTLS, which nodemailer does on
    // its own. SMTP_SECURE lets that default be overridden explicitly.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: { user, pass },
  });
  return smtpTransporter;
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");
  return new Resend(apiKey);
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const from = getFromAddress();
  if (isSmtpConfigured()) {
    await getSmtpTransporter().sendMail({ from, to, subject, html });
    return;
  }
  await getResendClient().emails.send({ from, to, subject, html });
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
    await send(
      ownerEmail,
      `New order #${order.orderNumber} — ${restaurantName}`,
      `
        <p>New order #${order.orderNumber} from ${order.customerName} (${order.customerPhone}).</p>
        <ul>${orderItemsHtml(order)}</ul>
        <p><strong>Total: ${formatINR(order.totalCents)}</strong></p>
        <p>${order.fulfillmentType === "DELIVERY" ? `Delivery to: ${order.deliveryAddress}` : order.fulfillmentType === "DINE_IN" ? `Table ${order.tableLabel}` : "Takeaway"}</p>
      `,
    );
  } catch (err) {
    console.error("sendOwnerNewOrderEmail failed:", err);
  }
}

/**
 * Fire-and-forget, same as the two order emails below — but note the caller
 * (src/lib/data/password-reset.ts) treats "email not configured" and "email
 * sent" identically on purpose (never reveals whether an account exists),
 * so a silent no-op here has a real consequence: without a configured
 * backend (SMTP or Resend), this is the one email in this codebase whose
 * absence makes a whole feature (forgot password) non-functional rather
 * than just less convenient.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    await send(
      to,
      "Reset your BhojSetu password",
      `
        <p>We received a request to reset your BhojSetu password.</p>
        <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 30 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    );
  } catch (err) {
    console.error("sendPasswordResetEmail failed:", err);
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
    await send(
      customerEmail,
      `Order #${order.orderNumber} confirmed — ${restaurantName}`,
      `
        <p>Thanks, ${order.customerName} — ${restaurantName} received your order.</p>
        <ul>${orderItemsHtml(order)}</ul>
        <p><strong>Total: ${formatINR(order.totalCents)}</strong></p>
        <p>We'll keep you updated as it's prepared.</p>
      `,
    );
  } catch (err) {
    console.error("sendCustomerOrderConfirmationEmail failed:", err);
  }
}
