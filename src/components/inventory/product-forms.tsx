"use client";

import { useActionState, useState, useTransition } from "react";
import {
  adjustItemStockAction,
  createStockItemAction,
  setAutoHideAction,
  stopTrackingStockAction,
  suggestProductFromPhotoAction,
  updateStockItemAction,
  type InventoryActionState,
} from "@/app/dashboard/inventory/actions";
import { PhotoPickerModal, type PhotoPick } from "@/components/inventory/photo-picker-modal";

export function AutoHideToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={enabled}
        disabled={pending}
        onChange={(e) => startTransition(() => setAutoHideAction(e.target.checked))}
        className="mt-0.5"
      />
      <span>
        Automatically mark a product unavailable when its own stock runs out
        <span className="block text-xs text-gray-500">
          Off by default — stock counts never block orders unless you turn this on. Turning items back on is manual.
        </span>
      </span>
    </label>
  );
}

const initial: InventoryActionState = { error: null };

const inputCls =
  "rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent";
const btnCls =
  "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50";

function Msg({ state }: { state: InventoryActionState }) {
  if (state.error) return <p className="text-xs text-red-600">{state.error}</p>;
  if (state.ok) return <p className="text-xs text-green-600">Saved.</p>;
  return null;
}

/** A photo thumbnail + "Add/Change/Remove photo" trigger for PhotoPickerModal — shared layout for Add/Edit Product. */
function PhotoPickerField({
  imageUrl,
  onOpen,
  onRemove,
  label,
}: {
  imageUrl: string | null;
  onOpen: () => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-50 dark:bg-white/5">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] text-gray-400">No photo</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button type="button" onClick={onOpen} className="text-left text-xs font-medium text-indigo-600 hover:underline">
          {imageUrl ? "🔍 Change photo" : "🔍 Add photo"}
        </button>
        {imageUrl && (
          <button type="button" onClick={onRemove} className="text-left text-xs font-medium text-red-600">
            Remove
          </button>
        )}
        {!imageUrl && <span className="text-[11px] text-gray-500">{label}</span>}
      </div>
    </div>
  );
}

/** "chocolate-croissant_v2.jpg" -> "Chocolate Croissant V2" — a starting point the owner can still edit, not a final answer. */
function suggestNameFromFilename(filename: string): string {
  const cleaned = filename
    .replace(/\.[^./\\]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export type CategoryOption = { id: string; name: string };

export function AddStockItemForm({
  categories,
  aiPhotoSuggestEnabled,
  stockPhotoSearchEnabled,
}: {
  categories: CategoryOption[];
  /** Whether ANTHROPIC_API_KEY is set — hides the "Suggest from photo" button entirely when it isn't, rather than showing a permanently-broken one. */
  aiPhotoSuggestEnabled: boolean;
  /** Whether PEXELS_API_KEY is set — hides the "Search stock photos" tab in the photo picker when it isn't. */
  stockPhotoSearchEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(createStockItemAction, initial);
  // Controlled only so a picked photo can suggest a starting name/category
  // (never overwriting something the owner already typed/picked) — see
  // suggestNameFromFilename (free, filename-based, automatic) and
  // handleAiSuggest (opt-in, looks at the actual photo, costs an API call).
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  // The original File, kept only when the photo came from a local upload
  // (not Pexels) — reused as-is for the AI-suggest vision call below so
  // there's no need to re-fetch the now-uploaded URL (which would risk a
  // CORS-blocked read for a cross-origin Pexels URL, and is simply
  // unnecessary work for an upload we already have the bytes for).
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [aiSuggesting, startAiSuggest] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  function handlePhotoPick({ url, file }: PhotoPick) {
    setImageUrl(url);
    setUploadedFile(file ?? null);
    setPhotoModalOpen(false);
    if (!name.trim()) setName(suggestNameFromFilename(url.split("/").pop() ?? ""));
  }

  function handleAiSuggest() {
    if (!uploadedFile) return;
    setAiError(null);
    startAiSuggest(async () => {
      const fd = new FormData();
      fd.append("photo", uploadedFile);
      fd.append("categories", JSON.stringify(categories));
      const result = await suggestProductFromPhotoAction(fd);
      if (result.error) {
        setAiError(result.error);
        return;
      }
      if (result.suggestion?.name) setName(result.suggestion.name);
      if (result.suggestion?.categoryId) setCategoryId(result.suggestion.categoryId);
    });
  }

  return (
    <>
      {photoModalOpen && (
        <PhotoPickerModal
          stockPhotoSearchEnabled={stockPhotoSearchEnabled}
          onPick={handlePhotoPick}
          onClose={() => setPhotoModalOpen(false)}
        />
      )}
      <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-4" key={state.ok ? "reset" : "form"}>
        <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-600">
          Product name
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chocolate Croissant"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Category
          <select
            name="categoryId"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              Choose…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          SKU / item code (optional)
          <input name="sku" placeholder="e.g. CRO-001" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Selling price (₹)
          <input name="sellingPrice" type="number" step="any" min="0" required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Purchase price (₹, optional)
          <input name="purchasePrice" type="number" step="any" min="0" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Opening stock
          <input name="openingStockQty" type="number" step="any" min="0" defaultValue="0" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Alert at or below
          <input name="lowStockThreshold" type="number" step="any" min="0" defaultValue="0" className={inputCls} />
        </label>
        <div className="col-span-2 flex flex-col gap-2 sm:col-span-4">
          <PhotoPickerField
            imageUrl={imageUrl}
            onOpen={() => setPhotoModalOpen(true)}
            onRemove={() => {
              setImageUrl(null);
              setUploadedFile(null);
            }}
            label="Optional — upload or search a stock photo"
          />
          <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
          {aiPhotoSuggestEnabled && uploadedFile && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={aiSuggesting}
                className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:bg-white/5"
              >
                {aiSuggesting ? "Looking at photo…" : "✨ Suggest name & category from photo (AI)"}
              </button>
              {aiError && <span className="text-xs text-red-600">{aiError}</span>}
            </div>
          )}
        </div>
        <div className="col-span-full flex items-center gap-3">
          <button type="submit" disabled={pending} className={btnCls}>
            {pending ? "Adding…" : "Add product"}
          </button>
          <Msg state={state} />
        </div>
      </form>
    </>
  );
}

export function EditStockItemForm({
  id,
  name,
  sku,
  categoryId,
  categories,
  purchasePriceRupees,
  sellingPriceRupees,
  lowStockThreshold,
  imageUrl: initialImageUrl,
  stockPhotoSearchEnabled,
}: {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categories: CategoryOption[];
  purchasePriceRupees: string;
  sellingPriceRupees: string;
  lowStockThreshold: string;
  imageUrl?: string | null;
  stockPhotoSearchEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(updateStockItemAction.bind(null, id), initial);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  return (
    <>
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
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input name="name" defaultValue={name} required aria-label="Name" className={`${inputCls} w-40`} />
        <select name="categoryId" defaultValue={categoryId} className={inputCls} aria-label="Category">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex flex-col gap-0.5 text-[11px] text-gray-500">
          SKU
          <input name="sku" defaultValue={sku} className={`${inputCls} w-28`} />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] text-gray-500">
          Selling price (₹)
          <input name="sellingPrice" type="number" step="any" min="0" defaultValue={sellingPriceRupees} className={`${inputCls} w-24`} />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] text-gray-500">
          Purchase price (₹)
          <input name="purchasePrice" type="number" step="any" min="0" defaultValue={purchasePriceRupees} className={`${inputCls} w-24`} />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] text-gray-500">
          Alert at or below
          <input name="lowStockThreshold" type="number" step="any" min="0" defaultValue={lowStockThreshold} className={`${inputCls} w-24`} />
        </label>
        <PhotoPickerField imageUrl={imageUrl} onOpen={() => setPhotoModalOpen(true)} onRemove={() => setImageUrl(null)} label="" />
        <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
        <button type="submit" disabled={pending} className={btnCls}>
          Save
        </button>
        <Msg state={state} />
      </form>
    </>
  );
}

export function AdjustItemStockForm({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState(adjustItemStockAction.bind(null, itemId), initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2" key={state.ok ? "reset" : "form"}>
      <select name="kind" defaultValue="PURCHASE" className={inputCls} aria-label="Change type">
        <option value="PURCHASE">Received stock (+)</option>
        <option value="WASTE">Wastage (−)</option>
        <option value="ADJUSTMENT">Stock count correction (+/−)</option>
      </select>
      <input name="quantity" type="number" step="any" required placeholder="Qty" aria-label="Quantity" className={`${inputCls} w-24`} />
      <input name="note" placeholder="Note (optional)" aria-label="Note" className={`${inputCls} w-40`} />
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "…" : "Update"}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function StopTrackingStockButton({ itemId, name }: { itemId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Stop tracking stock for "${name}"? The menu item itself stays — this only turns off stock tracking.`)) {
          startTransition(() => stopTrackingStockAction(itemId));
        }
      }}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      Stop tracking stock
    </button>
  );
}
