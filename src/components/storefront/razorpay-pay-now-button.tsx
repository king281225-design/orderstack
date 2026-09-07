"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyRazorpayPaymentAction } from "@/app/r/[slug]/actions";
import { loadRazorpayCheckout, openRazorpayCheckout } from "@/lib/razorpay-client";

/**
 * Shown on the order-status page when a Razorpay order exists but hasn't
 * been paid yet — e.g. the customer closed the checkout modal without
 * paying. Reopens it against the same razorpayOrderId (no new order or
 * charge is created).
 */
export function RazorpayPayNowButton({
  slug,
  orderId,
  razorpayOrderId,
  keyId,
  amountCents,
  restaurantName,
  customerName,
  customerPhone,
}: {
  slug: string;
  orderId: string;
  razorpayOrderId: string;
  keyId: string;
  amountCents: number;
  restaurantName: string;
  customerName: string;
  customerPhone: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handlePayNow() {
    setError(null);
    try {
      await loadRazorpayCheckout();
      openRazorpayCheckout({
        key: keyId,
        amount: amountCents,
        currency: "INR",
        order_id: razorpayOrderId,
        name: restaurantName,
        prefill: { name: customerName, contact: customerPhone },
        handler: (response) => {
          // order_id checkout always returns razorpay_order_id — the field
          // is optional on the shared response type only because
          // subscription checkout (src/components/billing/subscribe-button.tsx)
          // returns razorpay_subscription_id instead.
          if (!response.razorpay_order_id) return;
          const razorpayOrderIdFromResponse = response.razorpay_order_id;
          startTransition(async () => {
            await verifyRazorpayPaymentAction(
              slug,
              orderId,
              razorpayOrderIdFromResponse,
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
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handlePayNow}
        disabled={isPending}
        className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--brand-primary)" }}
      >
        {isPending ? "Confirming…" : "Pay now"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
