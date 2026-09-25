"use client";

import { useMemo, useState } from "react";
import type { MatchCandidate } from "@/lib/data/purchases";
import type { PurchaseLangKey } from "@/lib/purchase-scan-lang";

/** "Purane se jodo" — a small searchable picker over the tenant's existing sellable Products. */
export function MatchPicker({
  candidates,
  onCancel,
  onPick,
  t,
}: {
  candidates: MatchCandidate[];
  onCancel: () => void;
  onPick: (candidate: MatchCandidate) => void;
  t: (key: PurchaseLangKey) => string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) => c.name.toLowerCase().includes(q) || c.aliases.some((a) => a.toLowerCase().includes(q)),
    );
  }, [candidates, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[80vh] w-full flex-col gap-3 overflow-hidden rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl dark:bg-[#1c150f]">
        <h3 className="text-base font-semibold text-gray-900">{t("matchExisting")}</h3>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          autoFocus
          className="min-h-[44px] rounded-md border border-gray-300 px-3 text-base focus:border-indigo-600 focus:outline-none dark:bg-transparent"
        />
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No matches.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100">
              {filtered.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() => onPick(c)}
                    className="flex min-h-[48px] w-full items-center py-2.5 text-left text-sm font-medium text-gray-900"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] rounded-md border border-gray-300 text-sm font-medium text-gray-700"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
