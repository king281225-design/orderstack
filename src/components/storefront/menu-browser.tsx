"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/money";

type PublicItem = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
};
type PublicCategory = { id: string; name: string; items: PublicItem[] };

// Staggered entrance delay per item, capped so a long menu doesn't make the
// last rows wait an absurd amount of time before appearing.
const STAGGER_MS = 35;
const MAX_STAGGER_INDEX = 12;

export function MenuBrowser({ categories }: { categories: PublicCategory[] }) {
  const { lines, addItem, setQuantity } = useCart();
  const quantityFor = (itemId: string) => lines.find((l) => l.itemId === itemId)?.quantity ?? 0;

  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const visibleCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => activeCategoryId === null || c.id === activeCategoryId)
      .map((c) => ({
        ...c,
        items: q
          ? c.items.filter(
              (item) =>
                item.name.toLowerCase().includes(q) ||
                (item.description ?? "").toLowerCase().includes(q),
            )
          : c.items,
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, query, activeCategoryId]);

  let renderedIndex = -1; // running count across all visible items, for the stagger delay

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-4">
      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu…"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none"
            style={{ borderColor: query ? "var(--brand-secondary)" : undefined }}
          />
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategoryId(null)}
                className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                style={
                  activeCategoryId === null
                    ? { backgroundColor: "var(--brand-secondary)", borderColor: "var(--brand-secondary)", color: "white" }
                    : { borderColor: "var(--brand-secondary)", color: "var(--brand-secondary)" }
                }
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategoryId((prev) => (prev === c.id ? null : c.id))}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  style={
                    activeCategoryId === c.id
                      ? { backgroundColor: "var(--brand-secondary)", borderColor: "var(--brand-secondary)", color: "white" }
                      : { borderColor: "var(--brand-secondary)", color: "var(--brand-secondary)" }
                  }
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {visibleCategories.map((category) => (
        <section key={category.id}>
          <h2
            className="mb-2 border-l-4 pl-2 text-base font-semibold text-gray-900"
            style={{ borderColor: "var(--brand-secondary)" }}
          >
            {category.name}
          </h2>
          <div
            className="flex flex-col divide-y overflow-hidden rounded-lg border shadow-sm"
            style={{
              backgroundColor: "var(--brand-card-bg)",
              borderColor: "color-mix(in srgb, var(--brand-card-bg) 85%, black)",
            }}
          >
            {category.items.map((item) => {
              const qty = quantityFor(item.id);
              renderedIndex++;
              const staggerIndex = Math.min(renderedIndex, MAX_STAGGER_INDEX);
              return (
                <div
                  key={item.id}
                  className="animate-fade-in-up flex items-center gap-3 p-3 transition-colors hover:bg-black/[0.03]"
                  style={{
                    borderColor: "color-mix(in srgb, var(--brand-card-bg) 85%, black)",
                    animationDelay: `${staggerIndex * STAGGER_MS}ms`,
                  }}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-14 w-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div
                      className="h-14 w-14 shrink-0 rounded-md"
                      style={{ backgroundColor: "color-mix(in srgb, var(--brand-card-bg) 88%, black)" }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="truncate text-xs text-gray-500">{item.description}</p>
                    )}
                    <span
                      className="mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--brand-secondary) 15%, transparent)",
                        color: "var(--brand-secondary)",
                      }}
                    >
                      {formatINR(item.priceCents)}
                    </span>
                  </div>

                  {qty === 0 ? (
                    <button
                      onClick={() =>
                        addItem({
                          itemId: item.id,
                          name: item.name,
                          priceCents: item.priceCents,
                          imageUrl: item.imageUrl,
                        })
                      }
                      className="shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold text-white"
                      style={{ backgroundColor: "var(--brand-primary)" }}
                    >
                      Add
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => setQuantity(item.id, qty - 1)}
                        className="h-7 w-7 rounded-md border text-sm font-semibold"
                        style={{ borderColor: "var(--brand-secondary)", color: "var(--brand-secondary)" }}
                        aria-label={`Remove one ${item.name}`}
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-sm font-medium">{qty}</span>
                      <button
                        onClick={() => setQuantity(item.id, qty + 1)}
                        className="h-7 w-7 rounded-md border text-sm font-semibold"
                        style={{ borderColor: "var(--brand-secondary)", color: "var(--brand-secondary)" }}
                        aria-label={`Add one more ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {categories.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-500">
          This restaurant hasn&apos;t added any menu items yet.
        </p>
      )}
      {categories.length > 0 && visibleCategories.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-500">
          <p>No items match{query ? ` "${query}"` : " that filter"}.</p>
          <button
            onClick={() => {
              setQuery("");
              setActiveCategoryId(null);
            }}
            className="mt-2 font-medium underline"
            style={{ color: "var(--brand-secondary)" }}
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
