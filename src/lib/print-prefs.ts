/**
 * Thermal-printer receipt-width math — pure, so both server print pages
 * (which only ever see a `width` query-string value) and client components
 * (which also persist the choice — see print-prefs-client.ts) can use it.
 * Different thermal printers use different roll widths (80mm is common,
 * but plenty of cheap/Bluetooth receipt printers are 58mm) — a mismatch
 * here is exactly what reads as a print getting its margin "cut off":
 * laying the receipt out for 80mm and physically printing it on 58mm paper
 * clips the right-hand side of every line.
 */
export type ThermalWidth = "58" | "80";

export function isThermalWidth(value: string | undefined): value is ThermalWidth {
  return value === "58" || value === "80";
}

/** @page size/margin for a given roll width — 58mm paper has less usable width, so a smaller margin keeps more of it for content. */
export function thermalPageCss(width: ThermalWidth) {
  return { size: `${width}mm auto`, margin: width === "58" ? "2mm" : "3mm" };
}

/** On-screen/print content width — the roll width minus margin on both sides. */
export function thermalContentWidthMm(width: ThermalWidth) {
  const margin = width === "58" ? 2 : 3;
  return Number(width) - margin * 2;
}
