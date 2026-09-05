"use server";

import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/auth";
import { advanceOrderStatus } from "@/lib/data/orders";
import { setTenantOpen } from "@/lib/data/tenants";
import type { OrderStatus } from "@prisma/client";

export async function advanceOrderStatusAction(orderId: string, to: OrderStatus) {
  const session = await requireTenantSession();
  await advanceOrderStatus(session.tenantId, orderId, to);
  revalidatePath("/dashboard");
}

export async function toggleOpenAction(isOpen: boolean) {
  const session = await requireTenantSession();
  await setTenantOpen(session.tenantId, isOpen);
  revalidatePath("/dashboard");
}
