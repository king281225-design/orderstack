"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import {
  startTenantSubscription,
  verifyAndActivateSubscription,
  cancelTenantSubscription,
} from "@/lib/data/tenants";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";

export type StartSubscriptionResult = { error: string | null; subscriptionId: string | null };

export async function startSubscriptionAction(): Promise<StartSubscriptionResult> {
  const session = await requireOwnerSession();
  if (!isRazorpayConfigured()) {
    return { error: "Online billing isn't set up yet.", subscriptionId: null };
  }
  try {
    const subscription = await startTenantSubscription(session.tenantId);
    return { error: null, subscriptionId: subscription.id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not start a subscription.",
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
