"use server";

import { z } from "zod";
import { getTenantBySlug } from "@/lib/data/tenants";
import { createOrder, EmptyCartError, InvalidItemsError } from "@/lib/data/orders";

const cartLineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const checkoutSchema = z.object({
  customerName: z.string().min(1, "Name is required."),
  customerPhone: z.string().min(6, "Enter a valid phone number."),
  fulfillmentType: z.enum(["DELIVERY", "TAKEAWAY"]),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.enum(["UPI", "COD"]),
  notes: z.string().optional(),
});

export type PlaceOrderResult = { error?: string; orderId?: string };

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
    return { orderId: order.id };
  } catch (err) {
    if (err instanceof EmptyCartError) return { error: "Your cart is empty." };
    if (err instanceof InvalidItemsError) return { error: err.message };
    return { error: "Could not place order. Please try again." };
  }
}
