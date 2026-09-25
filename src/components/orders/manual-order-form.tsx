"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { createManualOrderAction, type CreateManualOrderState } from "@/app/dashboard/orders/new/actions";
import { formatINR, rupeesToCents } from "@/lib/money";

const initialState: CreateManualOrderState = { error: null };

type Line = { name: string; priceRupees: string; quantity: string; itemId?: string };

const emptyLine: Line = { name: "", priceRupees: "", quantity: "1" };

/** One pickable entry — a flat-priced item, or one Half/Full-style variant of one (see orders/new/page.tsx's toPickableItems). Every variant of the same item shares the same stock/category/image. */
export type PickableMenuItem = {
  itemId: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string;
  trackStock: boolean;
  /** null when this item isn't stock-tracked (never shown as low/out); a number (possibly <= 0) when it is. Never blocks adding it — see deductStockForOrder's "never block an order" rule. */
  stockQty: number | null;
};

export type MenuCategoryOption = { id: string; name: string };
export type CustomerOption = { name: string; phone: string; email: string | null };

export type TableOption = { id: string; label: string; status: string };

export function ManualOrderForm({
  menuItems,
  menuCategories,
  customers,
  defaultGstRate,
  tables,
}: {
  menuItems: PickableMenuItem[];
  menuCategories: MenuCategoryOption[];
  customers: CustomerOption[];
  defaultGstRate: number | null;
  tables: TableOption[];
}) {
  const [state, formAction, pending] = useActionState(createManualOrderAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [fulfillmentType, setFulfillmentType] = useState<"TAKEAWAY" | "DELIVERY" | "DINE_IN">("TAKEAWAY");
  const [tableLabel, setTableLabel] = useState("");
  const [discountMode, setDiscountMode] = useState<"flat" | "percent">("flat");
  const [discount, setDiscount] = useState("");
  const [gstRate, setGstRate] = useState(defaultGstRate != null ? String(defaultGstRate) : "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  // Which line's "Item / service name" field currently has its menu-match
  // dropdown open — at most one at a time, since only one input can be
  // focused. Typing filters menuItems by name so an owner can search their
  // own menu inline instead of switching to the tap-to-add grid above (which
  // stays, for browsing the full list at a glance / touch-first ordering).
  const [suggestFor, setSuggestFor] = useState<number | null>(null);

  const totals = useMemo(() => {
    const subtotalCents = lines.reduce((sum, l) => {
      const price = rupeesToCents(l.priceRupees || "0");
      const qty = Number(l.quantity) || 0;
      return sum + price * qty;
    }, 0);
    const discountCents =
      discountMode === "percent"
        ? Math.round((subtotalCents * Math.min(100, Math.max(0, Number(discount) || 0))) / 100)
        : Math.min(Math.max(0, rupeesToCents(discount || "0")), subtotalCents);
    const rate = Number(gstRate) || 0;
    const taxCents = rate > 0 ? Math.round(((subtotalCents - discountCents) * rate) / 100) : 0;
    const totalCents = subtotalCents - discountCents + taxCents;
    return { subtotalCents, discountCents, taxCents, totalCents };
  }, [lines, discount, discountMode, gstRate]);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  /** Tapping a grid card increments an already-added line's quantity instead of adding a duplicate row. */
  function addMenuItem(item: PickableMenuItem) {
    setLines((prev) => {
      const nonEmpty = prev.filter((l) => l.name.trim());
      const idx = nonEmpty.findIndex((l) => l.itemId === item.itemId && l.name === item.name);
      if (idx >= 0) {
        return nonEmpty.map((l, i) => (i === idx ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l));
      }
      return [
        ...nonEmpty,
        { name: item.name, priceRupees: (item.priceCents / 100).toString(), quantity: "1", itemId: item.itemId },
      ];
    });
  }

  function changeQty(index: number, delta: number) {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const next = Math.max(0, (Number(l.quantity) || 0) + delta);
        return { ...l, quantity: String(next) };
      }),
    );
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function selectSuggestion(index: number, item: PickableMenuItem) {
    setLines((prev) => {
      const next = prev.map((l, i) =>
        i === index ? { ...l, name: item.name, priceRupees: (item.priceCents / 100).toString(), itemId: item.itemId } : l,
      );
      if (index === prev.length - 1) next.push({ ...emptyLine });
      return next;
    });
    setSuggestFor(null);
  }

  // Search by initial letters first: typing "p" lists dishes with a word
  // starting with P, "pt" finds "Paneer Tikka" by its initials, and plain
  // substring matches come last. Dishes whose name starts with the typed text
  // rank above the rest.
  function suggestionsFor(name: string) {
    const q = name.trim().toLowerCase();
    if (!q) return menuItems.slice(0, 40);
    const scored: { m: PickableMenuItem; score: number }[] = [];
    for (const m of menuItems) {
      const lower = m.name.toLowerCase();
      const words = lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
      const initials = words.map((w) => w[0]).join("");
      let score = 0;
      if (lower.startsWith(q)) score = 4;
      else if (initials.startsWith(q)) score = 3;
      else if (words.some((w) => w.startsWith(q))) score = 2;
      else if (q.length > 1 && lower.includes(q)) score = 1;
      if (score > 0) scored.push({ m, score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 20).map((s) => s.m);
  }

  const gridItems = useMemo(
    () => (activeCategory === "all" ? menuItems : menuItems.filter((m) => m.categoryId === activeCategory)),
    [menuItems, activeCategory],
  );

  const customerMatches = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 8);
  }, [customers, customerQuery]);

  function selectCustomer(c: CustomerOption) {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerEmail(c.email ?? "");
    setCustomerQuery("");
    setShowCustomerResults(false);
  }

  const linesPayload = JSON.stringify(
    lines
      .filter((l) => l.name.trim() && (Number(l.quantity) || 0) > 0)
      .map((l) => ({
        name: l.name.trim(),
        priceRupees: Number(l.priceRupees) || 0,
        quantity: Number(l.quantity) || 0,
        itemId: l.itemId,
      })),
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="lines" value={linesPayload} />
      <input type="hidden" name="discountMode" value={discountMode} />

      <section className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4 sm:grid-cols-2">
        <h3 className="col-span-full text-sm font-semibold text-gray-900">Customer</h3>
        <div className="relative col-span-full sm:col-span-1">
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Name (optional)
            <input
              name="customerName"
              value={customerName}
              placeholder="Walk-in customer"
              onChange={(e) => {
                setCustomerName(e.target.value);
                setCustomerQuery(e.target.value);
                setShowCustomerResults(true);
              }}
              onFocus={() => setShowCustomerResults(Boolean(customerName))}
              onBlur={() => setTimeout(() => setShowCustomerResults(false), 150)}
              autoComplete="off"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>
          {showCustomerResults && customerMatches.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:bg-[#241d17]">
              {customerMatches.map((c) => (
                <li key={c.phone}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCustomer(c);
                    }}
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <span>{c.name}</span>
                    <span className="text-xs text-gray-500">{c.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Mobile number (optional)
          <input
            name="customerPhone"
            inputMode="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Email (optional)
          <input
            name="customerEmail"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Fulfillment
          <select
            name="fulfillmentType"
            value={fulfillmentType}
            onChange={(e) => setFulfillmentType(e.target.value as typeof fulfillmentType)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          >
            <option value="TAKEAWAY">Takeaway / counter</option>
            <option value="DELIVERY">Delivery</option>
            <option value="DINE_IN">Dine-in</option>
          </select>
        </label>
        {fulfillmentType === "DINE_IN" && (
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Table
            {tables.length > 0 ? (
              <select
                name="tableLabel"
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
              >
                <option value="">Choose…</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.label}>
                    {t.label}
                    {t.status !== "AVAILABLE" ? ` (${t.status.toLowerCase()})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="tableLabel"
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                placeholder="Table number"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
              />
            )}
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Payment method
          <select
            name="paymentMethod"
            defaultValue="COD"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          >
            <option value="COD">Cash</option>
            <option value="CARD">Card</option>
            <option value="UPI">UPI</option>
          </select>
        </label>
        <label className="col-span-full flex flex-col gap-1 text-xs font-medium text-gray-600">
          Notes (optional)
          <input
            name="notes"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
      </section>

      {menuItems.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Tap to add</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeCategory === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10"
              }`}
            >
              All
            </button>
            {menuCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  activeCategory === c.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {gridItems.map((item, i) => {
              const outOfStock = item.trackStock && (item.stockQty ?? 0) <= 0;
              return (
                <button
                  key={`${item.itemId}-${item.name}-${i}`}
                  type="button"
                  onClick={() => addMenuItem(item)}
                  className="flex flex-col items-start gap-1 rounded-lg border border-gray-200 bg-white p-2.5 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50 active:scale-[0.98] dark:bg-[#2b241d]"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-100 dark:bg-white/10">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-gray-300 dark:text-white/20">🍽️</div>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs font-medium text-gray-900">{item.name}</p>
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{formatINR(item.priceCents)}</span>
                    {item.trackStock && (
                      <span className={`text-[10px] font-semibold ${outOfStock ? "text-red-600" : "text-gray-500"}`}>
                        {outOfStock ? "Out of stock" : `${item.stockQty} left`}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Bill items</h3>
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { ...emptyLine }])}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            + Add line
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {lines.map((line, i) => {
            const suggestions = suggestFor === i ? suggestionsFor(line.name) : [];
            return (
              <div key={i} className="flex flex-col gap-2 rounded-md border border-gray-100 p-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <input
                    placeholder={menuItems.length > 0 ? "Type to search the menu, or type a free-form item" : "Item / service name"}
                    value={line.name}
                    onChange={(e) => {
                      updateLine(i, { name: e.target.value, itemId: undefined });
                      setSuggestFor(i);
                    }}
                    onFocus={() => setSuggestFor(i)}
                    onClick={() => setSuggestFor(i)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (line.name.trim() && suggestions.length > 0) selectSuggestion(i, suggestions[0]);
                    }}
                    onBlur={() => setTimeout(() => setSuggestFor((cur) => (cur === i ? null : cur)), 150)}
                    autoComplete="off"
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
                  />
                  {suggestions.length > 0 && (
                    <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:bg-[#241d17]">
                      {suggestions.map((m) => (
                        <li key={`${m.itemId}-${m.name}`}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectSuggestion(i, m);
                            }}
                            className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                          >
                            <span className="truncate">{m.name}</span>
                            <span className="shrink-0 text-xs text-gray-500">{formatINR(m.priceCents)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price ₹"
                  value={line.priceRupees}
                  onChange={(e) => updateLine(i, { priceRupees: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-600 focus:outline-none sm:w-24"
                />
                <div className="flex items-center gap-1 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => changeQty(i, -1)}
                    aria-label="Decrease quantity"
                    className="flex h-11 w-11 items-center justify-center rounded-md border border-gray-300 text-lg font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    aria-label="Quantity"
                    className="h-11 w-14 rounded-md border border-gray-300 px-1 text-center text-sm focus:border-indigo-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => changeQty(i, 1)}
                    aria-label="Increase quantity"
                    className="flex h-11 w-11 items-center justify-center rounded-md border border-gray-300 text-lg font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  aria-label="Remove line"
                  className="self-end text-xs text-red-600 hover:underline sm:self-auto"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          <span className="flex items-center justify-between">
            Discount
            <span className="flex overflow-hidden rounded-md border border-gray-300 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setDiscountMode("flat")}
                className={`px-2 py-0.5 ${discountMode === "flat" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 dark:bg-transparent"}`}
              >
                ₹
              </button>
              <button
                type="button"
                onClick={() => setDiscountMode("percent")}
                className={`px-2 py-0.5 ${discountMode === "percent" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 dark:bg-transparent"}`}
              >
                %
              </button>
            </span>
          </span>
          <input
            name="discount"
            type="number"
            min="0"
            max={discountMode === "percent" ? 100 : undefined}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          GST / tax rate (%, optional)
          <input
            name="gstRate"
            type="number"
            min="0"
            step="0.01"
            value={gstRate}
            onChange={(e) => setGstRate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>

        <div className="col-span-full flex flex-col gap-1 rounded-md bg-gray-50 p-3 text-sm">
          <Row label="Subtotal" value={formatINR(totals.subtotalCents)} />
          <Row label="Discount" value={`− ${formatINR(totals.discountCents)}`} />
          <Row label="Tax / GST" value={`+ ${formatINR(totals.taxCents)}`} />
          <Row label="Grand total" value={formatINR(totals.totalCents)} bold />
        </div>
      </section>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          name="intent"
          value="bill"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save & print bill"}
        </button>
        <button
          type="submit"
          name="intent"
          value="kot"
          disabled={pending}
          className="rounded-md border border-indigo-600 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
        >
          Save & print KOT
        </button>
        <button
          type="submit"
          name="intent"
          value="save"
          disabled={pending}
          className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Save only
        </button>
      </div>
    </form>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-semibold text-gray-900" : "text-gray-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
