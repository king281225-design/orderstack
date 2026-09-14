"use client";

import { useActionState, useState } from "react";
import {
  deleteCategoryAction,
  renameCategoryAction,
  type MenuActionState,
} from "@/app/dashboard/menu/actions";

const initialState: MenuActionState = { error: null };

export function CategoryHeader({
  categoryId,
  name,
}: {
  categoryId: string;
  name: string;
}) {
  const [editing, setEditing] = useState(false);
  const boundAction = renameCategoryAction.bind(null, categoryId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  // Same render-time-comparison pattern as ItemRow (see its comment) —
  // closes the form once a save actually succeeds, without a
  // react-hooks/set-state-in-effect violation.
  const [lastSeenState, setLastSeenState] = useState(state);
  if (state !== lastSeenState) {
    setLastSeenState(state);
    if (!state.error) setEditing(false);
  }

  if (editing) {
    return (
      <form action={formAction} className="mb-3 flex items-center gap-2">
        <input
          name="name"
          defaultValue={name}
          autoFocus
          required
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>
    );
  }

  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-gray-900">{name}</h3>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-gray-700 hover:underline"
        >
          Rename
        </button>
      </div>
      <form action={deleteCategoryAction.bind(null, categoryId)}>
        <button
          type="submit"
          className="text-xs font-medium text-red-600 hover:underline"
          title="Deletes the category and all its items"
        >
          Delete category
        </button>
      </form>
    </div>
  );
}
