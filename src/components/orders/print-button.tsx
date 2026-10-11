"use client";

import Link from "next/link";

/**
 * print:hidden controls — never rendered on the actual printed page.
 * `thermal` is owned by InvoiceView (see its own INVOICE_THERMAL_STORAGE_KEY
 * comment) so the choice survives a reload instead of resetting to A4 on
 * every visit — a counter that only ever prints to an 80mm thermal printer
 * would otherwise need to re-tick this box before every single bill.
 */
export function PrintControls({
  thermal,
  onThermalChange,
  kotHref,
}: {
  thermal: boolean;
  onThermalChange: (thermal: boolean) => void;
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
        Thermal receipt layout (80mm)
      </label>
    </div>
  );
}
