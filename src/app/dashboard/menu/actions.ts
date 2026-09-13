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
import { updateTenantMenuDocument } from "@/lib/data/tenants";
import { rupeesToCents } from "@/lib/money";
import { saveUpload } from "@/lib/storage";
import {
  extractMenuFromDocument,
  type ExtractedCategory,
  type ExtractionMethod,
} from "@/lib/ai/menu-import";

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
  const photo = formData.get("photo");

  if (!categoryId || !name || !price) {
    return { error: "Name, price, and category are required." };
  }
  const priceCents = rupeesToCents(price);
  if (priceCents <= 0) return { error: "Enter a valid price." };

  let imageUrl: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    imageUrl = await saveUpload(photo, "items");
  }

  try {
    await updateItem(session.tenantId, itemId, {
      categoryId,
      name,
      description: description || null,
      priceCents,
      ...(imageUrl ? { imageUrl } : {}),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update item." };
  }

  revalidatePath("/dashboard/menu");
  return ok;
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

export type AiMenuImportState = {
  error: string | null;
  categories: ExtractedCategory[] | null;
};

/**
 * Step 1 of AI menu import: read the uploaded photo/PDF and hand back the
 * AI's proposed categories/items — nothing is written to the database yet.
 * The owner reviews/edits the result client-side and only committing that
 * (confirmAiMenuImportAction) actually creates rows.
 */
export async function previewAiMenuImportAction(
  _prev: AiMenuImportState,
  formData: FormData,
): Promise<AiMenuImportState> {
  await requireTenantSession();
  const file = formData.get("menuPhoto");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo or PDF first.", categories: null };
  }
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");
  if (!isPdf && !isImage) {
    return { error: "Only images or PDFs are supported.", categories: null };
  }

  const method: ExtractionMethod = formData.get("method") === "claude" ? "claude" : "free";

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const categories = await extractMenuFromDocument(
      bytes,
      isPdf ? "application/pdf" : file.type,
      method,
    );
    return { error: null, categories };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not read that file.",
      categories: null,
    };
  }
}

/**
 * Step 2: the owner's (possibly edited/pruned) categories, submitted as JSON
 * — creates real Category/Item rows via the same data-layer functions the
 * manual "add item" form uses. Malformed input is refused rather than
 * partially applied.
 */
export async function confirmAiMenuImportAction(formData: FormData) {
  const session = await requireTenantSession();
  const raw = String(formData.get("categoriesJson") ?? "");

  let categories: ExtractedCategory[];
  try {
    categories = JSON.parse(raw);
  } catch {
    return { error: "Could not read the reviewed menu — try extracting again." };
  }
  if (!Array.isArray(categories)) {
    return { error: "Could not read the reviewed menu — try extracting again." };
  }

  for (const cat of categories) {
    const name = String(cat?.name ?? "").trim();
    const items = Array.isArray(cat?.items) ? cat.items : [];
    const validItems = items
      .map((i) => ({
        name: String(i?.name ?? "").trim(),
        description: String(i?.description ?? "").trim(),
        priceRupees: Number(i?.priceRupees),
      }))
      .filter((i) => i.name && Number.isFinite(i.priceRupees) && i.priceRupees > 0);
    if (!name || validItems.length === 0) continue;

    const category = await createCategory(session.tenantId, name);
    for (const item of validItems) {
      await createItem(session.tenantId, category.id, {
        name: item.name,
        description: item.description || null,
        priceCents: rupeesToCents(item.priceRupees),
      });
    }
  }

  revalidatePath("/dashboard/menu");
  return { error: null };
}
