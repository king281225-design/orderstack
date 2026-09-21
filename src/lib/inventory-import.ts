/**
 * Turns a pasted ingredient list into structured rows. Pure (no server-only
 * imports) so the same parser can run in the browser for the live preview.
 * The server re-validates every row before saving — see importIngredients in
 * src/lib/data/inventory.ts.
 *
 * Understands, one ingredient per line:
 *   Paneer 5 kg            Paneer - 5kg            Paneer: 5 kg
 *   5 kg Paneer            2 dozen Eggs            • Onion 10 kg
 *   Paneer, 5, kg, 2, 320  (name, quantity, unit, low-stock alert, cost per unit)
 *   Paneer<TAB>5 kg<TAB>2<TAB>320   (paste straight from Excel / Sheets)
 * A line with only a name is added with zero stock.
 */

export const IMPORT_UNITS = ["g", "kg", "ml", "l", "pcs"] as const;
export type ImportUnit = (typeof IMPORT_UNITS)[number];

export type ParsedIngredient = {
  name: string;
  quantity: number;
  unit: ImportUnit;
  lowStock: number;
  costPerUnit: number | null;
  /** Something the user should double-check, e.g. "unit assumed". */
  note: string | null;
};

const UNIT_ALIASES: Record<string, { unit: ImportUnit; factor: number }> = {};
function alias(unit: ImportUnit, words: string[], factor = 1) {
  for (const w of words) UNIT_ALIASES[w] = { unit, factor };
}
alias("g", ["g", "gm", "gms", "gr", "gram", "grams", "gramme", "grammes"]);
alias("kg", ["kg", "kgs", "kilo", "kilos", "kilogram", "kilograms"]);
alias("ml", ["ml", "mls", "millilitre", "millilitres", "milliliter", "milliliters"]);
alias("l", ["l", "lt", "ltr", "ltrs", "litre", "litres", "liter", "liters"]);
alias("pcs", [
  "pcs", "pc", "piece", "pieces", "nos", "no", "unit", "units", "pkt", "pkts",
  "packet", "packets", "pack", "packs", "box", "boxes", "bag", "bags", "bottle",
  "bottles", "tin", "tins", "can", "cans",
]);
alias("pcs", ["dozen", "doz", "dozens"], 12);

function resolveUnit(word: string): { unit: ImportUnit; factor: number } | null {
  return UNIT_ALIASES[word.toLowerCase().replace(/\.$/, "")] ?? null;
}

const HEADER_RE = /^(name|item|items|ingredient|ingredients|product|products|particulars?)$/i;
const NUMBER_UNIT_RE = /^(\d+(?:\.\d+)?)\s*([a-zA-Z.]*)$/;

function money(cell: string): number | null {
  const m = cell.replace(/[₹,]/g, "").replace(/^rs\.?\s*/i, "").trim().match(/^(\d+(?:\.\d+)?)(?:\s*\/-)?$/i);
  return m ? Number(m[1]) : null;
}

function cleanName(raw: string): string {
  return raw
    .replace(/\s+[x×]\s*$/i, "")
    .replace(/^[\s\-–—:=,@|.()]+|[\s\-–—:=,@|.()]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function finish(
  name: string,
  quantity: number | null,
  unit: ImportUnit | null,
  lowStock: number | null,
  costPerUnit: number | null,
  extraNote: string | null,
): ParsedIngredient | null {
  const cleaned = cleanName(name);
  if (!/\p{L}/u.test(cleaned)) return null;
  const notes: string[] = [];
  if (extraNote) notes.push(extraNote);
  if (quantity === null) notes.push("no quantity found — starts at 0");
  else if (unit === null) notes.push("unit not found — set to pcs");
  return {
    name: cleaned,
    quantity: quantity ?? 0,
    unit: unit ?? "pcs",
    lowStock: lowStock ?? 0,
    costPerUnit,
    note: notes.length ? notes.join("; ") : null,
  };
}

function parseDelimited(cells: string[]): ParsedIngredient | null {
  const [first, ...rest] = cells;
  if (HEADER_RE.test(first)) return null;
  let quantity: number | null = null;
  let unit: ImportUnit | null = null;
  let lowStock: number | null = null;
  let cost: number | null = null;
  let note: string | null = null;

  for (const cell of rest) {
    if (!cell) continue;
    const nu = cell.match(NUMBER_UNIT_RE);
    if (nu) {
      const value = Number(nu[1]);
      if (quantity === null) {
        quantity = value;
        if (nu[2]) {
          const u = resolveUnit(nu[2]);
          if (u) {
            unit = u.unit;
            quantity = value * u.factor;
          } else note = `unit "${nu[2]}" not recognised`;
        }
      } else if (lowStock === null) lowStock = value;
      else if (cost === null) cost = value;
      continue;
    }
    const u = resolveUnit(cell);
    if (u && unit === null) {
      unit = u.unit;
      if (quantity !== null) quantity *= u.factor;
      continue;
    }
    const price = money(cell);
    if (price !== null && cost === null) cost = price;
  }
  return finish(first, quantity, unit, lowStock, cost, note);
}

function parseFreeText(input: string): ParsedIngredient | null {
  // Pull out a price like "@ 45", "₹45" or "Rs 45/kg" first so it can't be
  // mistaken for the quantity.
  let line = input;
  let cost: number | null = null;
  const priceMatch = line.match(/(?:@|₹|\brs\.?)\s*(\d+(?:\.\d+)?)\s*(?:\/-|\/\s*[a-zA-Z]+)?/i);
  if (priceMatch) {
    cost = Number(priceMatch[1]);
    line = line.replace(priceMatch[0], " ");
  }
  const re = /(\d+(?:\.\d+)?)\s*([a-zA-Z.]*)/g;
  let match: RegExpExecArray | null;
  let bareNumber: RegExpExecArray | null = null;
  while ((match = re.exec(line))) {
    const u = match[2] ? resolveUnit(match[2]) : null;
    if (u) {
      const name = line.slice(0, match.index) + " " + line.slice(match.index + match[0].length);
      return finish(name, Number(match[1]) * u.factor, u.unit, null, cost, null);
    }
    if (!match[2] && !bareNumber) bareNumber = match;
  }
  if (bareNumber) {
    const name = line.slice(0, bareNumber.index) + " " + line.slice(bareNumber.index + bareNumber[0].length);
    return finish(name, Number(bareNumber[1]), null, null, cost, null);
  }
  return finish(line, null, null, null, cost, null);
}

export function parseIngredientList(text: string): ParsedIngredient[] {
  const rows: ParsedIngredient[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;
    // Strip list bullets and numbering ("1.", "2)", "-", "•").
    line = line.replace(/^(?:[-*•·▪●]|\d+[.)])\s+/, "");

    let row: ParsedIngredient | null;
    const commaCount = (line.match(/,/g) ?? []).length;
    if (line.includes("\t") || line.includes("|") || commaCount >= 2) {
      const sep = line.includes("\t") ? "\t" : line.includes("|") ? "|" : ",";
      row = parseDelimited(line.split(sep).map((c) => c.trim()));
    } else {
      row = parseFreeText(line);
    }
    if (row) rows.push(row);
  }
  return rows;
}
