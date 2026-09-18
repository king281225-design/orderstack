"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { rupeesToCents } from "@/lib/money";
import {
  InventoryError,
  adjustStock,
  createIngredient,
  createStation,
  deleteIngredient,
  deleteStation,
  setAutoHideOutOfStock,
  setCategoryStation,
  setItemStation,
  setRecipeForItem,
  updateIngredient,
} from "@/lib/data/inventory";

export type InventoryActionState = { error: string | null; ok?: boolean };

function fail(err: unknown): InventoryActionState {
  if (err instanceof InventoryError) return { error: err.message };
  console.error(err);
  return { error: "Something went wrong. Please try again." };
}

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function costCents(v: FormDataEntryValue | null): number | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? rupeesToCents(raw) : null;
}

export async function createIngredientAction(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const session = await requireOwnerSession();
  try {
    await createIngredient(session.tenantId, {
      name: String(formData.get("name") ?? ""),
      unit: String(formData.get("unit") ?? ""),
      openingStock: num(formData.get("openingStock") ?? "0"),
      lowStockThreshold: num(formData.get("lowStockThreshold") ?? "0"),
      costPerUnitCents: costCents(formData.get("costPerUnit")),
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/inventory");
  return { error: null, ok: true };
}

export async function updateIngredientAction(
  id: string,
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const session = await requireOwnerSession();
  try {
    await updateIngredient(session.tenantId, id, {
      name: String(formData.get("name") ?? ""),
      unit: String(formData.get("unit") ?? ""),
      lowStockThreshold: num(formData.get("lowStockThreshold") ?? "0"),
      costPerUnitCents: costCents(formData.get("costPerUnit")),
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/inventory");
  return { error: null, ok: true };
}

export async function adjustStockAction(
  ingredientId: string,
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const session = await requireOwnerSession();
  const kind = String(formData.get("kind") ?? "PURCHASE");
  const qty = num(formData.get("quantity"));
  if (!Number.isFinite(qty) || qty === 0) return { error: "Enter a quantity." };
  if (kind !== "ADJUSTMENT" && qty < 0) return { error: "Enter a positive quantity." };

  const reason = kind === "WASTE" ? "WASTE" : kind === "ADJUSTMENT" ? "ADJUSTMENT" : "PURCHASE";
  const delta = reason === "WASTE" ? -Math.abs(qty) : qty;
  try {
    await adjustStock(session.tenantId, ingredientId, delta, reason, String(formData.get("note") ?? ""));
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/inventory");
  return { error: null, ok: true };
}

export async function deleteIngredientAction(id: string) {
  const session = await requireOwnerSession();
  await deleteIngredient(session.tenantId, id);
  revalidatePath("/dashboard/inventory");
}

export async function setAutoHideAction(value: boolean) {
  const session = await requireOwnerSession();
  await setAutoHideOutOfStock(session.tenantId, value);
  revalidatePath("/dashboard/inventory");
}

export async function saveRecipeAction(
  itemId: string,
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const session = await requireOwnerSession();
  let lines: { ingredientId: string; quantity: number }[];
  try {
    const parsed = JSON.parse(String(formData.get("lines") ?? "[]"));
    lines = (Array.isArray(parsed) ? parsed : []).map((l) => ({
      ingredientId: String(l?.ingredientId ?? ""),
      quantity: Number(l?.quantity),
    }));
  } catch {
    return { error: "Could not read the recipe." };
  }
  try {
    await setRecipeForItem(session.tenantId, itemId, lines);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/inventory/recipes");
  return { error: null, ok: true };
}

export async function createStationAction(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const session = await requireOwnerSession();
  try {
    await createStation(session.tenantId, String(formData.get("name") ?? ""));
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/dashboard/kot/stations");
  return { error: null, ok: true };
}

export async function deleteStationAction(id: string) {
  const session = await requireOwnerSession();
  await deleteStation(session.tenantId, id);
  revalidatePath("/dashboard/kot/stations");
  revalidatePath("/dashboard/kot");
}

export async function setItemStationAction(itemId: string, formData: FormData) {
  const session = await requireOwnerSession();
  const stationId = String(formData.get("stationId") ?? "") || null;
  await setItemStation(session.tenantId, itemId, stationId);
  revalidatePath("/dashboard/kot/stations");
}

export async function setCategoryStationAction(categoryId: string, formData: FormData) {
  const session = await requireOwnerSession();
  const stationId = String(formData.get("stationId") ?? "") || null;
  await setCategoryStation(session.tenantId, categoryId, stationId);
  revalidatePath("/dashboard/kot/stations");
}
