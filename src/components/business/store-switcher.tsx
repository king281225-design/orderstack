"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export type SwitcherStore = { id: string; name: string; status: string };

/**
 * "Current store: X ▾" for Business accounts. Picking a store runs
 * switchStoreAction, which re-verifies on the server that the store belongs to
 * this owner's business before swapping the session. "All stores" goes to the
 * central dashboard, which aggregates every store.
 */
export function StoreSwitcher({
  stores,
  activeId,
  switchAction,
}: {
  stores: SwitcherStore[];
  activeId: string;
  switchAction: (storeId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-1.5 text-xs text-[var(--ds-muted)]">
      <span className="hidden lg:inline">Current store:</span>
      <select
        aria-label="Switch store"
        data-testid="store-switcher"
        disabled={pending}
        value={activeId}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__all") {
            router.push("/dashboard/business");
            return;
          }
          if (v !== activeId) startTransition(() => switchAction(v));
        }}
        className="max-w-[180px] rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-2 py-1.5 text-[13px] font-semibold text-[var(--ds-text)]"
      >
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.status === "SUSPENDED" ? " (disabled)" : ""}
          </option>
        ))}
        <option value="__all">All stores (central dashboard)</option>
      </select>
    </label>
  );
}
