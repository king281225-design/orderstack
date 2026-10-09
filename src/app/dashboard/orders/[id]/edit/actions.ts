"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/auth";
import {
  updateOrderItems,
  EmptyManualOrderError,
  InvalidManualLineError,
  OrderNotEditableError,
  type ManualOrderLine,
} from "@/lib/data/orders";
import { getTenantById } from "@/lib/data/tenants";
import { sendOwnerOrderEditWhatsApp } from "@/lib/notifications/whatsapp";
import { rupeesToCents } from "@/lib/money";

export type UpdateOrderItemsState = { error: string | null };

/**
 * Adds/removes/adjusts items on an already-created bill (/dashboard/orders/[id]/edit)
 * — the "same customer ordered more a few minutes later" flow — instead of
 * creating a second, separate bill for the same table/customer. Mirrors
 * createManualOrderAction's own parsing/validation; updateOrderItems itself
 * re-validates and recomputes every number from scratch, never trusting the
 * client's live preview.
 */
export async function updateOrderItemsAction(
  _prev: UpdateOrderItemsState,
  formData: FormData,
): Promise<UpdateOrderItemsState> {
  const session = await requireTenantSession();

  const orderId = String(formData.get("orderId") ?? "");
  const discountMode = String(formData.get("discountMode") ?? "flat");
  const discountRupees = String(formData.get("discount") ?? "");
  const gstRateRaw = String(formData.get("gstRate") ?? "");
  const linesRaw = String(formData.get("lines") ?? "[]");

  let parsedLines: { name: string; priceRupees: number; quantity: number; itemId?: string }[];
  try {
    parsedLines = JSON.parse(linesRaw);
  } catch {
    return { error: "Could not read the item list." };
  }

  const lines: ManualOrderLine[] = parsedLines.map((l) => ({
    name: String(l.name ?? ""),
    priceCents: rupeesToCents(l.priceRupees),
    quantity: Number(l.quantity) || 0,
    itemId: typeof l.itemId === "string" && l.itemId ? l.itemId : null,
  }));

  let updated;
  try {
    updated = await updateOrderItems(session.tenantId, orderId, {
      lines,
      ...(discountMode === "percent"
        ? { discountPercent: discountRupees ? Number(discountRupees) : 0 }
        : { discountCents: discountRupees ? rupeesToCents(discountRupees) : 0 }),
      gstRatePercent: gstRateRaw ? Number(gstRateRaw) : null,
      editedByUserId: session.sub,
      editedByName: session.email,
    });
  } catch (err) {
    if (err instanceof EmptyManualOrderError || err instanceof InvalidManualLineError || err instanceof OrderNotEditableError) {
      return { error: err.message };
    }
    return { error: "Could not update this order." };
  }

  // Tier A (zero credentials, always available): a prefilled wa.me link on
  // the history screen. Tier B (dormant until real WhatsApp API keys exist):
  // this fire-and-forget automatic send — see src/lib/notifications/whatsapp.ts.
  const tenant = await getTenantById(session.tenantId);
  if (tenant?.ownerWhatsapp) {
    void sendOwnerOrderEditWhatsApp(tenant.ownerWhatsapp, tenant.name, {
      orderNumber: updated.orderNumber,
      editedByName: session.email,
      totalCents: updated.totalCents,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/kot");
  revalidatePath("/dashboard/tables/board");
  revalidatePath(`/dashboard/orders/${orderId}/history`);
  revalidatePath("/dashboard/orders/history");
  const intent = String(formData.get("intent") ?? "bill");
  if (intent === "kot") redirect(`/dashboard/orders/${orderId}/kot`);
  if (intent === "save") redirect("/dashboard");
  redirect(`/dashboard/orders/${orderId}/print`);
}
