"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession, requireTenantSession } from "@/lib/auth";
import { advanceOrderStatus, markOrderPaid, markOrderRefunded } from "@/lib/data/orders";
import { parsePaymentSourceInput } from "@/lib/payment-sources";
import { dismissOnboarding, setTenantOpen } from "@/lib/data/tenants";
import { acknowledgeWaiterCall } from "@/lib/data/waiter-calls";
import type { OrderStatus } from "@prisma/client";

export async function advanceOrderStatusAction(orderId: string, to: OrderStatus) {
  const session = await requireTenantSession();
  await advanceOrderStatus(session.tenantId, orderId, to);
  revalidatePath("/dashboard");
}

/** Manual reconciliation for COD/UPI orders (see schema comment on Order.paymentStatus). */
export async function markOrderPaidAction(
  orderId: string,
  payment: { source?: string; label?: string; reference?: string } = {},
) {
  const session = await requireTenantSession();
  const { source, label, reference } = parsePaymentSourceInput(payment);
  await markOrderPaid(session.tenantId, orderId, { source, label, reference });
  revalidatePath("/dashboard");
}

/** Owner flags a paid order as refunded (the money went back out of band). */
export async function markOrderRefundedAction(orderId: string) {
  const session = await requireOwnerSession();
  await markOrderRefunded(session.tenantId, orderId);
  revalidatePath("/dashboard");
}

export async function toggleOpenAction(isOpen: boolean) {
  const session = await requireTenantSession();
  await setTenantOpen(session.tenantId, isOpen);
  revalidatePath("/dashboard");
}

export async function dismissOnboardingAction() {
  const session = await requireTenantSession();
  await dismissOnboarding(session.tenantId);
  revalidatePath("/dashboard");
}

export async function acknowledgeWaiterCallAction(id: string) {
  const session = await requireTenantSession();
  await acknowledgeWaiterCall(session.tenantId, id);
  revalidatePath("/dashboard");
}
