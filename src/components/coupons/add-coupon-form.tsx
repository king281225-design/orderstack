"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { createCouponAction, type CouponActionState } from "@/app/dashboard/coupons/actions";

const initialState: CouponActionState = { error: null };

export function AddCouponForm() {
  const [state, formAction, pending] = useActionState(createCouponAction, initialState);
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4 sm:grid-cols-2"
    >
      <h3 className="col-span-full text-sm font-semibold text-gray-900">Add a coupon</h3>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Code
        <input
          name="code"
          required
          placeholder="e.g. WELCOME10"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm uppercase focus:border-indigo-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Discount type
        <select
          name="discountType"
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FIXED")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        >
          <option value="PERCENT">Percent off</option>
          <option value="FIXED">Fixed amount off (₹)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        {discountType === "PERCENT" ? "Percent off (1-100)" : "Amount off (₹)"}
        <input
          name="discountValue"
          type="number"
          step={discountType === "PERCENT" ? "1" : "0.01"}
          min="0"
          max={discountType === "PERCENT" ? "100" : undefined}
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Minimum order (₹, optional)
        <input
          name="minOrder"
          type="number"
          step="0.01"
          min="0"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Max redemptions (optional)
        <input
          name="maxRedemptions"
          type="number"
          min="1"
          placeholder="Unlimited"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Expires (optional)
        <input
          name="expiresAt"
          type="date"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      {state.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="col-span-full w-fit rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add coupon"}
      </button>
    </form>
  );
}
