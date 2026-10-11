"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  itemId: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
  /** Display/convenience cache only, same as name/priceCents above — the server always re-derives the real variant price from Item.variants at checkout, never trusts this. */
  variantLabel?: string | null;
  /** Selected ItemAddOn ids — the server re-derives their real current price/name from the database, never trusts this. */
  addOnIds?: string[] | null;
};

/**
 * A line's real identity in the cart: same item but a different size (e.g.
 * Small vs Large) — or a different add-on combo — is a genuinely different
 * line, not the same one with its price silently overwritten. itemId alone
 * used to be the (buggy) key; this is what addItem/setQuantity/removeItem
 * actually match on now. Exported so any UI that lists/edits cart lines
 * (menu browser, checkout summary) can build a stable React key / target a
 * specific line the same way.
 */
export function cartLineKey(line: { itemId: string; variantLabel?: string | null; addOnIds?: string[] | null }): string {
  const addOns = [...(line.addOnIds ?? [])].sort().join(",");
  return `${line.itemId}::${line.variantLabel ?? ""}::${addOns}`;
}

type CartContextValue = {
  lines: CartLine[];
  totalCents: number;
  itemCount: number;
  /** Adds one of this exact item+variant+add-ons combo — a new cart line if this combo isn't already present, otherwise +1 on the existing one (never overwrites a different combo already in the cart). */
  addItem: (item: Omit<CartLine, "quantity">) => void;
  /** Targets one specific line by cartLineKey(line) — not just itemId, so two sizes of the same item can be adjusted independently. 0 or less removes that line. */
  setQuantity: (lineKey: string, quantity: number) => void;
  removeItem: (lineKey: string) => void;
  clear: () => void;
  /** Set once from the ?table=<label> a table's QR code links to (see CaptureTableParam) — survives the hop to /checkout via localStorage, same as the cart itself. */
  tableLabel: string | null;
  setTableLabel: (label: string | null) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(slug: string) {
  return `bhojsetu_cart_${slug}`;
}

function tableStorageKey(slug: string) {
  return `bhojsetu_table_${slug}`;
}

export function CartProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [tableLabel, setTableLabelState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Cart lives only in this viewer's browser (localStorage), namespaced per
  // restaurant slug. It's a display/convenience cache — the server always
  // re-derives real prices from the database at checkout, never trusts this.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(slug));
      const rawTable = window.localStorage.getItem(tableStorageKey(slug));
      // One-time hydration from an external store (localStorage) on mount —
      // window isn't available during SSR, so this can't be a lazy useState
      // initializer instead. Intentional exception to the "no setState in
      // effect" rule, not a derived-state anti-pattern.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setLines(JSON.parse(raw));
      if (rawTable) setTableLabelState(rawTable);
    } catch {
      // ignore corrupt/blocked storage
    }
    setHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey(slug), JSON.stringify(lines));
    } catch {
      // ignore blocked storage (private mode, quota, etc.)
    }
  }, [slug, lines, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (tableLabel) window.localStorage.setItem(tableStorageKey(slug), tableLabel);
      else window.localStorage.removeItem(tableStorageKey(slug));
    } catch {
      // ignore blocked storage
    }
  }, [slug, tableLabel, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const addItem: CartContextValue["addItem"] = (item) => {
      setLines((prev) => {
        const key = cartLineKey(item);
        const existing = prev.find((l) => cartLineKey(l) === key);
        if (existing) {
          return prev.map((l) => (cartLineKey(l) === key ? { ...l, quantity: l.quantity + 1 } : l));
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    };

    const setQuantity: CartContextValue["setQuantity"] = (lineKey, quantity) => {
      setLines((prev) => {
        if (quantity <= 0) return prev.filter((l) => cartLineKey(l) !== lineKey);
        return prev.map((l) => (cartLineKey(l) === lineKey ? { ...l, quantity } : l));
      });
    };

    const removeItem: CartContextValue["removeItem"] = (lineKey) => {
      setLines((prev) => prev.filter((l) => cartLineKey(l) !== lineKey));
    };

    const clear = () => setLines([]);

    const totalCents = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
    const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
    const setTableLabel = (label: string | null) => setTableLabelState(label);

    return {
      lines,
      totalCents,
      itemCount,
      addItem,
      setQuantity,
      removeItem,
      clear,
      tableLabel,
      setTableLabel,
    };
  }, [lines, tableLabel]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
