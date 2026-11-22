"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsEventName, type AnalyticsEventParams } from "@/lib/analytics/track-event";

/**
 * One delegated click listener for the whole site, instead of converting
 * every Server Component with a trackable link/button (phone, WhatsApp,
 * trial CTAs, pricing toggle, FAQ) into a Client Component. Any clicked
 * element (or an ancestor) carrying `data-ga-event="<name>"` gets tracked;
 * `data-ga-params='{"location":"hero"}'` (a JSON string) is optional. Never
 * calls preventDefault/stopPropagation — a tracked link always navigates
 * normally, in the same tab it would otherwise, even if gtag hasn't loaded.
 */
export function AnalyticsClickDelegate() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>("[data-ga-event]");
      if (!el) return;
      const name = el.dataset.gaEvent as AnalyticsEventName | undefined;
      if (!name) return;

      let params: AnalyticsEventParams = {};
      if (el.dataset.gaParams) {
        try {
          params = JSON.parse(el.dataset.gaParams);
        } catch {
          params = {};
        }
      }
      trackEvent(name, params);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
