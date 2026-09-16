import type { ExtractedCategory, ExtractedMenuItem } from "@/lib/ai/menu-import";

export type EditableItem = ExtractedMenuItem & {
  /** Unchecked items are dropped at Publish without ever reaching the server. */
  include: boolean;
  imageUrl: string | null;
};

export type EditableCategory = {
  name: string;
  items: EditableItem[];
  subcategories: EditableCategory[];
};

export type ThemeColors = {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorHeaderText: string;
  colorCardBackground: string;
};

export function toEditableCategories(categories: ExtractedCategory[]): EditableCategory[] {
  return categories.map((c) => ({
    name: c.name,
    items: c.items.map((i) => ({ ...i, include: true, imageUrl: null })),
    subcategories: toEditableCategories(c.subcategories),
  }));
}

/** Deep-clones an editable tree so an in-place mutation (e.g. a merge) never touches the previous React state object. */
export function cloneCategories(categories: EditableCategory[]): EditableCategory[] {
  return categories.map((c) => ({
    name: c.name,
    items: c.items.map((i) => ({ ...i, variants: i.variants ? i.variants.map((v) => ({ ...v })) : null, tags: [...i.tags] })),
    subcategories: cloneCategories(c.subcategories),
  }));
}

function getCategoryAtPrefix(categories: EditableCategory[], prefix: number[]): EditableCategory {
  let level = categories;
  let cat: EditableCategory = level[prefix[0]];
  for (let i = 1; i < prefix.length; i++) {
    cat = cat.subcategories[prefix[i]];
    level = cat.subcategories;
  }
  return cat;
}

/** Resolves a duplicate/flatten `path` (category indices..., item index) back to the real item, for in-place edits. */
export function getItemAtPath(categories: EditableCategory[], path: number[]): EditableItem {
  const catPrefix = path.slice(0, -1);
  const itemIndex = path[path.length - 1];
  if (catPrefix.length === 1) return categories[catPrefix[0]].items[itemIndex];
  const cat = getCategoryAtPrefix(categories, catPrefix);
  return cat.items[itemIndex];
}

export function setItemAtPath(categories: EditableCategory[], path: number[], next: EditableItem): EditableCategory[] {
  const cloned = cloneCategories(categories);
  const catPrefix = path.slice(0, -1);
  const itemIndex = path[path.length - 1];
  const cat = catPrefix.length === 1 ? cloned[catPrefix[0]] : getCategoryAtPrefix(cloned, catPrefix);
  cat.items[itemIndex] = next;
  return cloned;
}

/** Removes an item at `path` entirely (used by duplicate-merge). */
export function removeItemAtPath(categories: EditableCategory[], path: number[]): EditableCategory[] {
  const cloned = cloneCategories(categories);
  const catPrefix = path.slice(0, -1);
  const itemIndex = path[path.length - 1];
  const cat = catPrefix.length === 1 ? cloned[catPrefix[0]] : getCategoryAtPrefix(cloned, catPrefix);
  cat.items.splice(itemIndex, 1);
  return cloned;
}
