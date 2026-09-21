import "server-only";
import { Prisma } from "@prisma/client";
import type { StockMovementReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnerEmail } from "@/lib/data/tenants";
import { sendLowStockEmail } from "@/lib/notifications/email";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

export const INGREDIENT_UNITS = ["g", "kg", "ml", "l", "pcs"] as const;

export class InventoryError extends Error {}

/** Low = a threshold is set and stock is at/below it; Out = stock is zero or less. */
export function stockLevel(stock: Prisma.Decimal, threshold: Prisma.Decimal): "OK" | "LOW" | "OUT" {
  if (stock.lte(0)) return "OUT";
  if (threshold.gt(0) && stock.lte(threshold)) return "LOW";
  return "OK";
}

// ---------------------------------------------------------------- ingredients

export async function listIngredients(tenantId: string) {
  return prisma.ingredient.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export async function countLowStock(tenantId: string): Promise<number> {
  const all = await listIngredients(tenantId);
  return all.filter((i) => stockLevel(i.currentStock, i.lowStockThreshold) !== "OK").length;
}

function validateIngredientInput(input: { name: string; unit: string; lowStockThreshold: number }) {
  const name = input.name.trim();
  if (!name) throw new InventoryError("Ingredient name is required.");
  if (name.length > 100) throw new InventoryError("Ingredient name is too long.");
  if (!(INGREDIENT_UNITS as readonly string[]).includes(input.unit)) {
    throw new InventoryError("Pick a valid unit.");
  }
  if (!Number.isFinite(input.lowStockThreshold) || input.lowStockThreshold < 0) {
    throw new InventoryError("Low-stock level can't be negative.");
  }
  return name;
}

export async function createIngredient(
  tenantId: string,
  input: {
    name: string;
    unit: string;
    openingStock: number;
    lowStockThreshold: number;
    costPerUnitCents?: number | null;
  },
) {
  const name = validateIngredientInput(input);
  if (!Number.isFinite(input.openingStock) || input.openingStock < 0) {
    throw new InventoryError("Opening stock can't be negative.");
  }
  const existing = await prisma.ingredient.findUnique({ where: { tenantId_name: { tenantId, name } } });
  if (existing) throw new InventoryError(`"${name}" is already in your inventory.`);

  return prisma.$transaction(async (tx) => {
    const ing = await tx.ingredient.create({
      data: {
        tenantId,
        name,
        unit: input.unit,
        currentStock: D(input.openingStock),
        lowStockThreshold: D(input.lowStockThreshold),
        costPerUnitCents: input.costPerUnitCents ?? null,
      },
    });
    if (input.openingStock > 0) {
      await tx.stockMovement.create({
        data: { tenantId, ingredientId: ing.id, delta: D(input.openingStock), reason: "PURCHASE", note: "Opening stock" },
      });
    }
    return ing;
  });
}

export async function updateIngredient(
  tenantId: string,
  id: string,
  input: { name: string; unit: string; lowStockThreshold: number; costPerUnitCents?: number | null },
) {
  const name = validateIngredientInput(input);
  const clash = await prisma.ingredient.findFirst({ where: { tenantId, name, NOT: { id } } });
  if (clash) throw new InventoryError(`"${name}" is already in your inventory.`);
  const result = await prisma.ingredient.updateMany({
    where: { id, tenantId },
    data: {
      name,
      unit: input.unit,
      lowStockThreshold: D(input.lowStockThreshold),
      costPerUnitCents: input.costPerUnitCents ?? null,
    },
  });
  if (result.count === 0) throw new InventoryError("Ingredient not found.");
}

export async function deleteIngredient(tenantId: string, id: string) {
  await prisma.ingredient.deleteMany({ where: { id, tenantId } });
}

/**
 * Manual stock change (receive stock, wastage, count correction). `delta` is
 * signed. Restocking above the threshold clears the low-stock flag so the
 * next dip alerts again.
 */
export async function adjustStock(
  tenantId: string,
  ingredientId: string,
  delta: number,
  reason: Extract<StockMovementReason, "PURCHASE" | "WASTE" | "ADJUSTMENT">,
  note?: string | null,
) {
  if (!Number.isFinite(delta) || delta === 0) throw new InventoryError("Enter a non-zero quantity.");

  const { ingredient, low } = await prisma.$transaction(async (tx) => {
    const updated = await tx.ingredient.updateMany({
      where: { id: ingredientId, tenantId },
      data: { currentStock: { increment: D(delta) } },
    });
    if (updated.count === 0) throw new InventoryError("Ingredient not found.");
    await tx.stockMovement.create({
      data: { tenantId, ingredientId, delta: D(delta), reason, note: note?.trim() || null },
    });
    const ingredient = await tx.ingredient.findFirstOrThrow({ where: { id: ingredientId, tenantId } });
    const level = stockLevel(ingredient.currentStock, ingredient.lowStockThreshold);
    if (level === "OK" && ingredient.lowStockAlertedAt) {
      await tx.ingredient.update({ where: { id: ingredientId }, data: { lowStockAlertedAt: null } });
    }
    const low = level !== "OK" && !ingredient.lowStockAlertedAt ? [ingredient] : [];
    if (low.length) {
      await tx.ingredient.update({ where: { id: ingredientId }, data: { lowStockAlertedAt: new Date() } });
    }
    return { ingredient, low };
  });

  if (low.length) await notifyLowStock(tenantId, low);
  return ingredient;
}

export async function listRecentMovements(tenantId: string, take = 300) {
  return prisma.stockMovement.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take });
}

export async function listMovements(tenantId: string, ingredientId: string, take = 30) {
  return prisma.stockMovement.findMany({
    where: { tenantId, ingredientId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

// -------------------------------------------------------------------- recipes

export async function getRecipeForItem(tenantId: string, itemId: string) {
  return prisma.recipeLine.findMany({
    where: { tenantId, itemId },
    include: { ingredient: true },
    orderBy: { ingredient: { name: "asc" } },
  });
}

/** Every recipe line for the tenant — feeds the menu page's per-item recipe editors. */
export async function listRecipeLinesForTenant(tenantId: string) {
  return prisma.recipeLine.findMany({ where: { tenantId }, include: { ingredient: true } });
}

export async function setRecipeForItem(
  tenantId: string,
  itemId: string,
  lines: { ingredientId: string; quantity: number }[],
) {
  const item = await prisma.item.findFirst({ where: { id: itemId, tenantId }, select: { id: true } });
  if (!item) throw new InventoryError("Item not found.");

  const merged = new Map<string, number>();
  for (const l of lines) {
    if (!Number.isFinite(l.quantity) || l.quantity <= 0) continue;
    merged.set(l.ingredientId, (merged.get(l.ingredientId) ?? 0) + l.quantity);
  }
  const ingredientIds = [...merged.keys()];
  if (ingredientIds.length > 0) {
    const owned = await prisma.ingredient.count({ where: { tenantId, id: { in: ingredientIds } } });
    if (owned !== ingredientIds.length) throw new InventoryError("Unknown ingredient in recipe.");
  }

  await prisma.$transaction([
    prisma.recipeLine.deleteMany({ where: { tenantId, itemId } }),
    ...(ingredientIds.length
      ? [
          prisma.recipeLine.createMany({
            data: ingredientIds.map((ingredientId) => ({
              tenantId,
              itemId,
              ingredientId,
              quantity: D(merged.get(ingredientId)!),
            })),
          }),
        ]
      : []),
  ]);
}

// ------------------------------------------------------------ order integration

type Tx = Prisma.TransactionClient;

/**
 * Deducts each ordered menu item's recipe ingredients, inside the caller's
 * transaction (so the order and its stock movement commit or roll back
 * together). Idempotent: Order.stockDeductedAt is claimed with a conditional
 * UPDATE, so a second call for the same order is a no-op. Never blocks an
 * order — stock is allowed to go negative (that just reads as "Out").
 * Returns ingredients that newly crossed into low/out, for notifyLowStock to
 * email about once the transaction has committed.
 */
export async function deductStockForOrder(tx: Tx, tenantId: string, orderId: string) {
  type Ing = Prisma.IngredientGetPayload<object>;
  const none = { newlyLow: [] as Ing[] };

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

  const recipe = await tx.recipeLine.findMany({
    where: { tenantId, itemId: { in: [...qtyByItem.keys()] } },
  });
  const usage = new Map<string, Prisma.Decimal>();
  for (const line of recipe) {
    const need = line.quantity.mul(qtyByItem.get(line.itemId) ?? 0);
    usage.set(line.ingredientId, (usage.get(line.ingredientId) ?? D(0)).plus(need));
  }
  if (usage.size === 0) return none;

  for (const [ingredientId, total] of usage) {
    await tx.ingredient.updateMany({
      where: { id: ingredientId, tenantId },
      data: { currentStock: { decrement: total } },
    });
    await tx.stockMovement.create({
      data: { tenantId, ingredientId, delta: total.neg(), reason: "ORDER", orderId },
    });
  }

  const after = await tx.ingredient.findMany({ where: { tenantId, id: { in: [...usage.keys()] } } });
  const newlyLow = after.filter(
    (i) => stockLevel(i.currentStock, i.lowStockThreshold) !== "OK" && !i.lowStockAlertedAt,
  );
  if (newlyLow.length) {
    await tx.ingredient.updateMany({
      where: { tenantId, id: { in: newlyLow.map((i) => i.id) } },
      data: { lowStockAlertedAt: new Date() },
    });
  }

  const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { autoHideOutOfStock: true } });
  if (tenant?.autoHideOutOfStock) {
    const outIds = after.filter((i) => i.currentStock.lte(0)).map((i) => i.id);
    if (outIds.length) {
      await tx.item.updateMany({
        where: { tenantId, recipeLines: { some: { ingredientId: { in: outIds } } } },
        data: { isAvailable: false },
      });
    }
  }

  return { newlyLow };
}

/** Reverses deductStockForOrder for a cancelled order — at most once, via Order.stockRestoredAt. */
export async function restoreStockForOrder(tx: Tx, tenantId: string, orderId: string) {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, tenantId, stockDeductedAt: { not: null }, stockRestoredAt: null },
    data: { stockRestoredAt: new Date() },
  });
  if (claimed.count === 0) return;

  const movements = await tx.stockMovement.findMany({ where: { tenantId, orderId, reason: "ORDER" } });
  for (const m of movements) {
    await tx.ingredient.updateMany({
      where: { id: m.ingredientId, tenantId },
      data: { currentStock: { increment: m.delta.neg() } },
    });
    await tx.stockMovement.create({
      data: { tenantId, ingredientId: m.ingredientId, delta: m.delta.neg(), reason: "ORDER_CANCEL", orderId },
    });
  }

  const touched = await tx.ingredient.findMany({
    where: { tenantId, id: { in: movements.map((m) => m.ingredientId) }, lowStockAlertedAt: { not: null } },
  });
  const recovered = touched.filter((i) => stockLevel(i.currentStock, i.lowStockThreshold) === "OK");
  if (recovered.length) {
    await tx.ingredient.updateMany({
      where: { tenantId, id: { in: recovered.map((i) => i.id) } },
      data: { lowStockAlertedAt: null },
    });
  }
}

/** Fire-and-forget email to the owner — call after the order transaction has committed. */
export async function notifyLowStock(
  tenantId: string,
  ingredients: { name: string; unit: string; currentStock: Prisma.Decimal; lowStockThreshold: Prisma.Decimal }[],
) {
  if (ingredients.length === 0) return;
  try {
    const [tenant, ownerEmail] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      getOwnerEmail(tenantId),
    ]);
    if (!tenant || !ownerEmail) return;
    await sendLowStockEmail(
      ownerEmail,
      tenant.name,
      ingredients.map((i) => ({
        name: i.name,
        unit: i.unit,
        currentStock: Number(i.currentStock),
        lowStockThreshold: Number(i.lowStockThreshold),
      })),
    );
  } catch (err) {
    console.error("notifyLowStock failed:", err);
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

// ------------------------------------------------------------- bulk import

export type ImportRowInput = {
  name: string;
  unit: string;
  quantity: number;
  lowStock: number;
  costPerUnitCents: number | null;
};

export type ImportSummary = {
  created: number;
  restocked: number;
  skipped: string[];
  problems: string[];
};

export const MAX_IMPORT_ROWS = 300;

/**
 * Saves a pasted ingredient list. New names are created (with opening stock);
 * a name already in the inventory is either left alone ("skip") or has the
 * pasted quantity received on top of its stock ("add") — only when the units
 * match, so 5 g can never be added to a stock counted in kg. Rows are handled
 * one by one, so a single bad row is reported without losing the others.
 */
export async function importIngredients(
  tenantId: string,
  rows: ImportRowInput[],
  mode: "skip" | "add",
): Promise<ImportSummary> {
  if (rows.length === 0) throw new InventoryError("Nothing to import.");
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new InventoryError(`Import up to ${MAX_IMPORT_ROWS} ingredients at a time.`);
  }

  const existing = await listIngredients(tenantId);
  const byName = new Map(existing.map((i) => [i.name.trim().toLowerCase(), i]));
  const summary: ImportSummary = { created: 0, restocked: 0, skipped: [], problems: [] };

  for (const row of rows) {
    const name = row.name.trim();
    try {
      const found = byName.get(name.toLowerCase());
      if (found) {
        if (mode === "skip") {
          summary.skipped.push(name);
        } else if (found.unit !== row.unit) {
          summary.problems.push(`${name}: already stocked in ${found.unit}, not ${row.unit} — left unchanged.`);
        } else if (row.quantity > 0) {
          await adjustStock(tenantId, found.id, row.quantity, "PURCHASE", "Bulk import");
          summary.restocked += 1;
        } else {
          summary.skipped.push(name);
        }
        continue;
      }
      const created = await createIngredient(tenantId, {
        name,
        unit: row.unit,
        openingStock: row.quantity,
        lowStockThreshold: row.lowStock,
        costPerUnitCents: row.costPerUnitCents,
      });
      byName.set(name.toLowerCase(), created);
      summary.created += 1;
    } catch (err) {
      summary.problems.push(`${name || "(blank)"}: ${err instanceof InventoryError ? err.message : "could not be saved."}`);
    }
  }
  return summary;
}
