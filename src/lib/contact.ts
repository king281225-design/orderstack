/**
 * Single source of truth for the platform's own business/contact details,
 * used by the marketing topbar/footer, the homepage hero's "Book a demo"
 * link, and the legal pages. Real values confirmed directly by the user —
 * not placeholders.
 */

// wa.me requires full international format: no leading "+", no leading "0".
export const WHATSAPP_NUMBER = "919717821824";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export function buildWhatsAppUrl(message?: string): string {
  if (!message) return WHATSAPP_URL;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

// tel: links keep the "+" — that's the correct format for a tel: href.
export const PHONE_DISPLAY = "+91 97178 21824";
export const PHONE_TEL = "tel:+919717821824";

export const BUSINESS_NAME = "Rajat Digital Agency";

// A dedicated, always-on demo storefront (not a real restaurant) seeded via
// prisma/seed.ts — see that file's own comment for why.
export const DEMO_STOREFRONT_SLUG = "demo-restaurant";

// What the Help page promises customers about support turnaround. One place to
// change if the team's real response time changes.
export const SUPPORT_RESPONSE_TARGET = "1 hour";
