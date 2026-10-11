"use client";

import type { ReactNode } from "react";

/**
 * Prints a dashboard print URL (an invoice or KOT ticket, built with
 * ?autoprint=1) without opening a visible tab or window — loads it into a
 * hidden iframe instead of navigating there. The print page's own effect
 * (window.print() when autoprint=1 — see invoice-view.tsx / the KOT page)
 * then runs inside the iframe's own window, and window.print() called from
 * inside an iframe prints exactly that iframe's content, the same as it
 * would in a popped-up tab — just with nothing visible flashing open first.
 */
export function SilentPrintButton({
  buildHref,
  ariaLabel,
  title,
  className,
  children,
}: {
  /** Computed at click time (not a static href) so it can read a just-set localStorage preference, e.g. the thermal paper width. */
  buildHref: () => string;
  ariaLabel: string;
  title: string;
  className: string;
  children: ReactNode;
}) {
  function handleClick() {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
      opacity: "0",
    });

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      iframe.remove();
    };

    iframe.addEventListener("load", () => {
      try {
        iframe.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
      } catch {
        // Cross-origin or already torn down — the timeout fallback below still cleans up.
      }
    });

    // Fallback: the print page's own effect fires window.print() on mount,
    // but if that never happens (e.g. a popup/print blocker), this still
    // gets the hidden iframe out of the DOM instead of leaking it forever.
    setTimeout(cleanup, 20000);

    iframe.src = buildHref();
    document.body.appendChild(iframe);
  }

  return (
    <button type="button" onClick={handleClick} aria-label={ariaLabel} title={title} className={className}>
      {children}
    </button>
  );
}
