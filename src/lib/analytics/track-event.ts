/**
 * GA4 custom events for the marketing site (trial CTAs, demo clicks, pricing
 * views, etc.) — layered on top of the sitewide gtag loaded by
 * src/components/analytics/google-analytics.tsx, not a new loading
 * mechanism. See docs/analytics.md for the full event list and params.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsEventName =
  | "trial_cta_click"
  | "whatsapp_demo_click"
  | "phone_click"
  | "demo_view"
  | "pricing_view"
  | "pricing_toggle"
  | "login_click"
  | "signup_complete"
  | "faq_open";

export type AnalyticsEventParams = Record<string, string | number | boolean>;

/**
 * Fires a GA4 custom event. Never throws and never blocks navigation: a
 * tracked link/button must always behave normally even if gtag hasn't
 * loaded yet (ad blockers, very early paint, GA disabled in this
 * environment). Never pass personal data (names/phones/emails) in params.
 */
export function trackEvent(name: AnalyticsEventName, params: AnalyticsEventParams = {}): void {
  try {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", name, params);
  } catch {
    // analytics must never break the page
  }
}
