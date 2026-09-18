"use client";

/** print:hidden controls — never rendered on the printed ticket itself. */
export function KotPrintControls() {
  return (
    <div className="mb-4 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Print KOT (80mm)
      </button>
    </div>
  );
}
