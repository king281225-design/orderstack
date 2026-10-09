"use client";

import { useState, useTransition } from "react";
import { formatINR, rupeesToCents } from "@/lib/money";
import { listWinBackCandidatesAction, sendWinBackOfferAction } from "@/app/dashboard/customers/actions";

type Candidate = {
  phone: string;
  name: string;
  totalSpentCents: number;
  orderCount: number;
  lastOrderAt: Date;
};

const DAY_OPTIONS = [14, 30, 60, 90];

/**
 * Advanced+ only (gated both here via the page not rendering this component
 * on Starter, and server-side again in the actions themselves). Lists
 * customers who've gone quiet and lets the owner send each one a one-time
 * discount via WhatsApp — explicitly a per-customer click, not an automated
 * campaign. The discount itself (percent vs ₹ off, value, how long it's
 * valid) is set once below and applies to every send in this session —
 * sendWinBackOfferAction re-validates it server-side regardless.
 */
export function WinBackPanel() {
  const [sinceDays, setSinceDays] = useState(30);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [sentFor, setSentFor] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [discountMode, setDiscountMode] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = useState("10");
  const [expiryDays, setExpiryDays] = useState("14");
  const [minOrder, setMinOrder] = useState("");
  const [customCode, setCustomCode] = useState("");

  function load(days: number) {
    setSinceDays(days);
    startTransition(async () => {
      const result = await listWinBackCandidatesAction(days);
      setCandidates(
        result.map((c) => ({
          phone: c.phone,
          name: c.name,
          totalSpentCents: c.totalSpentCents,
          orderCount: c.orderCount,
          lastOrderAt: c.lastOrderAt,
        })),
      );
    });
  }

  function send(phone: string) {
    setError(null);
    const value = Number(discountValue) || 0;
    startTransition(async () => {
      const result = await sendWinBackOfferAction(phone, {
        discountType: discountMode,
        discountValue: discountMode === "FIXED" ? rupeesToCents(value) : value,
        expiryDays: Number(expiryDays) || 0,
        minOrderCents: minOrder ? rupeesToCents(Number(minOrder) || 0) : 0,
        customCode: customCode.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSentFor((prev) => ({ ...prev, [phone]: result.couponCode }));
      window.open(result.waLink, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Win back customers</h3>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-500">Haven&apos;t ordered in</span>
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => load(d)}
              className={`rounded-full px-2.5 py-1 font-semibold ${
                candidates !== null && sinceDays === d ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10"
              }`}
            >
              {d}+ days
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        Sends a one-time discount coupon over WhatsApp — a real click per customer, never automatic.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-md bg-gray-50 p-3 dark:bg-white/5">
        <div className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          <span>Offer</span>
          <span className="flex overflow-hidden rounded-md border border-gray-300 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setDiscountMode("PERCENT")}
              className={`px-2 py-1 ${discountMode === "PERCENT" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 dark:bg-transparent"}`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => setDiscountMode("FIXED")}
              className={`px-2 py-1 ${discountMode === "FIXED" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 dark:bg-transparent"}`}
            >
              ₹
            </button>
          </span>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          {discountMode === "PERCENT" ? "Percent off" : "₹ off"}
          <input
            type="number"
            min="1"
            max={discountMode === "PERCENT" ? 100 : undefined}
            step={discountMode === "PERCENT" ? "1" : "0.01"}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Valid for (days)
          <input
            type="number"
            min="1"
            max="90"
            step="1"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Minimum order ₹ (optional)
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 299"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Coupon code (optional)
          <input
            type="text"
            maxLength={40}
            placeholder="Auto-generated if blank"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm uppercase focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <p className="w-full text-xs text-gray-400">
          Applies to every send below — e.g. &quot;
          {discountMode === "PERCENT" ? `${discountValue || 0}% off` : formatINR(rupeesToCents(Number(discountValue) || 0))}
          {minOrder ? ` on orders above ${formatINR(rupeesToCents(Number(minOrder) || 0))}` : ""}, valid {expiryDays || 0} days
          {customCode ? `, code ${customCode.toUpperCase()}` : ""}.&quot;
          {customCode && " A typed code can only be used once — sending to a second customer in the same batch needs a different code."}
        </p>
      </div>

      {candidates === null ? (
        <button
          type="button"
          onClick={() => load(sinceDays)}
          disabled={pending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {pending ? "Loading…" : "Find inactive customers"}
        </button>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-gray-500">No customers have gone quiet for {sinceDays}+ days.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidates.map((c) => (
            <li key={c.phone} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-100 p-2 text-sm">
              <div>
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">
                  {c.phone} · {c.orderCount} orders · {formatINR(c.totalSpentCents)} spent · last {c.lastOrderAt.toLocaleDateString()}
                </p>
              </div>
              {sentFor[c.phone] ? (
                <span className="text-xs font-semibold text-green-700">Sent — code {sentFor[c.phone]}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => send(c.phone)}
                  disabled={pending}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  📲 Send win-back offer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
