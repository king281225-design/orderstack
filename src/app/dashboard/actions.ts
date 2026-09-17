"use server";

import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/auth";
import { advanceOrderStatus, markOrderPaid } from "@/lib/data/orders";
import { setTenantOpen } from "@/lib/data/tenants";
import { acknowledgeWaiterCall } from "@/lib/data/waiter-calls";
import type { OrderStatus } from "@prisma/client";

export async function advanceOrderStatusAction(orderId: string, to: OrderStatus) {
  const session = await requireTenantSession();
  await advanceOrderStatus(session.tenantId, orderId, to);
  revalidatePath("/dashboard");
}

/** Manual reconciliation for COD/UPI orders (see schema comment on Order.paymentStatus). */
export async function markOrderPaidAction(orderId: string) {
  const session = await requireTenantSession();
  await markOrderPaid(session.tenantId, orderId);
  revalidatePath("/dashboard");
}

export async function toggleOpenAction(isOpen: boolean) {
  const session = await requireTenantSession();
  await setTenantOpen(session.tenantId, isOpen);
  revalidatePath("/dashboard");
}

export async function acknowledgeWaiterCallAction(id: string) {
  const session = await requireTenantSession();
  await acknowledgeWaiterCall(session.tenantId, id);
  revalidatePath("/dashboard");
}
