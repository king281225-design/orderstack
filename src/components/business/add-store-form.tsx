"use client";

import { useActionState, useState } from "react";
import { addStoreAction, type AddStoreState } from "@/app/dashboard/business/actions";

const initial: AddStoreState = { error: null, success: false };

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export function AddStoreForm() {
  const [state, action, pending] = useActionState(addStoreAction, initial);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" data-testid="add-store-form">
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Store name
        <input
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="e.g. Noida Branch"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Storefront link (/r/…)
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <button disabled={pending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Adding…" : "Add store"}
      </button>
      {state.error && <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700 sm:col-span-3">Store added. Switch to it from the store switcher to set up its menu.</p>}
    </form>
  );
}
