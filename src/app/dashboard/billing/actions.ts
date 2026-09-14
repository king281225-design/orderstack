"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import {
  startTenantSubscription,
  verifyAndActivateSubscription,
  cancelTenantSubscription,
  validateWelcomeCoupon,
  startDiscountedPlanPurchase,
  verifyAndActivateDiscountedPlanPurchase,
} from "@/lib/data/tenants";
import { isRazorpayConfigured, extractRazorpayErrorMessage } from "@/lib/payments/razorpay";
import { PLAN_TIERS } from "@/lib/plans";
import type { PlanTier } from "@prisma/client";

export type StartSubscriptionResult = { error: string | null; subscriptionId: string | null };

/** tier is whichever plan card's Subscribe button the owner clicked — never trust it further than "is this a real tier". */
export async function startSubscriptionAction(tier: PlanTier): Promise<StartSubscriptionResult> {
  const session = await requireOwnerSession();
  if (!isRazorpayConfigured()) {
    return { error: "Online billing isn't set up yet.", subscriptionId: null };
  }
  if (!PLAN_TIERS.includes(tier)) {
    return { error: "Not a valid plan.", subscriptionId: null };
  }
  try {
    const subscription = await startTenantSubscription(session.tenantId, tier);
    return { error: null, subscriptionId: subscription.id };
  } catch (err) {
    return {
      error: extractRazorpayErrorMessage(err, "Could not start a subscription."),
      subscriptionId: null,
    };
  }
}

export async function verifySubscriptionAction(
  razorpaySubscriptionId: string,
  razorpayPaymentId: string,
  signature: string,
): Promise<void> {
  const session = await requireOwnerSession();
  try {
    await verifyAndActivateSubscription(session.tenantId, razorpaySubscriptionId, razorpayPaymentId, signature);
  } catch {
    // Verification failing here just means the badge stays as-is — the
    // webhook (once wired up post-deployment) is the authoritative path
    // regardless, same as one-time payments.
  }
  revalidatePath("/dashboard/billing");
}

export async function cancelSubscriptionAction(): Promise<void> {
  const session = await requireOwnerSession();
  await cancelTenantSubscription(session.tenantId);
  revalidatePath("/dashboard/billing");
}

export type WelcomeCouponPreviewResult =
  | { error: string; originalPriceCents?: undefined; discountCents?: undefined; finalPriceCents?: undefined }
  | { error: null; originalPriceCents: number; discountCents: number; finalPriceCents: number };

/** Live preview as the owner types the code — never trusted for the actual charge, see startDiscountedPlanPurchaseAction. tier is whichever plan card the "have a code?" box lives on. */
export async function previewWelcomeCouponAction(
  code: string,
  tier: PlanTier,
): Promise<WelcomeCouponPreviewResult> {
  const session = await requireOwnerSession();
  try {
    const preview = await validateWelcomeCoupon(session.tenantId, code, tier);
    return { error: null, ...preview };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid coupon." };
  }
}

export type StartDiscountedPurchaseResult = { error: string | null; orderId: string | null; amountCents: number | null };

export async function startDiscountedPlanPurchaseAction(
  code: string,
  tier: PlanTier,
): Promise<StartDiscountedPurchaseResult> {
  const session = await requireOwnerSession();
  if (!isRazorpayConfigured()) {
    return { error: "Online billing isn't set up yet.", orderId: null, amountCents: null };
  }
  try {
    const { order, finalPriceCents } = await startDiscountedPlanPurchase(session.tenantId, code, tier);
    return { error: null, orderId: order.id, amountCents: finalPriceCents };
  } catch (err) {
    return {
      error: extractRazorpayErrorMessage(err, "Could not start this purchase."),
      orderId: null,
      amountCents: null,
    };
  }
}

export async function verifyDiscountedPlanPurchaseAction(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): Promise<void> {
  const session = await requireOwnerSession();
  try {
    await verifyAndActivateDiscountedPlanPurchase(session.tenantId, razorpayOrderId, razorpayPaymentId, signature);
  } catch {
    // Same fallback stance as verifySubscriptionAction — the webhook (once
    // wired up post-deployment) is the authoritative path regardless.
  }
  revalidatePath("/dashboard/billing");
}
