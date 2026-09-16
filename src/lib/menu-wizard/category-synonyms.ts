/**
 * Purely informational category-name synonym hints for the Verify step —
 * "commonly also called 'Appetizers'". Never applied automatically; the
 * restaurant's own category text is always preserved unless the owner
 * explicitly clicks to rename.
 */
const CATEGORY_SYNONYMS: string[][] = [
  ["starters", "appetizers", "appetisers", "starter"],
  ["mains", "main course", "entrees", "entrees"],
  ["beverages", "drinks", "refreshments"],
  ["desserts", "sweets", "dessert"],
  ["breads", "roti", "indian breads"],
  ["rice", "biryani", "rice and biryani"],
  ["soups", "soup"],
  ["salads", "salad"],
  ["combos", "combo meals", "meal combos"],
];

export function findCategorySynonymHint(name: string): string | null {
  const norm = name.trim().toLowerCase();
  if (!norm) return null;
  const group = CATEGORY_SYNONYMS.find((g) => g.includes(norm));
  if (!group) return null;
  const hint = group.find((g) => g !== norm);
  return hint ?? null;
}
