"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isInternalTraffic } from "@/lib/analytics/internal-traffic";

/**
 * Fires a GA4 page_view on every route change (initial load + every
 * client-side navigation) — automatic page_view is disabled in
 * google-analytics.tsx (`send_page_view: false`) because it only fires
 * once, on script load, and Next.js navigations afterwards are soft/client-
 * side and wouldn't otherwise be seen as new page views at all.
 *
 * Tags traffic_type=internal when the route is /dashboard or /super-admin,
 * or when the owner's own bhojsetu_internal cookie is set (see
 * InternalTrafficFlag) — so GA4's own Internal Traffic data filter can
 * exclude it, matching the "page views carry traffic_type=internal too"
 * requirement (custom marketing events are handled separately in
 * track-event.ts, which never fires them at all on dashboard routes).
 */
export function AnalyticsPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    const payload: Record<string, string> = {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    };
    if (isInternalTraffic(pathname)) {
      payload.traffic_type = "internal";
    }
    window.gtag("event", "page_view", payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams' identity changes every render; .toString() above is the real dependency
  }, [pathname, searchParams.toString()]);

  return null;
}
