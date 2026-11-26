"use client";

import { useState, useTransition } from "react";
import { spinAction } from "@/app/r/[slug]/christmas-actions";
import { formatINR } from "@/lib/money";

function spunKey(slug: string) {
  return `bhojsetu_christmas_spun_${slug}`;
}
function prizeKey(slug: string) {
  return `bhojsetu_christmas_prize_${slug}`;
}
const DEVICE_ID_KEY = "bhojsetu_christmas_device";

/** A stable per-browser id, created once and reused — the device half of the spin-limit check (see spinAction). */
function getOrCreateDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, fresh);
    return fresh;
  } catch {
    // Blocked storage (private mode, quota) — fall back to a per-mount id;
    // the server-side check still runs, it just can't remember this device
    // across page loads. Acceptable for a non-airtight seasonal feature.
    return crypto.randomUUID();
  }
}

function readAlreadySpun(slug: string): boolean {
  try {
    return window.localStorage.getItem(spunKey(slug)) === "1";
  } catch {
    return false;
  }
}

type Won = { code: string; discountType: "PERCENT" | "FIXED"; discountValue: number };

/** A dozen small CSS-only confetti pieces, positioned/colored once at mount — see .christmas-confetti-piece in globals.css. */
function ConfettiBurst() {
  const pieces = Array.from({ length: 14 }, (_, i) => {
    const colors = ["#ef4444", "#16a34a", "#f59e0b", "#ffffff"];
    return {
      id: i,
      left: 10 + ((i * 37) % 80),
      color: colors[i % colors.length],
      drift: ((i % 2 === 0 ? 1 : -1) * (20 + (i % 3) * 15)),
      rotate: 180 + i * 20,
      delay: (i % 5) * 0.05,
    };
  });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="christmas-confetti-piece"
          style={
            {
              left: `${p.left}%`,
              top: "10%",
              width: "8px",
              height: "8px",
              backgroundColor: p.color,
              animationDuration: "900ms",
              animationDelay: `${p.delay}s`,
              "--confetti-x": `${p.drift}px`,
              "--confetti-rotate": `${p.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function SpinAndWinModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [alreadySpun] = useState(() => readAlreadySpun(slug));
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<Won | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSpin() {
    setError(null);
    setSpinning(true);
    const deviceId = getOrCreateDeviceId();
    startTransition(async () => {
      const result = await spinAction(slug, deviceId, null);
      setSpinning(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setWon({ code: result.code, discountType: result.discountType, discountValue: result.discountValue });
      try {
        window.localStorage.setItem(spunKey(slug), "1");
        window.localStorage.setItem(prizeKey(slug), result.code);
      } catch {
        // ignore blocked storage — the server-side check is still the real guard
      }
    });
  }

  function handleCopy() {
    if (won) void navigator.clipboard?.writeText(won.code).catch(() => {});
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Christmas Spin and Win"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-xl bg-white p-5 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {won && <ConfettiBurst />}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold text-gray-900">🎄 Spin &amp; Win</h2>

        {won ? (
          <div className="mt-3 flex flex-col items-center gap-2">
            <p className="text-sm text-gray-600">🎉 Congratulations! You won:</p>
            <p className="rounded-md border-2 border-dashed border-green-500 bg-green-50 px-4 py-2 text-xl font-bold tracking-wide text-green-700">
              {won.code}
            </p>
            <p className="text-sm text-gray-600">
              {won.discountType === "PERCENT" ? `${won.discountValue}% off` : `${formatINR(won.discountValue)} off`}{" "}
              your order
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
            >
              Copy code
            </button>
            <p className="text-xs text-gray-400">It&apos;s already filled in at checkout.</p>
          </div>
        ) : alreadySpun ? (
          <p className="mt-4 text-sm text-gray-600">You&apos;ve already used your spin on this device. Enjoy your visit! 🎁</p>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-3">
            <div
              className={`flex h-32 w-32 items-center justify-center rounded-full border-8 border-red-600 bg-gradient-to-br from-green-500 via-yellow-400 to-red-500 text-3xl ${
                spinning ? "animate-spin" : ""
              }`}
              aria-hidden="true"
            >
              🎁
            </div>
            <p className="text-sm text-gray-600">Spin the wheel to win a discount on your order!</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleSpin}
              disabled={isPending || spinning}
              className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {spinning || isPending ? "Spinning…" : "Spin now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
