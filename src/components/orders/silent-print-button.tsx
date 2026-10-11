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
 *
 * The iframe's own box must be a real, finite size — not 0×0. Both print
 * pages measure their *real rendered* content height on screen (see
 * useThermalPageHeightMm) and feed that straight into the printed @page
 * height. A 0×0 iframe collapses its document's containing block to zero
 * width too, so every line of text was wrapping down to its narrowest
 * possible column *during that on-screen measurement* — producing a wildly
 * inflated height. Chrome's actual print pass then re-paginates the same
 * content at the real, correct roll width (a handful of normal-width
 * lines), leaving most of that over-tall page blank — exactly the "huge
 * gap under a tiny-looking receipt" bug this caused. Giving the iframe a
 * generous fixed size (wide enough for the largest supported roll, see
 * MAX_MM in print-prefs.ts) makes the on-screen measurement match what
 * actually prints. Kept off-screen via a large negative offset (not
 * opacity/0-size) so it still never becomes visible or clickable.
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
      top: "0",
      left: "-10000px",
      width: "500px",
      height: "1500px",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
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
