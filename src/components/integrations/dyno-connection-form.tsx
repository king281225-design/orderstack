"use client";

import { useActionState } from "react";
import { saveDynoConnectionAction, type DynoConnectionState } from "@/app/dashboard/integrations/actions";
import type { DeliveryPlatform } from "@prisma/client";

const initialState: DynoConnectionState = { error: null, success: false };

export function DynoConnectionForm({ platform }: { platform: DeliveryPlatform }) {
  const [state, formAction, pending] = useActionState(saveDynoConnectionAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="platform" value={platform} />
      <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">Restaurant id on {platform === "ZOMATO" ? "Zomato" : "Swiggy"}</span>
        <input
          name="externalId"
          type="text"
          required
          placeholder="e.g. 12345"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Connecting…" : "Connect"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-green-600">Connected.</p>}
    </form>
  );
}
