import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { isAiMenuImportConfigured } from "@/lib/ai/menu-import";

/**
 * Free stock food-photo search (Pexels), offered in the menu-import wizard's
 * Verify/Design steps as an alternative to uploading your own photo — real
 * free AI image *generation* isn't feasible in this stack (no GPU/local-model
 * hosting; a real generation API costs per image, which would contradict a
 * free-first feature). Follows the same isXConfigured() dormancy convention
 * as isAiMenuImportConfigured()/isRazorpayConfigured()/isR2Configured(): does
 * nothing until PEXELS_API_KEY is set, and the UI shows a visible "not yet
 * enabled" state rather than hiding the option, same precedent as AI import.
 *
 * Pexels' own search is a real accuracy problem for specific regional dish
 * names, confirmed by hand against the live API rather than assumed: "paneer
 * tikka" returns a pizza (its own alt text: "gourmet pizza featuring paneer
 * and herb toppings") ranked above any genuine tikka photo, and "masala
 * dosa" returns crepes and a vegetable wrap — Pexels' library just doesn't
 * tag/carry many of these dishes, and its search falls back to loose
 * ingredient/cuisine matching rather than erroring. Keyword-filtering the
 * results against Pexels' own `alt` text doesn't fix this either — the pizza
 * result's alt text genuinely contains "paneer", so a keyword match can't
 * tell it apart from a real match. See filterCandidatesByVision below.
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
  alt: string;
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
// Fetched before any AI relevance filtering, so there are enough genuine
// candidates left after wrong ones are excluded — Pexels regularly returns
// only 1-2 real matches for a specific regional dish among its top results
// (see the module doc comment above).
const CANDIDATE_POOL_SIZE = 12;

async function pexelsSearch(apiKey: string, query: string, perPage: number): Promise<PexelsPhoto[]> {
  // orientation=square: menu-item photos are always displayed as small
  // square thumbnails (storefront and dashboard alike), so a square-cropped
  // source photo fits far better than an arbitrary landscape/portrait one.
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=square`;
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

const MATCH_TOOL: Anthropic.Tool = {
  name: "pick_matching_photos",
  description: "From the numbered candidate photos, pick which ones genuinely show the named dish.",
  input_schema: {
    type: "object",
    properties: {
      matchingIndexes: {
        type: "array",
        items: { type: "integer" },
        description:
          "0-based indexes of photos that genuinely depict the named dish, ordered best match first. A photo sharing just one ingredient or a generic 'Indian food' shot does NOT count as a match — the dish itself must be recognizable. Empty array if none of them genuinely show it.",
      },
    },
    required: ["matchingIndexes"],
    additionalProperties: false,
  },
  strict: true,
};

/**
 * Downloads each candidate's thumbnail and asks Claude vision, in one call,
 * which ones genuinely depict the named dish — the only reliable check here,
 * since Pexels' own search/alt-text can't tell a real match from a photo
 * that merely shares an ingredient or cuisine (see module doc comment).
 * Best-effort: any failure (download, auth, rate limit) throws, and the
 * caller falls back to the raw, unfiltered candidates rather than blocking
 * search entirely on an AI hiccup.
 */
async function filterCandidatesByVision(dishName: string, candidates: PexelsPhoto[]): Promise<PexelsPhoto[]> {
  const downloads = await Promise.all(
    candidates.map(async (photo) => {
      try {
        const res = await fetch(photo.src.medium);
        if (!res.ok) return null;
        const contentType = res.headers.get("content-type") ?? "image/jpeg";
        const bytes = Buffer.from(await res.arrayBuffer());
        return { photo, bytes, contentType };
      } catch {
        return null;
      }
    }),
  );
  const usable = downloads.filter((d): d is NonNullable<typeof d> => d !== null);
  if (usable.length === 0) throw new StockPhotoSearchError("Couldn't load any candidate photos to check.");

  const content: Anthropic.MessageParam["content"] = [
    {
      type: "text",
      text: `Dish name: "${dishName}". Below are ${usable.length} candidate photos, each preceded by its index number. Identify which ones genuinely show this specific dish — not just a related cuisine or a shared ingredient.`,
    },
  ];
  for (let i = 0; i < usable.length; i++) {
    const mediaType = usable[i].contentType.startsWith("image/png") ? "image/png" : "image/jpeg";
    content.push({ type: "text", text: `Photo ${i}:` });
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: usable[i].bytes.toString("base64") } });
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    tools: [MATCH_TOOL],
    tool_choice: { type: "tool", name: "pick_matching_photos" },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "pick_matching_photos",
  );
  if (!toolUse) throw new StockPhotoSearchError("The AI didn't return a relevance check for these photos.");
  const { matchingIndexes } = toolUse.input as { matchingIndexes: number[] };

  const seen = new Set<number>();
  const matched: PexelsPhoto[] = [];
  for (const idx of matchingIndexes) {
    if (seen.has(idx) || idx < 0 || idx >= usable.length) continue;
    seen.add(idx);
    matched.push(usable[idx].photo);
  }
  return matched;
}

/**
 * Picking a result stores its `fullUrl` (an absolute Pexels CDN URL)
 * directly in Item.imageUrl — every render call site already does a plain
 * `<img src={item.imageUrl}>` with no assumption the value is an
 * `/api/media/...` R2 key, so no re-upload/proxy is needed. Known
 * limitation, accepted for a "quick placeholder photo" feature: a hotlinked
 * URL isn't owned by this app and could theoretically break if Pexels
 * reorganizes it.
 *
 * Results are relevance-checked with Claude vision when ANTHROPIC_API_KEY is
 * set (isAiMenuImportConfigured() — the same key/gate the AI menu-import
 * feature uses), since Pexels' own search regularly surfaces photos of the
 * wrong dish for specific regional names (see module doc comment). Without
 * that key, or if the check itself fails for any reason, this falls back to
 * Pexels' raw, unfiltered order — never a hard error, since a rougher photo
 * search is still better than none.
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
  const photos = await pexelsSearch(apiKey, `${cleaned} food`, CANDIDATE_POOL_SIZE);
  if (photos.length < CANDIDATE_POOL_SIZE) {
    const fallback = await pexelsSearch(apiKey, cleaned, CANDIDATE_POOL_SIZE);
    const seen = new Set(photos.map((p) => p.id));
    for (const p of fallback) {
      if (!seen.has(p.id)) {
        photos.push(p);
        seen.add(p.id);
      }
    }
  }
  const candidates = photos.slice(0, CANDIDATE_POOL_SIZE);
  if (candidates.length === 0) return [];

  let picked = candidates;
  if (isAiMenuImportConfigured()) {
    try {
      picked = await filterCandidatesByVision(cleaned, candidates);
    } catch (err) {
      console.error("Stock photo relevance check failed, falling back to unfiltered results:", err);
      picked = candidates;
    }
  }

  return picked.slice(0, RESULTS_SHOWN).map((p) => ({
    id: p.id,
    thumbUrl: p.src.medium,
    fullUrl: p.src.large,
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
  }));
}
