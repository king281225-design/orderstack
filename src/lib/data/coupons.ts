import "server-only";
import { prisma } from "@/lib/prisma";
import type { DiscountType } from "@prisma/client";

export class CouponCodeTakenError extends Error {}
export class CouponNotFoundError extends Error {}
export class CouponInactiveError extends Error {}
export class CouponExpiredError extends Error {}
export class CouponRedemptionLimitError extends Error {}
export class CouponMinOrderError extends Error {
  constructor(public minOrderCents: number) {
    super(`This code needs a minimum order of that amount.`);
  }
}

/**
 * Computed here rather than in the dashboard page component: reading the
 * current time is impure, and the coupons page is a Server Component (the
 * lint rule against calling Date.now() during render applies there same as
 * a client one) — this keeps that read to one plain, non-component call.
 */
export async function listCouponsForTenant(tenantId: string) {
  const now = Date.now();
  const coupons = await prisma.coupon.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return coupons.map((c) => ({
    ...c,
    isExpired: c.expiresAt ? c.expiresAt.getTime() < now : false,
    isRedemptionLimitReached: c.maxRedemptions !== null && c.redemptionCount >= c.maxRedemptions,
  }));
}

export async function createCoupon(
  tenantId: string,
  input: {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderCents?: number;
    maxRedemptions?: number | null;
    expiresAt?: Date | null;
  },
) {
  const code = input.code.trim().toUpperCase();
  const existing = await prisma.coupon.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  if (existing) throw new CouponCodeTakenError(`Code "${code}" is already in use.`);

  return prisma.coupon.create({
    data: {
      tenantId,
      code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderCents: input.minOrderCents ?? 0,
      maxRedemptions: input.maxRedemptions ?? null,
      expiresAt: input.expiresAt ?? null,
    },
  });
}

export async function setCouponActive(tenantId: string, couponId: string, isActive: boolean) {
  return prisma.coupon.updateMany({ where: { id: couponId, tenantId }, data: { isActive } });
}

export async function deleteCoupon(tenantId: string, couponId: string) {
  return prisma.coupon.deleteMany({ where: { id: couponId, tenantId } });
}

/**
 * Validates a customer-entered code and computes the discount — used both
 * for the checkout-page live preview (non-authoritative) and, again, inside
 * createOrder (authoritative — the client's preview is never trusted for
 * what actually gets charged). Throws a specific error type per failure
 * reason so callers can show a precise message.
 */
export async function validateCoupon(tenantId: string, rawCode: string, subtotalCents: number) {
  const code = rawCode.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { tenantId_code: { tenantId, code } } });

  if (!coupon) throw new CouponNotFoundError(`Coupon "${code}" not found.`);
  if (!coupon.isActive) throw new CouponInactiveError("This coupon is no longer active.");
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw new CouponExpiredError("This coupon has expired.");
  }
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    throw new CouponRedemptionLimitError("This coupon has reached its redemption limit.");
  }
  if (subtotalCents < coupon.minOrderCents) {
    throw new CouponMinOrderError(coupon.minOrderCents);
  }

  const discountCents =
    coupon.discountType === "PERCENT"
      ? Math.floor((subtotalCents * coupon.discountValue) / 100)
      : Math.min(coupon.discountValue, subtotalCents);

  return { coupon, discountCents };
}

/**
 * Atomically increments redemptionCount only if the limit (if any) hasn't
 * been hit — guards against two concurrent checkouts both slipping past the
 * count check in validateCoupon above. maxRedemptions is the value read
 * moments earlier by validateCoupon; the row's current redemptionCount is
 * still read fresh by this UPDATE ... WHERE, which is what makes the check
 * atomic (a plain read-then-write in application code would not be).
 * Returns false if the increment lost the race, in which case the caller
 * should treat it as "limit reached" rather than let the order through
 * uncounted.
 */
export async function tryRedeemCoupon(couponId: string, maxRedemptions: number | null): Promise<boolean> {
  const result = await prisma.coupon.updateMany({
    where: {
      id: couponId,
      ...(maxRedemptions === null ? {} : { redemptionCount: { lt: maxRedemptions } }),
    },
    data: { redemptionCount: { increment: 1 } },
  });
  return result.count === 1;
}
