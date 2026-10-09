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

/**
 * Same wa.me click-to-chat shape as buildWhatsAppUrl above, but targeting a
 * TENANT's own number (Tenant.ownerWhatsapp, or a customer's own phone for a
 * win-back message) instead of the platform's own support number — the
 * zero-credential fallback for src/lib/notifications/whatsapp.ts's dormant
 * real-API path. `phone` is expected digits-only, international format, same
 * convention as WHATSAPP_NUMBER above (no leading "+" or "0").
 */
export function buildTenantWhatsAppUrl(phone: string, message?: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

// tel: links keep the "+" — that's the correct format for a tel: href.
export const PHONE_DISPLAY = "+91 97178 21824";
export const PHONE_TEL = "tel:+919717821824";

export const BUSINESS_NAME = "Rajat Digital Agency";
export const BUSINESS_FOUNDER = "Rajat Mirg";
export const BUSINESS_EMAIL = "bhojsetu@gmail.com";

// Confirmed directly by the user, 2026-10-06 — used in JSON-LD (Organization
// address) and the About/Contact pages, not just a formatting string.
export const BUSINESS_ADDRESS = {
  streetAddress: "Plot No. 147, Pratap Nagar, Maya Enclave",
  addressLocality: "New Delhi",
  addressCountry: "IN",
};
export const BUSINESS_ADDRESS_DISPLAY = `${BUSINESS_ADDRESS.streetAddress}, ${BUSINESS_ADDRESS.addressLocality}, India`;

// A dedicated, always-on demo storefront (not a real restaurant), seeded via
// prisma/seed.ts — see that file's own comment for why. This is the ONLY
// place this slug should be written; prisma/seed.ts imports it rather than
// hardcoding its own copy, specifically so a second demo tenant with a
// different slug can never get created by accident again (the 6 Oct 2026
// visibility audit found two real duplicates — bhojsetu-demo and
// bhojsetu-demo-2 — because the seed script and this constant had drifted
// apart and each got created by hand instead). Changed to "bhojsetu-demo"
// on 2026-10-07 to match the tenant that's actually live in production —
// "demo-restaurant" (the old value) only ever existed locally.
export const DEMO_STOREFRONT_SLUG = "bhojsetu-demo";

// What the Help page promises customers about support turnaround. One place to
// change if the team's real response time changes.
export const SUPPORT_RESPONSE_TARGET = "1 hour";
