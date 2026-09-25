import "server-only";
import { Prisma } from "@prisma/client";
import type { StockMovementReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnerEmail } from "@/lib/data/tenants";
import { sendLowStockEmail } from "@/lib/notifications/email";
import { createCategory } from "@/lib/data/menu";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

export class InventoryError extends Error {}

/** Low = a threshold is set and stock is at/below it; Out = stock is zero or less. */
export function stockLevel(stock: Prisma.Decimal, threshold: Prisma.Decimal): "OK" | "LOW" | "OUT" {
  if (stock.lte(0)) return "OUT";
  if (threshold.gt(0) && stock.lte(threshold)) return "LOW";
  return "OK";
}

/** Same rule as stockLevel, for a direct-stock Item — null qty/threshold (not yet tracking) default to 0. */
export function itemStockLevel(item: { stockQty: Prisma.Decimal | null; lowStockThreshold: Prisma.Decimal | null }) {
  return stockLevel(item.stockQty ?? D(0), item.lowStockThreshold ?? D(0));
}

// --------------------------------------------------- direct-stock items (Products)
//
// BhojSetu's only stock system: direct-stock tracking lives on the menu Item
// model itself (Item.trackStock/stockQty/...) — a sellable, stocked product
// (SKU, image, purchase/selling price). An earlier separate raw-material/
// recipe system (Ingredient/RecipeLine/StockMovement) was removed; every
// stocked thing is now a real, sellable Item.

export type StockItem = Prisma.ItemGetPayload<{ include: { category: true } }>;

export async function listStockItems(tenantId: string): Promise<StockItem[]> {
  return prisma.item.findMany({
    where: { tenantId, trackStock: true },
    include: { category: true },
    orderBy: { name: "asc" },
  });
}

export async function countLowStockItems(tenantId: string): Promise<number> {
  const items = await listStockItems(tenantId);
  return items.filter((i) => itemStockLevel(i) !== "OK").length;
}

function validateStockItemInput(input: { name: string; categoryId: string; sellingPriceCents: number; lowStockThreshold: number }) {
  const name = input.name.trim();
  if (!name) throw new InventoryError("Product name is required.");
  if (name.length > 100) throw new InventoryError("Product name is too long.");
  if (!input.categoryId) throw new InventoryError("Pick a category.");
  if (!Number.isFinite(input.sellingPriceCents) || input.sellingPriceCents <= 0) {
    throw new InventoryError("Enter a valid selling price.");
  }
  if (!Number.isFinite(input.lowStockThreshold) || input.lowStockThreshold < 0) {
    throw new InventoryError("Low-stock level can't be negative.");
  }
  return name;
}

async function assertSkuAvailable(tenantId: string, sku: string | null, excludeItemId?: string) {
  if (!sku) return;
  const clash = await prisma.item.findFirst({
    where: { tenantId, sku, ...(excludeItemId ? { NOT: { id: excludeItemId } } : {}) },
  });
  if (clash) throw new InventoryError(`SKU "${sku}" is already used by "${clash.name}".`);
}

export async function createStockItem(
  tenantId: string,
  input: {
    name: string;
    categoryId: string;
    sku?: string | null;
    imageUrl?: string | null;
    purchasePriceCents?: number | null;
    sellingPriceCents: number;
    openingStockQty: number;
    lowStockThreshold: number;
  },
) {
  const name = validateStockItemInput(input);
  const category = await prisma.category.findFirst({ where: { id: input.categoryId, tenantId } });
  if (!category) throw new InventoryError("Category not found.");
  const sku = input.sku?.trim() || null;
  await assertSkuAvailable(tenantId, sku);
  if (!Number.isFinite(input.openingStockQty) || input.openingStockQty < 0) {
    throw new InventoryError("Opening stock can't be negative.");
  }

  return prisma.$transaction(async (tx) => {
    const last = await tx.item.findFirst({ where: { tenantId, categoryId: input.categoryId }, orderBy: { sortOrder: "desc" } });
    const item = await tx.item.create({
      data: {
        tenantId,
        categoryId: input.categoryId,
        name,
        priceCents: input.sellingPriceCents,
        purchasePriceCents: input.purchasePriceCents ?? null,
        imageUrl: input.imageUrl ?? null,
        sku,
        trackStock: true,
        stockQty: D(input.openingStockQty),
        lowStockThreshold: D(input.lowStockThreshold),
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
    if (input.openingStockQty > 0) {
      await tx.itemStockMovement.create({
        data: { tenantId, itemId: item.id, delta: D(input.openingStockQty), reason: "PURCHASE", note: "Opening stock" },
      });
    }
    return item;
  });
}

export async function updateStockItem(
  tenantId: string,
  itemId: string,
  input: Partial<{
    name: string;
    categoryId: string;
    sku: string | null;
    imageUrl: string | null;
    purchasePriceCents: number | null;
    sellingPriceCents: number;
    lowStockThreshold: number;
    /** Lets the owner opt an item back out of stock-tracking without deleting the menu item itself. */
    trackStock: boolean;
  }>,
) {
  if (input.sku !== undefined) await assertSkuAvailable(tenantId, input.sku?.trim() || null, itemId);
  if (input.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: input.categoryId, tenantId } });
    if (!category) throw new InventoryError("Category not found.");
  }
  const result = await prisma.item.updateMany({
    where: { id: itemId, tenantId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.sku !== undefined ? { sku: input.sku?.trim() || null } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.purchasePriceCents !== undefined ? { purchasePriceCents: input.purchasePriceCents } : {}),
      ...(input.sellingPriceCents !== undefined ? { priceCents: input.sellingPriceCents } : {}),
      ...(input.lowStockThreshold !== undefined ? { lowStockThreshold: D(input.lowStockThreshold) } : {}),
      ...(input.trackStock !== undefined ? { trackStock: input.trackStock } : {}),
    },
  });
  if (result.count === 0) throw new InventoryError("Product not found.");
}

/** Manual stock change for a direct-stock Item (receive stock, wastage, count correction). */
export async function adjustItemStock(
  tenantId: string,
  itemId: string,
  delta: number,
  reason: Extract<StockMovementReason, "PURCHASE" | "WASTE" | "ADJUSTMENT">,
  note?: string | null,
) {
  if (!Number.isFinite(delta) || delta === 0) throw new InventoryError("Enter a non-zero quantity.");

  const { item, low } = await prisma.$transaction(async (tx) => {
    const updated = await tx.item.updateMany({
      where: { id: itemId, tenantId, trackStock: true },
      data: { stockQty: { increment: D(delta) } },
    });
    if (updated.count === 0) throw new InventoryError("Product not found.");
    await tx.itemStockMovement.create({
      data: { tenantId, itemId, delta: D(delta), reason, note: note?.trim() || null },
    });
    const item = await tx.item.findFirstOrThrow({ where: { id: itemId, tenantId } });
    const level = itemStockLevel(item);
    if (level === "OK" && item.lowStockAlertedAt) {
      await tx.item.update({ where: { id: itemId }, data: { lowStockAlertedAt: null } });
    }
    const low = level !== "OK" && !item.lowStockAlertedAt ? [item] : [];
    if (low.length) {
      await tx.item.update({ where: { id: itemId }, data: { lowStockAlertedAt: new Date() } });
    }
    return { item, low };
  });

  if (low.length) await notifyLowStockItems(tenantId, low);
  return item;
}

export async function listItemStockMovements(tenantId: string, itemId: string, take = 30) {
  return prisma.itemStockMovement.findMany({ where: { tenantId, itemId }, orderBy: { createdAt: "desc" }, take });
}

/** Every direct-stock item's recent movements for the tenant, newest first. */
export async function listRecentItemMovements(tenantId: string, take = 300) {
  return prisma.itemStockMovement.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take });
}

/** Fire-and-forget email to the owner — unit hardcoded "pcs" since direct-stock items are always counted, not weighed/measured. */
export async function notifyLowStockItems(
  tenantId: string,
  items: { name: string; stockQty: Prisma.Decimal | null; lowStockThreshold: Prisma.Decimal | null }[],
) {
  if (items.length === 0) return;
  try {
    const [tenant, ownerEmail] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      getOwnerEmail(tenantId),
    ]);
    if (!tenant || !ownerEmail) return;
    await sendLowStockEmail(
      ownerEmail,
      tenant.name,
      items.map((i) => ({
        name: i.name,
        unit: "pcs",
        currentStock: Number(i.stockQty ?? 0),
        lowStockThreshold: Number(i.lowStockThreshold ?? 0),
      })),
    );
  } catch (err) {
    console.error("notifyLowStockItems failed:", err);
  }
}

// ------------------------------------------------------------ order integration

type Tx = Prisma.TransactionClient;

/**
 * Deducts any ordered item's own direct stock (Item.trackStock), inside the
 * caller's transaction (so the order and its stock movements commit or roll
 * back together). Idempotent: Order.stockDeductedAt is claimed with a
 * conditional UPDATE, so a second call for the same order is a no-op. Never
 * blocks an order — stock is allowed to go negative (that just reads as
 * "Out"). Returns items that newly crossed into low/out, for
 * notifyLowStockItems to email about once the transaction has committed.
 */
export async function deductStockForOrder(tx: Tx, tenantId: string, orderId: string) {
  type Itm = Prisma.ItemGetPayload<object>;
  const none = { newlyLowItems: [] as Itm[] };

  const claimed = await tx.order.updateMany({
    where: { id: orderId, tenantId, stockDeductedAt: null },
    data: { stockDeductedAt: new Date() },
  });
  if (claimed.count === 0) return none;

  const orderLines = await tx.orderItem.findMany({
    where: { orderId, itemId: { not: null } },
    select: { itemId: true, quantity: true },
  });
  const qtyByItem = new Map<string, number>();
  for (const l of orderLines) {
    if (l.itemId) qtyByItem.set(l.itemId, (qtyByItem.get(l.itemId) ?? 0) + l.quantity);
  }
  if (qtyByItem.size === 0) return none;

  const trackedItems = await tx.item.findMany({
    where: { tenantId, id: { in: [...qtyByItem.keys()] }, trackStock: true },
  });
  let newlyLowItems: Itm[] = [];
  if (trackedItems.length > 0) {
    for (const item of trackedItems) {
      const qty = qtyByItem.get(item.id) ?? 0;
      if (qty <= 0) continue;
      await tx.item.updateMany({
        where: { id: item.id, tenantId },
        data: { stockQty: { decrement: D(qty) } },
      });
      await tx.itemStockMovement.create({
        data: { tenantId, itemId: item.id, delta: D(-qty), reason: "ORDER", orderId },
      });
    }

    const after = await tx.item.findMany({ where: { tenantId, id: { in: trackedItems.map((i) => i.id) } } });
    newlyLowItems = after.filter((i) => itemStockLevel(i) !== "OK" && !i.lowStockAlertedAt);
    if (newlyLowItems.length) {
      await tx.item.updateMany({
        where: { tenantId, id: { in: newlyLowItems.map((i) => i.id) } },
        data: { lowStockAlertedAt: new Date() },
      });
    }

    const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { autoHideOutOfStock: true } });
    if (tenant?.autoHideOutOfStock) {
      const outIds = after.filter((i) => i.stockQty != null && i.stockQty.lte(0)).map((i) => i.id);
      if (outIds.length) {
        await tx.item.updateMany({ where: { tenantId, id: { in: outIds } }, data: { isAvailable: false } });
      }
    }
  }

  return { newlyLowItems };
}

/** Reverses deductStockForOrder for a cancelled order — at most once, via Order.stockRestoredAt. */
export async function restoreStockForOrder(tx: Tx, tenantId: string, orderId: string) {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, tenantId, stockDeductedAt: { not: null }, stockRestoredAt: null },
    data: { stockRestoredAt: new Date() },
  });
  if (claimed.count === 0) return;

  const itemMovements = await tx.itemStockMovement.findMany({ where: { tenantId, orderId, reason: "ORDER" } });
  for (const m of itemMovements) {
    await tx.item.updateMany({
      where: { id: m.itemId, tenantId },
      data: { stockQty: { increment: m.delta.neg() } },
    });
    await tx.itemStockMovement.create({
      data: { tenantId, itemId: m.itemId, delta: m.delta.neg(), reason: "ORDER_CANCEL", orderId },
    });
  }

  const touchedItems = await tx.item.findMany({
    where: { tenantId, id: { in: itemMovements.map((m) => m.itemId) }, lowStockAlertedAt: { not: null } },
  });
  const recoveredItems = touchedItems.filter((i) => itemStockLevel(i) === "OK");
  if (recoveredItems.length) {
    await tx.item.updateMany({
      where: { tenantId, id: { in: recoveredItems.map((i) => i.id) } },
      data: { lowStockAlertedAt: null },
    });
  }
}

// ------------------------------------------------------------------- stations

export async function listStations(tenantId: string) {
  return prisma.station.findMany({ where: { tenantId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function createStation(tenantId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new InventoryError("Station name is required.");
  if (trimmed.length > 60) throw new InventoryError("Station name is too long.");
  const existing = await prisma.station.findUnique({ where: { tenantId_name: { tenantId, name: trimmed } } });
  if (existing) throw new InventoryError(`"${trimmed}" already exists.`);
  return prisma.station.create({ data: { tenantId, name: trimmed } });
}

export async function deleteStation(tenantId: string, id: string) {
  await prisma.station.deleteMany({ where: { id, tenantId } });
}

/** Assign (or clear, with null) an item's kitchen station — tenant-checked on both sides. */
export async function setItemStation(tenantId: string, itemId: string, stationId: string | null) {
  if (stationId) {
    const station = await prisma.station.findFirst({ where: { id: stationId, tenantId }, select: { id: true } });
    if (!station) throw new InventoryError("Station not found.");
  }
  await prisma.item.updateMany({ where: { id: itemId, tenantId }, data: { stationId } });
}

export async function setCategoryStation(tenantId: string, categoryId: string, stationId: string | null) {
  if (stationId) {
    const station = await prisma.station.findFirst({ where: { id: stationId, tenantId }, select: { id: true } });
    if (!station) throw new InventoryError("Station not found.");
  }
  await prisma.item.updateMany({
    where: { tenantId, OR: [{ categoryId }, { category: { parentCategoryId: categoryId } }] },
    data: { stationId },
  });
}

export async function setAutoHideOutOfStock(tenantId: string, value: boolean) {
  await prisma.tenant.update({ where: { id: tenantId }, data: { autoHideOutOfStock: value } });
}

// ---------------------------------------------------- product bulk import (CSV)

export type ProductImportRowInput = {
  name: string;
  sku: string | null;
  categoryName: string | null;
  purchasePriceCents: number | null;
  sellingPriceCents: number;
  stockQty: number;
  lowStockThreshold: number;
};

export type ProductImportSummary = {
  created: number;
  updated: number;
  skipped: string[];
  problems: string[];
};

export const MAX_PRODUCT_IMPORT_ROWS = 300;

/**
 * Saves reviewed CSV rows (see src/lib/product-csv-import.ts for parsing).
 * Matches an existing direct-stock product by SKU first (if given), else by
 * name (case-insensitive) — a match updates its price/category/threshold and
 * receives the row's quantity as new stock, rather than creating a
 * duplicate. categoryName is matched case-insensitively against existing
 * categories; an unmatched name creates a new top-level Category (mirrors
 * how the AI menu-import wizard already creates categories on the fly).
 * Rows are handled one at a time so a single bad row is reported without
 * losing the rest.
 */
export async function importStockItems(tenantId: string, rows: ProductImportRowInput[]): Promise<ProductImportSummary> {
  if (rows.length === 0) throw new InventoryError("Nothing to import.");
  if (rows.length > MAX_PRODUCT_IMPORT_ROWS) {
    throw new InventoryError(`Import up to ${MAX_PRODUCT_IMPORT_ROWS} products at a time.`);
  }

  const [existingItems, existingCategories] = await Promise.all([
    listStockItems(tenantId),
    prisma.category.findMany({ where: { tenantId } }),
  ]);
  const bySku = new Map<string, { id: string }>();
  const byName = new Map<string, { id: string }>();
  for (const i of existingItems) {
    if (i.sku) bySku.set(i.sku.toLowerCase(), { id: i.id });
    byName.set(i.name.trim().toLowerCase(), { id: i.id });
  }
  const categoryByName = new Map(existingCategories.map((c) => [c.name.trim().toLowerCase(), c]));

  const summary: ProductImportSummary = { created: 0, updated: 0, skipped: [], problems: [] };

  for (const row of rows) {
    const name = row.name.trim();
    try {
      if (!name) throw new InventoryError("Missing product name.");
      if (!Number.isFinite(row.sellingPriceCents) || row.sellingPriceCents <= 0) {
        throw new InventoryError(`${name}: missing or invalid selling price.`);
      }

      const categoryName = row.categoryName?.trim() || "Uncategorised";
      let category = categoryByName.get(categoryName.toLowerCase());
      if (!category) {
        category = await createCategory(tenantId, categoryName);
        categoryByName.set(categoryName.toLowerCase(), category);
      }

      const found = (row.sku && bySku.get(row.sku.trim().toLowerCase())) || byName.get(name.toLowerCase());
      if (found) {
        await updateStockItem(tenantId, found.id, {
          categoryId: category.id,
          ...(row.sku ? { sku: row.sku.trim() } : {}),
          purchasePriceCents: row.purchasePriceCents,
          sellingPriceCents: row.sellingPriceCents,
          lowStockThreshold: row.lowStockThreshold,
          trackStock: true,
        });
        if (row.stockQty > 0) {
          await adjustItemStock(tenantId, found.id, row.stockQty, "PURCHASE", "Bulk import");
        }
        summary.updated += 1;
        continue;
      }

      const created = await createStockItem(tenantId, {
        name,
        categoryId: category.id,
        sku: row.sku,
        purchasePriceCents: row.purchasePriceCents,
        sellingPriceCents: row.sellingPriceCents,
        openingStockQty: Math.max(0, row.stockQty),
        lowStockThreshold: row.lowStockThreshold,
      });
      byName.set(name.toLowerCase(), { id: created.id });
      if (created.sku) bySku.set(created.sku.toLowerCase(), { id: created.id });
      summary.created += 1;
    } catch (err) {
      summary.problems.push(`${name || "(blank)"}: ${err instanceof InventoryError ? err.message : "could not be saved."}`);
    }
  }
  return summary;
}
