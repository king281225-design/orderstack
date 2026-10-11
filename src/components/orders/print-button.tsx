"use client";

import Link from "next/link";
import type { ThermalWidth } from "@/lib/print-prefs";

/**
 * print:hidden controls — never rendered on the actual printed page.
 * `thermal`/`width` are owned by InvoiceView (see its own
 * INVOICE_THERMAL_STORAGE_KEY comment) so the choice survives a reload
 * instead of resetting to A4/80mm on every visit — a counter that only ever
 * prints to one particular thermal printer would otherwise need to re-pick
 * both before every single bill.
 */
export function PrintControls({
  thermal,
  onThermalChange,
  width,
  onWidthChange,
  kotHref,
}: {
  thermal: boolean;
  onThermalChange: (thermal: boolean) => void;
  width: ThermalWidth;
  onWidthChange: (width: ThermalWidth) => void;
  kotHref?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Print / Save as PDF
      </button>
      {kotHref && (
        <Link
          href={kotHref}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Print KOT
        </Link>
      )}
      <label className="flex items-center gap-1.5 text-sm text-gray-600">
        <input type="checkbox" checked={thermal} onChange={(e) => onThermalChange(e.target.checked)} />
        Thermal receipt layout
      </label>
      {thermal && (
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Roll width
          <select
            value={width}
            onChange={(e) => onWidthChange(e.target.value as ThermalWidth)}
            className="rounded-md border border-gray-300 px-1.5 py-1 text-sm"
          >
            <option value="80">80mm</option>
            <option value="58">58mm</option>
          </select>
        </label>
      )}
    </div>
  );
}
