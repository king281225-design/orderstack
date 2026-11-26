"use client";

import { useState } from "react";
import { SpinAndWinModal } from "@/components/storefront/christmas/spin-and-win-modal";

/**
 * A floating, non-blocking entry point for the Spin & Win game — same "fixed,
 * doesn't interrupt browsing" treatment as WaiterCallButton/CartBar. Opening
 * it is a client-state modal, not a route change, so the cart/current page
 * are untouched.
 */
export function SpinEntryPoint({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105"
      >
        <span aria-hidden>🎁</span>
        Spin &amp; Win
      </button>
      {open && <SpinAndWinModal slug={slug} onClose={() => setOpen(false)} />}
    </>
  );
}
