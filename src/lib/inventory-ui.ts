/** Stock-level pill styling/labels for the Products tab (direct-stock Item) — see itemStockLevel in src/lib/data/inventory.ts. */
export const LEVEL_STYLE = {
  OK: "bg-green-100 text-green-800",
  LOW: "bg-amber-100 text-amber-800",
  OUT: "bg-red-100 text-red-800",
} as const;

export const LEVEL_LABEL = { OK: "In stock", LOW: "Low stock", OUT: "Out of stock" } as const;

export const REASON_LABEL: Record<string, string> = {
  PURCHASE: "Received",
  ORDER: "Used by order",
  ORDER_CANCEL: "Returned (order cancelled)",
  WASTE: "Wastage",
  ADJUSTMENT: "Correction",
  PURCHASE_UNDO: "Purchase undone",
};
