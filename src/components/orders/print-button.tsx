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
  // through nonsense layouts (it also made it genuinely unclear whether a
  // typed value had actually been saved — an owner typing "72" could tab
  // away a keystroke early, silently keep the old value, and never know).
  // Now nothing commits until Save is clicked, which also gives a plain
  // "Saved" confirmation instead of a value changing invisibly.
  const [draft, setDraft] = useState(width);
  const [justSaved, setJustSaved] = useState(false);
  const canSave = isThermalWidth(draft) && draft !== width;

  function handleSave() {
    if (!isThermalWidth(draft)) {
      setDraft(width);
      return;
    }
    onWidthChange(draft);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

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
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-600">
          <label className="flex items-center gap-1.5">
            Roll width (mm) — check your printer&apos;s spec, e.g. 50/58/72/80
            <input
              type="number"
              list="thermal-width-presets"
              min={30}
              max={120}
              step={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
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
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md border border-gray-300 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Save
          </button>
          <span className="text-green-700" aria-live="polite">
            {justSaved ? `Saved — now using ${width}mm` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
