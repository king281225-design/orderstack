"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { callWaiterAction } from "@/app/r/[slug]/actions";

const COOLDOWN_MS = 60_000;

function cooldownKey(slug: string, table: string) {
  return `bhojsetu_waiter_call_${slug}_${table}`;
}

/**
 * Floats above the cart bar on every storefront page (mounted once in the
 * shared layout) so a seated customer can call for the waiter regardless of
 * which page they're on. Always rendered — a customer who reached the menu
 * without scanning an actual table QR (a shared link, or a scan that failed
 * to carry the ?table= param through) still gets a way to call the waiter;
 * they're just asked for their table number first instead of it being
 * pre-filled. Once given, it's saved into the cart's own tableLabel too
 * (same as a real QR scan would set), so checkout picks it up automatically.
 *
 * The cooldown is a per-viewer convenience against accidental repeat taps,
 * not a security control — it lives in localStorage and a determined
 * customer could always rescan/reload past it, which is fine: nothing here
 * is more sensitive than "someone waved at staff twice."
 */
export function WaiterCallButton({ slug }: { slug: string }) {
  const { tableLabel, setTableLabel } = useCart();
  const [status, setStatus] = useState<"idle" | "asking" | "calling" | "called" | "error">("idle");
  const [tableInput, setTableInput] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!tableLabel) return;
    try {
      const raw = window.localStorage.getItem(cooldownKey(slug, tableLabel));
      // One-time hydration from an external store (localStorage) on mount —
      // window isn't available during SSR, so this can't be a lazy useState
      // initializer instead. Same exception as CartProvider's own hydration
      // effect (src/lib/cart.tsx).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setCooldownUntil(Number(raw));
    } catch {
      // ignore blocked storage
    }
  }, [slug, tableLabel]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const onCooldown = cooldownUntil !== null && now < cooldownUntil;
  const secondsLeft = onCooldown ? Math.ceil((cooldownUntil! - now) / 1000) : 0;

  async function callFor(table: string) {
    setStatus("calling");
    const result = await callWaiterAction(slug, table);
    if (result.ok) {
      setStatus("called");
      const until = Date.now() + COOLDOWN_MS;
      setCooldownUntil(until);
      try {
        window.localStorage.setItem(cooldownKey(slug, table), String(until));
      } catch {
        // ignore blocked storage
      }
    } else {
      setStatus("error");
    }
  }

  function handleBellClick() {
    if (onCooldown || status === "calling") return;
    if (tableLabel) {
      void callFor(tableLabel);
    } else {
      setStatus("asking");
    }
  }

  function handleTableSubmit() {
    const trimmed = tableInput.trim();
    if (!trimmed) return;
    setTableLabel(trimmed);
    void callFor(trimmed);
  }

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-1">
      {status === "asking" && (
        <div className="flex items-center gap-1.5 rounded-lg bg-white p-2 shadow-lg ring-1 ring-black/10">
          <input
            autoFocus
            value={tableInput}
            onChange={(e) => setTableInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTableSubmit()}
            placeholder="Table no."
            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleTableSubmit}
            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Call
          </button>
        </div>
      )}
      {status === "called" && onCooldown && (
        <p className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white shadow">
          Waiter notified — someone will be with you shortly.
        </p>
      )}
      {status === "error" && (
        <p className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white shadow">
          Couldn&apos;t reach the restaurant — please try again.
        </p>
      )}
      <button
        type="button"
        onClick={handleBellClick}
        disabled={onCooldown || status === "calling"}
        className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
      >
        <span aria-hidden>🔔</span>
        {status === "calling" ? "Calling…" : onCooldown ? `Called (${secondsLeft}s)` : "Call waiter"}
      </button>
    </div>
  );
}
