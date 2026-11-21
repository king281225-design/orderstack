"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track-event";

/**
 * Fires the signup_complete GA4 event exactly once, the moment a brand-new
 * owner lands on /dashboard/menu right after signupAction's server-side
 * redirect (see src/app/signup/actions.ts's `?welcome=1`). Strips the query
 * param immediately after, so a refresh or back-navigation can't re-fire it.
 */
export function SignupWelcomePing() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome");

  useEffect(() => {
    if (welcome !== "1") return;
    trackEvent("signup_complete");
    router.replace("/dashboard/menu");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once for this exact mount, router/searchParams identity isn't meaningful here
  }, [welcome]);

  return null;
}
