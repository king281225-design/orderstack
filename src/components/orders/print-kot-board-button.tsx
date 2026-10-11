"use client";

import { SilentPrintButton } from "@/components/orders/silent-print-button";
import { getPersistedThermalWidth } from "@/lib/print-prefs-client";

/** The KOT station board's "Print KOT" action, styled to match its dark cards — same no-tab silent print as the order card icons. */
export function PrintKotBoardButton({ printHref }: { printHref: string }) {
  const sep = printHref.includes("?") ? "&" : "?";
  return (
    <SilentPrintButton
      buildHref={() => `${printHref}${sep}width=${getPersistedThermalWidth()}`}
      ariaLabel="Print KOT"
      title="Print KOT"
      className="rounded-md border border-white/30 px-3 py-2 text-sm font-medium hover:bg-white/10"
    >
      Print KOT
    </SilentPrintButton>
  );
}
