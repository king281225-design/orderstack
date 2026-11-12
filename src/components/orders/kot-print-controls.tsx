"use client";

import Link from "next/link";
import { printOrFallback } from "@/lib/local-print-agent";

/** print:hidden controls — never rendered on the printed ticket itself. */
export function KotPrintControls({
  billHref,
  width,
  escPosBase64,
}: {
  billHref: string;
  /** The actual configured roll width (see print-prefs.ts) — this used to be hardcoded "80mm" regardless of what was actually set. */
  width: string;
  /** Pre-built raw ESC/POS bytes (base64) for the optional local print agent — see local-print-agent.ts. */
  escPosBase64?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={() => void printOrFallback(escPosBase64)}
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
    </div>
  );
}
