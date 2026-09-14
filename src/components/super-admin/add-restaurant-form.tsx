"use client";

import { useActionState, useRef, useEffect } from "react";
import { createRestaurantAction, type CreateRestaurantState } from "@/app/super-admin/actions";

const initialState: CreateRestaurantState = { error: null, success: false };

export function AddRestaurantForm() {
  const [state, formAction, pending] = useActionState(createRestaurantAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && state.success) formRef.current?.reset();
  }, [pending, state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white dark:bg-[#1e2939] p-4 sm:grid-cols-2"
    >
      <h3 className="col-span-full text-sm font-semibold text-gray-900">Add a restaurant</h3>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Restaurant name
        <input
          name="name"
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Storefront slug
        <input
          name="slug"
          required
          pattern="[a-z0-9\-]+"
          placeholder="e.g. spice-corner"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Owner email
        <input
          name="ownerEmail"
          type="email"
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Owner temporary password
        <input
          name="ownerPassword"
          type="text"
          required
          minLength={8}
          placeholder="Share this with the owner directly"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      {state.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="col-span-full text-sm text-green-600">Restaurant created.</p>}

      <button
        type="submit"
        disabled={pending}
        className="col-span-full w-fit rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create restaurant"}
      </button>
    </form>
  );
}
