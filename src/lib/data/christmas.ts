import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * The owner-picked prize pool for the Christmas Spin & Win game
 * (Tenant.christmasSpinCouponIds — a JSON array of this tenant's own Coupon
 * ids). Re-validated against live Coupon rows on every read, same spirit as
 * getActivePromotableCoupons: a coupon the owner later disables, deletes, or
 * lets expire silently falls out of the pool instead of erroring.
 */
export async function getSpinPool(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { christmasSpinCouponIds: true },
  });
  const ids = parseCouponIds(tenant?.christmasSpinCouponIds);
  if (ids.length === 0) return [];

  const now = Date.now();
  const coupons = await prisma.coupon.findMany({ where: { id: { in: ids }, tenantId } });
  return coupons.filter(
    (c) =>
      c.isActive &&
      (!c.expiresAt || c.expiresAt.getTime() >= now) &&
      (c.maxRedemptions === null || c.redemptionCount < c.maxRedemptions),
  );
}

/** Untrusted JSON from the database — drop anything that isn't an array of strings. */
function parseCouponIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/**
 * Called from /dashboard/christmas's own server action — couponIds must
 * already be verified to belong to this tenant by the caller (see
 * setChristmasSpinPoolAction), this just persists the chosen set.
 */
export async function setSpinPool(tenantId: string, couponIds: string[]): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { christmasSpinCouponIds: couponIds },
  });
}

export type SpinResult =
  | { ok: true; code: string; discountType: "PERCENT" | "FIXED"; discountValue: number }
  | { ok: false; reason: "already_spun" | "no_prizes" };

/**
 * The real pick-and-award, run server-side only — the client never computes
 * or previews a result before this has committed one (same trust boundary as
 * validateCoupon for a typed-in code). Winning does NOT consume a coupon
 * redemption: checkout counts it when the order is placed, exactly as for a
 * typed-in code. Consuming it here as well double-counted every winner, so a
 * coupon at its limit rejected the very customer who had just won it (and
 * anyone scripting spins could exhaust a real coupon). An exhausted coupon
 * still drops out of the pool — see getSpinPool.
 */
export async function spinForPrize(
  tenantId: string,
  deviceId: string,
  phone: string | null,
): Promise<SpinResult> {
  // Anti-abuse check — explicitly NOT airtight. A cleared-storage + new
  // phone number combination can get a second spin; that's an accepted
  // tradeoff for a seasonal engagement feature, not a payment/fraud control.
  const alreadySpun = await prisma.christmasSpin.findFirst({
    where: {
      tenantId,
      OR: [{ deviceId }, ...(phone ? [{ customerPhone: phone }] : [])],
    },
    select: { id: true },
  });
  if (alreadySpun) return { ok: false, reason: "already_spun" };

  const pool = await getSpinPool(tenantId);
  if (pool.length === 0) return { ok: false, reason: "no_prizes" };

  const coupon = pool[Math.floor(Math.random() * pool.length)];
  await prisma.christmasSpin.create({
    data: { tenantId, deviceId, customerPhone: phone, couponId: coupon.id },
  });
  return {
    ok: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
  };
}

/** Lightweight log for /dashboard/christmas — no charts, no date-range picker, just the last ~50 spins. */
export async function listRecentSpins(tenantId: string) {
  return prisma.christmasSpin.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { coupon: { select: { code: true } } },
  });
}
