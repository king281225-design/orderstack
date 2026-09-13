"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { createManualOrderAction, type CreateManualOrderState } from "@/app/dashboard/orders/new/actions";
import { formatINR, rupeesToCents } from "@/lib/money";

const initialState: CreateManualOrderState = { error: null };

type Line = { name: string; priceRupees: string; quantity: string };

const emptyLine: Line = { name: "", priceRupees: "", quantity: "1" };

export function ManualOrderForm({
  menuItems,
  defaultGstRate,
}: {
  menuItems: { name: string; priceCents: number }[];
  defaultGstRate: number | null;
}) {
  const [state, formAction, pending] = useActionState(createManualOrderAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [discount, setDiscount] = useState("");
  const [gstRate, setGstRate] = useState(defaultGstRate != null ? String(defaultGstRate) : "");

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

  function addMenuItem(item: { name: string; priceCents: number }) {
    setLines((prev) => [
      ...prev,
      { name: item.name, priceRupees: (item.priceCents / 100).toString(), quantity: "1" },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  const linesPayload = JSON.stringify(
    lines
      .filter((l) => l.name.trim())
      .map((l) => ({
        name: l.name.trim(),
        priceRupees: Number(l.priceRupees) || 0,
        quantity: Number(l.quantity) || 0,
      })),
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="lines" value={linesPayload} />

      <section className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <h3 className="col-span-full text-sm font-semibold text-gray-900">Customer</h3>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Name
          <input
            name="customerName"
            required
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Mobile number
          <input
            name="customerPhone"
            required
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Email (optional)
          <input
            name="customerEmail"
            type="email"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Fulfillment
          <select
            name="fulfillmentType"
            defaultValue="TAKEAWAY"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
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
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
          >
            <option value="COD">Cash</option>
            <option value="UPI">UPI</option>
          </select>
        </label>
        <label className="col-span-full flex flex-col gap-1 text-xs font-medium text-gray-600">
          Notes (optional)
          <input
            name="notes"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
          />
        </label>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
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
              className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:outline-none"
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
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_70px_auto] items-center gap-2">
              <input
                placeholder="Item / service name"
                value={line.name}
                onChange={(e) => updateLine(i, { name: e.target.value })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price ₹"
                value={line.priceRupees}
                onChange={(e) => updateLine(i, { priceRupees: e.target.value })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
              />
              <input
                type="number"
                min="1"
                step="1"
                value={line.quantity}
                onChange={(e) => updateLine(i, { quantity: e.target.value })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeLine(i)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          + Add line
        </button>
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Discount (₹, optional)
          <input
            name="discount"
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
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
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
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
        className="w-fit rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
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
