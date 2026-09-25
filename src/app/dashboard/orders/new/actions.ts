"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/auth";
import {
  createManualOrder,
  EmptyManualOrderError,
  InvalidManualLineError,
  type ManualOrderLine,
} from "@/lib/data/orders";
import { rupeesToCents } from "@/lib/money";
import type { FulfillmentType, PaymentMethod } from "@prisma/client";

export type CreateManualOrderState = { error: string | null };

/**
 * Owner/staff-facing "create a bill" form (/dashboard/orders/new). Line
 * items arrive as a JSON string (name/priceRupees/quantity per row) from the
 * client form's dynamic row list — parsed and validated here, never trusted
 * as-is: createManualOrder itself re-validates every number and recomputes
 * subtotal/discount/tax/total from scratch, exactly like the storefront
 * checkout path does for a customer's cart.
 */
export async function createManualOrderAction(
  _prev: CreateManualOrderState,
  formData: FormData,
): Promise<CreateManualOrderState> {
  const session = await requireTenantSession();

  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();
  const fulfillmentType = String(formData.get("fulfillmentType") ?? "TAKEAWAY") as FulfillmentType;
  const tableLabel = String(formData.get("tableLabel") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "COD") as PaymentMethod;
  const notes = String(formData.get("notes") ?? "").trim();
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

  let order;
  try {
    order = await createManualOrder(session.tenantId, {
      lines,
      // Name and phone are optional for counter/walk-in bills. The columns
      // are required, so a blank name becomes "Walk-in customer" and a blank
      // phone is stored empty (empty phones are never grouped as a customer).
      customerName: customerName || "Walk-in customer",
      customerPhone,
      customerEmail: customerEmail || null,
      fulfillmentType,
      tableLabel: tableLabel || null,
      paymentMethod,
      notes: notes || null,
      ...(discountMode === "percent"
        ? { discountPercent: discountRupees ? Number(discountRupees) : 0 }
        : { discountCents: discountRupees ? rupeesToCents(discountRupees) : 0 }),
      gstRatePercent: gstRateRaw ? Number(gstRateRaw) : null,
    });
  } catch (err) {
    if (err instanceof EmptyManualOrderError || err instanceof InvalidManualLineError) {
      return { error: err.message };
    }
    return { error: "Could not create this order." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/kot");
  revalidatePath("/dashboard/tables/board");
  // Which button was clicked: plain save, save & print the bill, or save & print the KOT.
  const intent = String(formData.get("intent") ?? "bill");
  if (intent === "kot") redirect(`/dashboard/orders/${order.id}/kot`);
  if (intent === "save") redirect("/dashboard");
  redirect(`/dashboard/orders/${order.id}/print`);
}
