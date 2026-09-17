"use client";

import { useActionState, useState } from "react";
import { updateBillingSettingsAction, type BillingSettingsState } from "@/app/dashboard/branding/actions";
import { INDIA_STATES } from "@/lib/india-states";

const initialState: BillingSettingsState = { error: null, success: false };

// 5% is India's standard GST rate for most restaurants (non-AC, no input
// tax credit) — the common case by far. Purely a starting suggestion the
// owner can change before saving, never forced.
const DEFAULT_RESTAURANT_GST_RATE = "5";

export function BillingSettingsForm({
  gstRate,
  businessAddress,
  gstin,
  businessState,
}: {
  gstRate: number | null;
  businessAddress: string | null;
  gstin: string | null;
  businessState: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateBillingSettingsAction, initialState);
  // Setting a state only makes the CGST/SGST split possible — it still needs
  // a rate to actually apply. Picking a state with the rate field still
  // empty fills in the standard default so "set my state" alone is enough
  // to get a working split, rather than silently doing nothing until the
  // owner separately discovers the rate field too.
  const [gstRateValue, setGstRateValue] = useState(gstRate != null ? String(gstRate) : "");

  return (
    <form action={formAction} className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Billing / invoice details</h3>
      <p className="mb-3 text-xs text-gray-500">
        Shown on the printed invoice for manually-created bills (/dashboard/orders/new). GST rate
        is applied automatically when you create a new bill — never to storefront customer orders.
        Once you set your state below, the invoice automatically splits that tax into CGST + SGST
        instead of one combined line — the standard, compliant way to show GST on an Indian
        invoice for a dine-in/walk-in customer (who&apos;s always in the same state as the restaurant).
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          GST / tax rate (%, optional)
          <input
            name="gstRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={gstRateValue}
            onChange={(e) => setGstRateValue(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
          <span className="font-normal text-gray-400">5% is standard for most restaurants — adjust if yours differs.</span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Business state (for CGST/SGST split on invoices)
          <select
            name="businessState"
            defaultValue={businessState ?? ""}
            onChange={(e) => {
              if (e.target.value && !gstRateValue) setGstRateValue(DEFAULT_RESTAURANT_GST_RATE);
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          >
            <option value="">Not set (invoice shows a single GST line)</option>
            {INDIA_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          GSTIN (optional)
          <input
            name="gstin"
            defaultValue={gstin ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <label className="col-span-full flex flex-col gap-1 text-xs font-medium text-gray-600">
          Business address (optional, shown on invoices)
          <textarea
            name="businessAddress"
            rows={2}
            defaultValue={businessAddress ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
      </div>

      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-2 text-sm text-green-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
