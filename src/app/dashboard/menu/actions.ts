"use server";

import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/auth";
import {
  createCategory,
  createItem,
  createItemAddOn,
  deleteCategory,
  deleteItem,
  deleteItemAddOn,
  hasAnyMenuItems,
  renameCategory,
  seedSampleMenu,
  toggleItemAddOnAvailable,
  updateItem,
  type MenuItemVariant,
} from "@/lib/data/menu";
import { updateTenantMenuDocument } from "@/lib/data/tenants";
import { rupeesToCents } from "@/lib/money";
import { saveUpload } from "@/lib/storage";
import { searchFoodPhotos, StockPhotoSearchError } from "@/lib/images/stock-photo";
import { ALLOWED_TAGS, type MenuItemTag } from "@/lib/menu-wizard/constants";

const ALLOWED_TAG_SET = new Set<string>(ALLOWED_TAGS);

/** Parses the hidden variantsJson field a form submits — see VariantRowsEditor. Silently drops incomplete/invalid rows rather than erroring, since a half-filled row is more likely an in-progress edit than intentional. */
function parseVariantsField(formData: FormData): MenuItemVariant[] {
  const raw = String(formData.get("variantsJson") ?? "[]");
  let rows: { label?: unknown; price?: unknown }[];
  try {
    rows = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];
  const out: MenuItemVariant[] = [];
  for (const r of rows) {
    const label = typeof r.label === "string" ? r.label.trim() : "";
    const priceCents = typeof r.price === "string" || typeof r.price === "number" ? rupeesToCents(r.price) : 0;
    if (label && priceCents > 0) out.push({ label, priceCents });
  }
  return out;
}

function parseTagsField(formData: FormData): MenuItemTag[] {
  return formData
    .getAll("tags")
    .map((t) => String(t))
    .filter((t): t is MenuItemTag => ALLOWED_TAG_SET.has(t));
}

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

/**
 * Takes the same (id, prevState, formData) shape as updateItemAction, for
 * the same reason: passed directly as a form's `action` (not wrapped in a
 * plain client closure), this is what lets Next.js recognize it as a real
 * server action and automatically refresh the page's Server Component data
 * afterward — a plain client wrapper calling this function doesn't reliably
 * get that automatic refresh (hit for real: the category name kept showing
 * its old value after a successful rename until this was fixed).
 */
export async function renameCategoryAction(
  categoryId: string,
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const session = await requireTenantSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Category name is required." };
  await renameCategory(session.tenantId, categoryId, name);
  revalidatePath("/dashboard/menu");
  return ok;
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
  // Set eagerly by the photo picker (upload or Pexels search — see
  // uploadMenuItemPhotoAction/searchMenuItemStockPhotosAction below) via a
  // hidden input, same convention as the inventory Product form's
  // createStockItemAction.
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;

  if (!categoryId || !name || !price) {
    return { error: "Name, price, and category are required." };
  }
  const variants = parseVariantsField(formData);
  // Same rule the AI-import wizard already uses: when variants exist, the
  // item's own priceCents is the lowest variant's price — the plain Price
  // field above becomes a fallback for items with no variants.
  const priceCents = variants.length > 0 ? Math.min(...variants.map((v) => v.priceCents)) : rupeesToCents(price);
  if (priceCents <= 0) return { error: "Enter a valid price." };

  try {
    await createItem(session.tenantId, categoryId, {
      name,
      description: description || null,
      priceCents,
      imageUrl,
      variants: variants.length > 0 ? variants : null,
      tags: parseTagsField(formData),
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

/**
 * Edits an existing item — same fields as createItemAction, works the same
 * whether the item was originally added manually or came from the AI/OCR
 * import review step (both save through createItem, so there's no
 * difference in the data once it exists). Photo is optional here: leaving
 * it blank keeps the item's current photo rather than clearing it.
 */
export async function updateItemAction(
  itemId: string,
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const session = await requireTenantSession();
  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = String(formData.get("price") ?? "");
  // Blank (the owner never touched the photo picker) keeps the item's
  // current photo — same convention as the inventory Product form's
  // updateStockItemAction.
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || undefined;

  if (!categoryId || !name || !price) {
    return { error: "Name, price, and category are required." };
  }
  const variants = parseVariantsField(formData);
  const priceCents = variants.length > 0 ? Math.min(...variants.map((v) => v.priceCents)) : rupeesToCents(price);
  if (priceCents <= 0) return { error: "Enter a valid price." };

  try {
    await updateItem(session.tenantId, itemId, {
      categoryId,
      name,
      description: description || null,
      priceCents,
      variants: variants.length > 0 ? variants : null,
      tags: parseTagsField(formData),
      ...(imageUrl ? { imageUrl } : {}),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update item." };
  }

  revalidatePath("/dashboard/menu");
  return ok;
}

export type UploadPhotoState = { error: string | null; imageUrl: string | null };

/**
 * Uploads a photo immediately (before the surrounding Add/Edit Item form is
 * submitted) and returns its URL — used by PhotoPickerModal's "Upload" tab
 * on the menu item forms. Same eager-upload pattern the Inventory Product
 * form's uploadProductPhotoAction already uses (both save into the same
 * "items" folder — a menu Item and an inventory Product are the same
 * underlying row, see the direct-stock-inventory rebuild). Open to
 * STAFF too (requireTenantSession, not requireOwnerSession), matching
 * createItemAction/updateItemAction's own auth level — staff can already
 * edit menu items, so they shouldn't lose the photo picker specifically.
 */
export async function uploadMenuItemPhotoAction(_prev: UploadPhotoState, formData: FormData): Promise<UploadPhotoState> {
  await requireTenantSession();
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Choose a photo first.", imageUrl: null };
  if (!photo.type.startsWith("image/")) return { error: "Only images are supported here.", imageUrl: null };
  const imageUrl = await saveUpload(photo, "items");
  return { error: null, imageUrl };
}

export type StockPhotoState = { error: string | null; results: Awaited<ReturnType<typeof searchFoodPhotos>> | null };

/** "Search photos" tab on the menu item forms — same Pexels-backed search the Inventory Product form and AI menu-import wizard already use (src/lib/images/stock-photo.ts). */
export async function searchMenuItemStockPhotosAction(_prev: StockPhotoState, formData: FormData): Promise<StockPhotoState> {
  await requireTenantSession();
  const query = String(formData.get("query") ?? "");
  try {
    const results = await searchFoodPhotos(query);
    return { error: null, results };
  } catch (err) {
    if (err instanceof StockPhotoSearchError) return { error: err.message, results: null };
    console.error(err);
    return { error: "Search failed.", results: null };
  }
}

export async function createItemAddOnAction(
  itemId: string,
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const session = await requireTenantSession();
  const name = String(formData.get("name") ?? "").trim();
  const price = String(formData.get("price") ?? "");
  if (!name || !price) return { error: "Name and price are required." };
  const priceCents = rupeesToCents(price);
  if (priceCents <= 0) return { error: "Enter a valid price." };

  try {
    await createItemAddOn(session.tenantId, itemId, { name, priceCents });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add the add-on." };
  }

  revalidatePath("/dashboard/menu");
  return ok;
}

export async function toggleItemAddOnAvailableAction(addOnId: string, isAvailable: boolean) {
  const session = await requireTenantSession();
  await toggleItemAddOnAvailable(session.tenantId, addOnId, isAvailable);
  revalidatePath("/dashboard/menu");
}

export async function deleteItemAddOnAction(addOnId: string) {
  const session = await requireTenantSession();
  await deleteItemAddOn(session.tenantId, addOnId);
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

export type MenuDocActionState = { error: string | null };
const docOk: MenuDocActionState = { error: null };

/**
 * "Hardcopy menu upload" — a photo or PDF of an existing paper menu, for a
 * restaurant that hasn't built (or hasn't finished building) the digital
 * item-by-item menu yet. Shown as a link on the storefront alongside
 * whatever digital menu items do exist; not parsed or read in any way.
 */
export async function uploadMenuDocumentAction(
  _prev: MenuDocActionState,
  formData: FormData,
): Promise<MenuDocActionState> {
  const session = await requireTenantSession();
  const file = formData.get("menuDocument");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo or PDF first." };
  }
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");
  if (!isPdf && !isImage) {
    return { error: "Only images or PDFs are supported." };
  }

  const url = await saveUpload(file, "menu-docs");
  await updateTenantMenuDocument(session.tenantId, {
    menuDocumentUrl: url,
    menuDocumentType: isPdf ? "pdf" : "image",
  });

  revalidatePath("/dashboard/menu");
  return docOk;
}

export async function removeMenuDocumentAction() {
  const session = await requireTenantSession();
  await updateTenantMenuDocument(session.tenantId, { menuDocumentUrl: null, menuDocumentType: null });
  revalidatePath("/dashboard/menu");
}
