import "server-only";
import { prisma } from "@/lib/prisma";
import { getItemsForOrder } from "@/lib/data/menu";
import { validateCoupon, tryRedeemCoupon, CouponRedemptionLimitError } from "@/lib/data/coupons";
import { deductStockForOrder, restoreStockForOrder, notifyLowStock } from "@/lib/data/inventory";
import type { FulfillmentType, OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

export type CartLine = {
  itemId: string;
  quantity: number;
  variantLabel?: string | null;
  /** Ids of ItemAddOn rows selected for this line — see resolveLinePrice. */
  addOnIds?: string[] | null;
};

export class EmptyCartError extends Error {}
export class InvalidItemsError extends Error {}

/**
 * Resolves a submitted variantLabel/addOnIds against the item's OWN real
 * Item.variants (a JSON column) and its available ItemAddOn rows — the
 * client only ever sends a label/ids, never a price, so a tampered cart
 * can't change what a variant or add-on actually costs. Both are folded
 * into a single nameSnapshot/priceCentsSnapshot pair (no separate order-item
 * rows for add-ons) so every existing order-display surface (dashboard,
 * kitchen board, printed invoice) shows them correctly with zero changes,
 * and a later add-on price change or deletion never affects a past order.
 */
function resolveLinePrice(
  item: { name: string; priceCents: number; variants: unknown; addOns: { id: string; name: string; priceCents: number }[] },
  variantLabel?: string | null,
  addOnIds?: string[] | null,
): { nameSnapshot: string; priceCentsSnapshot: number } {
  let name = item.name;
  let priceCents = item.priceCents;

  if (variantLabel && Array.isArray(item.variants)) {
    const match = (item.variants as { label?: unknown; priceCents?: unknown }[]).find(
      (v) => typeof v?.label === "string" && v.label === variantLabel && typeof v.priceCents === "number",
    );
    if (match && typeof match.priceCents === "number") {
      name = `${item.name} (${variantLabel})`;
      priceCents = match.priceCents;
    }
  }

  if (addOnIds && addOnIds.length > 0) {
    const selected = item.addOns.filter((a) => addOnIds.includes(a.id));
    if (selected.length > 0) {
      priceCents += selected.reduce((sum, a) => sum + a.priceCents, 0);
      name = `${name} + ${selected.map((a) => a.name).join(", ")}`;
    }
  }

  return { nameSnapshot: name, priceCentsSnapshot: priceCents };
}

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
    /** See the Order.deliveryDistanceKm schema comment — informational only, never validated or enforced here. */
    deliveryDistanceKm?: number | null;
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
    const { nameSnapshot, priceCentsSnapshot } = resolveLinePrice(item, l.variantLabel, l.addOnIds);
    return {
      itemId: item.id,
      nameSnapshot,
      priceCentsSnapshot,
      quantity: l.quantity,
      stationId: item.station?.id ?? null,
      stationName: item.station?.name ?? null,
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

  // GST on customer storefront orders, same rate/mechanism as manual bills
  // (createManualOrder below) — computed server-side from the tenant's own
  // configured rate, never trusted from the client's own order-summary
  // preview (checkout-form.tsx shows the same math for display only).
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { gstRate: true } });
  const taxableCents = Math.max(0, subtotalCents - discountCents);
  const taxCents = tenant?.gstRate && tenant.gstRate > 0 ? Math.round((taxableCents * tenant.gstRate) / 100) : 0;
  const totalCents = taxableCents + taxCents;

  const { order, newlyLow } = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({
    data: {
      tenantId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail?.trim() || null,
      fulfillmentType: input.fulfillmentType,
      deliveryAddress: input.deliveryAddress ?? null,
      deliveryDistanceKm: input.deliveryDistanceKm ?? null,
      tableLabel: input.tableLabel ?? null,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? null,
      subtotalCents,
      taxCents,
      gstRatePercent: taxCents > 0 ? tenant!.gstRate : null,
      totalCents,
      couponId,
      couponCode,
      discountCents,
      items: { create: lines },
    },
    include: { items: true },
  });
  const { newlyLow } = await deductStockForOrder(tx, tenantId, order.id);
  return { order, newlyLow };
  });
  if (newlyLow.length) void notifyLowStock(tenantId, newlyLow);
  return order;
}

export type ManualOrderLine = {
  name: string;
  priceCents: number;
  quantity: number;
  /** Set when the line was quick-picked from the menu — enables station routing and stock deduction. Verified against the tenant below. */
  itemId?: string | null;
};

export class EmptyManualOrderError extends Error {}
export class InvalidManualLineError extends Error {}

/**
 * Owner/staff-created bill for a walk-in or phone-in customer
 * (/dashboard/orders/new) — the "billing system" entry point, as opposed to
 * createOrder above (a customer's own storefront checkout). Line items are
 * free-form (name + price + quantity typed in by staff, not necessarily tied
 * to a menu Item row) since this is meant to cover "products/services"
 * generally, not just menu dishes. Every number is validated and recomputed
 * here — subtotal, discount (clamped to the subtotal, never negative), tax,
 * and grand total are never trusted from the client. gstRatePercent falls
 * back to the tenant's own configured rate (Tenant.gstRate) when omitted;
 * both are optional — omit/zero means no tax line.
 */
export async function createManualOrder(
  tenantId: string,
  input: {
    lines: ManualOrderLine[];
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    fulfillmentType: FulfillmentType;
    discountCents?: number;
    gstRatePercent?: number | null;
    paymentMethod: PaymentMethod;
    notes?: string | null;
  },
) {
  const lines = input.lines.filter((l) => l.quantity > 0 && l.name.trim());
  if (lines.length === 0) throw new EmptyManualOrderError("Add at least one item to the bill.");
  for (const l of lines) {
    if (!Number.isFinite(l.priceCents) || l.priceCents < 0 || !Number.isInteger(l.quantity) || l.quantity < 1) {
      throw new InvalidManualLineError(`Invalid line: "${l.name}".`);
    }
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);

  const rawDiscount = input.discountCents ?? 0;
  const discountCents = Math.min(Math.max(0, Math.round(rawDiscount)), subtotalCents);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { gstRate: true } });
  const gstRate = input.gstRatePercent ?? tenant?.gstRate ?? null;
  const taxableCents = subtotalCents - discountCents;
  const taxCents = gstRate && gstRate > 0 ? Math.round((taxableCents * gstRate) / 100) : 0;

  const totalCents = taxableCents + taxCents;

  const linkedIds = lines.map((l) => l.itemId).filter((id): id is string => Boolean(id));
  const linkedItems = linkedIds.length
    ? await prisma.item.findMany({ where: { tenantId, id: { in: linkedIds } }, include: { station: true } })
    : [];
  const linkedMap = new Map(linkedItems.map((i) => [i.id, i]));

  const { order, newlyLow } = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({
    data: {
      tenantId,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      customerEmail: input.customerEmail?.trim() || null,
      fulfillmentType: input.fulfillmentType,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? null,
      source: "MANUAL",
      subtotalCents,
      discountCents,
      taxCents,
      gstRatePercent: taxCents > 0 ? gstRate : null,
      totalCents,
      // Manual bills are typically settled on the spot — a manually-created
      // order still starts PENDING/UNPAID like any other, the owner marks it
      // paid via the same "Mark as paid" reconciliation flow (or accepts
      // through the normal status flow) rather than this silently assuming
      // payment happened.
      items: {
        create: lines.map((l) => {
          const linked = l.itemId ? linkedMap.get(l.itemId) : undefined;
          return {
            itemId: linked?.id ?? null,
            nameSnapshot: l.name.trim(),
            priceCentsSnapshot: l.priceCents,
            quantity: l.quantity,
            stationId: linked?.station?.id ?? null,
            stationName: linked?.station?.name ?? null,
          };
        }),
      },
    },
    include: { items: true },
  });
  const { newlyLow } = await deductStockForOrder(tx, tenantId, order.id);
  return { order, newlyLow };
  });
  if (newlyLow.length) void notifyLowStock(tenantId, newlyLow);
  return order;
}

/** Tenant-scoped single-order lookup for the printable invoice page — never trust an order id alone. */
export async function getOrderForPrint(tenantId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, tenantId },
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
  // A double-click (the status buttons have no pending/disabled state, and
  // a slow request invites a second click before the first one's re-render
  // lands) resubmits the exact same transition — the order is already
  // where the owner wanted it, so treat that as a harmless no-op rather
  // than an InvalidTransitionError. A genuinely invalid transition (e.g.
  // clicking a stale "Accept" after the order was cancelled elsewhere)
  // still throws below.
  if (order.status === to) return order;
  if (!NEXT_STATUS[order.status].includes(to)) {
    throw new InvalidTransitionError(`Cannot move an order from ${order.status} to ${to}.`);
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({ where: { id: orderId }, data: { status: to } });
    if (to === "CANCELLED") await restoreStockForOrder(tx, tenantId, orderId);
    return updated;
  });
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

/**
 * Permanently deletes an order (its invoice) and its line items. Scoped to the
 * tenant — an id from another restaurant matches nothing. Any ingredient stock
 * the order consumed is put back first (same once-only rule as cancelling), so
 * deleting a bill never leaves inventory short. Returns false if not found.
 */
export async function deleteOrder(tenantId: string, orderId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, tenantId }, select: { id: true } });
    if (!order) return false;
    await restoreStockForOrder(tx, tenantId, orderId);
    await tx.order.deleteMany({ where: { id: orderId, tenantId } });
    return true;
  });
}
