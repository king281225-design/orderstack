/**
 * Short, readable KOT ticket code: the restaurant's initial letters plus the
 * order number, e.g. "Rajat Fast Food" + 104 -> "RFF-104". Purely derived from
 * existing data (nothing stored), so it is the same on the board and the slip.
 */
export function restaurantInitials(name: string): string {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  // Skip filler words so "The Curry House" reads CH, not TCH.
  const meaningful = words.filter((w) => !/^(the|and|of|&)$/i.test(w));
  const letters = (meaningful.length > 0 ? meaningful : words)
    .slice(0, 3)
    .map((w) => Array.from(w)[0].toUpperCase())
    .join("");
  return letters || "K";
}

export function kotCode(tenantName: string, orderNumber: number): string {
  return `${restaurantInitials(tenantName)}-${orderNumber}`;
}
