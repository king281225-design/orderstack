"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, CSSProperties } from "react";
import { thermalPageCss, type ThermalWidth } from "@/lib/print-prefs";
import { useThermalPageHeightMm } from "@/lib/print-prefs-client";

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
  children,
}: {
  width: ThermalWidth;
  className?: string;
  style?: CSSProperties;
  /** Fires window.print() once the real content height is measured — see invoice-view.tsx's identical gating for why this can't fire before that. */
  autoPrint: boolean;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const measuredHeightMm = useThermalPageHeightMm(contentRef);

  const hasAutoPrintedRef = useRef(false);
  useEffect(() => {
    if (!autoPrint || hasAutoPrintedRef.current || measuredHeightMm == null) return;
    hasAutoPrintedRef.current = true;
    window.print();
  }, [autoPrint, measuredHeightMm]);

  const pageCss = thermalPageCss(width, measuredHeightMm ?? FALLBACK_THERMAL_HEIGHT_MM);

  return (
    <div ref={contentRef} className={className} style={style}>
      <style>{`@page { size: ${pageCss.size}; margin: ${pageCss.margin}; }`}</style>
      {children}
    </div>
  );
}
