"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the server by re-running the current route's loaders every
 * `intervalMs`. This is the "live incoming orders" mechanism for v1 —
 * plain polling, not websockets, per the plan's day 8 note
 * ("polling/refresh"). Good enough at launch scale (1–5 restaurants).
 *
 * On weak hardware (e.g. Posiflex POS terminals) a single router.refresh()
 * round trip can itself take longer than intervalMs — a plain setInterval
 * would then queue up another refresh on top of the one still resolving,
 * every tick, with no way to catch up. Each overlapping refresh competes for
 * the same limited CPU, so the app gets progressively slower the longer a
 * board stays open. Skipping a tick while the previous refresh is still
 * pending (tracked via useTransition, which stays pending until the
 * refreshed content actually commits) keeps this from compounding, and
 * pausing while the tab/screen isn't visible saves CPU when a device is
 * multitasking with other software.
 */
export function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isPendingRef = useRef(isPending);
  isPendingRef.current = isPending;

  useEffect(() => {
    const id = setInterval(() => {
      if (isPendingRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      startTransition(() => router.refresh());
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, startTransition]);

  return null;
}
