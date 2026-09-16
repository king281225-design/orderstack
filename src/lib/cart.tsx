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
};

type CartContextValue = {
  lines: CartLine[];
  totalCents: number;
  itemCount: number;
  addItem: (item: Omit<CartLine, "quantity">) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
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
        const existing = prev.find((l) => l.itemId === item.itemId);
        if (existing) {
          return prev.map((l) =>
            l.itemId === item.itemId ? { ...l, quantity: l.quantity + 1 } : l,
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    };

    const setQuantity: CartContextValue["setQuantity"] = (itemId, quantity) => {
      setLines((prev) => {
        if (quantity <= 0) return prev.filter((l) => l.itemId !== itemId);
        return prev.map((l) => (l.itemId === itemId ? { ...l, quantity } : l));
      });
    };

    const removeItem: CartContextValue["removeItem"] = (itemId) => {
      setLines((prev) => prev.filter((l) => l.itemId !== itemId));
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
