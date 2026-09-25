import "server-only";
import { Prisma } from "@prisma/client";
import type { PurchaseLineConfidence, PurchaseScanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { itemStockLevel } from "@/lib/data/inventory";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

export class PurchaseError extends Error {}
export class DuplicatePurchaseError extends PurchaseError {}

/** "Undo within 10 minutes" — see undoPurchase. */
export const UNDO_WINDOW_MS = 10 * 60 * 1000;

// ------------------------------------------------------------- match candidates

/**
 * A bill-scan line can only ever restock a direct-stock Product
 * (Item.trackStock) — BhojSetu has no separate raw-material stock system —
 * sent to the AI extraction prompt so it can match a bill line against the
 * owner's real product list, and used again server-side to resolve/validate
 * whatever it returns. `key` is what the AI is asked to copy back verbatim.
 */
export type MatchCandidate = {
  key: string;
  id: string;
  name: string;
  aliases: string[];
  lastRateCents: number | null;
};

function readAliases(json: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((a): a is string => typeof a === "string");
}

export async function buildMatchCandidates(tenantId: string): Promise<MatchCandidate[]> {
  const items = await prisma.item.findMany({ where: { tenantId, trackStock: true }, orderBy: { name: "asc" } });
  return items.map((i) => ({
    key: i.id,
    id: i.id,
    name: i.name,
    aliases: readAliases(i.aliases),
    lastRateCents: i.purchasePriceCents ?? null,
  }));
}

// -------------------------------------------------------------------- suppliers

export async function listSuppliers(tenantId: string) {
  return prisma.supplier.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

async function findOrCreateSupplier(
  tx: Prisma.TransactionClient,
  tenantId: string,
  name: string,
  phone: string | null,
): Promise<{ id: string; name: string } | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const existing = await tx.supplier.findUnique({ where: { tenantId_name: { tenantId, name: trimmed } } });
  if (existing) {
    if (phone && !existing.phone) {
      await tx.supplier.update({ where: { id: existing.id }, data: { phone } });
    }
    return existing;
  }
  return tx.supplier.create({ data: { tenantId, name: trimmed, phone: phone?.trim() || null } });
}

/** "Yeh bill pehle se add hai" — same supplier + bill number + bill date already recorded (and not undone). */
export async function checkDuplicateBill(
  tenantId: string,
  supplierName: string | null,
  billNumber: string | null,
  billDate: Date | null,
): Promise<boolean> {
  const trimmedSupplier = supplierName?.trim();
  const trimmedBillNo = billNumber?.trim();
  if (!trimmedSupplier || !trimmedBillNo) return false;
  const existing = await prisma.purchase.findFirst({
    where: {
      tenantId,
      supplierNameSnapshot: trimmedSupplier,
      billNumber: trimmedBillNo,
      undoneAt: null,
      ...(billDate ? { billDate } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

// ---------------------------------------------------------------------- scans

export async function createPurchaseScan(tenantId: string, imageUrls: string[]) {
  return prisma.purchaseScan.create({ data: { tenantId, imageUrls, status: "PROCESSING" } });
}

export async function markPurchaseScanResult(
  tenantId: string,
  scanId: string,
  input: { status: PurchaseScanStatus; rawModelOutput?: unknown; modelName?: string; errorMessage?: string | null },
) {
  await prisma.purchaseScan.updateMany({
    where: { id: scanId, tenantId },
    data: {
      status: input.status,
      rawModelOutput: input.rawModelOutput === undefined ? undefined : (input.rawModelOutput as Prisma.InputJsonValue),
      modelName: input.modelName,
      errorMessage: input.errorMessage ?? null,
    },
  });
}

// -------------------------------------------------------------- confirm purchase

export type ConfirmPurchaseLine = {
  nameOnBill: string;
  /** null (with newProduct also null) = "skip this line" — recorded for the record, but restocks nothing. */
  matchedId: string | null;
  /**
   * Set instead of matchedId to create a brand-new sellable Product from
   * this line ("Naya item banao"). A photo can't tell you what to CHARGE for
   * something, so sellingPriceCents is always a real owner-entered number,
   * never invented — purchasePriceCents is auto-filled from the line's own
   * rate (that IS what the bill says), not re-asked.
   */
  newProduct: {
    name: string;
    categoryId: string;
    sku: string | null;
    sellingPriceCents: number;
    lowStockThreshold: number;
    imageUrl: string | null;
  } | null;
  quantity: number;
  unit: string;
  rateCents: number;
  note: string | null;
  editedByUser: boolean;
};

export type ConfirmPurchaseInput = {
  scanId: string | null;
  supplierName: string | null;
  supplierPhone: string | null;
  billNumber: string | null;
  billDate: string | null; // YYYY-MM-DD
  extraCharges: { label: string; amountCents: number }[];
  lines: ConfirmPurchaseLine[];
  /** Set true once the owner has already seen and dismissed the duplicate-bill warning. */
  allowDuplicate: boolean;
};

export type ConfirmPurchaseResult = {
  purchaseId: string;
  purchaseNumber: number;
  grandTotalCents: number;
  stockChanges: { name: string; before: number; after: number; alertCleared: boolean }[];
};

const MAX_LINES = 200;

function validateInput(input: ConfirmPurchaseInput) {
  if (input.lines.length === 0) throw new PurchaseError("No items to save.");
  if (input.lines.length > MAX_LINES) throw new PurchaseError(`A single bill can have at most ${MAX_LINES} lines.`);
  for (const line of input.lines) {
    if (!line.nameOnBill.trim()) throw new PurchaseError("Every row needs a name.");
    const isSkipped = !line.matchedId && !line.newProduct;
    if (isSkipped) continue;
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new PurchaseError(`"${line.nameOnBill}": enter a valid quantity before saving.`);
    }
    if (!Number.isFinite(line.rateCents) || line.rateCents < 0) {
      throw new PurchaseError(`"${line.nameOnBill}": enter a valid rate before saving.`);
    }
    if (line.newProduct) {
      if (!line.newProduct.name.trim()) throw new PurchaseError(`"${line.nameOnBill}": new product needs a name.`);
      if (!line.newProduct.categoryId) throw new PurchaseError(`"${line.nameOnBill}": pick a category for the new product.`);
      if (!Number.isFinite(line.newProduct.sellingPriceCents) || line.newProduct.sellingPriceCents <= 0) {
        throw new PurchaseError(`"${line.nameOnBill}": enter a selling price for the new product.`);
      }
    }
  }
}

/**
 * Saves the owner-confirmed bill as a real Purchase and adds stock — the
 * ONLY place stock changes for this feature; nothing is written during
 * scanning/extraction. Every number is recomputed here from the confirmed
 * lines, never trusted from the client or from the AI's raw output (same
 * "never trust the client" rule createOrder/createManualOrder already
 * follow for cart/bill totals).
 */
export async function confirmPurchase(
  tenantId: string,
  userId: string,
  input: ConfirmPurchaseInput,
): Promise<ConfirmPurchaseResult> {
  validateInput(input);

  const billDate = input.billDate ? new Date(`${input.billDate}T00:00:00`) : null;
  if (input.billDate && Number.isNaN(billDate?.getTime())) {
    throw new PurchaseError("Bill date is invalid.");
  }

  if (!input.allowDuplicate) {
    const dup = await checkDuplicateBill(tenantId, input.supplierName, input.billNumber, billDate);
    if (dup) throw new DuplicatePurchaseError("Yeh bill pehle se add hai — this bill looks already added.");
  }

  const extraCharges = input.extraCharges
    .map((c) => ({ label: c.label.trim(), amountCents: Math.round(c.amountCents) }))
    .filter((c) => c.label && Number.isFinite(c.amountCents) && c.amountCents !== 0);
  const extraChargesCents = extraCharges.reduce((s, c) => s + c.amountCents, 0);

  const result = await prisma.$transaction(async (tx) => {
    const supplier = await findOrCreateSupplier(tx, tenantId, input.supplierName ?? "", input.supplierPhone);
    const stockChanges: ConfirmPurchaseResult["stockChanges"] = [];

    // Pass 1: create any brand-new products ("Naya item banao") so they have
    // a real id before the PurchaseLine rows below reference them. A new
    // product's opening stock is left at 0 here — the actual received
    // quantity is applied uniformly below, in the same place every matched
    // line's stock is applied, so the ledger tells one consistent story.
    const resolvedLines: (ConfirmPurchaseLine & { resolvedItemId: string | null })[] = [];
    for (const line of input.lines) {
      if (line.newProduct) {
        const category = await tx.category.findFirst({ where: { id: line.newProduct.categoryId, tenantId } });
        if (!category) throw new PurchaseError(`"${line.nameOnBill}": category not found.`);
        const name = line.newProduct.name.trim();
        const sku = line.newProduct.sku?.trim() || null;
        if (sku) {
          const skuClash = await tx.item.findFirst({ where: { tenantId, sku } });
          if (skuClash) throw new PurchaseError(`SKU "${sku}" is already used by "${skuClash.name}".`);
        }
        const last = await tx.item.findFirst({ where: { tenantId, categoryId: category.id }, orderBy: { sortOrder: "desc" } });
        const item = await tx.item.create({
          data: {
            tenantId,
            categoryId: category.id,
            name,
            priceCents: line.newProduct.sellingPriceCents,
            purchasePriceCents: Math.round(line.rateCents),
            imageUrl: line.newProduct.imageUrl,
            sku,
            trackStock: true,
            stockQty: D(0),
            lowStockThreshold: D(Math.max(0, line.newProduct.lowStockThreshold)),
            sortOrder: (last?.sortOrder ?? -1) + 1,
          },
        });
        resolvedLines.push({ ...line, resolvedItemId: item.id });
      } else {
        resolvedLines.push({ ...line, resolvedItemId: line.matchedId });
      }
    }

    // Pass 2: create the Purchase itself (needs subtotal, computed below) —
    // create PurchaseLine rows and apply stock movements together.
    const lineTotals = resolvedLines.map((l) => {
      const included = Boolean(l.resolvedItemId);
      const total = included ? Math.round(l.quantity * l.rateCents) : 0;
      return { line: l, included, total };
    });
    const subtotalCents = lineTotals.reduce((s, l) => s + l.total, 0);
    const grandTotalCents = subtotalCents + extraChargesCents;

    const purchase = await tx.purchase.create({
      data: {
        tenantId,
        supplierId: supplier?.id ?? null,
        supplierNameSnapshot: supplier?.name ?? input.supplierName?.trim() ?? null,
        billNumber: input.billNumber?.trim() || null,
        billDate,
        subtotalCents,
        extraChargesCents,
        extraCharges: extraCharges.length > 0 ? (extraCharges as Prisma.InputJsonValue) : Prisma.JsonNull,
        grandTotalCents,
        scanId: input.scanId,
        createdByUserId: userId,
      },
    });

    for (const { line, included, total } of lineTotals) {
      const confidence: PurchaseLineConfidence = "MEDIUM";
      await tx.purchaseLine.create({
        data: {
          purchaseId: purchase.id,
          tenantId,
          nameOnBill: line.nameOnBill.trim(),
          matchedItemId: included ? line.resolvedItemId : null,
          quantity: D(line.quantity || 0),
          unit: line.unit,
          rateCents: Math.round(line.rateCents || 0),
          lineTotalCents: total,
          confidence,
          note: line.note?.trim() || null,
          editedByUser: line.editedByUser,
        },
      });

      if (!included) continue;

      const billLabel = line.nameOnBill.trim();
      const noteText = purchase.supplierNameSnapshot ? `Bill scan — ${purchase.supplierNameSnapshot}` : "Bill scan purchase";

      const item = await tx.item.findFirstOrThrow({ where: { id: line.resolvedItemId!, tenantId } });
      const before = Number(item.stockQty ?? 0);
      await tx.item.update({
        where: { id: item.id },
        data: { stockQty: { increment: D(line.quantity) }, purchasePriceCents: Math.round(line.rateCents) },
      });
      await tx.itemStockMovement.create({
        data: { tenantId, itemId: item.id, delta: D(line.quantity), reason: "PURCHASE", note: noteText, purchaseId: purchase.id },
      });
      // Alias learning — remember the bill's own wording for next time.
      const aliases = readAliases(item.aliases);
      const normalized = billLabel.toLowerCase();
      if (normalized && normalized !== item.name.trim().toLowerCase() && !aliases.some((a) => a.toLowerCase() === normalized)) {
        const next = [...aliases, billLabel].slice(-10);
        await tx.item.update({ where: { id: item.id }, data: { aliases: next as Prisma.InputJsonValue } });
      }
      const after = before + line.quantity;
      const level = itemStockLevel({ stockQty: D(after), lowStockThreshold: item.lowStockThreshold });
      let alertCleared = false;
      if (level === "OK" && item.lowStockAlertedAt) {
        await tx.item.update({ where: { id: item.id }, data: { lowStockAlertedAt: null } });
        alertCleared = true;
      }
      stockChanges.push({ name: item.name, before, after, alertCleared });
    }

    return { purchase, stockChanges };
  });

  return {
    purchaseId: result.purchase.id,
    purchaseNumber: result.purchase.purchaseNumber,
    grandTotalCents: result.purchase.grandTotalCents,
    stockChanges: result.stockChanges,
  };
}

// ------------------------------------------------------------------- history

export async function listPurchases(tenantId: string, take = 50) {
  return prisma.purchase.findMany({
    where: { tenantId },
    include: { supplier: true, lines: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getPurchase(tenantId: string, id: string) {
  return prisma.purchase.findFirst({
    where: { id, tenantId },
    include: { supplier: true, lines: { include: { matchedItem: true } } },
  });
}

// ----------------------------------------------------------------------- undo

export type UndoPurchaseResult = { restored: { name: string; delta: number }[] };

/**
 * Reverses a purchase's stock effect within the 10-minute window — mirrors
 * restoreStockForOrder's compensating-movement pattern (never deletes a
 * ledger row, writes an equal-and-opposite one instead). Does NOT revert
 * purchasePriceCents ("last purchase rate"), since a later purchase may
 * have already overwritten it — undo only restores quantity, exactly what
 * the brief's own acceptance test describes ("Undo ... restores the
 * previous stock").
 */
export async function undoPurchase(tenantId: string, purchaseId: string): Promise<UndoPurchaseResult> {
  const purchase = await prisma.purchase.findFirst({ where: { id: purchaseId, tenantId } });
  if (!purchase) throw new PurchaseError("Purchase not found.");
  if (purchase.undoneAt) throw new PurchaseError("This purchase was already undone.");
  if (Date.now() - purchase.createdAt.getTime() > UNDO_WINDOW_MS) {
    throw new PurchaseError("The 10-minute undo window has passed.");
  }

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.purchase.updateMany({
      where: { id: purchaseId, tenantId, undoneAt: null },
      data: { undoneAt: new Date() },
    });
    if (claimed.count === 0) throw new PurchaseError("This purchase was already undone.");

    const restored: UndoPurchaseResult["restored"] = [];
    const itemMovements = await tx.itemStockMovement.findMany({ where: { tenantId, purchaseId, reason: "PURCHASE" } });
    for (const m of itemMovements) {
      await tx.item.updateMany({ where: { id: m.itemId, tenantId }, data: { stockQty: { decrement: m.delta } } });
      await tx.itemStockMovement.create({
        data: { tenantId, itemId: m.itemId, delta: m.delta.neg(), reason: "PURCHASE_UNDO", purchaseId },
      });
      const item = await tx.item.findUnique({ where: { id: m.itemId } });
      if (item) restored.push({ name: item.name, delta: -Number(m.delta) });
    }

    return { restored };
  });
}
