import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * AI-assisted menu import: an owner uploads a photo or PDF of their existing
 * paper menu, and Claude reads it into structured categories/items. Gated on
 * ANTHROPIC_API_KEY, exactly like the Razorpay/Resend integrations elsewhere
 * in this codebase — dormant (no UI-visible attempt to call the API) until a
 * real key is set, so this ships now without spending anything.
 *
 * This is deliberately separate from "hardcopy menu upload"
 * (src/lib/storage.ts folder "menu-docs" / updateTenantMenuDocument) — that
 * feature just stores and links the file, unread. This one actually reads it
 * and proposes real Category/Item rows, which is why its result is always
 * shown back to the owner for review/edit before anything is written to the
 * database (an AI misread price or a merged/split item is a real risk with
 * this kind of extraction — never trusted blindly, same spirit as the
 * coupon-preview / cart-price-recompute pattern used elsewhere).
 */

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
export async function extractMenuFromDocument(
  fileBytes: Buffer,
  mimeType: string,
): Promise<ExtractedCategory[]> {
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
