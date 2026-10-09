import "server-only";

/**
 * WhatsApp sending — dormant until real credentials exist, same "gate on an
 * env var, do nothing without it" pattern as src/lib/notifications/email.ts
 * (Resend/SMTP) and Razorpay elsewhere in this codebase. Backend: Meta's
 * WhatsApp Business Cloud API (official, no middleman markup — same reasoning
 * Resend was picked for email). Until WHATSAPP_PHONE_NUMBER_ID/
 * WHATSAPP_ACCESS_TOKEN are set, every send() call below is a silent no-op —
 * the always-available fallback is a prefilled wa.me click-to-chat link (see
 * buildTenantWhatsAppUrl in src/lib/contact.ts), rendered directly by the
 * pages that need it, no server call involved.
 */
export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

async function send(to: string, body: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) throw new Error("WhatsApp is not configured.");

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WhatsApp send failed (${res.status}): ${text}`);
  }
}

/** Fire-and-forget from the caller's point of view — never throws, never blocks the edit that triggered it. */
export async function sendOwnerOrderEditWhatsApp(
  ownerWhatsapp: string,
  restaurantName: string,
  summary: { orderNumber: number; editedByName: string | null; totalCents: number },
): Promise<void> {
  if (!isWhatsAppConfigured()) return;
  try {
    await send(
      ownerWhatsapp,
      `${restaurantName}: bill #${summary.orderNumber} was just edited${summary.editedByName ? ` by ${summary.editedByName}` : ""} — new total ₹${(summary.totalCents / 100).toFixed(2)}.`,
    );
  } catch (err) {
    console.error("sendOwnerOrderEditWhatsApp failed:", err);
  }
}

/** Fire-and-forget, same contract — only called once a win-back coupon has actually been created. */
export async function sendWinBackWhatsApp(
  customerPhone: string,
  restaurantName: string,
  couponCode: string,
  discountSummary: string,
): Promise<void> {
  if (!isWhatsAppConfigured()) return;
  try {
    await send(
      customerPhone,
      `We miss you at ${restaurantName}! Here's ${discountSummary} on your next order — use code ${couponCode} at checkout.`,
    );
  } catch (err) {
    console.error("sendWinBackWhatsApp failed:", err);
  }
}
