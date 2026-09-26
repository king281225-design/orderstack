import "server-only";
import { prisma } from "@/lib/prisma";
import { getItemsForOrder } from "@/lib/data/menu";
import { validateCoupon, tryRedeemCoupon, CouponRedemptionLimitError } from "@/lib/data/coupons";
import { deductStockForOrder, restoreStockForOrder, notifyLowStockItems } from "@/lib/data/inventory";
import { markTableOccupiedFromOrder } from "@/lib/data/tables";
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

  const { order, newlyLowItems } = await prisma.$transaction(async (tx) => {
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
  const { newlyLowItems } = await deductStockForOrder(tx, tenantId, order.id);
  if (order.fulfillmentType === "DINE_IN") await markTableOccupiedFromOrder(tx, tenantId, order.tableLabel);
  return { order, newlyLowItems };
  });
  if (newlyLowItems.length) void notifyLowStockItems(tenantId, newlyLowItems);
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
    /** Only meaningful for DINE_IN — matched against the status board's Table.label by value (see src/lib/data/tables.ts). */
    tableLabel?: string | null;
    discountCents?: number;
    /** 0-100; when set and > 0, takes precedence over discountCents. Always computed here from the server's own subtotal — never trusted from the client's live preview. */
    discountPercent?: number | null;
    gstRatePercent?: number | null;
    paymentMethod: PaymentMethod;
    notes?: string | null;
    /** Owner ticked "Mark as paid" while creating the bill — settles it immediately instead of the usual after-the-fact reconciliation (see markOrderPaid). */
    markAsPaid?: boolean;
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

  const discountCents =
    input.discountPercent && input.discountPercent > 0
      ? Math.round((subtotalCents * Math.min(100, Math.max(0, input.discountPercent))) / 100)
      : Math.min(Math.max(0, Math.round(input.discountCents ?? 0)), subtotalCents);

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

  const { order, newlyLowItems } = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({
    data: {
      tenantId,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      customerEmail: input.customerEmail?.trim() || null,
      fulfillmentType: input.fulfillmentType,
      tableLabel: input.fulfillmentType === "DINE_IN" ? input.tableLabel?.trim() || null : null,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? null,
      source: "MANUAL",
      subtotalCents,
      discountCents,
      taxCents,
      gstRatePercent: taxCents > 0 ? gstRate : null,
      totalCents,
      // Manual bills are typically settled on the spot — defaults to
      // PENDING/UNPAID like any other order, unless the owner explicitly
      // ticked "Mark as paid" while creating this bill (otherwise it's
      // settled after the fact via the same reconciliation flow, or through
      // the normal status flow).
      paymentStatus: input.markAsPaid ? "PAID" : "PENDING",
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
  const { newlyLowItems } = await deductStockForOrder(tx, tenantId, order.id);
  if (order.fulfillmentType === "DINE_IN") await markTableOccupiedFromOrder(tx, tenantId, order.tableLabel);
  return { order, newlyLowItems };
  });
  if (newlyLowItems.length) void notifyLowStockItems(tenantId, newlyLowItems);
  return order;
}

export class OrderNotEditableError extends Error {}

/**
 * Adds/removes/adjusts line items on an ALREADY-CREATED order — the "same
 * customer ordered more (or wants something taken off) a few minutes later"
 * case, so the table/counter ends up with one running bill instead of a
 * second, separate one. Works for either order source (storefront or manual
 * bill). Only allowed while the order is still open: not yet
 * completed/cancelled, and not yet marked paid (editing a settled invoice
 * would silently change a total the customer already paid against — the
 * owner cancels and re-bills instead in that case).
 *
 * Every number is recomputed from scratch here exactly like createManualOrder
 * does — the client's live total preview is never trusted. The existing
 * discount is preserved as an absolute amount (re-clamped to the new
 * subtotal) unless the caller passes a new one; gstRatePercent likewise
 * falls back to whatever was already on the order.
 *
 * Stock: this order's own prior deduction is fully reversed
 * (restoreStockForOrder, the same "undo" path `deleteOrder`/cancelling
 * already use) and then re-deducted fresh against the new line list, so an
 * added item is deducted, a removed one is put back, and an unchanged one
 * nets to the same stock level it already had — never double-counted.
 */
export async function updateOrderItems(
  tenantId: string,
  orderId: string,
  input: {
    lines: ManualOrderLine[];
    discountCents?: number;
    discountPercent?: number | null;
    gstRatePercent?: number | null;
  },
) {
  const existing = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
  if (!existing) throw new Error("Order not found for this restaurant.");
  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
    throw new OrderNotEditableError("This order is already completed or cancelled — it can no longer be edited.");
  }
  if (existing.paymentStatus === "PAID") {
    throw new OrderNotEditableError("This order is already marked paid — edits are disabled so the invoice stays accurate.");
  }

  const lines = input.lines.filter((l) => l.quantity > 0 && l.name.trim());
  if (lines.length === 0) throw new EmptyManualOrderError("A bill needs at least one item — cancel it instead of removing everything.");
  for (const l of lines) {
    if (!Number.isFinite(l.priceCents) || l.priceCents < 0 || !Number.isInteger(l.quantity) || l.quantity < 1) {
      throw new InvalidManualLineError(`Invalid line: "${l.name}".`);
    }
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
  const discountCents =
    input.discountPercent && input.discountPercent > 0
      ? Math.round((subtotalCents * Math.min(100, Math.max(0, input.discountPercent))) / 100)
      : Math.min(Math.max(0, Math.round(input.discountCents ?? existing.discountCents)), subtotalCents);
  const gstRate = input.gstRatePercent ?? existing.gstRatePercent ?? null;
  const taxableCents = subtotalCents - discountCents;
  const taxCents = gstRate && gstRate > 0 ? Math.round((taxableCents * gstRate) / 100) : 0;
  const totalCents = taxableCents + taxCents;

  const linkedIds = lines.map((l) => l.itemId).filter((id): id is string => Boolean(id));
  const linkedItems = linkedIds.length
    ? await prisma.item.findMany({ where: { tenantId, id: { in: linkedIds } }, include: { station: true } })
    : [];
  const linkedMap = new Map(linkedItems.map((i) => [i.id, i]));

  const { order, newlyLowItems } = await prisma.$transaction(async (tx) => {
    await restoreStockForOrder(tx, tenantId, orderId);
    // restoreStockForOrder only flips stockRestoredAt — reset both flags so
    // the fresh deductStockForOrder call below isn't skipped as a no-op.
    await tx.order.update({ where: { id: orderId }, data: { stockDeductedAt: null, stockRestoredAt: null } });
    await tx.orderItem.deleteMany({ where: { orderId } });
    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        subtotalCents,
        discountCents,
        taxCents,
        gstRatePercent: taxCents > 0 ? gstRate : null,
        totalCents,
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
    const { newlyLowItems } = await deductStockForOrder(tx, tenantId, orderId);
    return { order, newlyLowItems };
  });
  if (newlyLowItems.length) void notifyLowStockItems(tenantId, newlyLowItems);
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

/**
 * Figures for the Orders board's top strip: today's non-cancelled orders and
 * revenue, plus yesterday's order count for the "vs yesterday" comparison.
 * "Today" starts at local midnight of the server, the same convention the
 * analytics presets use.
 */
export async function getTodayOrderStats(tenantId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - 1);
  const counted = { tenantId, status: { not: "CANCELLED" as const } };
  const [today, yesterday] = await Promise.all([
    prisma.order.aggregate({
      where: { ...counted, createdAt: { gte: start } },
      _count: { _all: true },
      _sum: { totalCents: true },
    }),
    prisma.order.count({ where: { ...counted, createdAt: { gte: prevStart, lt: start } } }),
  ]);
  return {
    ordersToday: today._count._all,
    revenueTodayCents: today._sum.totalCents ?? 0,
    ordersYesterday: yesterday,
  };
}
