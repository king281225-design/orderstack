import "server-only";
import { prisma } from "@/lib/prisma";
import { getItemsForOrder } from "@/lib/data/menu";
import { validateCoupon, tryRedeemCoupon, CouponRedemptionLimitError } from "@/lib/data/coupons";
import type { FulfillmentType, OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

export type CartLine = { itemId: string; quantity: number };

export class EmptyCartError extends Error {}
export class InvalidItemsError extends Error {}

/**
 * Creates an order for a public customer. Prices and item names are always
 * re-read from the tenant-scoped item table here — the client only ever
 * sends itemId + quantity, never a price, so a tampered cart can't change
 * what gets charged. Same rule for couponCode: whatever discount the
 * checkout page previewed client-side is recomputed from scratch here —
 * see validateCoupon.
 */
export async function createOrder(
  tenantId: string,
  input: {
    cart: CartLine[];
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    fulfillmentType: FulfillmentType;
    deliveryAddress?: string | null;
    tableLabel?: string | null;
    paymentMethod: PaymentMethod;
    notes?: string | null;
    couponCode?: string | null;
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

  const subtotalCents = lines.reduce((sum, l) => sum + l.priceCentsSnapshot * l.quantity, 0);

  // Cart/item validation happens above, before touching the coupon, so a
  // cart that's about to fail anyway doesn't burn a redemption first.
  let couponId: string | null = null;
  let couponCode: string | null = null;
  let discountCents = 0;

  if (input.couponCode?.trim()) {
    const { coupon, discountCents: computed } = await validateCoupon(
      tenantId,
      input.couponCode,
      subtotalCents,
    );
    const redeemed = await tryRedeemCoupon(coupon.id, coupon.maxRedemptions);
    if (!redeemed) {
      throw new CouponRedemptionLimitError("This coupon just reached its redemption limit.");
    }
    couponId = coupon.id;
    couponCode = coupon.code;
    discountCents = computed;
  }

  const totalCents = Math.max(0, subtotalCents - discountCents);

  return prisma.order.create({
    data: {
      tenantId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail?.trim() || null,
      fulfillmentType: input.fulfillmentType,
      deliveryAddress: input.deliveryAddress ?? null,
      tableLabel: input.tableLabel ?? null,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? null,
      subtotalCents,
      totalCents,
      couponId,
      couponCode,
      discountCents,
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
 * Only real, automatic payment confirmation (Razorpay) auto-accepts the
 * order — a static UPI QR / Cash on Delivery order has no way to be
 * verified automatically (no gateway, no webhook, nothing to poll for a
 * direct bank-to-bank UPI transfer), so those stay manual, exactly as the
 * plan's "reconciled manually" always intended. This only ever moves
 * PENDING -> ACCEPTED: an order the owner already advanced further (or
 * cancelled) is left alone, and a webhook retry after the flip already
 * happened is a harmless no-op (the PENDING-only condition just matches
 * nothing the second time).
 */
async function autoAcceptOnPaid(
  tx: Pick<typeof prisma, "order">,
  where: { id: string; tenantId: string } | { razorpayOrderId: string },
) {
  await tx.order.updateMany({ where: { ...where, status: "PENDING" }, data: { status: "ACCEPTED" } });
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
  return prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: orderId, tenantId },
      data: { paymentStatus: status, ...(razorpayPaymentId ? { razorpayPaymentId } : {}) },
    });
    if (status === "PAID") await autoAcceptOnPaid(tx, { id: orderId, tenantId });
    return result;
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
  return prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { razorpayOrderId },
      data: { paymentStatus: status, ...(razorpayPaymentId ? { razorpayPaymentId } : {}) },
    });
    if (status === "PAID") await autoAcceptOnPaid(tx, { razorpayOrderId });
    return result;
  });
}
