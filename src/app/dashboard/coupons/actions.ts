"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { createCoupon, setCouponActive, deleteCoupon, CouponCodeTakenError } from "@/lib/data/coupons";
import { rupeesToCents } from "@/lib/money";
import type { DiscountType } from "@prisma/client";

export type CouponActionState = { error: string | null };
const ok: CouponActionState = { error: null };

export async function createCouponAction(
  _prev: CouponActionState,
  formData: FormData,
): Promise<CouponActionState> {
  const session = await requireOwnerSession();

  const code = String(formData.get("code") ?? "").trim();
  const discountType = String(formData.get("discountType") ?? "PERCENT") as DiscountType;
  const discountValueRaw = String(formData.get("discountValue") ?? "");
  const minOrderRaw = String(formData.get("minOrder") ?? "");
  const maxRedemptionsRaw = String(formData.get("maxRedemptions") ?? "");
  const expiresAtRaw = String(formData.get("expiresAt") ?? "");

  if (!code) return { error: "Code is required." };

  const discountValue =
    discountType === "PERCENT" ? Number(discountValueRaw) : rupeesToCents(discountValueRaw);
  if (!discountValue || discountValue <= 0) return { error: "Enter a valid discount value." };
  if (discountType === "PERCENT" && discountValue > 100) {
    return { error: "A percent discount can't exceed 100." };
  }

  try {
    await createCoupon(session.tenantId, {
      code,
      discountType,
      discountValue,
      minOrderCents: minOrderRaw ? rupeesToCents(minOrderRaw) : 0,
      maxRedemptions: maxRedemptionsRaw ? Number(maxRedemptionsRaw) : null,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
    });
  } catch (err) {
    if (err instanceof CouponCodeTakenError) return { error: err.message };
    return { error: "Could not create coupon." };
  }

  revalidatePath("/dashboard/coupons");
  return ok;
}

export async function setCouponActiveAction(couponId: string, isActive: boolean) {
  const session = await requireOwnerSession();
  await setCouponActive(session.tenantId, couponId, isActive);
  revalidatePath("/dashboard/coupons");
}

export async function deleteCouponAction(couponId: string) {
  const session = await requireOwnerSession();
  await deleteCoupon(session.tenantId, couponId);
  revalidatePath("/dashboard/coupons");
}
