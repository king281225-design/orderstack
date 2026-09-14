"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import {
  deleteItemAction,
  toggleItemAvailableAction,
  updateItemAction,
  type MenuActionState,
} from "@/app/dashboard/menu/actions";
import { formatINR } from "@/lib/money";

const initialState: MenuActionState = { error: null };

type Item = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: string;
};

export function ItemRow({
  item,
  categories,
}: {
  item: Item;
  categories: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const boundAction = updateItemAction.bind(null, item.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  // Close the edit form automatically once a save actually succeeds. Not
  // done via useEffect (react-hooks/set-state-in-effect forbids a
  // synchronous setState there — see CLAUDE.md's QR-table-ordering note for
  // the same pattern hit before) — instead, compare against the previously
  // seen state during render itself, React's own documented alternative.
  const [lastSeenState, setLastSeenState] = useState(state);
  if (state !== lastSeenState) {
    setLastSeenState(state);
    if (!state.error) setEditing(false);
  }

  if (editing) {
    return (
      <li className="border-b border-gray-100 py-3 last:border-0">
        <form action={formAction} className="grid grid-cols-1 gap-3 rounded-md bg-gray-50 p-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Category
            <select
              name="categoryId"
              defaultValue={item.categoryId}
              required
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Name
            <input
              name="name"
              defaultValue={item.name}
              required
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Price (₹)
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={(item.priceCents / 100).toString()}
              required
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Photo (leave blank to keep current)
            <input
              name="photo"
              type="file"
              accept="image/*"
              className="rounded-md border border-gray-300 px-3 py-1 text-sm file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs"
            />
          </label>

          <label className="col-span-full flex flex-col gap-1 text-xs font-medium text-gray-600">
            Description (optional)
            <textarea
              name="description"
              rows={2}
              defaultValue={item.description ?? ""}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>

          {state.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}

          <div className="col-span-full flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-3">
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.name}
          width={48}
          height={48}
          className="h-12 w-12 rounded-md object-cover"
          unoptimized
        />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-md bg-gray-100" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
        {item.description && <p className="truncate text-xs text-gray-500">{item.description}</p>}
      </div>
      <span className="text-sm font-medium text-gray-700">{formatINR(item.priceCents)}</span>
      <form action={toggleItemAvailableAction.bind(null, item.id, !item.isAvailable)}>
        <button
          type="submit"
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
          }`}
        >
          {item.isAvailable ? "Available" : "Unavailable"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs font-medium text-gray-700 hover:underline"
      >
        Edit
      </button>
      <form action={deleteItemAction.bind(null, item.id)}>
        <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
          Delete
        </button>
      </form>
    </li>
  );
}
