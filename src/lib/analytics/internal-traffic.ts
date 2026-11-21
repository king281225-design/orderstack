/**
 * "Is this the owner's own browsing, not a real visitor?" — used to tag GA4
 * events/page views with traffic_type=internal so the GA4 property's own
 * Internal Traffic data filter (set up in GA4 Admin, see docs/analytics.md)
 * can exclude it. Two independent signals, either one is enough:
 *  1. A non-httpOnly `bhojsetu_internal` cookie, set via /?internal=1 (see
 *     InternalTrafficFlag) — for the owner's own devices. 1 year, analytics
 *     only, never touches the real httpOnly session cookie.
 *  2. The current route being under /dashboard or /super-admin — the
 *     session itself is an httpOnly JWT (src/lib/auth.ts), unreadable from
 *     client JS, so route is the only client-feasible "is this app usage,
 *     not marketing browsing" signal.
 */

export const INTERNAL_TRAFFIC_COOKIE = "bhojsetu_internal";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function isInternalTrafficCookieSet(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((pair) => pair === `${INTERNAL_TRAFFIC_COOKIE}=1`);
}

export function setInternalTrafficCookie(enabled: boolean): void {
  if (typeof document === "undefined") return;
  if (enabled) {
    document.cookie = `${INTERNAL_TRAFFIC_COOKIE}=1; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`;
  } else {
    document.cookie = `${INTERNAL_TRAFFIC_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}

export function isDashboardPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/super-admin");
}

export function isInternalTraffic(pathname: string): boolean {
  return isInternalTrafficCookieSet() || isDashboardPath(pathname);
}
