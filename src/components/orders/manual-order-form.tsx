"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { createManualOrderAction, type CreateManualOrderState } from "@/app/dashboard/orders/new/actions";
import { formatINR, rupeesToCents } from "@/lib/money";

const initialState: CreateManualOrderState = { error: null };

type Line = { name: string; priceRupees: string; quantity: string; itemId?: string };

const emptyLine: Line = { name: "", priceRupees: "", quantity: "1" };

/** One pickable entry — a flat-priced item, or one Half/Full-style variant of one (see orders/new/page.tsx's toPickableItems). */
export type PickableMenuItem = { itemId: string; name: string; priceCents: number };

export function ManualOrderForm({
  menuItems,
  defaultGstRate,
}: {
  menuItems: PickableMenuItem[];
  defaultGstRate: number | null;
}) {
  const [state, formAction, pending] = useActionState(createManualOrderAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [discount, setDiscount] = useState("");
  const [gstRate, setGstRate] = useState(defaultGstRate != null ? String(defaultGstRate) : "");
  // Which line's "Item / service name" field currently has its menu-match
  // dropdown open — at most one at a time, since only one input can be
  // focused. Typing filters menuItems by name so an owner can search their
  // own menu inline instead of switching to the separate "+ Add from menu"
  // picker (which stays, for browsing the full list at a glance).
  const [suggestFor, setSuggestFor] = useState<number | null>(null);

  const totals = useMemo(() => {
    const subtotalCents = lines.reduce((sum, l) => {
      const price = rupeesToCents(l.priceRupees || "0");
      const qty = Number(l.quantity) || 0;
      return sum + price * qty;
    }, 0);
    const discountCents = Math.min(Math.max(0, rupeesToCents(discount || "0")), subtotalCents);
    const rate = Number(gstRate) || 0;
    const taxCents = rate > 0 ? Math.round(((subtotalCents - discountCents) * rate) / 100) : 0;
    const totalCents = subtotalCents - discountCents + taxCents;
    return { subtotalCents, discountCents, taxCents, totalCents };
  }, [lines, discount, gstRate]);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }

  function addMenuItem(item: PickableMenuItem) {
    setLines((prev) => [
      ...prev,
      { name: item.name, priceRupees: (item.priceCents / 100).toString(), quantity: "1", itemId: item.itemId },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function selectSuggestion(index: number, item: PickableMenuItem) {
    setLines((prev) => {
      const next = prev.map((l, i) =>
        i === index ? { ...l, name: item.name, priceRupees: (item.priceCents / 100).toString(), itemId: item.itemId } : l,
      );
      // Picking a suggestion while typing into the very last row is the
      // common "keep adding items" flow — appending a fresh blank row right
      // after gives immediate, obvious visual confirmation the click did
      // something (the row you clicked into fills in AND a new one appears
      // below it), instead of a silent in-place update that's easy to miss.
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
    // Clicking into an empty box lists the whole menu, so the bar is a
    // picker as well as a search box.
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

  const linesPayload = JSON.stringify(
    lines
      .filter((l) => l.name.trim())
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

      <section className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4 sm:grid-cols-2">
        <h3 className="col-span-full text-sm font-semibold text-gray-900">Customer</h3>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Name (optional)
          <input
            name="customerName"
            placeholder="Walk-in customer"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Mobile number (optional)
          <input
            name="customerPhone"
            inputMode="tel"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Email (optional)
          <input
            name="customerEmail"
            type="email"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Fulfillment
          <select
            name="fulfillmentType"
            defaultValue="TAKEAWAY"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          >
            <option value="TAKEAWAY">Takeaway / counter</option>
            <option value="DELIVERY">Delivery</option>
            <option value="DINE_IN">Dine-in</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Payment method
          <select
            name="paymentMethod"
            defaultValue="COD"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          >
            <option value="COD">Cash</option>
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

      <section className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Products / services</h3>
          {menuItems.length > 0 && (
            <select
              onChange={(e) => {
                const item = menuItems.find((m) => m.name === e.target.value);
                if (item) addMenuItem(item);
                e.target.value = "";
              }}
              defaultValue=""
              className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none"
            >
              <option value="" disabled>
                + Add from menu
              </option>
              {menuItems.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} — {formatINR(m.priceCents)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {lines.map((line, i) => {
            const suggestions = suggestFor === i ? suggestionsFor(line.name) : [];
            return (
            <div key={i} className="grid grid-cols-[1fr_90px_70px_auto] items-center gap-2">
              <div className="relative">
                <input
                  placeholder={menuItems.length > 0 ? "Click to pick from menu, or type (e.g. pt)" : "Item / service name"}
                  value={line.name}
                  onChange={(e) => {
                    updateLine(i, { name: e.target.value, itemId: undefined });
                    setSuggestFor(i);
                  }}
                  onFocus={() => setSuggestFor(i)}
                  onClick={() => setSuggestFor(i)}
                  // Enter picks the top match instead of submitting the whole bill.
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    if (line.name.trim() && suggestions.length > 0) selectSuggestion(i, suggestions[0]);
                  }}
                  // A plain onBlur would fire and close the dropdown before a
                  // click on a suggestion registers — closing on a short
                  // delay instead lets the suggestion's own onClick run first.
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
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
              />
              <input
                type="number"
                min="1"
                step="1"
                value={line.quantity}
                onChange={(e) => updateLine(i, { quantity: e.target.value })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeLine(i)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          + Add line
        </button>
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Discount (₹, optional)
          <input
            name="discount"
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
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

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save order & print bill"}
      </button>
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
