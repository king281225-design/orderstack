"use client";

import { useActionState } from "react";
import { updateBrandingAction, type BrandingState } from "@/app/dashboard/branding/actions";
import type { Tenant } from "@prisma/client";

const initialState: BrandingState = { error: null, success: false };

export function BrandingForm({ tenant }: { tenant: Tenant }) {
  const [state, formAction, pending] = useActionState(updateBrandingAction, initialState);

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="flex max-w-lg flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4"
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Restaurant name
        <input
          name="name"
          defaultValue={tenant.name}
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Tagline
        <input
          name="tagline"
          defaultValue={tenant.tagline ?? ""}
          placeholder="e.g. Home-style food, made fresh daily"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Logo
        {tenant.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.logoUrl} alt="Current logo" className="h-16 w-16 rounded object-cover" />
        )}
        <input name="logo" type="file" accept="image/*" className="text-sm" />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Primary color
          <input
            name="colorPrimary"
            type="color"
            defaultValue={tenant.colorPrimary}
            className="h-9 w-full rounded-md border border-gray-300"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Secondary color
          <input
            name="colorSecondary"
            type="color"
            defaultValue={tenant.colorSecondary}
            className="h-9 w-full rounded-md border border-gray-300"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Accent color
          <input
            name="colorAccent"
            type="color"
            defaultValue={tenant.colorAccent}
            className="h-9 w-full rounded-md border border-gray-300"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        UPI ID (for the payment QR code)
        <input
          name="upiId"
          defaultValue={tenant.upiId ?? ""}
          placeholder="yourrestaurant@upi"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
