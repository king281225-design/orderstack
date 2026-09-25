"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { rupeesToCents } from "@/lib/money";
import { saveUpload } from "@/lib/storage";
import { suggestProductFromPhoto, isProductPhotoSuggestConfigured, PhotoSuggestError } from "@/lib/ai/product-photo-suggest";
import { searchFoodPhotos, StockPhotoSearchError, type StockPhotoResult } from "@/lib/images/stock-photo";
import {
  InventoryError,
  adjustItemStock,
  createStation,
  createStockItem,
  deleteStation,
  importStockItems,
  type ProductImportSummary,
  setAutoHideOutOfStock,
  setCategoryStation,
  setItemStation,
  updateStockItem,
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

export async function setAutoHideAction(value: boolean) {
  const session = await requireOwnerSession();
  await setAutoHideOutOfStock(session.tenantId, value);
  revalidatePath("/dashboard/inventory");
}

// -------------------------------------------------- products (direct-stock items)

function revalidateAfterProductChange() {
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/menu"); // a direct-stock product is also a real menu Item
  revalidatePath("/dashboard/orders/new"); // the New Bill product grid must see it
}

export type SuggestProductState = {
  error: string | null;
  suggestion?: { name: string; categoryId: string | null };
};

/**
 * Opt-in (explicit button click, not automatic on every file pick) so a
 * real API call — and its cost — only happens when the owner actually asks
 * for it. Only ever returns a name + a category match; there is no
 * price/cost/stock field on the underlying tool at all (see
 * src/lib/ai/product-photo-suggest.ts), so it's structurally impossible for
 * this to return a fabricated number. `categoryNames` arrives as JSON
 * (id/name pairs) because the form already has the tenant's category list
 * client-side — matching it back to a real id here is just string
 * comparison, the actual ownership check happens again in createStockItem
 * when the product is actually saved.
 */
export async function suggestProductFromPhotoAction(formData: FormData): Promise<SuggestProductState> {
  await requireOwnerSession();
  if (!isProductPhotoSuggestConfigured()) return { error: "AI photo suggestions aren't enabled." };

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Choose a photo first." };

  let categories: { id: string; name: string }[];
  try {
    const parsed = JSON.parse(String(formData.get("categories") ?? "[]"));
    categories = Array.isArray(parsed) ? parsed : [];
  } catch {
    categories = [];
  }

  try {
    const bytes = Buffer.from(await photo.arrayBuffer());
    const result = await suggestProductFromPhoto(
      bytes,
      photo.type || "image/jpeg",
      categories.map((c) => c.name),
    );
    const matched = categories.find((c) => c.name.toLowerCase() === (result.categoryName ?? "").toLowerCase());
    return { error: null, suggestion: { name: result.name, categoryId: matched?.id ?? null } };
  } catch (err) {
    if (err instanceof PhotoSuggestError) return { error: err.message };
    console.error(err);
    return { error: "Could not get a suggestion for that photo." };
  }
}

export async function createStockItemAction(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const session = await requireOwnerSession();
  // imageUrl is set eagerly, before this form ever submits — either by
  // PhotoPickerModal's own upload (uploadProductPhotoAction below) or by
  // picking a Pexels result — and carried here via a plain hidden input.
  // Simpler than the old lazy-file-in-the-form-submit approach, and avoids
  // nesting the photo picker's own UI inside this form (nested <form>s are
  // invalid HTML and silently break — see PhotoPickerModal's doc comment).
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  try {
    await createStockItem(session.tenantId, {
      name: String(formData.get("name") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      sku: String(formData.get("sku") ?? "").trim() || null,
      imageUrl,
      purchasePriceCents: costCents(formData.get("purchasePrice")),
      sellingPriceCents: rupeesToCents(String(formData.get("sellingPrice") ?? "")),
      openingStockQty: num(formData.get("openingStockQty") ?? "0"),
      lowStockThreshold: num(formData.get("lowStockThreshold") ?? "0"),
    });
  } catch (err) {
    return fail(err);
  }
  revalidateAfterProductChange();
  return { error: null, ok: true };
}

/** imageUrl is optional here: leaving it blank keeps the product's current photo, same convention as updateItemAction on the menu page. */
export async function updateStockItemAction(
  itemId: string,
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const session = await requireOwnerSession();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || undefined;
  try {
    await updateStockItem(session.tenantId, itemId, {
      name: String(formData.get("name") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      sku: String(formData.get("sku") ?? "").trim() || null,
      purchasePriceCents: costCents(formData.get("purchasePrice")),
      sellingPriceCents: rupeesToCents(String(formData.get("sellingPrice") ?? "")),
      lowStockThreshold: num(formData.get("lowStockThreshold") ?? "0"),
      ...(imageUrl ? { imageUrl } : {}),
    });
  } catch (err) {
    return fail(err);
  }
  revalidateAfterProductChange();
  return { error: null, ok: true };
}

export type UploadPhotoState = { error: string | null; imageUrl: string | null };

/**
 * Uploads a photo immediately (before the surrounding Add/Edit Product form
 * is submitted) and returns its URL — used by PhotoPickerModal's "Upload a
 * photo" tab. Same eager-upload pattern the AI menu-import wizard already
 * uses for its own per-item photo picker (uploadWizardImageAction).
 */
export async function uploadProductPhotoAction(_prev: UploadPhotoState, formData: FormData): Promise<UploadPhotoState> {
  await requireOwnerSession();
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Choose a photo first.", imageUrl: null };
  if (!photo.type.startsWith("image/")) return { error: "Only images are supported here.", imageUrl: null };
  const imageUrl = await saveUpload(photo, "items");
  return { error: null, imageUrl };
}

export async function adjustItemStockAction(
  itemId: string,
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
    await adjustItemStock(session.tenantId, itemId, delta, reason, String(formData.get("note") ?? ""));
  } catch (err) {
    return fail(err);
  }
  revalidateAfterProductChange();
  return { error: null, ok: true };
}

/** Opts a product back out of stock-tracking — the underlying menu item is untouched; delete it from /dashboard/menu instead. */
export async function stopTrackingStockAction(itemId: string) {
  const session = await requireOwnerSession();
  await updateStockItem(session.tenantId, itemId, { trackStock: false });
  revalidateAfterProductChange();
}

export type ImportProductsState = { error: string | null; summary?: ProductImportSummary };

/**
 * Saves the reviewed rows from the CSV bulk-upload table. Rows arrive as
 * JSON (the browser already ran parseProductCsv for the live preview) and
 * are re-validated here and again in importStockItems — the client-side
 * parse is a convenience, never trusted.
 */
export async function importStockItemsAction(rowsJson: string): Promise<ImportProductsState> {
  const session = await requireOwnerSession();
  let rows: {
    name: string;
    sku: string | null;
    categoryName: string | null;
    purchasePriceCents: number | null;
    sellingPriceCents: number;
    stockQty: number;
    lowStockThreshold: number;
  }[];
  try {
    const parsed = JSON.parse(rowsJson);
    if (!Array.isArray(parsed)) throw new Error("not a list");
    rows = parsed.map((r) => ({
      name: String(r?.name ?? ""),
      sku: r?.sku ? String(r.sku) : null,
      categoryName: r?.categoryName ? String(r.categoryName) : null,
      purchasePriceCents:
        r?.purchasePriceRupees === null || r?.purchasePriceRupees === undefined || r?.purchasePriceRupees === ""
          ? null
          : rupeesToCents(String(r.purchasePriceRupees)),
      sellingPriceCents: rupeesToCents(String(r?.sellingPriceRupees ?? 0)),
      stockQty: Number(r?.stockQty ?? 0) || 0,
      lowStockThreshold: Number(r?.lowStockThreshold ?? 0) || 0,
    }));
  } catch {
    return { error: "Could not read the file." };
  }
  try {
    const summary = await importStockItems(session.tenantId, rows);
    revalidateAfterProductChange();
    return { error: null, summary };
  } catch (err) {
    const res = fail(err);
    return { error: res.error };
  }
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

export type StockPhotoState = { error: string | null; results: StockPhotoResult[] | null };

/**
 * "Search stock photos" on the Add Product form — same Pexels-backed search
 * the AI menu-import wizard's Design step already uses
 * (src/lib/images/stock-photo.ts), offered here as an alternative to
 * uploading your own photo. Picking a result stores its absolute Pexels URL
 * directly (no re-upload) — see that module's own doc comment.
 */
export async function searchProductStockPhotosAction(
  _prev: StockPhotoState,
  formData: FormData,
): Promise<StockPhotoState> {
  await requireOwnerSession();
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
