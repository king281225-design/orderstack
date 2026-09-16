/**
 * Pure, dependency-free duplicate-item detection for the AI menu-import
 * wizard's Verify step. Deliberately isomorphic (no "server-only") — the
 * Verify step calls this client-side, via useMemo, on every edit, so it
 * needs to be cheap and need no server round-trip. Also reused by
 * src/lib/ai/menu-import.ts (server-side) to merge same-named categories
 * across multiple uploaded files/pages.
 */

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Classic O(n*m) edit-distance DP — no npm dependency needed for a small item-name comparison. */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

/** 1 = identical (after normalization), 0 = completely different. */
export function similarityScore(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(na, nb) / maxLen;
}

// Tuned conservatively so distinct dishes sharing words ("Chicken Curry" vs
// "Chicken Biryani") don't false-positive, while true near-duplicates (an
// OCR misread, or the same dish appearing on two uploaded pages) do.
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.82;

export type CategoryLike<I> = { items: I[]; subcategories: CategoryLike<I>[] };
export type FlatItemRef<I> = { path: number[]; item: I };

/** Flattens a nested category/subcategory item tree; `path` locates the item back in the original tree (category index, ...subcategory indices, item index). */
export function flattenItems<I>(categories: CategoryLike<I>[]): FlatItemRef<I>[] {
  const out: FlatItemRef<I>[] = [];
  const walk = (cats: CategoryLike<I>[], prefix: number[]) => {
    cats.forEach((cat, ci) => {
      cat.items.forEach((item, ii) => out.push({ path: [...prefix, ci, ii], item }));
      walk(cat.subcategories, [...prefix, ci]);
    });
  };
  walk(categories, []);
  return out;
}

export type DuplicateGroup<I> = {
  key: string;
  reason: "exact" | "similar";
  refs: FlatItemRef<I>[];
};

/**
 * Groups items across the whole tree (not per-category — the same dish
 * could legitimately be mis-listed under two different headings, or
 * duplicated across two uploaded pages that overlap) by exact
 * normalized-name match or a similarity score above the threshold.
 */
export function findDuplicateGroups<I extends { name: string }>(
  categories: CategoryLike<I>[],
): DuplicateGroup<I>[] {
  const flat = flattenItems(categories);
  const groups: DuplicateGroup<I>[] = [];
  const used = new Set<number>();

  for (let i = 0; i < flat.length; i++) {
    if (used.has(i)) continue;
    const normI = normalizeName(flat[i].item.name);
    if (!normI) continue;
    const refs: FlatItemRef<I>[] = [flat[i]];
    let reason: "exact" | "similar" = "exact";

    for (let j = i + 1; j < flat.length; j++) {
      if (used.has(j)) continue;
      const normJ = normalizeName(flat[j].item.name);
      if (!normJ) continue;
      if (normI === normJ) {
        refs.push(flat[j]);
        used.add(j);
      } else if (similarityScore(flat[i].item.name, flat[j].item.name) >= DUPLICATE_SIMILARITY_THRESHOLD) {
        refs.push(flat[j]);
        used.add(j);
        reason = "similar";
      }
    }

    if (refs.length > 1) {
      used.add(i);
      groups.push({ key: refs.map((r) => r.path.join(".")).join("|"), reason, refs });
    }
  }

  return groups;
}
