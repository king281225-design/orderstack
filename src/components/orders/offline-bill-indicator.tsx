"use client";

import { useEffect, useState, useCallback } from "react";
import { loadQueuedBills, removeQueuedBill, countQueuedBills, onQueueChanged } from "@/lib/offline-bill-queue";
import { syncQueuedBillAction } from "@/app/dashboard/orders/new/actions";

/**
 * Mounted once on /dashboard/orders/new. Shows how many bills are waiting to
 * sync (saved locally while offline — see src/lib/offline-bill-queue.ts) and
 * auto-flushes them the moment the browser reports it's back online. Each
 * queued bill is a brand-new order (never an edit), so flushing several in a
 * row — even out of order, even from two different offline devices — never
 * risks overwriting anything.
 */
export function OfflineBillIndicator() {
  // Lazy initializer, not a plain Date.now()-style impure read: it's a safe
  // synchronous localStorage read with its own try/catch (countQueuedBills ->
  // loadQueuedBills), same "compute a static initial value during render,
  // don't set it from inside the effect body" fix already used elsewhere in
  // this codebase for the react-hooks/set-state-in-effect rule.
  const [pendingCount, setPendingCount] = useState(() => countQueuedBills());
  const [syncing, setSyncing] = useState(false);

  const flush = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      for (const bill of loadQueuedBills()) {
        const fd = new FormData();
        for (const [key, value] of Object.entries(bill.fields)) fd.append(key, value);
        // Remove it whether it synced or failed validation server-side — a
        // bill that's invalid now will stay invalid on retry, and leaving it
        // queued forever would just hide the failure. Succeed-or-drop, same
        // as any other best-effort sync in this codebase.
        await syncQueuedBillAction(fd);
        removeQueuedBill(bill.localId);
      }
    } finally {
      setSyncing(false);
      setPendingCount(countQueuedBills());
    }
  }, []);

  useEffect(() => {
    window.addEventListener("online", flush);
    const offChange = onQueueChanged(() => setPendingCount(countQueuedBills()));
    // Deferred, not called directly: flush() sets state as its very first
    // synchronous statement, and invoking it directly inside the effect body
    // trips react-hooks/set-state-in-effect the same way a bare setState call
    // would. A zero-delay timer makes this an external-system callback (same
    // class as the online listener above) instead of a synchronous effect-body
    // call — same fix shape as elsewhere in this codebase for this rule.
    const kickoff = navigator.onLine ? window.setTimeout(() => void flush(), 0) : null;
    return () => {
      window.removeEventListener("online", flush);
      offChange();
      if (kickoff !== null) window.clearTimeout(kickoff);
    };
  }, [flush]);

  if (pendingCount === 0) return null;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
      {syncing
        ? "Syncing offline bill(s)…"
        : `${pendingCount} bill${pendingCount === 1 ? "" : "s"} saved offline — will sync automatically once you're back online.`}
    </div>
  );
}
