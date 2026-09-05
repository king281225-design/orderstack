"use client";

import { useActionState, useRef, useEffect } from "react";
import { createItemAction, type MenuActionState } from "@/app/dashboard/menu/actions";

const initialState: MenuActionState = { error: null };

export function AddItemForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createItemAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  if (categories.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500">
        Add a category first, then you can add items to it.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
    >
      <h3 className="col-span-full text-sm font-semibold text-gray-900">Add a menu item</h3>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Category
        <select
          name="categoryId"
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
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
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Price (₹)
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Photo (optional)
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
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      {state.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="col-span-full w-fit rounded-md bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add item"}
      </button>
    </form>
  );
}
