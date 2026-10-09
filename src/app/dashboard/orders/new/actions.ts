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
import { parsePaymentSourceInput } from "@/lib/payment-sources";
import type { FulfillmentType, PaymentMethod } from "@prisma/client";

export type CreateManualOrderState = { error: string | null };

/**
 * Shared parsing between the real form submission (createManualOrderAction,
 * which redirects afterward) and the offline queue's background sync
 * (syncQueuedBillAction, which must NOT redirect — see
 * src/lib/offline-bill-queue.ts). Line items arrive as a JSON string (name/
 * priceRupees/quantity per row) from the client form's dynamic row list —
 * parsed and validated here, never trusted as-is: createManualOrder itself
 * re-validates every number and recomputes subtotal/discount/tax/total from
 * scratch, exactly like the storefront checkout path does for a customer's
 * cart.
 */
type ParsedManualOrder =
  | { ok: false; error: string }
  | { ok: true; input: Parameters<typeof createManualOrder>[1] };

function parseManualOrderFormData(formData: FormData): ParsedManualOrder {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();
  const fulfillmentType = String(formData.get("fulfillmentType") ?? "TAKEAWAY") as FulfillmentType;
  const tableLabel = String(formData.get("tableLabel") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "COD") as PaymentMethod;
  const markAsPaid = formData.get("markAsPaid") === "on";
  const notes = String(formData.get("notes") ?? "").trim();
  const discountMode = String(formData.get("discountMode") ?? "flat");
  const discountRupees = String(formData.get("discount") ?? "");
  const gstRateRaw = String(formData.get("gstRate") ?? "");
  const linesRaw = String(formData.get("lines") ?? "[]");

  let parsedLines: { name: string; priceRupees: number; quantity: number; itemId?: string }[];
  try {
    parsedLines = JSON.parse(linesRaw);
  } catch {
    return { ok: false, error: "Could not read the item list." };
  }

  const lines: ManualOrderLine[] = parsedLines.map((l) => ({
    name: String(l.name ?? ""),
    priceCents: rupeesToCents(l.priceRupees),
    quantity: Number(l.quantity) || 0,
    itemId: typeof l.itemId === "string" && l.itemId ? l.itemId : null,
  }));

  const p = parsePaymentSourceInput({
    source: formData.get("paymentSource"),
    label: formData.get("paymentSourceLabel"),
    reference: formData.get("paymentReference"),
  });

  return {
    ok: true,
    input: {
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
      markAsPaid,
      paymentSource: p.source,
      paymentSourceLabel: p.label,
      paymentReference: p.reference,
      notes: notes || null,
      ...(discountMode === "percent"
        ? { discountPercent: discountRupees ? Number(discountRupees) : 0 }
        : { discountCents: discountRupees ? rupeesToCents(discountRupees) : 0 }),
      gstRatePercent: gstRateRaw ? Number(gstRateRaw) : null,
    },
  };
}

function revalidateOrderPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/kot");
  revalidatePath("/dashboard/tables/board");
}

export async function createManualOrderAction(
  _prev: CreateManualOrderState,
  formData: FormData,
): Promise<CreateManualOrderState> {
  const session = await requireTenantSession();

  const parsed = parseManualOrderFormData(formData);
  if (!parsed.ok) return { error: parsed.error };

  let order;
  try {
    order = await createManualOrder(session.tenantId, parsed.input);
  } catch (err) {
    if (err instanceof EmptyManualOrderError || err instanceof InvalidManualLineError) {
      return { error: err.message };
    }
    return { error: "Could not create this order." };
  }

  revalidateOrderPaths();
  // Which button was clicked: plain save, save & print the bill, or save & print the KOT.
  const intent = String(formData.get("intent") ?? "bill");
  if (intent === "kot") redirect(`/dashboard/orders/${order.id}/kot`);
  if (intent === "save") redirect("/dashboard");
  redirect(`/dashboard/orders/${order.id}/print`);
}

/**
 * Background sync for a bill queued while offline (src/lib/offline-bill-
 * queue.ts, src/components/orders/offline-bill-indicator.tsx) — deliberately
 * does NOT redirect (unlike createManualOrderAction above): this runs
 * unattended after the browser's `online` event fires, possibly flushing
 * several queued bills in a row, so navigating away mid-flush would be
 * wrong. Returns a plain result instead.
 */
export async function syncQueuedBillAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireTenantSession();

  const parsed = parseManualOrderFormData(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    await createManualOrder(session.tenantId, parsed.input);
  } catch (err) {
    if (err instanceof EmptyManualOrderError || err instanceof InvalidManualLineError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Could not create this order." };
  }

  revalidateOrderPaths();
  return { ok: true };
}
