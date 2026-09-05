"use server";

import { z } from "zod";
import { getTenantBySlug } from "@/lib/data/tenants";
import {
  attachRazorpayOrder,
  createOrder,
  EmptyCartError,
  InvalidItemsError,
  markPaymentStatus,
} from "@/lib/data/orders";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyCheckoutSignature,
} from "@/lib/payments/razorpay";

const cartLineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const checkoutSchema = z.object({
  customerName: z.string().min(1, "Name is required."),
  customerPhone: z.string().min(6, "Enter a valid phone number."),
  fulfillmentType: z.enum(["DELIVERY", "TAKEAWAY"]),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.enum(["UPI", "COD", "RAZORPAY"]),
  notes: z.string().optional(),
});

export type PlaceOrderResult = {
  error?: string;
  orderId?: string;
  /** Present only for paymentMethod RAZORPAY — the client opens Razorpay's checkout with these. */
  razorpay?: { keyId: string; razorpayOrderId: string; amountCents: number };
};

/**
 * Called directly from the client checkout form (not a <form action>), so
 * both the cart and the customer-entered fields are untrusted input — cart
 * item ids/quantities are re-validated shape-wise here, then prices are
 * re-derived from the database inside createOrder(). Never trust a price
 * from the client.
 */
export async function placeOrderAction(
  slug: string,
  cart: unknown,
  fields: unknown,
): Promise<PlaceOrderResult> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.status === "SUSPENDED") return { error: "Restaurant not found." };
  if (!tenant.isOpen) return { error: "This restaurant is currently closed." };

  const cartParsed = z.array(cartLineSchema).min(1, "Your cart is empty.").safeParse(cart);
  if (!cartParsed.success) {
    return { error: cartParsed.error.issues[0]?.message ?? "Invalid cart." };
  }

  const fieldsParsed = checkoutSchema.safeParse(fields);
  if (!fieldsParsed.success) {
    return { error: fieldsParsed.error.issues[0]?.message ?? "Invalid order details." };
  }
  const data = fieldsParsed.data;

  if (data.fulfillmentType === "DELIVERY" && !data.deliveryAddress?.trim()) {
    return { error: "Delivery address is required for delivery orders." };
  }
  if (data.paymentMethod === "RAZORPAY" && !isRazorpayConfigured()) {
    // Shouldn't normally happen — the UI hides this option when unconfigured —
    // but a stale client-side cache or a direct call shouldn't silently break.
    return { error: "Online payment isn't set up yet. Please choose UPI or Cash on Delivery." };
  }

  try {
    const order = await createOrder(tenant.id, {
      cart: cartParsed.data,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      fulfillmentType: data.fulfillmentType,
      deliveryAddress: data.deliveryAddress?.trim() || null,
      paymentMethod: data.paymentMethod,
      notes: data.notes?.trim() || null,
    });

    if (data.paymentMethod === "RAZORPAY") {
      const razorpayOrder = await createRazorpayOrder(order.totalCents, order.id);
      await attachRazorpayOrder(tenant.id, order.id, razorpayOrder.id);
      return {
        orderId: order.id,
        razorpay: {
          keyId: getRazorpayKeyId()!,
          razorpayOrderId: razorpayOrder.id,
          amountCents: order.totalCents,
        },
      };
    }

    return { orderId: order.id };
  } catch (err) {
    if (err instanceof EmptyCartError) return { error: "Your cart is empty." };
    if (err instanceof InvalidItemsError) return { error: err.message };
    return { error: "Could not place order. Please try again." };
  }
}

export type VerifyPaymentResult = { ok: boolean };

/**
 * Called from the client right after Razorpay's checkout widget reports
 * success. Verifies the signature server-side before trusting it — the
 * webhook (src/app/api/webhooks/razorpay/route.ts) is the authoritative
 * confirmation in case this call never happens (closed tab, network drop).
 */
export async function verifyRazorpayPaymentAction(
  slug: string,
  orderId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<VerifyPaymentResult> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { ok: false };

  const valid = verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) return { ok: false };

  await markPaymentStatus(tenant.id, orderId, "PAID", razorpayPaymentId);
  return { ok: true };
}
