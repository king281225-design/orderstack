import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { isAiMenuImportConfigured } from "@/lib/ai/menu-import";

export { isAiMenuImportConfigured as isProductPhotoSuggestConfigured };

export class PhotoSuggestError extends Error {}

type SupportedImageMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
function toImageMediaType(mimeType: string): SupportedImageMime {
  if (mimeType === "image/png" || mimeType === "image/gif" || mimeType === "image/webp") return mimeType;
  return "image/jpeg"; // covers "image/jpg" (not a real MIME type, but some clients send it) too
}

/**
 * Deliberately tiny: name + best-matching existing category, nothing else.
 * A photo can show what a product IS, never what you SELL it for or how
 * many you HAVE — there's no field here for price/cost/stock/SKU, so it's
 * structurally impossible for the model to invent one. Those stay manual,
 * same "never guess a number" rule the AI menu-import feature already
 * follows for prices.
 */
const SUGGEST_TOOL: Anthropic.Tool = {
  name: "suggest_product",
  description: "Suggest a product name and matching category for the photographed product.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "A short, natural product name for what's shown in the photo, e.g. 'Chocolate Croissant'.",
      },
      categoryName: {
        type: ["string", "null"],
        description:
          "The single best match from the given list of existing category names, copied exactly (including capitalization). Null if none of them fit.",
      },
    },
    required: ["name", "categoryName"],
    additionalProperties: false,
  },
  strict: true,
};

export type PhotoSuggestion = { name: string; categoryName: string | null };

export async function suggestProductFromPhoto(
  bytes: Buffer,
  mimeType: string,
  existingCategoryNames: string[],
): Promise<PhotoSuggestion> {
  if (!isAiMenuImportConfigured()) {
    throw new PhotoSuggestError("AI photo suggestions aren't configured (ANTHROPIC_API_KEY is not set).");
  }

  const client = new Anthropic();
  const base64 = bytes.toString("base64");
  const categoryList = existingCategoryNames.length > 0 ? existingCategoryNames.join(", ") : "(no categories yet)";

  let response: Anthropic.Message;
  try {
    // No extended thinking needed for a single small classification call, so
    // tool_choice can be forced (simpler/more reliable than the menu-import
    // wizard's instruction-only approach, which avoids forcing only because
    // forced tool_choice is incompatible with extended thinking).
    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      tools: [SUGGEST_TOOL],
      tool_choice: { type: "tool", name: "suggest_product" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: toImageMediaType(mimeType), data: base64 } },
            {
              type: "text",
              text: `This is a photo of a single product for a restaurant/bakery/shop's inventory. Suggest a short, natural product name for what's shown. Also pick the single best-matching category from this exact list, copied exactly if one genuinely fits: [${categoryList}] — or null if none of them do. Never suggest a price, cost, or quantity — none of that can be determined from a photo, and this tool has no field for it.`,
            },
          ],
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new PhotoSuggestError("The Anthropic API key was rejected — check ANTHROPIC_API_KEY.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new PhotoSuggestError("Rate limited by the AI provider — try again in a moment.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new PhotoSuggestError(`AI suggestion failed: ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new PhotoSuggestError("The AI declined to process that photo — try a different one.");
  }
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "suggest_product",
  );
  if (!toolUse) throw new PhotoSuggestError("The AI didn't return a suggestion for that photo.");

  const parsed = toolUse.input as { name: string; categoryName: string | null };
  return { name: parsed.name?.trim() || "", categoryName: parsed.categoryName?.trim() || null };
}
