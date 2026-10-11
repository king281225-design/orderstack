"use client";

import { useEffect } from "react";

/**
 * Fires window.print() once on mount when `enabled`. Used by links built
 * with `?autoprint=1` (order card icons, the KOT station board) so clicking
 * the link goes straight to the OS print dialog instead of landing on a
 * preview page that still needs its own Print button clicked — one click
 * end to end instead of two.
 */
export function AutoPrintOnMount({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (enabled) window.print();
  }, [enabled]);
  return null;
}
