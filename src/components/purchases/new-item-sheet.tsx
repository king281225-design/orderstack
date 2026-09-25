"use client";

import { useState } from "react";
import type { PurchaseLangKey } from "@/lib/purchase-scan-lang";
import { PhotoPickerModal } from "@/components/inventory/photo-picker-modal";

export type CategoryOption = { id: string; name: string };

export type NewProductDraft = {
  name: string;
  categoryId: string;
  sku: string | null;
  sellingPriceRupees: string;
  lowStockThreshold: number;
  imageUrl: string | null;
};

/**
 * "New item bottom sheet" from the brief — but since raw materials were
 * removed, an unmatched bill line can only ever become a real, sellable
 * Product (Item.trackStock), not a free-floating stock entry. That means a
 * category and a selling price are required here: a supplier bill only ever
 * tells you what something COST, never what to CHARGE for it, so the owner
 * enters that themselves rather than it being invented. Purchase price is
 * auto-filled from the line's own rate (see confirmPurchase) — not re-asked.
 * A photo is optional, via the same upload/Pexels-search modal the main
 * Add Product form uses.
 */
export function NewItemSheet({
  initialName,
  categories,
  stockPhotoSearchEnabled,
  onCancel,
  onSave,
  t,
}: {
  initialName: string;
  categories: CategoryOption[];
  stockPhotoSearchEnabled: boolean;
  onCancel: () => void;
  onSave: (draft: NewProductDraft) => void;
  t: (key: PurchaseLangKey) => string;
}) {
  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [sku, setSku] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [minStock, setMinStock] = useState("0");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const canSave = name.trim().length > 0 && categoryId.length > 0 && Number(sellingPrice) > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
        <div className="flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl dark:bg-[#1c150f]">
          <h3 className="text-base font-semibold text-gray-900">{t("createNewItem")}</h3>

          {categories.length === 0 ? (
            <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">
              Add a menu category first (see the Menu page), then come back here.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-50 dark:bg-white/5">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-gray-400">No photo</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setPhotoModalOpen(true)}
                    className="text-left text-xs font-medium text-indigo-600 hover:underline"
                  >
                    {imageUrl ? "🔍 Change photo" : "🔍 Add photo (optional)"}
                  </button>
                  {imageUrl && (
                    <button type="button" onClick={() => setImageUrl(null)} className="text-left text-xs font-medium text-red-600">
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Naam
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 text-base focus:border-indigo-600 focus:outline-none dark:bg-transparent"
                  autoFocus
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                {t("category")}
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 text-base focus:border-indigo-600 focus:outline-none dark:bg-transparent"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                SKU / item code (optional)
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 text-base focus:border-indigo-600 focus:outline-none dark:bg-transparent"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Selling price (₹) — bill se sirf purchase price milta hai, yeh khud tay karo
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 text-base focus:border-indigo-600 focus:outline-none dark:bg-transparent"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                {t("minStockLevel")}
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="min-h-[44px] rounded-md border border-gray-300 px-3 text-base focus:border-indigo-600 focus:outline-none dark:bg-transparent"
                />
              </label>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] flex-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={() =>
                onSave({
                  name: name.trim(),
                  categoryId,
                  sku: sku.trim() || null,
                  sellingPriceRupees: sellingPrice,
                  lowStockThreshold: Math.max(0, Number(minStock) || 0),
                  imageUrl,
                })
              }
              className="min-h-[44px] flex-1 rounded-md bg-indigo-600 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("save")}
            </button>
          </div>
        </div>
      </div>
      {photoModalOpen && (
        <PhotoPickerModal
          stockPhotoSearchEnabled={stockPhotoSearchEnabled}
          onPick={({ url }) => {
            setImageUrl(url);
            setPhotoModalOpen(false);
          }}
          onClose={() => setPhotoModalOpen(false)}
        />
      )}
    </>
  );
}
