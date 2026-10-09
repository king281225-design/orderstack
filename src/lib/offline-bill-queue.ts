"use client";

/**
 * Queues a manually-created bill's form fields in the browser when offline,
 * and auto-resubmits once back online — same "no service worker" reasoning
 * as src/lib/purchase-offline-queue.ts (this app has no PWA/SW
 * infrastructure, and installing one just for this would be a much bigger,
 * riskier change than this needs), generalized to hold MULTIPLE pending
 * bills instead of just one slot.
 *
 * Deliberately scoped to bill CREATION only (/dashboard/orders/new), not
 * editing an existing bill — editing needs live server state (current
 * discount, stock, payment status) to diff against safely, which an offline
 * device can't know. Creating a bill always inserts a brand-new row, so two
 * offline devices queuing bills concurrently just produce two new orders —
 * no overwrite risk, the same as any two walk-in bills typed at the same
 * time.
 */

const STORAGE_KEY = "bhojsetu_pending_bills";

export type PendingBill = {
  localId: string;
  createdAt: number;
  /** Every field createManualOrderAction's FormData reads, as plain key/value pairs. */
  fields: Record<string, string>;
};

/** Fired after queueBill/removeQueuedBill change the queue, so a mounted OfflineBillIndicator can refresh its count without polling. */
const QUEUE_CHANGED_EVENT = "bhojsetu:offline-bill-queue-changed";

export function queueBill(fields: Record<string, string>): void {
  try {
    const pending = loadQueuedBills();
    pending.push({ localId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: Date.now(), fields });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
  } catch {
    // Quota exceeded or storage blocked — the owner can just retry once back online.
  }
}

export function onQueueChanged(listener: () => void): () => void {
  window.addEventListener(QUEUE_CHANGED_EVENT, listener);
  return () => window.removeEventListener(QUEUE_CHANGED_EVENT, listener);
}

export function loadQueuedBills(): PendingBill[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function removeQueuedBill(localId: string): void {
  try {
    const next = loadQueuedBills().filter((b) => b.localId !== localId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
  } catch {
    // Nothing to do — worst case a stale queued bill gets offered again.
  }
}

export function countQueuedBills(): number {
  return loadQueuedBills().length;
}
