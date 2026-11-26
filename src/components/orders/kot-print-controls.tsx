"use client";

import Link from "next/link";
import { printOrFallback } from "@/lib/local-print-agent";
import { kotEscPosBase64 } from "@/lib/escpos-client";
import type { KotTicketData } from "@/lib/escpos";
import { useThermalWidthPref } from "@/lib/print-prefs-client";

/** print:hidden controls — never rendered on the printed ticket itself. */
export function KotPrintControls({
  billHref,
  kotData,
}: {
  billHref: string;
  /** Ticket content for the raw ESC/POS path (see escpos-client.ts); bytes are built at click time so the saved roll width is honored. */
  kotData: KotTicketData;
}) {
  const width = useThermalWidthPref();
  return (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-2 print:hidden">
      <button
        type="button"
        onClick={() => void printOrFallback(kotEscPosBase64(kotData))}
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
