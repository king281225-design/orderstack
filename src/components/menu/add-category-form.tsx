"use client";

import { useActionState, useRef, useEffect } from "react";
import { createCategoryAction, type MenuActionState } from "@/app/dashboard/menu/actions";

const initialState: MenuActionState = { error: null };

export function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(createCategoryAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="category-name" className="text-xs font-medium text-gray-600">
          New category
        </label>
        <input
          id="category-name"
          name="name"
          placeholder="e.g. Starters"
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        Add
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
