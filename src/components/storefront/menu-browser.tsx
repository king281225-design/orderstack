"use client";

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

export function MenuBrowser({ categories }: { categories: PublicCategory[] }) {
  const { lines, addItem, setQuantity } = useCart();
  const quantityFor = (itemId: string) => lines.find((l) => l.itemId === itemId)?.quantity ?? 0;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-4">
      {categories.map((category) => (
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
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-black/[0.03]"
                  style={{ borderColor: "color-mix(in srgb, var(--brand-card-bg) 85%, black)" }}
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
    </div>
  );
}
