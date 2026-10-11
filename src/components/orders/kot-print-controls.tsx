"use client";

import Link from "next/link";

/** print:hidden controls — never rendered on the printed ticket itself. */
export function KotPrintControls({
  billHref,
  pricesHref,
  showPrices,
  width,
}: {
  billHref: string;
  pricesHref: string;
  showPrices: boolean;
  /** The actual configured roll width (see print-prefs.ts) — this used to be hardcoded "80mm" regardless of what was actually set. */
  width: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Print KOT ({width}mm)
      </button>
      <Link
        href={billHref}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        Go to bill
      </Link>
      <Link
        href={pricesHref}
        replace
        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        {showPrices ? "Hide prices" : "Show prices"}
      </Link>
    </div>
  );
}
