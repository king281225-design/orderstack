"use client";

import { useState } from "react";

/** print:hidden controls — never rendered on the actual printed page. */
export function PrintControls({ onThermalChange }: { onThermalChange: (thermal: boolean) => void }) {
  const [thermal, setThermal] = useState(false);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Print / Save as PDF
      </button>
      <label className="flex items-center gap-1.5 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={thermal}
          onChange={(e) => {
            setThermal(e.target.checked);
            onThermalChange(e.target.checked);
          }}
        />
        Thermal receipt layout (80mm)
      </label>
    </div>
  );
}
