"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatINR } from "@/lib/money";
import { PrintControls } from "@/components/orders/print-button";
import { thermalContentWidthMm, thermalPageCss, type ThermalWidth } from "@/lib/print-prefs";
import { setPersistedThermalWidth, useThermalPageHeightMm, useThermalWidthPref } from "@/lib/print-prefs-client";

/** Only a placeholder for the brief on-screen moment before the real content height is measured — see useThermalPageHeightMm. Auto-print waits for the real measurement and never prints against this. */
const FALLBACK_THERMAL_HEIGHT_MM = 1000;

type InvoiceLine = { id: string; nameSnapshot: string; priceCentsSnapshot: number; quantity: number };

/** Remembers the thermal/A4 choice across visits — see the `thermal` state comment below. */
const INVOICE_THERMAL_STORAGE_KEY = "bhojsetu-invoice-thermal";

/**
 * useSyncExternalStore, not a plain useEffect+setState — localStorage can't
 * be read during SSR, and this project's own react-hooks/set-state-in-effect
 * rule (see the delivery-radius feature's own note on this) forbids calling
 * setState synchronously inside an effect just to "correct" a default after
 * mount, which is also exactly the pattern that causes a visible flash and a
 * hydration mismatch warning. This hook is React's own answer to reading an
 * external store like localStorage: getServerSnapshot tells it what to
 * render on the server/during hydration (false, i.e. A4 — nothing to read
 * yet), and it re-syncs safely once the real client value is available.
 */
function subscribeThermalPref(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}
function getThermalPrefSnapshot() {
  try {
    return localStorage.getItem(INVOICE_THERMAL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}
function getThermalPrefServerSnapshot() {
  return false;
}

export function InvoiceView({
  tenantName,
  businessAddress,
  businessState,
  gstin,
  invoiceNumber,
  createdAt,
  customerName,
  customerPhone,
  customerEmail,
  lines,
  subtotalCents,
  discountCents,
  couponCode,
  taxCents,
  gstRatePercent,
  totalCents,
  paymentMethod,
  paymentStatus,
  paymentSource,
  upiQr,
  kotHref,
  forceThermal,
  autoPrint,
  forceWidth,
}: {
  tenantName: string;
  businessAddress: string | null;
  /** When set, the tax line below splits into CGST+SGST instead of one combined line — see the Tenant.businessState schema comment. */
  businessState: string | null;
  gstin: string | null;
  invoiceNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  lines: InvoiceLine[];
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
  taxCents: number;
  /** Snapshotted at order time — see Order.gstRatePercent. Null on orders placed before this existed, or with no tax. */
  gstRatePercent: number | null;
  totalCents: number;
  paymentMethod: string;
  paymentStatus: string;
  /** Channel the merchant recorded when confirming payment (e.g. "Google Pay"); null if none. */
  paymentSource?: string | null;
  /** Scan-to-pay QR for a still-unpaid UPI bill. Paying through it does NOT mark the bill paid — the merchant confirms receipt. */
  upiQr?: { dataUrl: string; upiId: string; uri: string } | null;
  /** When set, the controls bar shows a "Print KOT" link to the order's kitchen ticket. */
  kotHref?: string;
  /** From a one-click "print thermal" link (?thermal=1) — switches straight to the 80mm layout, overriding the persisted preference for this visit. */
  forceThermal?: boolean;
  /** From a one-click print link (?autoprint=1) — fires window.print() itself once the requested layout has actually rendered, no manual Print click needed. */
  autoPrint?: boolean;
  /** From a one-click print link's ?width=58|80 — overrides the persisted roll-width preference for this visit, same relationship forceThermal has to the thermal preference. */
  forceWidth?: ThermalWidth;
}) {
  // A dine-in/walk-in customer is always in the same state as the
  // restaurant, so once a state is on file this is always an intra-state
  // supply — CGST + SGST, each half the total rate, never IGST. Falls back
  // to the old single combined line when either piece of data is missing
  // (older orders placed before gstRatePercent existed, or a tenant that
  // hasn't set a state yet) so nothing changes for them.
  const showGstSplit = taxCents > 0 && businessState && gstRatePercent != null;
  const halfRate = showGstSplit ? gstRatePercent! / 2 : 0;
  const sgstCents = showGstSplit ? Math.floor(taxCents / 2) : 0;
  const cgstCents = showGstSplit ? taxCents - sgstCents : 0;

  const persistedThermal = useSyncExternalStore(
    subscribeThermalPref,
    getThermalPrefSnapshot,
    getThermalPrefServerSnapshot,
  );
  // null = "no manual choice yet this visit" — follow forceThermal/the
  // persisted preference. Set once the owner actually clicks the checkbox,
  // which then wins outright for the rest of this visit.
  const [override, setOverride] = useState<boolean | null>(null);
  const thermal = override ?? ((forceThermal ?? false) || persistedThermal);

  function setThermal(next: boolean) {
    setOverride(next);
    try {
      localStorage.setItem(INVOICE_THERMAL_STORAGE_KEY, String(next));
    } catch {
      // Private-browsing/blocked storage — the choice just won't be
      // remembered next visit, nothing else depends on it.
    }
  }

  // Same override-wins-over-persisted-preference shape as thermal above.
  const persistedWidth = useThermalWidthPref();
  const [widthOverride, setWidthOverride] = useState<ThermalWidth | null>(null);
  const width = widthOverride ?? forceWidth ?? persistedWidth;

  function setWidth(next: ThermalWidth) {
    setWidthOverride(next);
    setPersistedThermalWidth(next);
  }

  useEffect(() => {
    // A one-click thermal print link is also the clearest possible signal
    // of the owner's actual printer — remember it exactly like an explicit
    // checkbox click would, so a later plain /print visit (opened from
    // somewhere that doesn't know to force it) already defaults right. No
    // setState here, just an external-system write, which is what this
    // project's own react-hooks/set-state-in-effect rule allows effects to
    // do — only a setState call directly inside an effect is disallowed.
    if (forceThermal) {
      try {
        localStorage.setItem(INVOICE_THERMAL_STORAGE_KEY, "true");
      } catch {
        // Private-browsing/blocked storage — nothing else depends on this.
      }
    }
    if (forceWidth) setPersistedThermalWidth(forceWidth);
  }, [forceThermal, forceWidth]);

  const contentRef = useRef<HTMLDivElement>(null);
  const measuredHeightMm = useThermalPageHeightMm(contentRef);

  const hasAutoPrintedRef = useRef(false);
  useEffect(() => {
    if (!autoPrint || hasAutoPrintedRef.current) return;
    // A4 doesn't depend on measuring anything — print immediately, same as
    // before. Thermal mode has to wait for measuredHeightMm to actually
    // resolve (not the FALLBACK_THERMAL_HEIGHT_MM placeholder) — printing
    // one tick too early would fire window.print() against the same
    // "huge blank page" bug this measurement exists to fix. In practice
    // this resolves within a frame or two of mount; see
    // useThermalPageHeightMm's own comment on why this can't be a plain
    // setState-in-effect instead.
    if (thermal && measuredHeightMm == null) return;
    hasAutoPrintedRef.current = true;
    window.print();
  }, [autoPrint, thermal, measuredHeightMm]);

  const pageCss = thermal
    ? thermalPageCss(width, measuredHeightMm ?? FALLBACK_THERMAL_HEIGHT_MM)
    : { size: "A4", margin: "12mm" };

  return (
    <div
      className={thermal ? "invoice-thermal mx-auto" : "mx-auto max-w-2xl"}
      style={thermal ? { maxWidth: `${thermalContentWidthMm(width)}mm` } : undefined}
    >
      {/* The actual print/PDF page size — not just the on-screen width above —
          has to change with the toggle too, or a real thermal printer (e.g.
          an 80mm TVS RP 3160 Gold, or a 58mm one — see print-prefs.ts; a
          width mismatch here is exactly what reads as a receipt getting its
          margin "cut off") still gets handed an A4-shaped page. @page rules
          apply document-wide regardless of where the <style> tag sits, so
          toggling this one is enough; see globals.css's own comment for why
          this moved out of a static rule there. */}
      <style>{`@page { size: ${pageCss.size}; margin: ${pageCss.margin}; }`}</style>
      <PrintControls thermal={thermal} onThermalChange={setThermal} width={width} onWidthChange={setWidth} kotHref={kotHref} />

      <div
        ref={contentRef}
        className="rounded-lg border border-gray-200 bg-white p-6 text-gray-900 print:rounded-none print:border-0 print:p-0"
      >
        <header className="mb-4 flex flex-col gap-1 border-b border-gray-200 pb-4">
          <h1 className="text-xl font-bold">{tenantName}</h1>
          {businessAddress && <p className="text-xs text-gray-600 whitespace-pre-line">{businessAddress}</p>}
          {gstin && <p className="text-xs text-gray-600">GSTIN: {gstin}</p>}
          {businessState && <p className="text-xs text-gray-600">Place of supply: {businessState}</p>}
        </header>

        <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm">
          <div>
            <p className="font-semibold">Invoice {invoiceNumber}</p>
            <p className="text-xs text-gray-500">{createdAt}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Bill to</p>
            <p>{customerName}</p>
            {customerPhone && <p className="text-xs text-gray-500">{customerPhone}</p>}
            {customerEmail && <p className="text-xs text-gray-500">{customerEmail}</p>}
          </div>
        </div>

        {thermal ? (
          // A 74mm-wide receipt has no room for 4 side-by-side columns
          // (Item/Qty/Rate/Amount) without their text overlapping — the same
          // two-line-per-item layout real thermal receipts use instead: item
          // name + line total on one line, "qty × rate" on a smaller line
          // below, so nothing has to squeeze into a narrow fixed column.
          <div className="mb-4 flex flex-col text-sm">
            {lines.map((l) => (
              <div key={l.id} className="border-b border-gray-100 py-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  {/* min-w-0 is load-bearing here — see the identical
                      comment on the KOT ticket's item row. Without it, a
                      long item name doesn't wrap against the price column,
                      it overflows the receipt's edge instead. */}
                  <span className="min-w-0 break-words">{l.nameSnapshot}</span>
                  <span className="shrink-0">{formatINR(l.priceCentsSnapshot * l.quantity)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {l.quantity} × {formatINR(l.priceCentsSnapshot)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <table className="mb-4 w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="w-1/2 py-1.5">Item</th>
                <th className="w-[15%] py-1.5 text-right">Qty</th>
                <th className="w-[17.5%] py-1.5 text-right">Rate</th>
                <th className="w-[17.5%] py-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-gray-100">
                  <td className="py-1.5">{l.nameSnapshot}</td>
                  <td className="py-1.5 text-right">{l.quantity}</td>
                  <td className="py-1.5 text-right">{formatINR(l.priceCentsSnapshot)}</td>
                  <td className="py-1.5 text-right">{formatINR(l.priceCentsSnapshot * l.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
          <Row label="Subtotal" value={formatINR(subtotalCents)} />
          {discountCents > 0 && (
            <Row label={`Discount${couponCode ? ` (${couponCode})` : ""}`} value={`− ${formatINR(discountCents)}`} />
          )}
          {taxCents > 0 && !showGstSplit && <Row label="Tax / GST" value={`+ ${formatINR(taxCents)}`} />}
          {showGstSplit && (
            <>
              <Row label={`CGST @ ${halfRate}%`} value={`+ ${formatINR(cgstCents)}`} />
              <Row label={`SGST @ ${halfRate}%`} value={`+ ${formatINR(sgstCents)}`} />
            </>
          )}
          <Row label="Grand total" value={formatINR(totalCents)} bold />
          <Row label="Payment method" value={paymentMethod} />
          {paymentSource && <Row label="Paid via" value={paymentSource} />}
          <Row label="Payment status" value={paymentStatus} />
        </div>

        {upiQr && (
          <div className="mt-4 flex flex-col items-center gap-1 border-t border-dashed border-gray-300 pt-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={upiQr.dataUrl} data-upi-uri={upiQr.uri} alt="Scan to pay with any UPI app" width={140} height={140} />
            <p className="text-xs text-gray-600">Scan to pay with any UPI app · {upiQr.upiId}</p>
          </div>
        )}

        <p className="mt-6 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          Thank you for visiting {tenantName}.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t border-gray-300 pt-1 text-base font-semibold" : "text-gray-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
