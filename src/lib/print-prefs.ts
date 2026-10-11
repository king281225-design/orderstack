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

/** @page size/margin for a given roll width — narrow paper has less usable width, so a smaller margin keeps more of it for content. */
export function thermalPageCss(width: ThermalWidth) {
  return { size: `${width}mm auto`, margin: Number(width) <= 60 ? "2mm" : "3mm" };
}

/** On-screen/print content width — the roll width minus margin on both sides. */
export function thermalContentWidthMm(width: ThermalWidth) {
  const margin = Number(width) <= 60 ? 2 : 3;
  return Number(width) - margin * 2;
}
