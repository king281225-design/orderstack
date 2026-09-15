"use client";

import { useActionState } from "react";
import { updateBillingSettingsAction, type BillingSettingsState } from "@/app/dashboard/branding/actions";

const initialState: BillingSettingsState = { error: null, success: false };

export function BillingSettingsForm({
  gstRate,
  businessAddress,
  gstin,
}: {
  gstRate: number | null;
  businessAddress: string | null;
  gstin: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateBillingSettingsAction, initialState);

  return (
    <form action={formAction} className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Billing / invoice details</h3>
      <p className="mb-3 text-xs text-gray-500">
        Shown on the printed invoice for manually-created bills (/dashboard/orders/new). GST rate
        is applied automatically when you create a new bill — never to storefront customer orders.
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
            defaultValue={gstRate ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
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
