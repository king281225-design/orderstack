"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the server by re-running the current route's loaders every
 * `intervalMs`. This is the "live incoming orders" mechanism for v1 —
 * plain polling, not websockets, per the plan's day 8 note
 * ("polling/refresh"). Good enough at launch scale (1–5 restaurants).
 */
export function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
