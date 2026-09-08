"use client";

/** Thin wrapper around Razorpay's checkout.js — loaded on demand, never bundled. */

export type RazorpayCheckoutOptions = {
  key: string;
  amount?: number;
  currency?: string;
  // One-time payment checkout uses order_id; recurring billing checkout
  // (src/components/billing/subscribe-button.tsx) uses subscription_id
  // instead — Razorpay's widget accepts either, never both.
  order_id?: string;
  subscription_id?: string;
  name: string;
  description?: string;
  prefill?: { name?: string; contact?: string; method?: "upi"; vpa?: string };
  config?: { display?: { hide?: { method: string; flows: string[] }[] } };
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id?: string;
    razorpay_subscription_id?: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
};

/**
 * Razorpay's UPI method offers three sub-flows: scan a QR code, pick a UPI
 * app (intent — mobile browsers only), or type a UPI ID directly (collect).
 * A real user reported the QR sub-flow not rendering/scanning for them —
 * rather than debug Razorpay's own QR renderer, this skips past it entirely:
 * `prefill.method: "upi"` opens checkout already on the UPI method (instead
 * of the generic method-picker screen), and `config.display.hide` removes
 * just the "qr" sub-flow, leaving "enter UPI ID" (collect) and the UPI-app
 * intent flow as the ways to pay. The customer can still back out to Card/
 * other methods from the widget's own navigation — this only changes what
 * it opens on by default. Spread into every real checkout call in this app
 * (storefront pay-now, checkout, and subscription Subscribe) so the same
 * fix applies everywhere UPI is offered, not just one flow.
 */
export const PREFER_UPI_COLLECT: Pick<RazorpayCheckoutOptions, "prefill" | "config"> = {
  prefill: { method: "upi" },
  config: { display: { hide: [{ method: "upi", flows: ["qr"] }] } },
};

type RazorpayInstance = { open: () => void };
type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
    document.body.appendChild(script);
  });
  return loadPromise;
}

export function openRazorpayCheckout(options: RazorpayCheckoutOptions): void {
  if (!window.Razorpay) throw new Error("Razorpay checkout script isn't loaded yet.");
  new window.Razorpay(options).open();
}
