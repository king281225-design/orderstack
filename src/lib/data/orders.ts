import "server-only";
import { prisma } from "@/lib/prisma";
import { getItemsForOrder } from "@/lib/data/menu";
import type { FulfillmentType, OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

export type CartLine = { itemId: string; quantity: number };

export class EmptyCartError extends Error {}
export class InvalidItemsError extends Error {}

/**
 * Creates an order for a public customer. Prices and item names are always
 * re-read from the tenant-scoped item table here — the client only ever
 * sends itemId + quantity, never a price, so a tampered cart can't change
 * what gets charged.
 */
export async function createOrder(
  tenantId: string,
  input: {
    cart: CartLine[];
    customerName: string;
    customerPhone: string;
    fulfillmentType: FulfillmentType;
    deliveryAddress?: string | null;
    paymentMethod: PaymentMethod;
    notes?: string | null;
  },
) {
  const cart = input.cart.filter((l) => l.quantity > 0);
  if (cart.length === 0) throw new EmptyCartError("Cart is empty.");

  const items = await getItemsForOrder(
    tenantId,
    cart.map((l) => l.itemId),
  );
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const lines = cart.map((l) => {
    const item = itemMap.get(l.itemId);
    if (!item) throw new InvalidItemsError("One or more items are no longer available.");
    return {
      itemId: item.id,
      nameSnapshot: item.name,
      priceCentsSnapshot: item.priceCents,
      quantity: l.quantity,
    };
  });

  const totalCents = lines.reduce((sum, l) => sum + l.priceCentsSnapshot * l.quantity, 0);

  return prisma.order.create({
    data: {
      tenantId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      fulfillmentType: input.fulfillmentType,
      deliveryAddress: input.deliveryAddress ?? null,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? null,
      totalCents,
      items: { create: lines },
    },
    include: { items: true },
  });
}

/** Public order-status lookup, always re-checked against tenantId so one restaurant's orders never leak into another's URL space. */
export async function getOrderForTenant(tenantId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true },
  });
}

export async function listOrdersForTenant(tenantId: string, statuses?: OrderStatus[]) {
  return prisma.order.findMany({
    where: { tenantId, ...(statuses ? { status: { in: statuses } } : {}) },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export class InvalidTransitionError extends Error {}

export async function advanceOrderStatus(tenantId: string, orderId: string, to: OrderStatus) {
  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
  if (!order) throw new Error("Order not found for this restaurant.");
  if (!NEXT_STATUS[order.status].includes(to)) {
    throw new InvalidTransitionError(`Cannot move an order from ${order.status} to ${to}.`);
  }
  return prisma.order.update({ where: { id: orderId }, data: { status: to } });
}

/** Links a newly created order to the Razorpay order created for it (see src/lib/payments/razorpay.ts). */
export async function attachRazorpayOrder(tenantId: string, orderId: string, razorpayOrderId: string) {
  return prisma.order.updateMany({
    where: { id: orderId, tenantId },
    data: { razorpayOrderId },
  });
}

/**
 * Owner-facing manual reconciliation for COD/UPI orders (the plan's
 * "reconciled manually"), scoped to the session's tenant like every other
 * dashboard action.
 */
export async function markOrderPaid(tenantId: string, orderId: string) {
  return prisma.order.updateMany({
    where: { id: orderId, tenantId },
    data: { paymentStatus: "PAID" },
  });
}

/**
 * Tenant-scoped verification path for Razorpay checkout — called right
 * after the client-side checkout succeeds, with a signature already
 * verified by the caller (see verifyRazorpayPaymentAction).
 */
export async function markPaymentStatus(
  tenantId: string,
  orderId: string,
  status: PaymentStatus,
  razorpayPaymentId?: string,
) {
  return prisma.order.updateMany({
    where: { id: orderId, tenantId },
    data: { paymentStatus: status, ...(razorpayPaymentId ? { razorpayPaymentId } : {}) },
  });
}

/**
 * Webhook path only (src/app/api/webhooks/razorpay/route.ts) — there's no
 * session/slug to scope by here, only Razorpay's own order id, which is
 * why razorpayOrderId is unique: this is the sole lookup key, and it's only
 * ever trusted after the caller has verified the webhook signature.
 */
export async function setPaymentStatusByRazorpayOrderId(
  razorpayOrderId: string,
  status: PaymentStatus,
  razorpayPaymentId?: string,
) {
  return prisma.order.updateMany({
    where: { razorpayOrderId },
    data: { paymentStatus: status, ...(razorpayPaymentId ? { razorpayPaymentId } : {}) },
  });
}
