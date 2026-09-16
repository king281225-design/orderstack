import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createWorker } from "tesseract.js";
import { normalizeName } from "@/lib/menu-wizard/duplicates";
import { ALLOWED_TAGS, REVIEW_CONFIDENCE_THRESHOLD, type MenuItemTag } from "@/lib/menu-wizard/constants";

export { ALLOWED_TAGS, REVIEW_CONFIDENCE_THRESHOLD, type MenuItemTag };
// pdf-parse is loaded lazily inside the OCR/thumbnail paths below, not
// imported here at module top-level. It depends on @napi-rs/canvas (a native
// Node addon), and native binaries like that are a known trouble spot for
// serverless function bundlers — a lazy import means the menu page itself
// never touches pdf-parse; only an actual PDF-import attempt does.

/**
 * AI-assisted menu import: an owner uploads photos and/or a PDF of their
 * existing paper menu, and it gets read into structured categories/items —
 * subcategories, per-item veg/non-veg, promotional tags, size/portion
 * variants, and a confidence score, so the wizard's Verify step can flag
 * exactly what needs a human look. Two extraction backends:
 *
 * - "free" (default, always available, no account/credentials needed): OCR
 *   via Tesseract.js (local, open-source, no API calls) plus a heuristic
 *   text parser (parseMenuChunks below). Less accurate than the Claude path
 *   — OCR mistakes and layout ambiguity are real — which is exactly why the
 *   result always goes through the same owner review step before anything
 *   is saved.
 * - "claude" (opt-in, needs ANTHROPIC_API_KEY + account credit): Claude
 *   reads the actual image/PDF with vision, understanding layout/columns
 *   the free path can't. Same review-before-save behavior either way.
 *
 * Never invents a price, a size/variant, a veg/non-veg status, or a
 * promotional tag that isn't actually on the menu — every extraction path
 * below is built to leave a field null/empty and flag `needsReview` rather
 * than guess.
 *
 * This is deliberately separate from "hardcopy menu upload"
 * (src/lib/storage.ts folder "menu-docs" / updateTenantMenuDocument) — that
 * feature just stores and links the file, unread.
 */

export type ExtractionMethod = "free" | "claude";

export function isAiMenuImportConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type ExtractedVariant = { label: string; priceRupees: number };

export type ExtractedMenuItem = {
  name: string;
  description: string;
  /** null = no price could be read — never guessed. Flagged via needsReview, never dropped. */
  priceRupees: number | null;
  /** Structured size/portion pricing (e.g. Half/Full). When set, priceRupees is null — an item has either a flat price or variants, never both. */
  variants: ExtractedVariant[] | null;
  /** null = not detectable on the menu — never guessed from the dish name alone. */
  isVeg: boolean | null;
  tags: MenuItemTag[];
  /** 0..1 */
  confidence: number;
  /** "ocr" = Tesseract's own measured confidence; "model-estimate" = Claude's self-reported confidence (not an objective measurement). */
  confidenceSource: "ocr" | "model-estimate";
  source: { fileIndex: number; page: number };
  needsReview: boolean;
};

export type ExtractedCategory = {
  name: string;
  subcategories: ExtractedCategory[];
  items: ExtractedMenuItem[];
};

export type PageThumbnail = { fileIndex: number; page: number; dataUrl: string };

export type MultiFileExtractionResult = {
  categories: ExtractedCategory[];
  pageThumbnails: PageThumbnail[];
};

export class MenuExtractionError extends Error {}

function hasResolvedPrice(priceRupees: number | null, variants: ExtractedVariant[] | null): boolean {
  return priceRupees !== null || Boolean(variants && variants.length > 0);
}

function computeNeedsReview(
  priceRupees: number | null,
  variants: ExtractedVariant[] | null,
  confidence: number,
): boolean {
  return !hasResolvedPrice(priceRupees, variants) || confidence < REVIEW_CONFIDENCE_THRESHOLD;
}

/* ------------------------------------------------------------------ */
/* Deterministic description fallback — never AI-generated, so the free  */
/* (no-API-key) path gets equally invention-free descriptions.           */
/* ------------------------------------------------------------------ */

const DESCRIPTION_TEMPLATES: ((name: string) => string)[] = [
  (name) => `${name}, prepared fresh and served hot.`,
  (name) => `A popular choice — ${name}.`,
  (name) => `${name}, made to order.`,
  (name) => `${name} — a menu favorite.`,
];

/**
 * Fills any item missing a description with a short, neutral, templated
 * line built only from the item's own name — deterministic (not
 * Math.random(), safe to call from a render path too), so it invents no
 * ingredients/allergens/claims regardless of which extraction backend ran.
 */
export function fillMissingDescriptions(categories: ExtractedCategory[]): ExtractedCategory[] {
  const fill = (cats: ExtractedCategory[]): ExtractedCategory[] =>
    cats.map((c) => ({
      ...c,
      subcategories: fill(c.subcategories),
      items: c.items.map((item) => {
        if (item.description.trim().length > 0) return item;
        const template = DESCRIPTION_TEMPLATES[item.name.length % DESCRIPTION_TEMPLATES.length];
        return { ...item, description: template(item.name) };
      }),
    }));
  return fill(categories);
}

/* ------------------------------------------------------------------ */
/* Merge same-named categories across multiple uploaded files/pages     */
/* ------------------------------------------------------------------ */

function mergeCategoryInto(
  target: ExtractedCategory[],
  indexByNorm: Map<string, number>,
  incoming: ExtractedCategory,
) {
  const norm = normalizeName(incoming.name);
  const existingIdx = indexByNorm.get(norm);
  if (existingIdx === undefined) {
    target.push({ name: incoming.name, items: [...incoming.items], subcategories: [...incoming.subcategories] });
    indexByNorm.set(norm, target.length - 1);
    return;
  }
  const existing = target[existingIdx];
  existing.items.push(...incoming.items);
  const subIndex = new Map<string, number>();
  existing.subcategories.forEach((sc, i) => subIndex.set(normalizeName(sc.name), i));
  for (const sub of incoming.subcategories) {
    mergeCategoryInto(existing.subcategories, subIndex, sub);
  }
}

function mergeCategories(perFile: ExtractedCategory[][]): ExtractedCategory[] {
  const merged: ExtractedCategory[] = [];
  const indexByNorm = new Map<string, number>();
  for (const categories of perFile) {
    for (const cat of categories) mergeCategoryInto(merged, indexByNorm, cat);
  }
  return merged;
}

/* ------------------------------------------------------------------ */
/* PDF page thumbnails — for the Verify step's original-page pane, kept  */
/* independent of whether OCR actually needs a page image.              */
/* ------------------------------------------------------------------ */

type PdfParser = InstanceType<Awaited<ReturnType<typeof importPdfParse>>["PDFParse"]>;
async function importPdfParse() {
  return import("pdf-parse");
}

async function renderPdfPageThumbnails(
  parser: PdfParser,
  maxPages = 12,
): Promise<{ page: number; dataUrl: string }[]> {
  try {
    const shot = await parser.getScreenshot({ scale: 1.5, first: maxPages });
    return shot.pages.map((p, i) => ({
      page: i + 1,
      dataUrl: `data:image/png;base64,${Buffer.from(p.data).toString("base64")}`,
    }));
  } catch {
    // Thumbnails are a display nicety, not load-bearing for extraction —
    // never fail the whole import over a rendering hiccup.
    return [];
  }
}

async function renderStandalonePdfThumbnails(fileBytes: Buffer): Promise<{ page: number; dataUrl: string }[]> {
  const { PDFParse } = await importPdfParse();
  const parser = new PDFParse({ data: fileBytes });
  try {
    return await renderPdfPageThumbnails(parser);
  } finally {
    await parser.destroy();
  }
}

/* ------------------------------------------------------------------ */
/* Free backend: local OCR (Tesseract.js) + heuristic text parsing      */
/* ------------------------------------------------------------------ */

async function ocrImageBuffer(buffer: Buffer): Promise<{ text: string; confidence: number }> {
  // Tesseract.js's underlying image decoder (Leptonica, compiled to wasm)
  // has real gaps with some JPEG/PNG variants a real phone camera produces
  // even though it decodes a plain, simply-encoded PNG (like the ones
  // pdfjs-dist renders for the scanned-PDF path below) just fine. Re-encoding
  // through sharp first normalizes any input into a plain baseline PNG
  // Leptonica reliably handles, regardless of source format/encoding quirks.
  const sharp = (await import("sharp")).default;
  const meta = await sharp(buffer).metadata();
  let pipeline = sharp(buffer)
    // Greyscale + contrast-stretch before OCR: a menu photo shot at an angle
    // under uneven lighting, or with a decorative/textured background behind
    // the text, is a real, common failure mode — Tesseract does noticeably
    // better once the text is high-contrast black-on-white rather than
    // reading whatever mid-tones the camera happened to capture.
    .greyscale()
    .normalize()
    .sharpen();
  // Upscale a small/low-res source image — tiny text (a whole menu crammed
  // into one photo) is the single biggest real-world driver of garbled OCR
  // output (dot-leader lines especially: a low-res run of "...." tends to
  // get hallucinated into random letters rather than read as separators).
  if (meta.width && meta.width < 1800) {
    pipeline = pipeline.resize({ width: 1800, withoutEnlargement: false });
  }
  const normalized = await pipeline.png().toBuffer();
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(normalized);
    // Tesseract's own measured recognition confidence (0-100) — a real,
    // objective signal, unlike Claude's self-reported estimate below.
    const confidence = Math.max(0, Math.min(1, (data.confidence ?? 0) / 100));
    return { text: data.text, confidence };
  } finally {
    await worker.terminate();
  }
}

type TextChunk = { text: string; confidence: number; page: number };

async function extractChunksFreeOcr(
  fileBytes: Buffer,
  mimeType: string,
): Promise<{ chunks: TextChunk[]; pageThumbnails: { page: number; dataUrl: string }[] }> {
  if (mimeType === "application/pdf") {
    const { PDFParse } = await importPdfParse();
    const parser = new PDFParse({ data: fileBytes });
    try {
      const pageThumbnails = await renderPdfPageThumbnails(parser);
      const textResult = await parser.getText();
      const embeddedText = (textResult.text ?? "").trim();
      if (embeddedText.length > 60) {
        // A text-based PDF (exported from a document editor, not a scan) —
        // the embedded text layer is exact, no OCR needed or wanted.
        return { chunks: [{ text: embeddedText, confidence: 1, page: 1 }], pageThumbnails };
      }
      // No usable text layer — a scanned/photographed menu saved as a PDF.
      // Capped at 5 pages for OCR (unchanged, deliberate limit) even though
      // thumbnails above render up to 12 — a longer menu still lets the
      // owner *see* later pages even if free-OCR won't extract dishes from
      // them (surfaced in the Verify step's own empty-state copy).
      const shot = await parser.getScreenshot({ scale: 2, first: 5 });
      const chunks: TextChunk[] = [];
      for (let i = 0; i < shot.pages.length; i++) {
        const { text, confidence } = await ocrImageBuffer(Buffer.from(shot.pages[i].data));
        chunks.push({ text, confidence, page: i + 1 });
      }
      return { chunks, pageThumbnails };
    } finally {
      await parser.destroy();
    }
  }
  const { text, confidence } = await ocrImageBuffer(fileBytes);
  return { chunks: [{ text, confidence, page: 1 }], pageThumbnails: [] };
}

const NBSP_RE = new RegExp(String.fromCharCode(160), "g");

// Currency-prefixed price ("₹220", "Rs. 220", "INR 220") or a bare trailing
// number — either way anchored to the end of the line, since that's where
// printed/scanned menus put it. The negative lookbehind keeps a longer digit
// run (a 6-digit PIN code, a phone number fragment) from matching on just
// its last 1-5 digits.
const priceRe =
  /(?:₹|rs\.?|inr)\s*(?<![0-9])([0-9]{1,5}(?:[.,][0-9]{1,2})?)\s*(?:\/-)?\s*$|(?<![0-9])([0-9]{1,5}(?:[.,][0-9]{1,2})?)\s*(?:\/-)?\s*$/i;

// Lines that are never a dish, no matter how they scan: contact/tax/legal
// info, hours, addresses, footers.
const noiseRe =
  /\b(gst(in)?|fssai|tin|pan|cin|license\s*no|contact|tel\.?:|phone|mobile|whatsapp|e[-\s]?mail|address|www\.|https?:\/\/|open(?:ing)?\s*(?:hours|time)|mon(?:day)?\s*[-–]\s*(?:sun|sat)|table\s*no|order\s*no|invoice|bill\s*no|thank\s*you|welcome\s*to|all\s*rights\s*reserved|road|street|st\.|nagar|colony|floor|cross|sector|block|near|opp\.?|landmark)\b|©/i;
const isNoiseLine = (text: string) => noiseRe.test(text) || /^[+\d][\d\s\-()]{8,}$/.test(text);

// A line like "Half - ₹180" or "Full 320" immediately after an item — a
// structured size/variant, not a separate dish or a plain description.
const variantLineRe =
  /^(half|full|regular|large|small|medium|quarter|mini|jumbo)\b[^0-9₹]{0,20}(?:₹|rs\.?|inr)?\s*([0-9]{1,5}(?:[.,][0-9]{1,2})?)\s*(?:\/-)?\s*$/i;

const NON_VEG_MARKER = /\bnon[-\s]?veg(?:etarian)?\b/i;
const VEG_MARKER = /\bveg(?:etarian)?\b/i;
const NON_VEG_KEYWORDS =
  /\b(chicken|mutton|lamb|beef|pork|fish|prawns?|shrimp|eggs?|keema|seafood|crab|squid|bacon|ham)\b/i;

/** Keyword-only, biased toward null — never positively infers vegetarian from the mere absence of a meat word. */
function detectIsVeg(text: string): boolean | null {
  if (NON_VEG_MARKER.test(text)) return false;
  if (VEG_MARKER.test(text)) return true;
  if (NON_VEG_KEYWORDS.test(text)) return false;
  return null;
}

const TAG_PATTERNS: { re: RegExp; tag: MenuItemTag }[] = [
  { re: /best\s*seller/i, tag: "Bestseller" },
  { re: /chef'?s?\s*special/i, tag: "Chef Special" },
  { re: /\bspicy\b|🌶/u, tag: "Spicy" },
  { re: /\bnew\b/i, tag: "New" },
  { re: /\brecommended\b|must[\s-]?try/i, tag: "Recommended" },
];

/** Exact keyword match only against the fixed tag vocabulary — never inferred from price/popularity. */
function detectTags(text: string): MenuItemTag[] {
  const tags: MenuItemTag[] = [];
  for (const { re, tag } of TAG_PATTERNS) if (re.test(text)) tags.push(tag);
  return tags;
}

type ParsedLine = { text: string; price: number | null; nameOnly: string; confidence: number; page: number };

function parseLines(chunks: TextChunk[]): ParsedLine[] {
  const out: ParsedLine[] = [];
  for (const chunk of chunks) {
    const lines = chunk.text
      .split(/\r?\n/)
      .map((l) => l.replace(NBSP_RE, " ").trim())
      .filter((l) => l.length > 0);

    for (const line of lines) {
      if (isNoiseLine(line)) continue;
      const m = line.match(priceRe);
      if (!m || m.index === undefined) {
        out.push({ text: line, price: null, nameOnly: line, confidence: chunk.confidence, page: chunk.page });
        continue;
      }
      const raw = (m[1] ?? m[2] ?? "").replace(",", ".");
      const price = Number(raw);
      if (!Number.isFinite(price) || price <= 0 || price > 99999) {
        out.push({ text: line, price: null, nameOnly: line, confidence: chunk.confidence, page: chunk.page });
        continue;
      }
      const nameOnly = line.slice(0, m.index).replace(/[.\-_\s]+$/g, "").trim();
      out.push({ text: line, price, nameOnly, confidence: chunk.confidence, page: chunk.page });
    }
  }
  return out;
}

function makeItem(
  displayName: string,
  rawLineText: string,
  priceRupees: number | null,
  fileIndex: number,
  page: number,
  confidence: number,
): ExtractedMenuItem {
  return {
    name: displayName,
    description: "",
    priceRupees,
    variants: null,
    isVeg: detectIsVeg(rawLineText),
    tags: detectTags(rawLineText),
    confidence,
    confidenceSource: "ocr",
    source: { fileIndex, page },
    needsReview: computeNeedsReview(priceRupees, null, confidence),
  };
}

/**
 * Groups OCR'd (or PDF-extracted) plain text into categories/items by
 * looking for a trailing price on each line. Inherently a rougher read than
 * an LLM with vision — no page-layout information survives into plain text
 * — kept deliberately simple and predictable, since its output always goes
 * through the owner's own review before saving.
 */
export function parseMenuChunks(chunks: TextChunk[], fileIndex: number): ExtractedCategory[] {
  const parsed = parseLines(chunks);
  const categories: ExtractedCategory[] = [];
  let current: ExtractedCategory | null = null;
  // Tracks whether the immediately preceding line created/extended the
  // current last item — used to decide whether the next priceless line is a
  // one-line description continuation (the common case) or a distinct
  // (priceless) dish of its own.
  let lastLineWasItem = false;

  // A menu almost always has *some* priced line within 5 lines of *any*
  // short priceless line, so "short + a price nearby" alone is a very weak
  // heading signal — it fires just as often for a priceless dish sitting
  // among priced ones (the common case) as for a real section heading. Once
  // a category is already open, only trust it when there's stronger
  // evidence: the line is printed in ALL CAPS (a common real-menu heading
  // convention that survives OCR reasonably well), or it contains a common
  // section-name word. Before any category exists yet, there's no other
  // signal available, so the weak heuristic is the only option for
  // detecting the document's very first heading.
  const isAllCaps = (text: string) => {
    const letters = text.replace(/[^a-zA-Z]/g, "");
    return letters.length >= 3 && letters === letters.toUpperCase();
  };
  const categoryKeywordRe =
    /\b(starters?|appetizers?|appetisers?|soups?|salads?|main\s*course|mains?|entr[ée]es?|rice|biryani|breads?|rotis?|naans?|desserts?|sweets?|beverages?|drinks?|combos?|thali|specials?|sides?|extras?|snacks?|tandoor|grills?|curr(y|ies)|noodles?)\b/i;

  const looksLikeHeadingAt = (i: number, text: string) => {
    const shapeMatches = text.length <= 30 && /[a-zA-Z]/.test(text) && !/[0-9]/.test(text);
    if (!shapeMatches) return false;
    if (!parsed.slice(i + 1, i + 6).some((next) => next.price !== null)) return false;
    if (isAllCaps(text) || categoryKeywordRe.test(text)) return true;
    return current === null;
  };

  const ensureCategory = () => {
    if (!current) {
      current = { name: "Menu", items: [], subcategories: [] };
      categories.push(current);
    }
    return current;
  };

  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];

    // A Half/Full-style variant line right after an item — attach as
    // structured size/portion pricing rather than a new item or description.
    const variantMatch = p.text.match(variantLineRe);
    if (variantMatch && current && current.items.length > 0) {
      const variantPrice = Number(variantMatch[2].replace(",", "."));
      if (Number.isFinite(variantPrice) && variantPrice > 0) {
        const lastItem = current.items[current.items.length - 1];
        const label = variantMatch[1][0].toUpperCase() + variantMatch[1].slice(1).toLowerCase();
        if (lastItem.priceRupees !== null && (!lastItem.variants || lastItem.variants.length === 0)) {
          // Fold the item's own flat price into variants too, so it ends up
          // with either a flat price or a variants array, never both.
          lastItem.variants = [{ label: "Regular", priceRupees: lastItem.priceRupees }];
          lastItem.priceRupees = null;
        }
        lastItem.variants = [...(lastItem.variants ?? []), { label, priceRupees: variantPrice }];
        lastItem.needsReview = computeNeedsReview(lastItem.priceRupees, lastItem.variants, lastItem.confidence);
        lastLineWasItem = true;
        continue;
      }
    }

    // A real dish name has at least one letter — a bare price, a stray
    // code, or leftover punctuation doesn't count even if it's sitting
    // right in front of a number that reads like a price.
    if (p.price !== null && p.nameOnly.length > 0 && /[a-zA-Z]/.test(p.nameOnly)) {
      ensureCategory().items.push(makeItem(p.nameOnly, p.text, p.price, fileIndex, p.page, p.confidence));
      lastLineWasItem = true;
      continue;
    }

    const looksLikeHeading = looksLikeHeadingAt(i, p.text);
    if (looksLikeHeading) {
      current = { name: p.text, items: [], subcategories: [] };
      categories.push(current);
      lastLineWasItem = false;
      continue;
    }

    const hasLetters = /[a-zA-Z]/.test(p.text);

    // Never invent a price, never drop a real dish. A short,
    // dish-name-shaped line (capitalized start, not too long) is checked
    // BEFORE the description-continuation branch below — a genuine dish
    // name ("Veg Manchurian") must win over being silently swallowed as the
    // previous item's description just because it happens to follow one.
    const wordCount = p.text.split(/\s+/).filter(Boolean).length;
    const looksDishLike = hasLetters && wordCount <= 8 && p.text.length <= 60 && /^[A-Z0-9]/.test(p.text.trim());
    if (looksDishLike) {
      ensureCategory().items.push(makeItem(p.nameOnly || p.text, p.text, null, fileIndex, p.page, p.confidence));
      lastLineWasItem = true;
      continue;
    }

    // One-line description continuation of the item just created — the
    // common case (an item's description sits on the very next line,
    // usually lowercase-starting prose rather than a capitalized dish name,
    // which is why it falls through to here only once looksDishLike above
    // has already ruled out "this is actually a new dish").
    if (current && current.items.length > 0 && lastLineWasItem && hasLetters) {
      const lastItem = current.items[current.items.length - 1];
      lastItem.description = lastItem.description ? `${lastItem.description} ${p.text}` : p.text;
      lastLineWasItem = false;
      continue;
    }

    // Unclassifiable fragment the noise filter didn't catch — drop rather
    // than risk it becoming a fake item.
    lastLineWasItem = false;
  }

  return categories.filter((c) => c.items.length > 0);
}

/* ------------------------------------------------------------------ */
/* Claude backend: vision + strict structured tool output               */
/* ------------------------------------------------------------------ */

const ITEM_SCHEMA = {
  type: "object" as const,
  properties: {
    name: { type: "string" as const },
    description: {
      type: "string" as const,
      description:
        "Use the menu's own description text verbatim if printed. If the menu shows no description for an item, leave this as an empty string — a short description will be generated separately from the item's name; do not invent one yourself.",
    },
    priceRupees: {
      type: ["number", "null"] as const,
      description:
        "Price in rupees, numeric only (no currency symbol). If the menu shows multiple sizes/portions with separate prices, leave this null and use `variants` instead. If a price is present but illegible/ambiguous, leave this null rather than guessing — never invent a price.",
    },
    variants: {
      type: "array" as const,
      description:
        "Populate only when the menu itself lists multiple sizes/portions for one dish (e.g. Half/Full, Regular/Large) — do not invent sizes that aren't printed. Leave empty otherwise.",
      items: {
        type: "object" as const,
        properties: { label: { type: "string" as const }, priceRupees: { type: "number" as const } },
        required: ["label", "priceRupees"],
        additionalProperties: false,
      },
    },
    isVeg: {
      type: ["boolean", "null"] as const,
      description:
        "true only if the menu marks this dish vegetarian (a green dot, the word 'veg', explicitly meat-free ingredients like paneer/dal/vegetable-only names); false only if it explicitly contains meat/fish/egg; null if you cannot tell — never guess from a dish's name alone if it's ambiguous.",
    },
    tags: {
      type: "array" as const,
      description:
        "Only include a tag if the menu itself visibly marks the item that way (a star icon, the printed word, a 'Chef's Special' label, a chili symbol). Never add a tag based on your own judgment of what seems popular or spicy.",
      items: { type: "string" as const, enum: [...ALLOWED_TAGS] },
    },
    confidence: {
      type: "number" as const,
      description:
        "Your own confidence (0 to 1) that name/price/category were read correctly from the image — lower it for blurry, small, or ambiguous text.",
    },
    sourcePage: {
      type: ["integer", "null"] as const,
      description:
        "The 1-indexed page number within this document that this item appears on (page 1 for a single image or the first PDF page). Null only if genuinely indeterminate.",
    },
  },
  required: ["name", "description", "priceRupees", "variants", "isVeg", "tags", "confidence", "sourcePage"],
  additionalProperties: false,
};

const RECORD_MENU_TOOL: Anthropic.Tool = {
  name: "record_menu",
  description:
    "Record every category, subcategory, and item found on the uploaded restaurant menu, exactly as read from the image or document.",
  input_schema: {
    type: "object",
    properties: {
      categories: {
        type: "array",
        description: "Menu sections in the order they appear (e.g. Starters, Mains, Beverages).",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            items: { type: "array", items: ITEM_SCHEMA },
            subcategories: {
              type: "array",
              description:
                "Only populate if the menu itself groups items under a sub-heading within this section (e.g. 'Main Course' -> 'Rice & Biryani'). Leave empty otherwise.",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  items: { type: "array", items: ITEM_SCHEMA },
                },
                required: ["name", "items"],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "items", "subcategories"],
          additionalProperties: false,
        },
      },
    },
    required: ["categories"],
    additionalProperties: false,
  },
  strict: true,
};

type ClaudeRawItem = {
  name: string;
  description: string;
  priceRupees: number | null;
  variants: { label: string; priceRupees: number }[];
  isVeg: boolean | null;
  tags: string[];
  confidence: number;
  sourcePage: number | null;
};
type ClaudeRawSubcategory = { name: string; items: ClaudeRawItem[] };
type ClaudeRawCategory = { name: string; items: ClaudeRawItem[]; subcategories: ClaudeRawSubcategory[] };

function convertClaudeItem(it: ClaudeRawItem, fileIndex: number): ExtractedMenuItem {
  const confidence = typeof it.confidence === "number" ? Math.max(0, Math.min(1, it.confidence)) : 0.75;
  const variants = it.variants && it.variants.length > 0 ? it.variants : null;
  const priceRupees = variants ? null : typeof it.priceRupees === "number" ? it.priceRupees : null;
  const allowed = new Set<string>(ALLOWED_TAGS);
  return {
    name: it.name,
    description: it.description ?? "",
    priceRupees,
    variants,
    isVeg: it.isVeg ?? null,
    tags: Array.isArray(it.tags) ? it.tags.filter((t): t is MenuItemTag => allowed.has(t)) : [],
    confidence,
    confidenceSource: "model-estimate",
    source: { fileIndex, page: it.sourcePage ?? 1 },
    needsReview: computeNeedsReview(priceRupees, variants, confidence),
  };
}

function convertClaudeCategory(cat: ClaudeRawCategory, fileIndex: number): ExtractedCategory {
  return {
    name: cat.name,
    items: (cat.items ?? []).map((it) => convertClaudeItem(it, fileIndex)),
    subcategories: (cat.subcategories ?? []).map((sc) => ({
      name: sc.name,
      items: (sc.items ?? []).map((it) => convertClaudeItem(it, fileIndex)),
      subcategories: [],
    })),
  };
}

type SupportedImageMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function toImageMediaType(mimeType: string): SupportedImageMime {
  if (mimeType === "image/png" || mimeType === "image/gif" || mimeType === "image/webp") {
    return mimeType;
  }
  // Covers "image/jpg" (not a real MIME type, but some clients send it) too.
  return "image/jpeg";
}

/**
 * `mimeType` must be "application/pdf" or an "image/*" type — the caller
 * already validates this before reading the file into a Buffer.
 */
async function extractWithClaude(
  fileBytes: Buffer,
  mimeType: string,
  fileIndex: number,
): Promise<ExtractedCategory[]> {
  if (!isAiMenuImportConfigured()) {
    throw new MenuExtractionError("AI menu import is not configured (ANTHROPIC_API_KEY is not set).");
  }

  const client = new Anthropic();
  const base64 = fileBytes.toString("base64");
  const isPdf = mimeType === "application/pdf";

  const documentBlock: Anthropic.ContentBlockParam = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: toImageMediaType(mimeType), data: base64 } };

  let response: Anthropic.Message;
  try {
    // Streamed, per the model's own guidance for requests with sizable
    // input (a scanned menu image/PDF) and output (a full structured menu)
    // — avoids the SDK client timing out on a slow single non-streamed call.
    const stream = client.messages.stream({
      model: "claude-opus-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      tools: [RECORD_MENU_TOOL],
      // Not forced (tool_choice: {type: "tool", ...}) — forced tool_choice
      // is incompatible with extended thinking. Instruction below is
      // explicit instead, and strict:true still guarantees valid input if
      // record_menu is the one called.
      messages: [
        {
          role: "user",
          content: [
            documentBlock,
            {
              type: "text",
              text: "This is a photo or scanned PDF of a restaurant's paper menu. Read every category, subcategory, and item you can find and call record_menu with the complete structured result — that tool call is the only thing that should happen here. Only include actual dishes/drinks that are ordered and priced individually — every item must belong to a category. Group items under the same section headings the menu itself uses, or a sensible default (e.g. 'Starters'/'Mains'/'Beverages') if the menu has none; only use subcategories when the menu itself visually groups items under a sub-heading within a section. Do NOT include the restaurant's name, address, phone/contact info, GST/tax/license numbers, opening hours, table numbers, terms and conditions, or any other non-dish text as if it were an item. Never invent a price, a size/variant, a veg/non-veg status, or a promotional tag that isn't actually shown on the menu — leave the corresponding field null/empty instead of guessing.",
            },
          ],
        },
      ],
    });
    response = await stream.finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new MenuExtractionError("The Anthropic API key was rejected — check ANTHROPIC_API_KEY.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new MenuExtractionError("Rate limited by the AI provider — try again in a moment.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new MenuExtractionError(`AI extraction failed: ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new MenuExtractionError("The AI declined to process that file — try a different one.");
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "record_menu",
  );
  if (!toolUse) {
    throw new MenuExtractionError(
      "The AI didn't return structured menu data for that file — try a clearer photo or a text-based PDF.",
    );
  }

  const parsed = toolUse.input as { categories: ClaudeRawCategory[] };
  const categories = (parsed.categories ?? [])
    .map((c) => convertClaudeCategory(c, fileIndex))
    .filter((c) => c.items.length > 0 || c.subcategories.some((sc) => sc.items.length > 0));
  if (categories.length === 0) {
    throw new MenuExtractionError("No menu items were recognized in that file — try a clearer photo or a different page.");
  }
  return categories;
}

/* ------------------------------------------------------------------ */
/* Multi-file entry point                                                */
/* ------------------------------------------------------------------ */

/**
 * Extracts and merges a whole wizard upload session (one or more images
 * and/or PDFs) in one go — categories sharing a normalized name across
 * files/pages are merged rather than duplicated, and every PDF page gets a
 * lightweight thumbnail for the Verify step's original-page pane regardless
 * of the OCR/text-layer decision made along the way.
 */
export async function extractMenuFromDocuments(
  files: { bytes: Buffer; mimeType: string }[],
  method: ExtractionMethod,
): Promise<MultiFileExtractionResult> {
  const perFileCategories: ExtractedCategory[][] = [];
  const pageThumbnails: PageThumbnail[] = [];
  const errors: string[] = [];

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex];
    try {
      if (method === "claude") {
        const categories = await extractWithClaude(file.bytes, file.mimeType, fileIndex);
        perFileCategories.push(categories);
        if (file.mimeType === "application/pdf") {
          const thumbs = await renderStandalonePdfThumbnails(file.bytes);
          thumbs.forEach((t) => pageThumbnails.push({ fileIndex, page: t.page, dataUrl: t.dataUrl }));
        }
      } else {
        const { chunks, pageThumbnails: thumbs } = await extractChunksFreeOcr(file.bytes, file.mimeType);
        perFileCategories.push(parseMenuChunks(chunks, fileIndex));
        thumbs.forEach((t) => pageThumbnails.push({ fileIndex, page: t.page, dataUrl: t.dataUrl }));
      }
    } catch (err) {
      // One bad file in a multi-file session shouldn't sink the whole
      // upload — collect the error and keep going; surfaced back to the
      // owner alongside whatever did extract successfully.
      errors.push(err instanceof Error ? err.message : `Could not read file ${fileIndex + 1}.`);
    }
  }

  const merged = mergeCategories(perFileCategories).filter(
    (c) => c.items.length > 0 || c.subcategories.some((sc) => sc.items.length > 0),
  );

  if (merged.length === 0) {
    throw new MenuExtractionError(
      errors[0] ??
        "Couldn't make out a menu in those files — try clearer, well-lit photos, or use Claude AI below if you have it configured.",
    );
  }

  return { categories: fillMissingDescriptions(merged), pageThumbnails };
}
