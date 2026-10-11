/**
 * Thermal-printer receipt-width math — pure, so both server print pages
 * (which only ever see a `width` query-string value) and client components
 * (which also persist the choice — see print-prefs-client.ts) can use it.
 *
 * This is a free-form mm value, not a fixed 58/80 choice — thermal printers
 * come in plenty of roll widths (a Decode DCMP21, for example, is 50mm; 58mm
 * and 80mm are just the two most common ones). A browser has no API to ask
 * a printer what paper is loaded in it — there's nothing to "auto-detect"
 * here — so the one real fix is letting the owner type their printer's
 * actual width once; a mismatch between what the receipt is laid out for
 * and the real paper is exactly what reads as a print getting its margin
 * "cut off" or landing off-center, since it's printing part of a wider
 * layout than the paper can actually hold.
 */
export type ThermalWidth = string;

const MIN_MM = 30;
const MAX_MM = 120;
export const DEFAULT_THERMAL_WIDTH: ThermalWidth = "80";

export function isThermalWidth(value: string | undefined): value is ThermalWidth {
  if (!value) return false;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n >= MIN_MM && n <= MAX_MM;
}

/**
 * @page size/margin for a given roll width and page height (in mm). The
 * height used to be the keyword `auto` (`size: 48mm auto`) to mean "let the
 * page grow to fit the receipt" — but `<length> auto` is not a valid CSS
 * @page `size` value (the spec only allows one or two lengths, a page-size
 * keyword, or `auto` on its own). Confirmed directly against Chromium's
 * print pipeline: with that invalid value, Chrome silently discarded the
 * whole rule and fell back to a full US Letter page (612×792pt) — which is
 * exactly what reading as "margin cut off" / "footer jumps down the page
 * onto blank space" would look like, since real content sat in a narrow
 * column on an oversized page.
 *
 * A fixed height is valid CSS and does get applied correctly — but a
 * generous guessed height (1000mm) turned out to be the wrong fix too: a
 * real print preview showed one line of content followed by nearly a
 * meter of blank page, meaning the printer driver does NOT reliably trim
 * trailing blank paper the way a true continuous-roll driver would. The
 * height passed in here should be the real measured content height (see
 * useThermalPageHeightMm in print-prefs-client.ts), not a guess.
 *
 * The height is floored to stay above the width — a page where width >
 * height is, by definition, landscape-shaped. A short ticket (few items)
 * can genuinely measure shorter than the roll width, and @page size with
 * two explicit lengths has no separate `portrait`/`landscape` keyword to
 * force orientation independently (that keyword only combines with a named
 * page-size like "A4 portrait", not with explicit lengths) — the only way
 * to guarantee portrait here is making sure the height we hand over is
 * always taller than the width.
 */
export function thermalPageCss(width: ThermalWidth, heightMm: number) {
  const safeHeightMm = Math.max(heightMm, Number(width) + 10);
  return { size: `${width}mm ${safeHeightMm}mm`, margin: Number(width) <= 60 ? "2mm" : "3mm" };
}

/** On-screen/print content width — the roll width minus margin on both sides. */
export function thermalContentWidthMm(width: ThermalWidth) {
  const margin = Number(width) <= 60 ? 2 : 3;
  return Number(width) - margin * 2;
}
