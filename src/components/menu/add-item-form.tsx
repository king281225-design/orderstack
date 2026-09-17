"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { createItemAction, type MenuActionState } from "@/app/dashboard/menu/actions";
import { ALLOWED_TAGS } from "@/lib/menu-wizard/constants";
import { VariantRowsEditor, type VariantRow } from "@/components/menu/variant-rows-editor";

const initialState: MenuActionState = { error: null };

export function AddItemForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createItemAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);

  // formRef.reset() is imperative DOM work, fine inside an effect — but
  // setVariantRows is real React state, and calling it synchronously inside
  // an effect trips react-hooks/set-state-in-effect (same rule this
  // codebase has hit before — see item-row.tsx's own comment on the
  // pattern). Split: DOM reset stays in the effect, state reset moves to
  // the render-time "last seen state" comparison below.
  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  const [lastSeenState, setLastSeenState] = useState(state);
  if (state !== lastSeenState) {
    setLastSeenState(state);
    if (!state.error) setVariantRows([]);
  }

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
      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4 sm:grid-cols-2"
    >
      <h3 className="col-span-full text-sm font-semibold text-gray-900">Add a menu item</h3>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Category
        <select
          name="categoryId"
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
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
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
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      <VariantRowsEditor rows={variantRows} onChange={setVariantRows} />
      <input type="hidden" name="variantsJson" value={JSON.stringify(variantRows)} />

      <div className="col-span-full flex flex-col gap-1.5 text-xs font-medium text-gray-600">
        <span>Tags (optional)</span>
        <div className="flex flex-wrap gap-3">
          {ALLOWED_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-1.5 font-normal text-gray-700">
              <input type="checkbox" name="tags" value={tag} />
              {tag}
            </label>
          ))}
        </div>
      </div>

      {state.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="col-span-full w-fit rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add item"}
      </button>
    </form>
  );
}
