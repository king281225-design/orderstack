"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type PendingWaiterCall = { id: string; tableLabel: string };

const MUTE_KEY = "bhojsetu_dashboard_sound_muted";
// This component lives in the dashboard's shared layout (mounted on every
// /dashboard/* page), so it runs its own poll rather than depending on
// whichever page happens to render its own <AutoRefresh /> — Menu, Branding,
// etc. don't have one, and the bell should still stay live there.
const REFRESH_MS = 8000;

/* ------------------------------------------------------------------ */
/* Two short, distinct chimes via the Web Audio API — no audio asset to  */
/* ship, and each reads as a different kind of alert.                   */
/* ------------------------------------------------------------------ */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctor();
  return sharedAudioCtx;
}

// Loud on purpose — this needs to be heard over a busy kitchen/counter, not
// a subtle desktop-notification-style ping. 0.6 is close to Web Audio's
// safe ceiling before clipping (1.0); still headroom-limited so it doesn't
// distort on cheap speakers.
function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  volume = 0.6,
  type: OscillatorType = "sine",
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/**
 * New order: a warm two-note ascending "ding-dong" on a triangle wave —
 * deliberately a different timbre and rhythm from the waiter chime below so
 * the two are tellable apart by ear alone, not just by badge/dropdown text.
 * Repeats on a timer (see hasPendingOrders effect) for as long as at least
 * one order is still sitting unaccepted — a single chime is too easy to
 * miss over a busy kitchen, same reasoning as the waiter bell.
 */
function playOrderChime(ctx: AudioContext) {
  playTone(ctx, 880, 0, 0.22, 0.6, "triangle");
  playTone(ctx, 1175, 0.18, 0.3, 0.6, "triangle");
}

/**
 * Waiter call: three sharp, even beeps on a square wave — a harsher,
 * more alarm-like timbre than the order chime's warm triangle-wave "ding-
 * dong", so it reads as the more urgent of the two even at a glance of the
 * ear. Repeated on a timer below until acknowledged.
 */
function playWaiterChime(ctx: AudioContext) {
  playTone(ctx, 660, 0, 0.14, 0.6, "square");
  playTone(ctx, 660, 0.18, 0.14, 0.6, "square");
  playTone(ctx, 660, 0.36, 0.14, 0.6, "square");
}

export function NotificationBell({
  pendingOrderCount,
  waiterCalls,
  acknowledgeAction,
}: {
  pendingOrderCount: number;
  waiterCalls: PendingWaiterCall[];
  acknowledgeAction: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioUnlocked = useRef(false);
  const prevOrderCount = useRef(pendingOrderCount);
  const prevWaiterIds = useRef(new Set(waiterCalls.map((c) => c.id)));

  useEffect(() => {
    try {
      // One-time hydration from an external store (localStorage) on mount —
      // window isn't available during SSR, so this can't be a lazy useState
      // initializer instead. Same exception as CartProvider's own hydration
      // effect (src/lib/cart.tsx).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMuted(window.localStorage.getItem(MUTE_KEY) === "1");
    } catch {
      // ignore blocked storage
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  // Browsers block audio playback until a real user gesture happens on the
  // page — a one-time listener on the whole document unlocks it the moment
  // the owner clicks or taps anything, well before a poll ever needs to
  // play a sound.
  useEffect(() => {
    const unlock = () => {
      if (audioUnlocked.current) return;
      const ctx = getAudioContext();
      if (ctx?.state === "suspended") void ctx.resume();
      audioUnlocked.current = true;
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (pendingOrderCount > prevOrderCount.current && !muted) {
      const ctx = getAudioContext();
      if (ctx) playOrderChime(ctx);
    }
    prevOrderCount.current = pendingOrderCount;
  }, [pendingOrderCount, muted]);

  const waiterIdsKey = waiterCalls.map((c) => c.id).join(",");
  useEffect(() => {
    const hasNew = waiterCalls.some((c) => !prevWaiterIds.current.has(c.id));
    if (hasNew && !muted) {
      const ctx = getAudioContext();
      if (ctx) playWaiterChime(ctx);
    }
    prevWaiterIds.current = new Set(waiterCalls.map((c) => c.id));
    // waiterCalls itself is a new array/object set on every poll even when
    // unchanged — comparing by its id list (waiterIdsKey) instead avoids
    // re-running this on every refresh tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiterIdsKey, muted]);

  // An unaccepted order shouldn't go silent after one chime either — it
  // keeps ringing every few seconds for as long as at least one order is
  // still sitting in Pending, same "keep ringing until handled" reasoning
  // as the waiter bell below, just on its own cadence (8s vs the waiter
  // bell's 6s) and its own distinct sound so the two loops never sound
  // identical even if they happen to land close together.
  const hasPendingOrders = pendingOrderCount > 0;
  useEffect(() => {
    if (!hasPendingOrders || muted) return;
    const id = setInterval(() => {
      const ctx = getAudioContext();
      if (ctx) playOrderChime(ctx);
    }, 8000);
    return () => clearInterval(id);
  }, [hasPendingOrders, muted]);

  // A waiter call is a "come here now" request, not a background fact like
  // an unaccepted order — it keeps ringing every few seconds for as long as
  // it sits unacknowledged, the same way a real physical call bell would,
  // instead of chiming once and going silent while a customer keeps waiting.
  const hasPendingWaiterCalls = waiterCalls.length > 0;
  useEffect(() => {
    if (!hasPendingWaiterCalls || muted) return;
    const id = setInterval(() => {
      const ctx = getAudioContext();
      if (ctx) playWaiterChime(ctx);
    }, 6000);
    return () => clearInterval(id);
  }, [hasPendingWaiterCalls, muted]);

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      try {
        window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        // ignore blocked storage
      }
      return next;
    });
  }

  const badgeCount = pendingOrderCount + waiterCalls.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative grid size-8 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
      >
        <span aria-hidden className="text-base">
          🔔
        </span>
        {badgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold">Notifications</p>
            <button type="button" onClick={toggleMute} className="text-xs font-medium text-gray-500 hover:text-gray-700">
              {muted ? "🔇 Sound off" : "🔊 Sound on"}
            </button>
          </div>

          {pendingOrderCount > 0 && (
            <p className="mb-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              {pendingOrderCount} order{pendingOrderCount === 1 ? "" : "s"} waiting to be accepted.
            </p>
          )}

          {waiterCalls.length === 0 ? (
            <p className="text-xs text-gray-400">No waiter calls right now.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {waiterCalls.map((call) => (
                <li key={call.id} className="flex items-center justify-between gap-2 rounded-md bg-indigo-50 px-2 py-1.5">
                  <span className="text-xs font-medium text-indigo-900">🔔 Table {call.tableLabel}</span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => acknowledgeAction(call.id))}
                    className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
