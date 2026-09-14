"use client";

import { useActionState, useRef, useEffect } from "react";
import { createStaffAction, type StaffActionState } from "@/app/dashboard/staff/actions";

const initialState: StaffActionState = { error: null };

export function AddStaffForm() {
  const [state, formAction, pending] = useActionState(createStaffAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white dark:bg-[#1e2939] p-4 sm:grid-cols-2"
    >
      <h3 className="col-span-full text-sm font-semibold text-gray-900">Add a staff login</h3>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Email
        <input
          name="email"
          type="email"
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Temporary password
        <input
          name="password"
          type="text"
          required
          minLength={8}
          placeholder="Share this with them directly"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      {state.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="col-span-full w-fit rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add staff login"}
      </button>
    </form>
  );
}
