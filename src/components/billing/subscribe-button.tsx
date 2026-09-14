"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startSubscriptionAction, verifySubscriptionAction } from "@/app/dashboard/billing/actions";
import { loadRazorpayCheckout, openRazorpayCheckout, PREFER_UPI_METHOD } from "@/lib/razorpay-client";
import type { PlanTier } from "@prisma/client";

/**
 * Starts a real recurring Razorpay subscription for one specific plan tier
 * (the card this button lives on) and opens Razorpay's checkout widget for
 * the owner to authorize it. Mirrors
 * src/components/storefront/razorpay-pay-now-button.tsx, but for a
 * subscription_id instead of an order_id.
 */
export function SubscribeButton({
  keyId,
  restaurantName,
  tier,
  label,
}: {
  keyId: string;
  restaurantName: string;
  tier: PlanTier;
  /** Button text, e.g. "Subscribe to Starter — ₹499/mo". Defaults to a generic label if omitted. */
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      const result = await startSubscriptionAction(tier);
      if (result.error || !result.subscriptionId) {
        setError(result.error ?? "Could not start a subscription.");
        return;
      }
      const subscriptionId = result.subscriptionId;

      try {
        await loadRazorpayCheckout();
        openRazorpayCheckout({
          key: keyId,
          subscription_id: subscriptionId,
          name: restaurantName,
          description: "BhojSetu subscription",
          ...PREFER_UPI_METHOD,
          handler: (response) => {
            startTransition(async () => {
              await verifySubscriptionAction(
                subscriptionId,
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
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleSubscribe}
        disabled={isPending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {isPending ? "Starting…" : (label ?? "Subscribe")}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
