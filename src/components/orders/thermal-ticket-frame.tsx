"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, CSSProperties } from "react";
import { thermalPageCss, type ThermalWidth } from "@/lib/print-prefs";
import { useThermalPageHeightMm } from "@/lib/print-prefs-client";
import { printOrFallback } from "@/lib/local-print-agent";
import { kotEscPosBase64 } from "@/lib/escpos-client";
import type { KotTicketData } from "@/lib/escpos";

/** Only a placeholder for the brief on-screen moment before the real content height is measured — see useThermalPageHeightMm. Auto-print waits for the real measurement and never prints against this. */
const FALLBACK_THERMAL_HEIGHT_MM = 1000;

/**
 * Wraps a thermal ticket's printable content (the KOT slip), measures its
 * real rendered height, and emits the matching @page CSS — the same
 * measure-don't-guess approach invoice-view.tsx uses for the bill, pulled
 * out into its own component since the KOT page itself is a server
 * component (data-fetches via requireTenantSession) and can't use hooks
 * directly.
 */
export function ThermalTicketFrame({
  width,
  className,
  style,
  autoPrint,
  forceWidth,
  kotData,
  children,
}: {
  width: ThermalWidth;
  className?: string;
  style?: CSSProperties;
  /** Fires window.print() once the real content height is measured — see invoice-view.tsx's identical gating for why this can't fire before that. */
  autoPrint: boolean;
  /** From the URL's ?width= — wins over the roll width saved on this device (see escpos-client.ts). */
  forceWidth?: ThermalWidth;
  /** Ticket content for the raw ESC/POS path; bytes are built at the moment auto-print fires so the saved roll width is honored. Falls back to window.print() when the local agent isn't reachable. */
  kotData: KotTicketData;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const measuredHeightMm = useThermalPageHeightMm(contentRef);

  const hasAutoPrintedRef = useRef(false);
  useEffect(() => {
    if (!autoPrint || hasAutoPrintedRef.current || measuredHeightMm == null) return;
    hasAutoPrintedRef.current = true;
    void printOrFallback(kotEscPosBase64(kotData, forceWidth));
  }, [autoPrint, measuredHeightMm, kotData, forceWidth]);

  const pageCss = thermalPageCss(width, measuredHeightMm ?? FALLBACK_THERMAL_HEIGHT_MM);

  return (
    <div ref={contentRef} className={className} style={style}>
      <style>{`@page { size: ${pageCss.size}; margin: ${pageCss.margin}; }`}</style>
      {children}
    </div>
  );
}
