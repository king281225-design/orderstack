"use client";

import { useActionState, useState } from "react";
import { MenuBrowser } from "@/components/storefront/menu-browser";
import { CartProvider } from "@/lib/cart";
import { rupeesToCents } from "@/lib/money";
import {
  searchStockPhotosAction,
  uploadWizardImageAction,
  type StockPhotoState,
  type UploadWizardImageState,
} from "@/app/dashboard/menu/import/actions";
import { getItemAtPath, setItemAtPath, type EditableCategory, type ThemeColors } from "./types";

const initialStockState: StockPhotoState = { error: null, results: null };
const initialUploadState: UploadWizardImageState = { error: null, imageUrl: null };

const WIDTHS: { key: "mobile" | "tablet" | "desktop"; label: string; px: number }[] = [
  { key: "mobile", label: "Mobile", px: 390 },
  { key: "tablet", label: "Tablet", px: 768 },
  { key: "desktop", label: "Desktop", px: 1280 },
];

type FlatMissingPhoto = { path: number[]; name: string };

function collectMissingPhotos(categories: EditableCategory[]): FlatMissingPhoto[] {
  const out: FlatMissingPhoto[] = [];
  categories.forEach((cat, ci) => {
    cat.items.forEach((item, ii) => {
      if (item.include && !item.imageUrl) out.push({ path: [ci, ii], name: item.name });
    });
    cat.subcategories.forEach((sub, si) => {
      sub.items.forEach((item, ii) => {
        if (item.include && !item.imageUrl) out.push({ path: [ci, si, ii], name: item.name });
      });
    });
  });
  return out;
}

function toPublicCategories(categories: EditableCategory[]) {
  const mapItems = (items: EditableCategory["items"]) =>
    items
      .filter((i) => i.include)
      .map((i, idx) => ({
        id: `preview-${idx}-${i.name}`,
        name: i.name,
        description: i.description || null,
        priceCents: i.variants && i.variants.length > 0 ? rupeesToCents(i.variants[0].priceRupees) : rupeesToCents(i.priceRupees ?? 0),
        imageUrl: i.imageUrl,
        isVeg: i.isVeg,
        tags: i.tags,
        variants: i.variants ? i.variants.map((v) => ({ label: v.label, priceCents: rupeesToCents(v.priceRupees) })) : null,
      }));

  return categories.map((c, ci) => ({
    id: `cat-${ci}`,
    name: c.name,
    items: mapItems(c.items),
    subcategories: c.subcategories.map((sc, si) => ({
      id: `cat-${ci}-${si}`,
      name: sc.name,
      items: mapItems(sc.items),
    })),
  }));
}

function PhotoPicker({
  itemName,
  stockPhotoConfigured,
  onPicked,
}: {
  itemName: string;
  stockPhotoConfigured: boolean;
  onPicked: (url: string) => void;
}) {
  const [mode, setMode] = useState<"none" | "upload" | "search">("none");
  const [uploadState, uploadAction, uploading] = useActionState(uploadWizardImageAction, initialUploadState);
  const [searchState, searchAction, searching] = useActionState(searchStockPhotosAction, initialStockState);

  const [seenUpload, setSeenUpload] = useState(uploadState);
  if (uploadState !== seenUpload) {
    setSeenUpload(uploadState);
    if (uploadState.imageUrl) onPicked(uploadState.imageUrl);
  }

  if (mode === "none") {
    return (
      <div className="mt-1 flex gap-2 text-xs">
        <button type="button" onClick={() => setMode("upload")} className="font-medium text-indigo-600 hover:underline">
          Upload your own
        </button>
        {stockPhotoConfigured ? (
          <button type="button" onClick={() => setMode("search")} className="font-medium text-indigo-600 hover:underline">
            Search a free stock photo
          </button>
        ) : (
          <span className="text-gray-400" title="Set PEXELS_API_KEY to enable this">
            Stock photo search isn&apos;t enabled yet
          </span>
        )}
      </div>
    );
  }

  if (mode === "upload") {
    return (
      <form action={uploadAction} className="mt-1 flex items-center gap-2">
        <input name="photo" type="file" accept="image/*" required className="text-xs" />
        <button type="submit" disabled={uploading} className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
          {uploading ? "Uploading…" : "Use this photo"}
        </button>
        {uploadState.error && <span className="text-xs text-red-600">{uploadState.error}</span>}
      </form>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-2">
      <form action={searchAction} className="flex items-center gap-2">
        <input name="query" defaultValue={itemName} className="rounded border border-gray-200 px-2 py-1 text-xs" />
        <button type="submit" disabled={searching} className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
          {searching ? "Searching…" : "Search"}
        </button>
      </form>
      {searchState.error && <p className="text-xs text-red-600">{searchState.error}</p>}
      {searchState.results && searchState.results.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {searchState.results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPicked(r.fullUrl)}
              title={`Photo by ${r.photographer}`}
              className="group flex flex-col items-center gap-0.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.thumbUrl}
                alt=""
                className="h-24 w-24 rounded-md border border-gray-200 object-cover group-hover:ring-2 group-hover:ring-indigo-500"
              />
              <span className="text-[10px] font-medium text-indigo-600 opacity-0 group-hover:opacity-100">
                Use this
              </span>
            </button>
          ))}
        </div>
      )}
      {searchState.results && searchState.results.length === 0 && (
        <p className="text-xs text-gray-500">No matches — try a different or simpler search term.</p>
      )}
    </div>
  );
}

export function DesignStep({
  categories,
  onChange,
  theme,
  stockPhotoConfigured,
  onBack,
  onNext,
}: {
  categories: EditableCategory[];
  onChange: (next: EditableCategory[]) => void;
  theme: ThemeColors;
  stockPhotoConfigured: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(WIDTHS[0]);
  const missingPhotos = collectMissingPhotos(categories);

  function setImage(path: number[], url: string) {
    const current = getItemAtPath(categories, path);
    onChange(setItemAtPath(categories, path, { ...current, imageUrl: url }));
  }

  const themeVars = {
    "--brand-primary": theme.colorPrimary,
    "--brand-secondary": theme.colorSecondary,
    "--brand-accent": theme.colorAccent,
    "--brand-header-text": theme.colorHeaderText,
    "--brand-card-bg": theme.colorCardBackground,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col gap-4">
      {missingPhotos.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            Add photos ({missingPhotos.length} item{missingPhotos.length === 1 ? "" : "s"} without one)
          </h3>
          <p className="mb-2 text-xs text-gray-500">
            Optional — publishing without a photo is fine, you can add one later from the menu page too.
          </p>
          <ul className="flex flex-col gap-2">
            {missingPhotos.map((m) => (
              <li key={m.path.join(".")} className="rounded border border-gray-100 p-2">
                <p className="text-xs font-medium text-gray-700">{m.name}</p>
                <PhotoPicker
                  itemName={m.name}
                  stockPhotoConfigured={stockPhotoConfigured}
                  onPicked={(url) => setImage(m.path, url)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Live preview</h3>
          <div className="flex gap-1">
            {WIDTHS.map((w) => (
              <button
                key={w.key}
                type="button"
                onClick={() => setWidth(w)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  w.key === width.key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
        {width.key === "desktop" && (
          <p className="mb-2 text-xs text-gray-400">
            This storefront is mobile-first today, so Desktop shows the same single-column layout
            centered in extra space — not a preview inaccuracy, that&apos;s genuinely what customers
            see on a wide screen right now.
          </p>
        )}
        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div
            className="mx-auto overflow-hidden rounded-lg shadow"
            style={{ width: width.px, maxWidth: "100%", ...themeVars, backgroundColor: "var(--brand-accent)" }}
          >
            <CartProvider slug="__menu_import_wizard_preview__">
              <MenuBrowser categories={toPublicCategories(categories)} />
            </CartProvider>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Continue to Publish →
        </button>
      </div>
    </div>
  );
}
