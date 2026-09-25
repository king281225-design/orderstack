"use client";

import { useActionState } from "react";
import { createStationAction, type InventoryActionState } from "@/app/dashboard/inventory/actions";

const initial: InventoryActionState = { error: null };

const inputCls =
  "rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent";
const btnCls =
  "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50";

export function AddStationForm() {
  const [state, action, pending] = useActionState(createStationAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" key={state.ok ? "reset" : "form"}>
      <input name="name" required placeholder="e.g. Grill, Tandoor, Bar" className={`${inputCls} w-56`} />
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Adding…" : "Add station"}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.ok && <p className="text-xs text-green-600">Saved.</p>}
    </form>
  );
}
