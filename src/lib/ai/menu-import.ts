import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createWorker } from "tesseract.js";
import { PDFParse } from "pdf-parse";

/**
 * AI-assisted menu import: an owner uploads a photo or PDF of their existing
 * paper menu, and it gets read into structured categories/items. Two
 * extraction backends:
 *
 * - "free" (default, always available, no account/credentials needed): OCR
 *   via Tesseract.js (local, open-source, no API calls) plus a heuristic
 *   text parser (parseMenuText below) that groups lines into categories and
 *   items by looking for trailing prices. Less accurate than the Claude
 *   path — OCR mistakes and layout ambiguity are real — which is exactly
 *   why the result always goes through the same owner review step before
 *   anything is saved.
 * - "claude" (opt-in, needs ANTHROPIC_API_KEY + account credit): Claude
 *   reads the actual image/PDF with vision, understanding layout/columns
 *   the free path can't. Same review-before-save behavior either way.
 *
 * This is deliberately separate from "hardcopy menu upload"
 * (src/lib/storage.ts folder "menu-docs" / updateTenantMenuDocument) — that
 * feature just stores and links the file, unread. This one actually reads
 * it and proposes real Category/Item rows, which is why its result is
 * always shown back to the owner for review/edit before anything is written
 * to the database (a misread price or a merged/split item is a real risk
 * with either extraction backend — never trusted blindly, same spirit as
 * the coupon-preview / cart-price-recompute pattern used elsewhere).
 */

export type ExtractionMethod = "free" | "claude";

export function isAiMenuImportConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type ExtractedMenuItem = {
  name: string;
  description: string;
  priceRupees: number;
};

export type ExtractedCategory = {
  name: string;
  items: ExtractedMenuItem[];
};

export class MenuExtractionError extends Error {}

export async function extractMenuFromDocument(
  fileBytes: Buffer,
  mimeType: string,
  method: ExtractionMethod = "free",
): Promise<ExtractedCategory[]> {
  if (method === "claude") {
    return extractWithClaude(fileBytes, mimeType);
  }
  return extractWithFreeOcr(fileBytes, mimeType);
}

/* ------------------------------------------------------------------ */
/* Free backend: local OCR (Tesseract.js) + heuristic text parsing      */
/* ------------------------------------------------------------------ */

async function ocrImageBuffer(buffer: Buffer): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

async function extractWithFreeOcr(
  fileBytes: Buffer,
  mimeType: string,
): Promise<ExtractedCategory[]> {
  let rawText: string;

  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: fileBytes });
    try {
      const textResult = await parser.getText();
      const embeddedText = (textResult.text ?? "").trim();
      if (embeddedText.length > 60) {
        // A text-based PDF (exported from a document editor, not a scan) —
        // the embedded text layer is exact, no OCR needed or wanted.
        rawText = embeddedText;
      } else {
        // No usable text layer, so this is a scanned/photographed menu
        // saved as a PDF — render pages to images and OCR those instead,
        // same as we'd do for a photo. Capped at 5 pages: a paper menu is
        // rarely longer, and OCR-ing dozens of pages would be slow for
        // what's meant to be a quick import.
        const shot = await parser.getScreenshot({ scale: 2, first: 5 });
        const pageTexts = await Promise.all(
          shot.pages.map((page) => ocrImageBuffer(Buffer.from(page.data))),
        );
        rawText = pageTexts.join("\n");
      }
    } finally {
      await parser.destroy();
    }
  } else {
    rawText = await ocrImageBuffer(fileBytes);
  }

  const categories = parseMenuText(rawText);
  if (categories.length === 0) {
    throw new MenuExtractionError(
      "Couldn't make out a menu in that file with the free OCR reader — try a clearer, well-lit photo, or use Claude AI below if you have it configured.",
    );
  }
  return categories;
}

/**
 * Groups OCR'd (or PDF-extracted) plain text into categories/items by
 * looking for a trailing price on each line. Inherently a rougher read
 * than an LLM with vision — no page-layout information survives into plain
 * text, so a two-column menu or unusual formatting can confuse it. Kept
 * deliberately simple and predictable rather than clever, since its output
 * always goes through the owner's own review before saving.
 */
export function parseMenuText(rawText: string): ExtractedCategory[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/ /g, " ").trim())
    .filter((l) => l.length > 0);

  // Currency-prefixed price ("₹220", "Rs. 220", "INR 220") or a bare
  // trailing number ("Paneer Tikka .......... 220", "Cold Coffee 90") —
  // either way the price must anchor to the end of the line, since that's
  // where printed/scanned menus put it.
  const priceRe =
    /(?:₹|rs\.?|inr)\s*([0-9]{1,5}(?:[.,][0-9]{1,2})?)\s*(?:\/-)?\s*$|([0-9]{1,5}(?:[.,][0-9]{1,2})?)\s*(?:\/-)?\s*$/i;

  const parsed = lines.map((line) => {
    const m = line.match(priceRe);
    if (!m || m.index === undefined) {
      return { text: line, price: null as number | null, nameOnly: line };
    }
    const raw = (m[1] ?? m[2] ?? "").replace(",", ".");
    const price = Number(raw);
    if (!Number.isFinite(price) || price <= 0 || price > 99999) {
      return { text: line, price: null as number | null, nameOnly: line };
    }
    const nameOnly = line.slice(0, m.index).replace(/[.\-_\s]+$/g, "").trim();
    return { text: line, price, nameOnly };
  });

  const categories: ExtractedCategory[] = [];
  let current: ExtractedCategory | null = null;

  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];

    if (p.price !== null && p.nameOnly.length > 0) {
      if (!current) {
        current = { name: "Menu", items: [] };
        categories.push(current);
      }
      current.items.push({ name: p.nameOnly, description: "", priceRupees: p.price });
      continue;
    }

    // No price on this line. Decide between three things it could be: a
    // category heading, a description continuing the previous item, or
    // noise (restaurant name, address, page footer). Headings are short
    // and precede priced lines; descriptions immediately follow an item.
    const looksLikeHeading =
      p.text.length <= 30 &&
      !/[0-9]/.test(p.text) &&
      parsed.slice(i + 1, i + 6).some((next) => next.price !== null);

    if (looksLikeHeading) {
      current = { name: p.text, items: [] };
      categories.push(current);
    } else if (current && current.items.length > 0) {
      const lastItem = current.items[current.items.length - 1];
      lastItem.description = lastItem.description ? `${lastItem.description} ${p.text}` : p.text;
    }
    // else: noise before any category/item exists yet — skip it.
  }

  return categories.filter((c) => c.items.length > 0);
}

/* ------------------------------------------------------------------ */
/* Claude backend: vision + strict structured tool output               */
/* ------------------------------------------------------------------ */

const RECORD_MENU_TOOL: Anthropic.Tool = {
  name: "record_menu",
  description:
    "Record every category and item found on the uploaded restaurant menu, exactly as read from the image or document.",
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
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: {
                    type: "string",
                    description: "Short description if the menu shows one, otherwise an empty string.",
                  },
                  priceRupees: {
                    type: "number",
                    description:
                      "Price in rupees, numeric only (no currency symbol). If a dish lists multiple sizes/portions, use the lowest price.",
                  },
                },
                required: ["name", "description", "priceRupees"],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "items"],
          additionalProperties: false,
        },
      },
    },
    required: ["categories"],
    additionalProperties: false,
  },
  strict: true,
};

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
 * (the server action) already validates this before reading the file into a
 * Buffer, same as the existing hardcopy-menu-upload action does.
 */
async function extractWithClaude(fileBytes: Buffer, mimeType: string): Promise<ExtractedCategory[]> {
  if (!isAiMenuImportConfigured()) {
    throw new MenuExtractionError("AI menu import is not configured (ANTHROPIC_API_KEY is not set).");
  }

  const client = new Anthropic();
  const base64 = fileBytes.toString("base64");
  const isPdf = mimeType === "application/pdf";

  const documentBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      }
    : {
        type: "image",
        source: { type: "base64", media_type: toImageMediaType(mimeType), data: base64 },
      };

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
              text: "This is a photo or scanned PDF of a restaurant's paper menu. Read every category and item you can find and call record_menu with the complete structured result — that tool call is the only thing that should happen here. Group items under the same section headings the menu itself uses, or a sensible default (e.g. 'Starters'/'Mains'/'Beverages') if the menu has none. Skip decorative text, addresses, or anything that isn't an actual menu item.",
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
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === "record_menu",
  );
  if (!toolUse) {
    throw new MenuExtractionError(
      "The AI didn't return structured menu data for that file — try a clearer photo or a text-based PDF.",
    );
  }

  const parsed = toolUse.input as { categories: ExtractedCategory[] };
  const categories = (parsed.categories ?? []).filter((c) => c.items.length > 0);
  if (categories.length === 0) {
    throw new MenuExtractionError(
      "No menu items were recognized in that file — try a clearer photo or a different page.",
    );
  }
  return categories;
}
