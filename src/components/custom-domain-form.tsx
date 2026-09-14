"use client";

import { useActionState } from "react";
import { setCustomDomainAction, type CustomDomainState } from "@/app/dashboard/branding/actions";

const initialState: CustomDomainState = { error: null, success: false };

export function CustomDomainForm({ customDomain }: { customDomain: string | null }) {
  const [state, formAction, pending] = useActionState(setCustomDomainAction, initialState);

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#1e2939] p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Custom domain (optional)</h3>
      <p className="mb-3 text-xs text-gray-500">
        Point your own domain at your storefront instead of the platform link. Add a CNAME record
        for your domain to wherever this app is deployed, then enter it here. This only takes
        effect once the app is deployed to a public server and your DNS has propagated — it does
        nothing on a local/dev setup.
      </p>
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input
          name="customDomain"
          type="text"
          defaultValue={customDomain ?? ""}
          placeholder="orders.yourrestaurant.com"
          className="min-w-[16rem] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-2 text-sm text-green-600">Saved.</p>}
    </div>
  );
}
