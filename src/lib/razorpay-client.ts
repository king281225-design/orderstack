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
  prefill?: { name?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id?: string;
    razorpay_subscription_id?: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
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
