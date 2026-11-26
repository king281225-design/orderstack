"use client";

import { useActionState } from "react";
import { setChristmasSpinPoolAction, type SpinPoolActionState } from "@/app/dashboard/christmas/actions";
import { formatINR } from "@/lib/money";

const initialState: SpinPoolActionState = { error: null };

type CouponOption = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
};

/** A checklist over the tenant's OWN existing coupons — no parallel "create a prize" UI, see /dashboard/coupons. */
export function SpinPoolForm({
  coupons,
  selectedIds,
}: {
  coupons: CouponOption[];
  selectedIds: string[];
}) {
  const [state, formAction, pending] = useActionState(setChristmasSpinPoolAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
      <div className="flex flex-col gap-2">
        {coupons.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="couponId"
              value={c.id}
              defaultChecked={selectedIds.includes(c.id)}
              className="h-4 w-4"
            />
            <span className="font-medium text-gray-900">{c.code}</span>
            <span className="text-gray-500">
              — {c.discountType === "PERCENT" ? `${c.discountValue}% off` : `${formatINR(c.discountValue)} off`}
            </span>
          </label>
        ))}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save spin pool"}
      </button>
    </form>
  );
}
