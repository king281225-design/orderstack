"use client";

import { useState, useSyncExternalStore } from "react";
import { WHATS_NEW } from "@/lib/whats-new";

const STORAGE_KEY = "bhojsetu:whats-new-seen";

// No real external subscription exists (localStorage doesn't notify on
// change) — this store only ever has one snapshot, taken once at mount.
function subscribe() {
  return () => {};
}

function hasUnseenUpdate(): boolean {
  if (WHATS_NEW.length === 0) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== WHATS_NEW[0].id;
  } catch {
    // Private browsing / blocked storage — nothing to show reliably.
    return false;
  }
}

function serverSnapshot(): boolean {
  return false;
}

/**
 * A one-time popup for the owner/staff dashboard announcing recently shipped
 * features (see src/lib/whats-new.ts). "Seen" is tracked per-browser via
 * localStorage, not the database — this is a per-viewer UI nicety, not real
 * tenant data, so it's fine if it reappears in a different browser or after
 * clearing site data (see CLAUDE.md's browser-storage guidance).
 *
 * Reads localStorage via useSyncExternalStore rather than an effect+setState
 * pair — React's documented way to read an external, client-only source
 * once at mount without a hydration mismatch: getServerSnapshot always
 * reports "nothing to show" so the server/hydration render matches, and the
 * real value takes over right after hydration completes.
 */
export function WhatsNewModal() {
  const hasUpdate = useSyncExternalStore(subscribe, hasUnseenUpdate, serverSnapshot);
  const [dismissed, setDismissed] = useState(false);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, WHATS_NEW[0].id);
    } catch {
      // Nothing to persist if storage is blocked.
    }
  }

  if (!hasUpdate || dismissed) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="What's new"
      onClick={dismiss}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-xl bg-white p-6 shadow-xl dark:bg-[#241d17]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">What&apos;s new ✨</h2>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {WHATS_NEW.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-gray-100 p-3 dark:border-white/10">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{entry.title}</h3>
                <span className="shrink-0 text-xs text-gray-400">{entry.date}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{entry.description}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
