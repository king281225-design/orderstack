import type { listMenuForTenant, MenuItemVariant } from "@/lib/data/menu";
import type { PickableMenuItem, MenuCategoryOption } from "@/components/orders/manual-order-form";

function isVariantArray(v: unknown): v is MenuItemVariant[] {
  return Array.isArray(v) && v.every((r) => typeof r?.label === "string" && typeof r?.priceCents === "number");
}

type Categories = Awaited<ReturnType<typeof listMenuForTenant>>;
type RawItem = Categories[number]["items"][number];

/**
 * Expands each item into one pickable entry per Half/Full-style variant
 * (labeled "Item (Half)"/"Item (Full)" so they're distinct, searchable
 * options) instead of the single flat item.priceCents — which is just the
 * *lowest* variant's price (see variant-rows-editor.tsx). Every variant of
 * the same item shares the same itemId, imageUrl, category and stock — a
 * variant is a price/name label on the same underlying stock-tracked (or
 * not) Item.
 */
function toPickableItems(items: RawItem[], categoryId: string, categoryName: string): PickableMenuItem[] {
  return items.flatMap((i) => {
    const base = {
      itemId: i.id,
      imageUrl: i.imageUrl,
      categoryId,
      categoryName,
      trackStock: i.trackStock,
      stockQty: i.trackStock ? Number(i.stockQty ?? 0) : null,
    };
    if (isVariantArray(i.variants) && i.variants.length > 0) {
      return i.variants.map((v) => ({ ...base, name: `${i.name} (${v.label})`, priceCents: v.priceCents }));
    }
    return [{ ...base, name: i.name, priceCents: i.priceCents }];
  });
}

/** Shared by the new-bill and edit-bill forms — both need the same tap-to-add grid over the tenant's own menu. */
export function buildPickableMenu(categories: Categories): {
  menuItems: PickableMenuItem[];
  menuCategories: MenuCategoryOption[];
} {
  const menuItems = categories.flatMap((c) => [
    ...toPickableItems(c.items, c.id, c.name),
    ...c.subcategories.flatMap((sc) => toPickableItems(sc.items, sc.id, `${c.name} / ${sc.name}`)),
  ]);
  const menuCategories = categories.flatMap((c) => [
    { id: c.id, name: c.name },
    ...c.subcategories.map((sc) => ({ id: sc.id, name: `${c.name} / ${sc.name}` })),
  ]);
  return { menuItems, menuCategories };
}
