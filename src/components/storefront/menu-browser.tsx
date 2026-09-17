"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/money";

type PublicVariant = { label: string; priceCents: number };
type PublicAddOn = { id: string; name: string; priceCents: number };

type PublicItem = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  isVeg?: boolean | null;
  tags?: string[] | null;
  variants?: PublicVariant[] | null;
  addOns?: PublicAddOn[] | null;
};
type PublicCategory = { id: string; name: string; items: PublicItem[]; subcategories?: PublicCategory[] };

// Staggered entrance delay per item, capped so a long menu doesn't make the
// last rows wait an absurd amount of time before appearing.
const STAGGER_MS = 35;
const MAX_STAGGER_INDEX = 12;

function VegDot({ isVeg }: { isVeg: boolean | null | undefined }) {
  if (isVeg === null || isVeg === undefined) return null;
  const color = isVeg ? "#16a34a" : "#dc2626";
  return (
    <span
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border"
      style={{ borderColor: color }}
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      title={isVeg ? "Vegetarian" : "Non-vegetarian"}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

function ItemCard({
  item,
  qty,
  staggerDelayMs,
  onAdd,
  onSetQuantity,
}: {
  item: PublicItem;
  qty: number;
  staggerDelayMs: number;
  onAdd: (args: {
    itemId: string;
    name: string;
    priceCents: number;
    imageUrl: string | null;
    variantLabel?: string | null;
    addOnIds?: string[] | null;
  }) => void;
  onSetQuantity: (itemId: string, quantity: number) => void;
}) {
  const variants = item.variants && item.variants.length > 0 ? item.variants : null;
  const addOns = item.addOns && item.addOns.length > 0 ? item.addOns : null;
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const basePriceCents = variants ? variants[selectedVariant].priceCents : item.priceCents;
  const selectedAddOns = addOns ? addOns.filter((a) => selectedAddOnIds.includes(a.id)) : [];
  const effectivePriceCents = basePriceCents + selectedAddOns.reduce((sum, a) => sum + a.priceCents, 0);
  const effectiveLabel = variants ? variants[selectedVariant].label : null;

  function toggleAddOn(id: string) {
    setSelectedAddOnIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div
      className="animate-fade-in-up flex items-center gap-3 p-3 transition-colors hover:bg-black/[0.03]"
      style={{
        borderColor: "color-mix(in srgb, var(--brand-card-bg) 85%, black)",
        animationDelay: `${staggerDelayMs}ms`,
      }}
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.name} className="h-14 w-14 shrink-0 rounded-md object-cover" />
      ) : (
        <div
          className="h-14 w-14 shrink-0 rounded-md"
          style={{ backgroundColor: "color-mix(in srgb, var(--brand-card-bg) 88%, black)" }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <VegDot isVeg={item.isVeg} />
          <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
        </div>
        {item.description && <p className="truncate text-xs text-gray-500">{item.description}</p>}
        {item.tags && item.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                  color: "var(--brand-primary)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {variants && qty === 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {variants.map((v, i) => (
              <button
                key={v.label}
                type="button"
                onClick={() => setSelectedVariant(i)}
                className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={
                  i === selectedVariant
                    ? { backgroundColor: "var(--brand-secondary)", borderColor: "var(--brand-secondary)", color: "white" }
                    : { borderColor: "var(--brand-secondary)", color: "var(--brand-secondary)" }
                }
              >
                {v.label} · {formatINR(v.priceCents)}
              </button>
            ))}
          </div>
        )}
        {addOns && qty === 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {addOns.map((a) => {
              const checked = selectedAddOnIds.includes(a.id);
              return (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  style={
                    checked
                      ? { backgroundColor: "var(--brand-secondary)", borderColor: "var(--brand-secondary)", color: "white" }
                      : { borderColor: "var(--brand-secondary)", color: "var(--brand-secondary)" }
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAddOn(a.id)}
                    className="sr-only"
                  />
                  + {a.name} ({formatINR(a.priceCents)})
                </label>
              );
            })}
          </div>
        )}
        <span
          className="mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-semibold"
          style={{
            backgroundColor: "color-mix(in srgb, var(--brand-secondary) 15%, transparent)",
            color: "var(--brand-secondary)",
          }}
        >
          {formatINR(effectivePriceCents)}
        </span>
      </div>

      {qty === 0 ? (
        <button
          onClick={() => {
            const baseName = effectiveLabel ? `${item.name} (${effectiveLabel})` : item.name;
            const name = selectedAddOns.length > 0 ? `${baseName} + ${selectedAddOns.map((a) => a.name).join(", ")}` : baseName;
            onAdd({
              itemId: item.id,
              name,
              priceCents: effectivePriceCents,
              imageUrl: item.imageUrl,
              variantLabel: effectiveLabel,
              addOnIds: selectedAddOnIds.length > 0 ? selectedAddOnIds : null,
            });
          }}
          className="shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          Add
        </button>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => onSetQuantity(item.id, qty - 1)}
            className="h-7 w-7 rounded-md border text-sm font-semibold"
            style={{ borderColor: "var(--brand-secondary)", color: "var(--brand-secondary)" }}
            aria-label={`Remove one ${item.name}`}
          >
            −
          </button>
          <span className="w-4 text-center text-sm font-medium">{qty}</span>
          <button
            onClick={() => onSetQuantity(item.id, qty + 1)}
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
}

export function MenuBrowser({ categories }: { categories: PublicCategory[] }) {
  const { lines, addItem, setQuantity } = useCart();
  const quantityFor = (itemId: string) => lines.find((l) => l.itemId === itemId)?.quantity ?? 0;

  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const visibleCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filterItems = (items: PublicItem[]) =>
      q
        ? items.filter(
            (item) =>
              item.name.toLowerCase().includes(q) || (item.description ?? "").toLowerCase().includes(q),
          )
        : items;

    return categories
      .filter((c) => activeCategoryId === null || c.id === activeCategoryId)
      .map((c) => {
        const subcategories = (c.subcategories ?? [])
          .map((sc) => ({ ...sc, items: filterItems(sc.items) }))
          .filter((sc) => sc.items.length > 0);
        return { ...c, items: filterItems(c.items), subcategories };
      })
      .filter((c) => c.items.length > 0 || c.subcategories.length > 0);
  }, [categories, query, activeCategoryId]);

  let renderedIndex = -1; // running count across all visible items, for the stagger delay
  const nextStaggerDelay = () => {
    renderedIndex++;
    return Math.min(renderedIndex, MAX_STAGGER_INDEX) * STAGGER_MS;
  };

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
          {category.items.length > 0 && (
            <div
              className="flex flex-col divide-y overflow-hidden rounded-lg border shadow-sm"
              style={{
                backgroundColor: "var(--brand-card-bg)",
                borderColor: "color-mix(in srgb, var(--brand-card-bg) 85%, black)",
              }}
            >
              {category.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  qty={quantityFor(item.id)}
                  staggerDelayMs={nextStaggerDelay()}
                  onAdd={addItem}
                  onSetQuantity={setQuantity}
                />
              ))}
            </div>
          )}

          {(category.subcategories ?? []).map((sub) => (
            <div key={sub.id} className="mt-3 pl-2">
              <h3 className="mb-1.5 text-sm font-semibold text-gray-700">{sub.name}</h3>
              <div
                className="flex flex-col divide-y overflow-hidden rounded-lg border shadow-sm"
                style={{
                  backgroundColor: "var(--brand-card-bg)",
                  borderColor: "color-mix(in srgb, var(--brand-card-bg) 85%, black)",
                }}
              >
                {sub.items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    qty={quantityFor(item.id)}
                    staggerDelayMs={nextStaggerDelay()}
                    onAdd={addItem}
                    onSetQuantity={setQuantity}
                  />
                ))}
              </div>
            </div>
          ))}
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
