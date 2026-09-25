/**
 * Turns an uploaded .csv file's text into structured product rows for the
 * Inventory "Products" bulk-upload flow. Pure (no server-only imports) so
 * the same parser runs in the browser for the live review table — the
 * server re-validates every row before saving (see importStockItems in
 * src/lib/data/inventory.ts).
 *
 * Hand-rolled, dependency-free CSV parsing (no papaparse/xlsx) — handles
 * quoted fields with embedded commas/newlines and "" escaped quotes,
 * CRLF/LF line endings. Not a full RFC4180 implementation: no BOM handling,
 * no alternate delimiters. True binary .xlsx isn't supported — export the
 * sheet as CSV first.
 */

/** Splits raw CSV text into rows of raw string cells. Exported for tests/reuse; parseProductCsv is the main entry point. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      i += 1; // swallow — \n (or end of text) closes the row
      continue;
    }
    if (c === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  // A file with no trailing newline still has one more field/row to flush.
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export type ProductCsvRow = {
  name: string;
  sku: string | null;
  category: string | null;
  purchasePriceRupees: number | null;
  sellingPriceRupees: number | null;
  stockQty: number | null;
  lowStockThreshold: number | null;
  /** Surfaced per-row in the review table — e.g. "Missing product name". */
  problems: string[];
};

type Field =
  | "name"
  | "sku"
  | "category"
  | "purchasePriceRupees"
  | "sellingPriceRupees"
  | "stockQty"
  | "lowStockThreshold";

const HEADER_MAP: Record<string, Field> = {
  name: "name",
  item: "name",
  "item name": "name",
  product: "name",
  "product name": "name",
  particulars: "name",
  sku: "sku",
  code: "sku",
  "item code": "sku",
  "product code": "sku",
  barcode: "sku",
  category: "category",
  "product category": "category",
  type: "category",
  "purchase price": "purchasePriceRupees",
  "cost price": "purchasePriceRupees",
  cost: "purchasePriceRupees",
  "buying price": "purchasePriceRupees",
  "selling price": "sellingPriceRupees",
  price: "sellingPriceRupees",
  mrp: "sellingPriceRupees",
  rate: "sellingPriceRupees",
  stock: "stockQty",
  "stock qty": "stockQty",
  qty: "stockQty",
  quantity: "stockQty",
  "opening stock": "stockQty",
  "current stock": "stockQty",
  "low stock": "lowStockThreshold",
  "low stock threshold": "lowStockThreshold",
  "reorder level": "lowStockThreshold",
  "alert at": "lowStockThreshold",
  "min stock": "lowStockThreshold",
};

function num(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[₹,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Keyword fallback for a header that doesn't exactly match HEADER_MAP —
 * real-world sheets (and this app's own form labels, e.g. "SKU / item code",
 * "Selling price (₹)", "Alert at or below") rarely match a fixed dictionary
 * exactly. Order matters: more specific checks (purchase price, SKU,
 * category, low-stock) run before the generic ones they'd otherwise be
 * swallowed by (e.g. "Purchase price" contains "price", which would
 * otherwise match the generic selling-price rule).
 */
function classifyHeader(normalized: string): Field | null {
  if (/purchase|cost|buying/.test(normalized)) return "purchasePriceRupees";
  if (/sku|barcode|code/.test(normalized)) return "sku";
  if (/categ|\btype\b/.test(normalized)) return "category";
  if (/sell|price|mrp|\brate\b/.test(normalized)) return "sellingPriceRupees";
  if (/low|alert|reorder|threshold|\bmin\b/.test(normalized)) return "lowStockThreshold";
  if (/stock|qty|quantity/.test(normalized)) return "stockQty";
  if (/name|\bitem\b|product|particular/.test(normalized)) return "name";
  return null;
}

/**
 * Header-row driven and column-order independent. Tries an exact match
 * against HEADER_MAP first (its normalized form — lowercased, punctuation
 * stripped — so "SKU / item code" and "sku item code" both hit "item code"),
 * then falls back to classifyHeader's keyword matching so headers copied
 * straight from this app's own form labels (or any reasonable variant) are
 * still recognised. Only a header matching neither is reported as unknown
 * and ignored, rather than failing the whole file.
 */
export function parseProductCsv(text: string): { rows: ProductCsvRow[]; unknownHeaders: string[] } {
  const grid = parseCsvRows(text);
  if (grid.length === 0) return { rows: [], unknownHeaders: [] };

  const [headerRow, ...dataRows] = grid;
  const fields: (Field | null)[] = [];
  const unknownHeaders: string[] = [];
  for (const h of headerRow) {
    const key = h.trim().toLowerCase();
    const normalized = key.replace(/[^a-z0-9]+/g, " ").trim();
    const mapped = HEADER_MAP[key] ?? HEADER_MAP[normalized] ?? classifyHeader(normalized);
    fields.push(mapped);
    if (!mapped && h.trim()) unknownHeaders.push(h.trim());
  }

  const rows: ProductCsvRow[] = [];
  for (const dataRow of dataRows) {
    if (dataRow.every((c) => !c.trim())) continue;
    const byField: Partial<Record<Field, string>> = {};
    fields.forEach((f, i) => {
      if (f && dataRow[i] !== undefined) byField[f] = dataRow[i];
    });

    const name = (byField.name ?? "").trim();
    const sellingPriceRupees = num(byField.sellingPriceRupees);
    const problems: string[] = [];
    if (!name) problems.push("Missing product name");
    if (sellingPriceRupees === null || sellingPriceRupees <= 0) problems.push("Missing or invalid selling price");

    rows.push({
      name,
      sku: byField.sku?.trim() || null,
      category: byField.category?.trim() || null,
      purchasePriceRupees: num(byField.purchasePriceRupees),
      sellingPriceRupees,
      stockQty: num(byField.stockQty),
      lowStockThreshold: num(byField.lowStockThreshold),
      problems,
    });
  }

  return { rows, unknownHeaders };
}
