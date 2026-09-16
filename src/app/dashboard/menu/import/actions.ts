"use server";

import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/auth";
import { createCategory, createItem, type MenuItemVariant } from "@/lib/data/menu";
import { rupeesToCents } from "@/lib/money";
import { saveUpload } from "@/lib/storage";
import {
  extractMenuFromDocuments,
  ALLOWED_TAGS,
  type ExtractionMethod,
  type MultiFileExtractionResult,
} from "@/lib/ai/menu-import";
import { searchFoodPhotos, type StockPhotoResult } from "@/lib/images/stock-photo";
import { buildTableQrDataUrl } from "@/lib/table-qr";

const ALLOWED_TAG_SET = new Set<string>(ALLOWED_TAGS);

/* ------------------------------------------------------------------ */
/* Step: Extract                                                        */
/* ------------------------------------------------------------------ */

export type ExtractWizardState = { error: string | null; result: MultiFileExtractionResult | null };

export async function extractMenuWizardAction(
  _prev: ExtractWizardState,
  formData: FormData,
): Promise<ExtractWizardState> {
  await requireTenantSession();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one photo or PDF first.", result: null };

  for (const file of files) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      return { error: `"${file.name}" isn't an image or PDF.`, result: null };
    }
  }

  const method: ExtractionMethod = formData.get("method") === "claude" ? "claude" : "free";

  try {
    const inputs = await Promise.all(
      files.map(async (file) => ({
        bytes: Buffer.from(await file.arrayBuffer()),
        mimeType:
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : file.type,
      })),
    );
    const result = await extractMenuFromDocuments(inputs, method);
    return { error: null, result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not read those files.", result: null };
  }
}

/* ------------------------------------------------------------------ */
/* Step: Design — free stock-photo search / manual photo upload         */
/* ------------------------------------------------------------------ */

export type StockPhotoState = { error: string | null; results: StockPhotoResult[] | null };

export async function searchStockPhotosAction(
  _prev: StockPhotoState,
  formData: FormData,
): Promise<StockPhotoState> {
  await requireTenantSession();
  const query = String(formData.get("query") ?? "");
  try {
    const results = await searchFoodPhotos(query);
    return { error: null, results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Search failed.", results: null };
  }
}

export type UploadWizardImageState = { error: string | null; imageUrl: string | null };

/**
 * Uploads a photo for an item that doesn't exist as a real DB row yet (the
 * wizard hasn't published anything until the last step) — just returns the
 * resulting URL, same saveUpload() pipeline the manual "add item" form uses.
 */
export async function uploadWizardImageAction(
  _prev: UploadWizardImageState,
  formData: FormData,
): Promise<UploadWizardImageState> {
  await requireTenantSession();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo first.", imageUrl: null };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Only images are supported here.", imageUrl: null };
  }
  const imageUrl = await saveUpload(file, "items");
  return { error: null, imageUrl };
}

/* ------------------------------------------------------------------ */
/* Step: Publish                                                        */
/* ------------------------------------------------------------------ */

type PublishVariant = { label?: unknown; priceRupees?: unknown };
type PublishItem = {
  name?: unknown;
  description?: unknown;
  priceRupees?: unknown;
  variants?: unknown;
  isVeg?: unknown;
  tags?: unknown;
  imageUrl?: unknown;
};
type PublishCategory = { name?: unknown; items?: unknown; subcategories?: unknown };

export type PublishWizardState = {
  error: string | null;
  publishedCount: number | null;
  skippedItems: { name: string; reason: string }[];
};

/**
 * Re-validates every item server-side — never trusts the client's wizard
 * state. An item with no resolved price (flat or variants) is excluded from
 * publish rather than defaulted or guessed, and reported back so the owner
 * can go fix it in Verify.
 */
export async function publishMenuWizardAction(
  _prev: PublishWizardState,
  formData: FormData,
): Promise<PublishWizardState> {
  const session = await requireTenantSession();
  const raw = String(formData.get("categoriesJson") ?? "");

  let categories: PublishCategory[];
  try {
    categories = JSON.parse(raw);
  } catch {
    return { error: "Could not read the reviewed menu — go back and try again.", publishedCount: null, skippedItems: [] };
  }
  if (!Array.isArray(categories)) {
    return { error: "Could not read the reviewed menu — go back and try again.", publishedCount: null, skippedItems: [] };
  }

  const skipped: { name: string; reason: string }[] = [];
  let publishedCount = 0;

  async function publishCategory(cat: PublishCategory, parentCategoryId: string | null): Promise<void> {
    const name = String(cat?.name ?? "").trim();
    if (!name) return;
    const rawItems = Array.isArray(cat?.items) ? (cat.items as PublishItem[]) : [];
    const rawSubcats = Array.isArray(cat?.subcategories) ? (cat.subcategories as PublishCategory[]) : [];

    const validated: {
      name: string;
      description: string;
      priceCents: number;
      variants: MenuItemVariant[] | null;
      isVeg: boolean | null;
      tags: string[];
      imageUrl: string | null;
    }[] = [];

    for (const item of rawItems) {
      const itemName = String(item?.name ?? "").trim();
      if (!itemName) continue;

      const rawVariants = Array.isArray(item?.variants) ? (item.variants as PublishVariant[]) : [];
      const variants: MenuItemVariant[] = rawVariants
        .map((v) => ({
          label: String(v?.label ?? "").trim(),
          priceCents: rupeesToCents(Number(v?.priceRupees)),
        }))
        .filter((v) => v.label.length > 0 && v.priceCents > 0);

      const priceRupees = Number(item?.priceRupees);
      const hasFlatPrice = Number.isFinite(priceRupees) && priceRupees > 0;
      const hasVariants = variants.length > 0;

      if (!hasFlatPrice && !hasVariants) {
        skipped.push({ name: itemName, reason: "needs a price before it can be published" });
        continue;
      }

      const priceCents = hasVariants ? Math.min(...variants.map((v) => v.priceCents)) : rupeesToCents(priceRupees);
      const isVeg = item?.isVeg === true ? true : item?.isVeg === false ? false : null;
      const tags = Array.isArray(item?.tags)
        ? (item.tags as unknown[]).filter((t): t is string => typeof t === "string" && ALLOWED_TAG_SET.has(t))
        : [];
      const imageUrl = typeof item?.imageUrl === "string" && item.imageUrl.trim() ? item.imageUrl.trim() : null;

      validated.push({
        name: itemName,
        description: String(item?.description ?? "").trim(),
        priceCents,
        variants: hasVariants ? variants : null,
        isVeg,
        tags,
        imageUrl,
      });
    }

    if (validated.length === 0 && rawSubcats.length === 0) return;

    const category = await createCategory(session.tenantId, name, { parentCategoryId });
    for (const item of validated) {
      await createItem(session.tenantId, category.id, {
        name: item.name,
        description: item.description || null,
        priceCents: item.priceCents,
        imageUrl: item.imageUrl,
        isVeg: item.isVeg,
        tags: item.tags,
        variants: item.variants,
      });
      publishedCount++;
    }
    for (const sub of rawSubcats) {
      await publishCategory(sub, category.id);
    }
  }

  for (const cat of categories) {
    await publishCategory(cat, null);
  }

  revalidatePath("/dashboard/menu");

  if (publishedCount === 0) {
    return {
      error: "Nothing was published — every item needs a name and a price (or variant prices) first.",
      publishedCount: 0,
      skippedItems: skipped,
    };
  }

  return { error: null, publishedCount, skippedItems: skipped };
}

/** Plain data-URL QR for the tenant's own live shareable link — no `?table=` param, reusing the exact same qrcode pattern as /dashboard/tables. */
export async function getMenuQrDataUrlAction(url: string): Promise<string> {
  await requireTenantSession();
  return buildTableQrDataUrl(url);
}
