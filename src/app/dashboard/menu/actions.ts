"use server";

import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/auth";
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  hasAnyMenuItems,
  renameCategory,
  seedSampleMenu,
  updateItem,
} from "@/lib/data/menu";
import { rupeesToCents } from "@/lib/money";
import { saveUpload } from "@/lib/storage";

export type MenuActionState = { error: string | null };
const ok: MenuActionState = { error: null };

export async function createCategoryAction(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const session = await requireTenantSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Category name is required." };
  await createCategory(session.tenantId, name);
  revalidatePath("/dashboard/menu");
  return ok;
}

export async function renameCategoryAction(categoryId: string, name: string) {
  const session = await requireTenantSession();
  if (!name.trim()) return;
  await renameCategory(session.tenantId, categoryId, name.trim());
  revalidatePath("/dashboard/menu");
}

export async function deleteCategoryAction(categoryId: string) {
  const session = await requireTenantSession();
  await deleteCategory(session.tenantId, categoryId);
  revalidatePath("/dashboard/menu");
}

export async function createItemAction(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const session = await requireTenantSession();
  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = String(formData.get("price") ?? "");
  const photo = formData.get("photo");

  if (!categoryId || !name || !price) {
    return { error: "Name, price, and category are required." };
  }
  const priceCents = rupeesToCents(price);
  if (priceCents <= 0) return { error: "Enter a valid price." };

  let imageUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    imageUrl = await saveUpload(photo, "items");
  }

  try {
    await createItem(session.tenantId, categoryId, {
      name,
      description: description || null,
      priceCents,
      imageUrl,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add item." };
  }

  revalidatePath("/dashboard/menu");
  return ok;
}

export async function toggleItemAvailableAction(itemId: string, isAvailable: boolean) {
  const session = await requireTenantSession();
  await updateItem(session.tenantId, itemId, { isAvailable });
  revalidatePath("/dashboard/menu");
}

export async function deleteItemAction(itemId: string) {
  const session = await requireTenantSession();
  await deleteItem(session.tenantId, itemId);
  revalidatePath("/dashboard/menu");
}

/**
 * Quick-start for a brand-new restaurant with nothing on its menu yet —
 * refuses if any item already exists, so it can never silently duplicate
 * onto (or wipe) a real menu someone's already built.
 */
export async function loadSampleMenuAction() {
  const session = await requireTenantSession();
  if (await hasAnyMenuItems(session.tenantId)) return;
  await seedSampleMenu(session.tenantId);
  revalidatePath("/dashboard/menu");
}
