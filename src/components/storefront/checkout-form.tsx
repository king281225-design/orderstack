"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/money";
import { placeOrderAction, previewCouponAction, verifyRazorpayPaymentAction } from "@/app/r/[slug]/actions";
import { loadRazorpayCheckout, openRazorpayCheckout } from "@/lib/razorpay-client";

export function CheckoutForm({
  slug,
  restaurantName,
  hasUpi,
  hasRazorpay,
}: {
  slug: string;
  restaurantName: string;
  hasUpi: boolean;
  hasRazorpay: boolean;
}) {
  const { lines, totalCents, clear, tableLabel } = useCart();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Lazy initializer, not a hardcoded default: by the time this page mounts,
  // CartProvider (which persists across the client-side nav from the
  // storefront page — same layout, not remounted) has usually already
  // hydrated tableLabel from localStorage, so this needs to check it at
  // mount rather than always start at Takeaway and rely solely on the
  // render-time adjustment below to correct it after the fact.
  const [fulfillmentType, setFulfillmentType] = useState<"DELIVERY" | "TAKEAWAY" | "DINE_IN">(
    () => (tableLabel ? "DINE_IN" : "TAKEAWAY"),
  );
  const [manualTable, setManualTable] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "COD" | "RAZORPAY">(
    hasRazorpay ? "RAZORPAY" : hasUpi ? "UPI" : "COD",
  );
  const formRef = useRef<HTMLFormElement>(null);

  // tableLabel hydrates from localStorage asynchronously (see CartProvider),
  // so it's often still null on the very first render even when a QR scan
  // set it a moment ago. Switching to Dine-in once it shows up is "adjusting
  // state during render" — React's documented alternative to a
  // setState-in-effect for exactly this case (comparing against a second
  // state variable holding the last-seen value, not a ref — refs can't be
  // read or written during render either).
  const [prevTableLabel, setPrevTableLabel] = useState(tableLabel);
  if (tableLabel !== prevTableLabel) {
    setPrevTableLabel(tableLabel);
    if (tableLabel) setFulfillmentType("DINE_IN");
  }

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountCents: number } | null>(
    null,
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, startCouponTransition] = useTransition();

  function handleApplyCoupon() {
    setCouponError(null);
    if (!couponInput.trim()) return;
    startCouponTransition(async () => {
      const result = await previewCouponAction(slug, couponInput, totalCents);
      if (result.error) {
        setCouponError(result.error);
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon({ code: result.code!, discountCents: result.discountCents! });
    });
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  const discountCents = appliedCoupon?.discountCents ?? 0;
  const payableCents = Math.max(0, totalCents - discountCents);

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        Your cart is empty.{" "}
        <Link href={`/r/${slug}`} className="font-medium underline">
          Browse the menu
        </Link>
        .
      </div>
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    const fields = {
      customerName: String(formData.get("customerName") ?? ""),
      customerPhone: String(formData.get("customerPhone") ?? ""),
      customerEmail: String(formData.get("customerEmail") ?? ""),
      fulfillmentType,
      deliveryAddress: String(formData.get("deliveryAddress") ?? ""),
      tableLabel: tableLabel ?? manualTable,
      paymentMethod,
      notes: String(formData.get("notes") ?? ""),
      couponCode: appliedCoupon?.code ?? "",
    };
    const cart = lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity }));

    startTransition(async () => {
      const result = await placeOrderAction(slug, cart, fields);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.orderId) return;

      // Cash on delivery / UPI QR: the order's placed, nothing left to do here.
      if (!result.razorpay) {
        clear();
        router.push(`/r/${slug}/order/${result.orderId}`);
        return;
      }

      // Razorpay: the order exists (payment PENDING) — open the checkout
      // widget. Whatever happens next (paid, dismissed, closed tab), the
      // order-status page can pick up from there, so it's always safe to
      // land the customer there once the order itself is created.
      const orderId = result.orderId;
      const { keyId, razorpayOrderId, amountCents } = result.razorpay;
      try {
        await loadRazorpayCheckout();
        openRazorpayCheckout({
          key: keyId,
          amount: amountCents,
          currency: "INR",
          order_id: razorpayOrderId,
          name: restaurantName,
          prefill: { name: fields.customerName, contact: fields.customerPhone },
          theme: {
            color:
              (formRef.current && getComputedStyle(formRef.current).getPropertyValue("--brand-primary").trim()) ||
              undefined,
          },
          handler: (response) => {
            // order_id checkout always returns razorpay_order_id — see the
            // matching comment in razorpay-pay-now-button.tsx.
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
              clear();
              router.push(`/r/${slug}/order/${orderId}`);
            });
          },
          modal: {
            ondismiss: () => {
              clear();
              router.push(`/r/${slug}/order/${orderId}`);
            },
          },
        });
      } catch {
        setError("Could not open the payment window. Please try again.");
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-5">
      <section className="rounded-lg border border-gray-200 bg-white p-3">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Your order</h2>
        <ul className="flex flex-col divide-y divide-gray-100 text-sm">
          {lines.map((l) => (
            <li key={l.itemId} className="flex justify-between py-1.5">
              <span>
                {l.quantity} × {l.name}
              </span>
              <span>{formatINR(l.priceCents * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 border-t border-gray-100 pt-2 text-sm">
          <div className="flex justify-between">
            <span className={appliedCoupon ? "text-gray-500" : "font-semibold"}>Subtotal</span>
            <span className={appliedCoupon ? "text-gray-500" : "font-semibold"}>
              {formatINR(totalCents)}
            </span>
          </div>
          {appliedCoupon && (
            <div className="flex justify-between text-green-700">
              <span>Coupon {appliedCoupon.code}</span>
              <span>−{formatINR(discountCents)}</span>
            </div>
          )}
          {appliedCoupon && (
            <div className="mt-1 flex justify-between border-t border-gray-100 pt-1 font-semibold">
              <span>Total</span>
              <span>{formatINR(payableCents)}</span>
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-1">
        {appliedCoupon ? (
          <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            <span>
              <strong>{appliedCoupon.code}</strong> applied — you saved {formatINR(discountCents)}
            </span>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="font-medium text-green-800 underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Have a coupon code?"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm uppercase focus:border-gray-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={isApplyingCoupon || !couponInput.trim()}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              {isApplyingCoupon ? "Checking…" : "Apply"}
            </button>
          </div>
        )}
        {couponError && <p className="text-sm text-red-600">{couponError}</p>}
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Your name
        <input
          name="customerName"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Phone number
        <input
          name="customerPhone"
          type="tel"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Email (optional — for an order confirmation)
        <input
          name="customerEmail"
          type="email"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium text-gray-700">Fulfillment</legend>
        <div className="flex flex-wrap gap-3">
          {(["DINE_IN", "TAKEAWAY", "DELIVERY"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFulfillmentType(opt)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                fulfillmentType === opt
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-700"
              }`}
            >
              {opt === "TAKEAWAY" ? "Takeaway" : opt === "DELIVERY" ? "Delivery" : "Dine-in"}
            </button>
          ))}
        </div>
      </fieldset>

      {fulfillmentType === "DELIVERY" && (
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Delivery address
          <textarea
            name="deliveryAddress"
            required
            rows={2}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </label>
      )}

      {fulfillmentType === "DINE_IN" &&
        (tableLabel ? (
          <p className="text-sm text-gray-700">
            Table: <span className="font-semibold">{tableLabel}</span>
          </p>
        ) : (
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Table number
            <input
              value={manualTable}
              onChange={(e) => setManualTable(e.target.value)}
              required
              placeholder="e.g. 5"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </label>
        ))}

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium text-gray-700">Payment</legend>
        <div className="flex flex-wrap gap-3">
          {hasRazorpay && (
            <button
              type="button"
              onClick={() => setPaymentMethod("RAZORPAY")}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                paymentMethod === "RAZORPAY"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-700"
              }`}
            >
              Pay online (Card/UPI/Netbanking)
            </button>
          )}
          {hasUpi && (
            <button
              type="button"
              onClick={() => setPaymentMethod("UPI")}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                paymentMethod === "UPI"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-700"
              }`}
            >
              UPI (QR code)
            </button>
          )}
          <button
            type="button"
            onClick={() => setPaymentMethod("COD")}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              paymentMethod === "COD"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 text-gray-700"
            }`}
          >
            Cash on delivery
          </button>
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Notes (optional)
        <textarea
          name="notes"
          rows={2}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--brand-primary)" }}
      >
        {isPending ? "Placing order…" : `Place order · ${formatINR(payableCents)}`}
      </button>
    </form>
  );
}
