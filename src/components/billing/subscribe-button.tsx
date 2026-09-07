"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startSubscriptionAction, verifySubscriptionAction } from "@/app/dashboard/billing/actions";
import { loadRazorpayCheckout, openRazorpayCheckout } from "@/lib/razorpay-client";

/**
 * Starts a real recurring Razorpay subscription for the tenant's current
 * plan tier and opens Razorpay's checkout widget for the owner to authorize
 * it. Mirrors src/components/storefront/razorpay-pay-now-button.tsx, but for
 * a subscription_id instead of an order_id.
 */
export function SubscribeButton({
  keyId,
  restaurantName,
}: {
  keyId: string;
  restaurantName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      const result = await startSubscriptionAction();
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
          description: "OrderStack subscription",
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
        {isPending ? "Starting…" : "Subscribe"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
