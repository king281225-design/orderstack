import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { isAiMenuImportConfigured } from "@/lib/ai/menu-import";
import type { MatchCandidate } from "@/lib/data/purchases";

export { isAiMenuImportConfigured as isPurchaseScanConfigured };

export class PurchaseScanError extends Error {}

/**
 * "Bill Photo se Stock": reads a photo (or up to a few pages) of a supplier
 * bill and extracts every purchased line, matched against the owner's
 * existing products wherever confident. Mirrors src/lib/ai/menu-import.ts's
 * Claude-vision pattern (adaptive thinking, streamed, unforced tool_choice,
 * strict:true schema) but for a single multi-page document read in one call
 * — a bill's pages are genuinely one document (a line can continue or a
 * total can appear on a later page), unlike menu-import's per-file loop.
 *
 * Every product here is counted (pcs) — BhojSetu has no separate raw-material
 * stock system, so there's no kg/L unit conversion to do; a multi-pack line
 * ("2 dozen", "1 case of 24") just resolves to a plain received count.
 *
 * Every number this returns is re-validated server-side in
 * validateExtraction() below before it can reach a real Purchase — never
 * trusted on its own, same rule the menu-import wizard follows for prices.
 */

export type RawExtractedLine = {
  name_on_bill: string;
  matched_key: string | null;
  quantity: number | null;
  rate: number | null;
  line_total: number | null;
  confidence: "high" | "medium" | "low";
  note: string | null;
};

export type RawExtraction = {
  supplier_name: string | null;
  bill_number: string | null;
  bill_date: string | null;
  items: RawExtractedLine[];
  extra_charges: { label: string; amount: number }[];
  bill_grand_total: number | null;
  image_quality: "good" | "poor" | "unreadable";
};

const LINE_SCHEMA = {
  type: "object" as const,
  properties: {
    name_on_bill: { type: "string" as const, description: "The item name exactly as printed/written on the bill." },
    matched_key: {
      type: ["string", "null"] as const,
      description:
        "The `key` field copied EXACTLY from the candidate list for the closest matching existing product — use names, aliases, spelling variants, Hindi/Hinglish names, and brand names to match. Null if none of them confidently match.",
    },
    quantity: {
      type: ["number", "null"] as const,
      description:
        "How many pieces were received, as a plain count (e.g. '2 dozen' -> 24, '1 case of 24' -> 24). Null if illegible — never guess.",
    },
    rate: { type: ["number", "null"] as const, description: "Price per piece, in rupees. Null if illegible — never guess." },
    line_total: { type: ["number", "null"] as const, description: "This line's total as printed on the bill, in rupees. Null if illegible." },
    confidence: { type: "string" as const, enum: ["high", "medium", "low"] },
    note: {
      type: ["string", "null"] as const,
      description: "A short Hinglish note for anything the owner should double-check (a pack-size conversion made, an illegible field, etc). Null if nothing to flag.",
    },
  },
  required: ["name_on_bill", "matched_key", "quantity", "rate", "line_total", "confidence", "note"],
  additionalProperties: false,
};

const RECORD_BILL_TOOL: Anthropic.Tool = {
  name: "record_purchase_bill",
  description: "Record every purchased line item found on the supplier bill photo(s), matched against the owner's existing products wherever possible.",
  input_schema: {
    type: "object",
    properties: {
      supplier_name: { type: ["string", "null"], description: "The supplier/vendor name printed on the bill, if visible." },
      bill_number: { type: ["string", "null"], description: "The bill/invoice number, if visible." },
      bill_date: { type: ["string", "null"], description: "The bill's date in YYYY-MM-DD format, if visible." },
      items: { type: "array", items: LINE_SCHEMA },
      extra_charges: {
        type: "array",
        description: "Non-item charges printed separately on the bill (transport, loading, packing) — not GST breakup or round-off.",
        items: {
          type: "object",
          properties: { label: { type: "string" }, amount: { type: "number" } },
          required: ["label", "amount"],
          additionalProperties: false,
        },
      },
      bill_grand_total: { type: ["number", "null"], description: "The bill's own printed grand total, in rupees, if visible." },
      image_quality: {
        type: "string",
        enum: ["good", "poor", "unreadable"],
        description: "'unreadable' if the photo isn't a bill at all, or is too blurry/dark to read anything useful.",
      },
    },
    required: ["supplier_name", "bill_number", "bill_date", "items", "extra_charges", "bill_grand_total", "image_quality"],
    additionalProperties: false,
  },
  strict: true,
};

type SupportedImageMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
function toImageMediaType(mimeType: string): SupportedImageMime {
  if (mimeType === "image/png" || mimeType === "image/gif" || mimeType === "image/webp") return mimeType;
  return "image/jpeg";
}

function candidateListText(candidates: MatchCandidate[]): string {
  if (candidates.length === 0) return "(the owner has no products set up yet — matched_key must be null for everything)";
  return candidates
    .map((c) => {
      const aliasText = c.aliases.length > 0 ? `, aliases: ${c.aliases.join(", ")}` : "";
      return `{key: "${c.key}", name: "${c.name}"${aliasText}}`;
    })
    .join("\n");
}

export async function extractPurchaseBill(
  images: { bytes: Buffer; mimeType: string }[],
  candidates: MatchCandidate[],
): Promise<RawExtraction> {
  if (!isAiMenuImportConfigured()) {
    throw new PurchaseScanError("Bill scanning isn't configured (ANTHROPIC_API_KEY is not set).");
  }
  if (images.length === 0) throw new PurchaseScanError("No photo was provided.");

  const client = new Anthropic();
  const imageBlocks: Anthropic.ContentBlockParam[] = images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: toImageMediaType(img.mimeType), data: img.bytes.toString("base64") },
  }));

  const prompt = `You are a stock-entry assistant for BhojSetu, a restaurant/bakery/shop management app.

TASK
Read the attached photo(s) of a supplier bill and extract every purchased item so it can be added to the owner's product stock. The bill may be printed, handwritten, a thermal receipt, or a kachha bill, in English, Hindi or Hinglish, and may be blurry, tilted or partly cut off. If more than one photo is attached, they are pages of the SAME bill.

OWNER'S EXISTING PRODUCTS (match against these; copy the "key" field exactly)
${candidateListText(candidates)}

RULES
1. Extract every line item: name as written, how many pieces were received, rate per piece, and line total.
2. Match each item to the closest candidate above using names, aliases, spelling variants, Hindi/Hinglish names and brand names. If there is no confident match, set matched_key to null.
3. Every quantity is a plain piece count — resolve multi-packs/cases (e.g. "2 dozen" = 24, "1 case of 24" = 24) into that count, and note the conversion you made.
4. Never guess numbers. If a quantity or price is unreadable, set it to null and confidence to "low".
5. Read the supplier name, bill number and bill date if visible.
6. Ignore non-item lines (GST breakup, round-off, "Thank you", phone numbers, addresses). Put any charges like transport or loading in extra_charges, not as items.
7. Set image_quality to "unreadable" only if this isn't a bill at all, or is too blurry/dark to read anything useful.

Call record_purchase_bill with the complete result — that tool call is the only thing that should happen here.`;

  let response: Anthropic.Message;
  try {
    const stream = client.messages.stream({
      model: "claude-opus-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      tools: [RECORD_BILL_TOOL],
      messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: prompt }] }],
    });
    response = await stream.finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new PurchaseScanError("The Anthropic API key was rejected — check ANTHROPIC_API_KEY.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new PurchaseScanError("Rate limited by the AI provider — try again in a moment.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new PurchaseScanError(`Bill reading failed: ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new PurchaseScanError("The AI declined to process that photo — try a different one.");
  }
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "record_purchase_bill",
  );
  if (!toolUse) throw new PurchaseScanError("Photo saaf nahi aayi, dobara lo — couldn't read that bill, try a clearer photo.");

  return toolUse.input as RawExtraction;
}

// ------------------------------------------------------------ server-side validation

export type ValidatedLine = {
  nameOnBill: string;
  matchedId: string | null;
  matchedName: string | null;
  quantity: number | null;
  rateCents: number | null;
  lineTotalCents: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  note: string | null;
};

export type ValidatedExtraction = {
  supplierName: string | null;
  billNumber: string | null;
  billDate: string | null;
  lines: ValidatedLine[];
  extraCharges: { label: string; amountCents: number }[];
  billGrandTotalCents: number | null;
  calculatedTotalCents: number;
  totalMismatch: boolean;
  imageQuality: "good" | "poor" | "unreadable";
};

const toCents = (rupees: number) => Math.round(rupees * 100);

/**
 * "Validation (server side — don't trust the model blindly)": recomputes
 * every total from scratch, forces low confidence on anything that doesn't
 * add up or is missing a number, flags a big swing from the item's last
 * purchase rate, and drops any matched_key the model invented that isn't
 * actually in the candidate list.
 */
export function validateExtraction(raw: RawExtraction, candidates: MatchCandidate[]): ValidatedExtraction {
  if (raw.image_quality === "unreadable" || raw.items.length === 0) {
    throw new PurchaseScanError("Photo saaf nahi aayi, dobara lo — that photo wasn't readable as a bill. Try again with better light.");
  }

  const byKey = new Map(candidates.map((c) => [c.key, c]));
  let calculatedTotalCents = 0;

  const lines: ValidatedLine[] = raw.items.map((item) => {
    const nameOnBill = (item.name_on_bill ?? "").trim() || "Unnamed item";
    const candidate = item.matched_key ? byKey.get(item.matched_key) ?? null : null;

    let confidence: "HIGH" | "MEDIUM" | "LOW" =
      item.confidence === "high" ? "HIGH" : item.confidence === "low" ? "LOW" : "MEDIUM";
    const notes: string[] = item.note?.trim() ? [item.note.trim()] : [];

    const quantity = typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : null;
    const rate = typeof item.rate === "number" && Number.isFinite(item.rate) && item.rate >= 0 ? item.rate : null;
    if (quantity === null || rate === null) confidence = "LOW";

    const modelLineTotal = typeof item.line_total === "number" && Number.isFinite(item.line_total) ? item.line_total : null;
    const effectiveTotal = quantity !== null && rate !== null ? quantity * rate : modelLineTotal;

    if (quantity !== null && rate !== null && modelLineTotal !== null) {
      const computed = quantity * rate;
      const tolerance = Math.max(2, computed * 0.02);
      if (Math.abs(computed - modelLineTotal) > tolerance) {
        confidence = "LOW";
        notes.push("Qty x rate bill ke total se match nahi karta.");
      }
    }

    if (candidate && candidate.lastRateCents !== null && rate !== null) {
      const newRateCents = toCents(rate);
      const deviation = Math.abs(newRateCents - candidate.lastRateCents) / Math.max(1, candidate.lastRateCents);
      if (deviation > 0.4) {
        if (confidence === "HIGH") confidence = "MEDIUM";
        notes.push("Rate pichhli baar se bahut alag hai.");
      }
    }

    if (effectiveTotal !== null) calculatedTotalCents += toCents(effectiveTotal);

    return {
      nameOnBill,
      matchedId: candidate?.id ?? null,
      matchedName: candidate?.name ?? null,
      quantity,
      rateCents: rate !== null ? toCents(rate) : null,
      lineTotalCents: effectiveTotal !== null ? toCents(effectiveTotal) : null,
      confidence,
      note: notes.length > 0 ? notes.join(" ") : null,
    };
  });

  const extraCharges = (raw.extra_charges ?? [])
    .map((c) => ({ label: (c.label ?? "").trim(), amountCents: toCents(typeof c.amount === "number" ? c.amount : 0) }))
    .filter((c) => c.label && c.amountCents !== 0);
  const extraChargesTotal = extraCharges.reduce((s, c) => s + c.amountCents, 0);

  const billGrandTotalCents = typeof raw.bill_grand_total === "number" && Number.isFinite(raw.bill_grand_total) ? toCents(raw.bill_grand_total) : null;
  const tolerance = billGrandTotalCents !== null ? Math.max(200, billGrandTotalCents * 0.02) : 0;
  const totalMismatch =
    billGrandTotalCents !== null && Math.abs(calculatedTotalCents + extraChargesTotal - billGrandTotalCents) > tolerance;

  return {
    supplierName: raw.supplier_name?.trim() || null,
    billNumber: raw.bill_number?.trim() || null,
    billDate: /^\d{4}-\d{2}-\d{2}$/.test(raw.bill_date ?? "") ? raw.bill_date : null,
    lines,
    extraCharges,
    billGrandTotalCents,
    calculatedTotalCents,
    totalMismatch,
    imageQuality: raw.image_quality,
  };
}
