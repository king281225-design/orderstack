"use client";

import Link from "next/link";
import { useState } from "react";
import { isThermalWidth, type ThermalWidth } from "@/lib/print-prefs";

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
  // A free-typed mm value, not a draft of `width` itself — typing "5" on the
  // way to "50" is briefly out of the valid 30-120mm range, and committing
  // every keystroke straight to the live @page size would flash the page
  // through nonsense layouts. Only a value that actually parses gets
  // propagated; losing focus with an invalid value snaps back to `width`.
  const [draft, setDraft] = useState(width);

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
          Roll width (mm) — check your printer&apos;s spec, e.g. 50/58/80
          <input
            type="number"
            list="thermal-width-presets"
            min={30}
            max={120}
            step={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (isThermalWidth(e.target.value)) onWidthChange(e.target.value);
            }}
            onBlur={() => {
              if (!isThermalWidth(draft)) setDraft(width);
            }}
            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-base"
          />
          <datalist id="thermal-width-presets">
            <option value="50" />
            <option value="58" />
            <option value="72" />
            <option value="80" />
          </datalist>
        </label>
      )}
    </div>
  );
}
