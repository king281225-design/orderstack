"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { setInternalTrafficCookie } from "@/lib/analytics/internal-traffic";

/**
 * Visit `/?internal=1` once on a device to mark it as the owner's own
 * browsing for a year (so GA4's Internal Traffic data filter can exclude
 * it) — `/?internal=0` clears it. See docs/analytics.md. Strips the query
 * param immediately after so it never lingers in the URL or gets shared.
 */
export function InternalTrafficFlag() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const internal = searchParams.get("internal");

  useEffect(() => {
    if (internal !== "1" && internal !== "0") return;
    setInternalTrafficCookie(internal === "1");
    const rest = new URLSearchParams(searchParams);
    rest.delete("internal");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per mount for this exact param value
  }, [internal]);

  return null;
}
