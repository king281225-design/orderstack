"use client";

import { useActionState } from "react";
import { updateNotificationsAction, type NotificationsSettingsState } from "@/app/dashboard/branding/actions";

const initialState: NotificationsSettingsState = { error: null, success: false };

export function NotificationsForm({
  ownerWhatsapp,
  loyaltyRupeesPerPoint,
}: {
  ownerWhatsapp: string | null;
  loyaltyRupeesPerPoint: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateNotificationsAction, initialState);

  return (
    <form action={formAction} className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Notifications &amp; loyalty</h3>
      <p className="mb-3 text-xs text-gray-500">
        Set your own WhatsApp number to get a one-click notify link whenever a bill is edited (see Edit history), plus
        how many rupees a customer needs to spend to earn one loyalty point.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          WhatsApp number for alerts (optional)
          <input
            name="ownerWhatsapp"
            inputMode="tel"
            placeholder="919876543210"
            defaultValue={ownerWhatsapp ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
          <span className="font-normal text-gray-400">With country code, digits only — e.g. 91 for India.</span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          ₹ per loyalty point
          <input
            name="loyaltyRupeesPerPoint"
            type="number"
            min="1"
            step="1"
            placeholder="10"
            defaultValue={loyaltyRupeesPerPoint ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
          <span className="font-normal text-gray-400">Default is ₹10 = 1 point if left blank.</span>
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
