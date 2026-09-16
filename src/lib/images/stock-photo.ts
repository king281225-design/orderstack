import "server-only";

/**
 * Free stock food-photo search (Pexels), offered in the menu-import wizard's
 * Verify/Design steps as an alternative to uploading your own photo — real
 * free AI image *generation* isn't feasible in this stack (no GPU/local-model
 * hosting; a real generation API costs per image, which would contradict a
 * free-first feature). Follows the same isXConfigured() dormancy convention
 * as isAiMenuImportConfigured()/isRazorpayConfigured()/isR2Configured(): does
 * nothing until PEXELS_API_KEY is set, and the UI shows a visible "not yet
 * enabled" state rather than hiding the option, same precedent as AI import.
 */

export function isStockPhotoSearchConfigured(): boolean {
  return Boolean(process.env.PEXELS_API_KEY);
}

export type StockPhotoResult = {
  id: number;
  thumbUrl: string;
  fullUrl: string;
  photographer: string;
  photographerUrl: string;
};

type PexelsPhoto = {
  id: number;
  photographer: string;
  photographer_url: string;
  src: { medium: string; large: string };
};

export class StockPhotoSearchError extends Error {}

// Menu item names often carry variant/size or bracketed qualifiers that hurt
// stock-photo search relevance ("Veg Manchurian (Half)", "Paneer Tikka -
// Full") — strip those down to the plain dish name before searching.
function cleanQueryText(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(half|full|regular|large|small|medium|quarter|mini|jumbo)\b/gi, " ")
    .replace(/[-–—|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const RESULTS_SHOWN = 5;

async function pexelsSearch(apiKey: string, query: string): Promise<PexelsPhoto[]> {
  // orientation=square: menu-item photos are always displayed as small
  // square thumbnails (storefront and dashboard alike), so a square-cropped
  // source photo fits far better than an arbitrary landscape/portrait one.
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${RESULTS_SHOWN}&orientation=square`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: apiKey } });
  } catch {
    throw new StockPhotoSearchError("Couldn't reach the stock photo service — try again in a moment.");
  }
  if (!res.ok) {
    if (res.status === 401) throw new StockPhotoSearchError("The stock photo API key was rejected.");
    if (res.status === 429) throw new StockPhotoSearchError("Stock photo search rate limit reached — try again shortly.");
    throw new StockPhotoSearchError(`Stock photo search failed (${res.status}).`);
  }
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  return data.photos ?? [];
}

/**
 * Picking a result stores its `fullUrl` (an absolute Pexels CDN URL)
 * directly in Item.imageUrl — every render call site already does a plain
 * `<img src={item.imageUrl}>` with no assumption the value is an
 * `/api/media/...` R2 key, so no re-upload/proxy is needed. Known
 * limitation, accepted for a "quick placeholder photo" feature: a hotlinked
 * URL isn't owned by this app and could theoretically break if Pexels
 * reorganizes it.
 */
export async function searchFoodPhotos(query: string): Promise<StockPhotoResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new StockPhotoSearchError("Stock photo search is not configured (PEXELS_API_KEY is not set).");
  }
  const cleaned = cleanQueryText(query);
  if (!cleaned) return [];

  // Primary search: the cleaned dish name plus "food", biasing results
  // toward actual dishes rather than an unrelated match on the bare word
  // (e.g. a live animal photo for "Chicken"). If that comes back thin —
  // real risk for a specific regional dish name a stock library may not
  // have tagged — fall back to the bare cleaned name, which is broader and
  // more likely to return *something* relevant to pick from.
  const photos = await pexelsSearch(apiKey, `${cleaned} food`);
  if (photos.length < RESULTS_SHOWN) {
    const fallback = await pexelsSearch(apiKey, cleaned);
    const seen = new Set(photos.map((p) => p.id));
    for (const p of fallback) {
      if (!seen.has(p.id)) {
        photos.push(p);
        seen.add(p.id);
      }
    }
  }

  return photos.slice(0, RESULTS_SHOWN).map((p) => ({
    id: p.id,
    thumbUrl: p.src.medium,
    fullUrl: p.src.large,
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
  }));
}
