"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previewWelcomeCouponAction,
  startDiscountedPlanPurchaseAction,
  verifyDiscountedPlanPurchaseAction,
} from "@/app/dashboard/billing/actions";
import { loadRazorpayCheckout, openRazorpayCheckout, PREFER_UPI_METHOD } from "@/lib/razorpay-client";
import { formatINR } from "@/lib/money";
import { PLAN_DEFINITIONS } from "@/lib/plans";
import type { PlanTier } from "@prisma/client";

/**
 * WELCOME100 — ₹100 off a tenant's first ever paid plan purchase (see
 * src/lib/data/tenants.ts). Originally Starter-only; shown on every plan
 * card as of 2026-09-13 at the user's request — `tier` is whichever card
 * this instance lives on. Only shown while the tenant hasn't already used
 * it / doesn't already have an active paid subscription — the backend
 * re-checks both regardless of what this form shows, so a stale render can
 * never let it through twice.
 */
export function WelcomeCouponForm({
  keyId,
  restaurantName,
  tier,
}: {
  keyId: string;
  restaurantName: string;
  tier: PlanTier;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    originalPriceCents: number;
    discountCents: number;
    finalPriceCents: number;
  } | null>(null);

  function handleApply() {
    setError(null);
    setPreview(null);
    startTransition(async () => {
      const result = await previewWelcomeCouponAction(code, tier);
      if (result.error !== null) {
        setError(result.error);
        return;
      }
      setPreview(result);
    });
  }

  function handlePay() {
    setError(null);
    startTransition(async () => {
      const started = await startDiscountedPlanPurchaseAction(code, tier);
      if (started.error || !started.orderId || started.amountCents == null) {
        setError(started.error ?? "Could not start this purchase.");
        return;
      }
      const { orderId, amountCents } = started;

      try {
        await loadRazorpayCheckout();
        openRazorpayCheckout({
          key: keyId,
          order_id: orderId,
          amount: amountCents,
          name: restaurantName,
          description: `BhojSetu ${PLAN_DEFINITIONS[tier].label} plan — WELCOME100 applied`,
          ...PREFER_UPI_METHOD,
          handler: (response) => {
            startTransition(async () => {
              await verifyDiscountedPlanPurchaseAction(
                orderId,
                response.razorpay_payment_id,
                response.razorpay_signature,
              );
              router.refresh();
            });
          },
        });
      } catch {
        setError("Could not open the payment window. Please try again.");
      }
    });
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-dashed border-gray-300 p-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Have a welcome code?
        <div className="flex gap-1">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setPreview(null);
              setError(null);
            }}
            placeholder="WELCOME100"
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm uppercase focus:border-indigo-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={isPending || !code.trim()}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {preview && (
        <div className="rounded-md bg-green-50 p-2 text-xs text-green-800">
          <p>
            Plan price: <span className="line-through">{formatINR(preview.originalPriceCents)}</span>
          </p>
          <p>WELCOME100 discount: −{formatINR(preview.discountCents)}</p>
          <p className="font-semibold">Payable now: {formatINR(preview.finalPriceCents)}</p>
          <button
            type="button"
            onClick={handlePay}
            disabled={isPending}
            className="mt-2 w-full rounded-md bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            {isPending ? "Starting…" : `Pay ${formatINR(preview.finalPriceCents)}`}
          </button>
        </div>
      )}
    </div>
  );
}
