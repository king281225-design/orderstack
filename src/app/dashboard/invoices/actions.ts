"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { deleteOrder } from "@/lib/data/orders";

/** Owner-only: permanently removes an invoice (the underlying order). */
export async function deleteInvoiceAction(orderId: string): Promise<{ error: string | null }> {
  const session = await requireOwnerSession();
  const deleted = await deleteOrder(session.tenantId, orderId);
  if (!deleted) return { error: "Invoice not found." };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/kot");
  return { error: null };
}
