"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/track-event";

/**
 * Fires once when the live demo storefront (DEMO_STOREFRONT_SLUG) loads —
 * mounted only on that one tenant's /r/[slug] page (see src/app/r/[slug]/page.tsx),
 * never on a real restaurant's storefront.
 */
export function DemoViewPing() {
  useEffect(() => {
    trackEvent("demo_view");
  }, []);

  return null;
}
