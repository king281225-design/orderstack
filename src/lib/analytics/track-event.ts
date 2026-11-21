/**
 * GA4 custom events for the marketing site (trial CTAs, demo clicks, pricing
 * views, etc.) — layered on top of the sitewide gtag loaded by
 * src/components/analytics/google-analytics.tsx, not a new loading
 * mechanism. See docs/analytics.md for the full event list and params.
 */

import { isDashboardPath, isInternalTrafficCookieSet } from "./internal-traffic";

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
 *
 * Marketing conversion events (trial CTAs, demo clicks, etc.) never fire on
 * /dashboard or /super-admin routes at all — those components don't render
 * there anyway, but this is a second, explicit guard. Separately, when the
 * owner's own `bhojsetu_internal` cookie is set (see InternalTrafficFlag),
 * a `traffic_type: "internal"` param is added rather than dropping the
 * event, so GA4's own Internal Traffic data filter can exclude it.
 */
export function trackEvent(name: AnalyticsEventName, params: AnalyticsEventParams = {}): void {
  try {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    if (isDashboardPath(window.location.pathname)) return;
    const payload = isInternalTrafficCookieSet() ? { ...params, traffic_type: "internal" } : params;
    window.gtag("event", name, payload);
  } catch {
    // analytics must never break the page
  }
}
