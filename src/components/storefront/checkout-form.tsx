"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/money";
import { placeOrderAction } from "@/app/r/[slug]/actions";

export function CheckoutForm({ slug, hasUpi }: { slug: string; hasUpi: boolean }) {
  const { lines, totalCents, clear } = useCart();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<"DELIVERY" | "TAKEAWAY">("TAKEAWAY");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "COD">(hasUpi ? "UPI" : "COD");

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
      fulfillmentType,
      deliveryAddress: String(formData.get("deliveryAddress") ?? ""),
      paymentMethod,
      notes: String(formData.get("notes") ?? ""),
    };
    const cart = lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity }));

    startTransition(async () => {
      const result = await placeOrderAction(slug, cart, fields);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.orderId) {
        clear();
        router.push(`/r/${slug}/order/${result.orderId}`);
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
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
        <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-sm font-semibold">
          <span>Total</span>
          <span>{formatINR(totalCents)}</span>
        </div>
      </section>

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

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium text-gray-700">Fulfillment</legend>
        <div className="flex gap-3">
          {(["TAKEAWAY", "DELIVERY"] as const).map((opt) => (
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
              {opt === "TAKEAWAY" ? "Takeaway" : "Delivery"}
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

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium text-gray-700">Payment</legend>
        <div className="flex gap-3">
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
        {isPending ? "Placing order…" : `Place order · ${formatINR(totalCents)}`}
      </button>
    </form>
  );
}
