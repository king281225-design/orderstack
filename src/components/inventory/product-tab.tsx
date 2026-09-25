"use client";

import { useMemo, useState } from "react";
import { formatINR } from "@/lib/money";
import { LEVEL_LABEL, LEVEL_STYLE, REASON_LABEL } from "@/lib/inventory-ui";
import {
  AddStockItemForm,
  AdjustItemStockForm,
  AutoHideToggle,
  EditStockItemForm,
  StopTrackingStockButton,
  type CategoryOption,
} from "@/components/inventory/product-forms";
import { ProductCsvImport } from "@/components/inventory/product-csv-import";

export type UIStockItemHistory = { id: string; reason: string; note: string | null; delta: number; createdAtLabel: string };

/** Plain, JSON-serializable shape for a direct-stock Item — Prisma.Decimal fields are pre-converted to number server-side (see page.tsx) since this whole tab is a client component. */
export type UIStockItem = {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string;
  priceCents: number;
  purchasePriceCents: number | null;
  stockQty: number;
  lowStockThreshold: number;
  level: "OK" | "LOW" | "OUT";
  history: UIStockItemHistory[];
};

type SortKey = "name" | "stock" | "price" | "category";
type StatusFilter = "all" | "low" | "out";

export function ProductTab({
  isOwner,
  items,
  categories,
  aiPhotoSuggestEnabled,
  stockPhotoSearchEnabled,
  autoHideEnabled,
}: {
  isOwner: boolean;
  items: UIStockItem[];
  categories: CategoryOption[];
  aiPhotoSuggestEnabled: boolean;
  stockPhotoSearchEnabled: boolean;
  autoHideEnabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q) && !(i.sku ?? "").toLowerCase().includes(q)) return false;
      if (categoryFilter && i.categoryId !== categoryFilter) return false;
      if (statusFilter === "low" && i.level !== "LOW") return false;
      if (statusFilter === "out" && i.level !== "OUT") return false;
      return true;
    });
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "stock":
          return a.stockQty - b.stockQty;
        case "price":
          return a.priceCents - b.priceCents;
        case "category":
          return a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [items, search, categoryFilter, statusFilter, sortKey]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500">
        Stocked, sellable products — photos, SKU codes, purchase/selling price. Selling one (at the counter via New
        Bill, or through the storefront) deducts its stock automatically, and restores it if the order is cancelled.
      </p>

      {isOwner && (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Add a product</h3>
            {categories.length === 0 ? (
              <p className="text-sm text-amber-700">Add a menu category first (see the Menu page), then come back here.</p>
            ) : (
              <AddStockItemForm
                categories={categories}
                aiPhotoSuggestEnabled={aiPhotoSuggestEnabled}
                stockPhotoSearchEnabled={stockPhotoSearchEnabled}
              />
            )}
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Bulk upload (CSV)</h3>
            <ProductCsvImport existingSkus={items.map((i) => i.sku).filter((s): s is string => Boolean(s))} />
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
            <AutoHideToggle enabled={autoHideEnabled} />
          </section>
        </>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">
          No stocked products yet.{isOwner ? " Add your first one above, or bulk-upload a CSV." : ""}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:bg-[#241d17]">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or SKU"
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Category
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:bg-transparent"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Stock
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:bg-transparent"
              >
                <option value="all">All</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Sort by
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:bg-transparent"
              >
                <option value="name">Name</option>
                <option value="stock">Stock qty</option>
                <option value="price">Price</option>
                <option value="category">Category</option>
              </select>
            </label>
            <span className="text-xs text-gray-500">
              {filtered.length} of {items.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">No products match these filters.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  isOwner={isOwner}
                  stockPhotoSearchEnabled={stockPhotoSearchEnabled}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductCard({
  item,
  categories,
  isOwner,
  stockPhotoSearchEnabled,
}: {
  item: UIStockItem;
  categories: CategoryOption[];
  isOwner: boolean;
  stockPhotoSearchEnabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">No photo</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">{item.name}</p>
          <p className="truncate text-xs text-gray-500">
            {item.categoryName}
            {item.sku ? ` · ${item.sku}` : ""}
          </p>
          <p className="text-sm text-gray-700">{formatINR(item.priceCents)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_STYLE[item.level]}`}>
          {LEVEL_LABEL[item.level]}
        </span>
      </div>

      <p className="text-sm text-gray-600">
        <span className="text-lg font-semibold">{item.stockQty}</span> in stock
        {item.lowStockThreshold > 0 && <span className="text-xs text-gray-500"> · alert at {item.lowStockThreshold}</span>}
      </p>

      {isOwner && (
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
          <AdjustItemStockForm itemId={item.id} />
          <details>
            <summary className="cursor-pointer text-xs font-medium text-gray-600">Edit details</summary>
            <div className="mt-2 flex flex-col gap-2">
              <EditStockItemForm
                id={item.id}
                name={item.name}
                sku={item.sku ?? ""}
                categoryId={item.categoryId}
                categories={categories}
                purchasePriceRupees={item.purchasePriceCents != null ? String(item.purchasePriceCents / 100) : ""}
                sellingPriceRupees={String(item.priceCents / 100)}
                lowStockThreshold={String(item.lowStockThreshold)}
                imageUrl={item.imageUrl}
                stockPhotoSearchEnabled={stockPhotoSearchEnabled}
              />
              <div>
                <StopTrackingStockButton itemId={item.id} name={item.name} />
              </div>
            </div>
          </details>
        </div>
      )}

      {item.history.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-medium text-gray-600">Recent activity</summary>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-gray-600">
            {item.history.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2">
                <span>
                  {REASON_LABEL[m.reason] ?? m.reason}
                  {m.note ? ` — ${m.note}` : ""}
                </span>
                <span>
                  <span className={m.delta < 0 ? "text-red-600" : "text-green-600"}>
                    {m.delta > 0 ? "+" : ""}
                    {m.delta}
                  </span>{" "}
                  · {m.createdAtLabel}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
