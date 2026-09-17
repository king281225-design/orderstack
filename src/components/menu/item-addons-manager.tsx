"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import {
  createItemAddOnAction,
  deleteItemAddOnAction,
  toggleItemAddOnAvailableAction,
  type MenuActionState,
} from "@/app/dashboard/menu/actions";
import { formatINR } from "@/lib/money";

const initialState: MenuActionState = { error: null };

type AddOn = { id: string; name: string; priceCents: number; isAvailable: boolean };

/** Collapsed by default — expands into an add-on list + inline add form for one item. Add/delete only, no rename (same MVP scope as the rest of the menu editor). */
export function ItemAddOnsManager({ itemId, addOns }: { itemId: string; addOns: AddOn[] }) {
  const [open, setOpen] = useState(false);
  const boundAction = createItemAddOnAction.bind(null, itemId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-gray-500 hover:underline"
      >
        {open ? "Hide add-ons" : `Add-ons (${addOns.length})`}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-md bg-gray-50 p-2.5 dark:bg-black/20">
          {addOns.length > 0 && (
            <ul className="flex flex-col gap-1">
              {addOns.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className={a.isAvailable ? "text-gray-700" : "text-gray-400 line-through"}>
                    {a.name} · {formatINR(a.priceCents)}
                  </span>
                  <span className="flex items-center gap-2">
                    <form action={toggleItemAddOnAvailableAction.bind(null, a.id, !a.isAvailable)}>
                      <button type="submit" className="font-medium text-gray-600 hover:underline">
                        {a.isAvailable ? "Disable" : "Enable"}
                      </button>
                    </form>
                    <form action={deleteItemAddOnAction.bind(null, a.id)}>
                      <button type="submit" className="font-medium text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form ref={formRef} action={formAction} className="flex items-center gap-2">
            <input
              name="name"
              placeholder="e.g. Extra cheese"
              required
              className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none"
            />
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Price (₹)"
              required
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {pending ? "Adding…" : "Add"}
            </button>
          </form>
          {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        </div>
      )}
    </div>
  );
}
