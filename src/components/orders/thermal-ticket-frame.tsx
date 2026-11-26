"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, CSSProperties } from "react";
import { thermalContentWidthMm, thermalPageCss } from "@/lib/print-prefs";
import { useThermalPageHeightMm, useThermalWidthPref } from "@/lib/print-prefs-client";
import { printOrFallback } from "@/lib/local-print-agent";
import { kotEscPosBase64 } from "@/lib/escpos-client";
import type { KotTicketData } from "@/lib/escpos";

/** Only a placeholder for the brief on-screen moment before the real content height is measured — see useThermalPageHeightMm. Auto-print waits for the real measurement and never prints against this. */
const FALLBACK_THERMAL_HEIGHT_MM = 1000;
/** Lets the saved roll width apply and the ticket re-measure before auto-print fires. */
const AUTOPRINT_SETTLE_MS = 250;

/**
 * Wraps a thermal ticket's printable content (the KOT slip), lays it out at
 * the roll width saved on this device, measures its real rendered height, and
 * emits the matching @page CSS — the same measure-don't-guess approach
 * invoice-view.tsx uses for the bill, pulled out into its own component since
 * the KOT page itself is a server component (data-fetches via
 * requireTenantSession) and can't read localStorage or use hooks.
 */
export function ThermalTicketFrame({
  className,
  style,
  autoPrint,
  kotData,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  /** Fires window.print() once the real content height is measured — see invoice-view.tsx's identical gating for why this can't fire before that. */
  autoPrint: boolean;
  /** Ticket content for the raw ESC/POS path; bytes are built at the moment auto-print fires so the saved roll width is honored. Falls back to window.print() when the local agent isn't reachable. */
  kotData: KotTicketData;
  children: ReactNode;
}) {
  const width = useThermalWidthPref();
  const contentRef = useRef<HTMLDivElement>(null);
  const measuredHeightMm = useThermalPageHeightMm(contentRef);

  const hasAutoPrintedRef = useRef(false);
  useEffect(() => {
    if (!autoPrint || hasAutoPrintedRef.current || measuredHeightMm == null) return;
    // Restarted whenever the width or measured height changes, so the print
    // only fires once the layout has stopped moving.
    const timer = setTimeout(() => {
      hasAutoPrintedRef.current = true;
      void printOrFallback(kotEscPosBase64(kotData));
    }, AUTOPRINT_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [autoPrint, measuredHeightMm, width, kotData]);

  const pageCss = thermalPageCss(width, measuredHeightMm ?? FALLBACK_THERMAL_HEIGHT_MM);

  return (
    <div
      ref={contentRef}
      className={`mx-auto ${className ?? ""}`}
      style={{ ...style, maxWidth: `${thermalContentWidthMm(width)}mm` }}
    >
      <style>{`@page { size: ${pageCss.size}; margin: ${pageCss.margin}; }`}</style>
      {children}
    </div>
  );
}
