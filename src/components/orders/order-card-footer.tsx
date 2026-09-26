"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { advanceOrderStatusAction, markOrderPaidAction } from "@/app/dashboard/actions";

/**
 * The bottom of an order card in the Orders board: total, the small icon
 * buttons (print bill, print KOT, cancel) and the one big next-step button.
 * A client component because the buttons run server actions with a pending
 * state — a second tap during a slow round trip is harmless server-side, but
 * a disabled "Working…" button stops the card looking frozen.
 */
export function OrderCardFooter({
  orderId,
  totalText,
  next,
  tone,
  cancellable,
  paymentPending,
  editable,
}: {
  orderId: string;
  totalText: string;
  next: { to: OrderStatus; label: string } | undefined;
  tone: "accent" | "dark" | "green";
  cancellable: boolean;
  paymentPending: boolean;
  /** Whether this order can still have items added/removed — see updateOrderItems's own guard (not completed/cancelled, not yet paid). */
  editable: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const toneCls =
    tone === "green"
      ? "bg-[#1e7a4c] text-[#f2fbf5]"
      : tone === "dark"
        ? "bg-[#221b14] text-[#fbf8f3] dark:bg-[#f5efe6] dark:text-[#221b14]"
        : "bg-[var(--ds-accent)] text-[#fff8f1]";

  const iconBtn =
    "grid size-[30px] place-items-center rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-chip-text)] hover:bg-[var(--ds-chip)]";

  return (
    <>
      <div className="flex items-center justify-between border-t border-dashed border-[var(--ds-border-soft)] pt-2">
        <span className="ds-mono text-sm font-semibold">{totalText}</span>
        <div className="flex items-center gap-1.5">
          {paymentPending && (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => markOrderPaidAction(orderId))}
              title="Mark this order as paid (manual reconciliation)"
              className="mr-1 rounded-lg border border-[var(--ds-border)] px-2 py-1 text-[11px] font-semibold text-[var(--ds-chip-text)] hover:bg-[var(--ds-chip)] disabled:opacity-50"
            >
              Mark paid
            </button>
          )}
          {editable && (
            <Link href={`/dashboard/orders/${orderId}/edit`} aria-label="Add or remove items" title="Add or remove items" className={iconBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </Link>
          )}
          <Link href={`/dashboard/orders/${orderId}/print`} target="_blank" aria-label="Print bill" title="Print bill" className={iconBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </Link>
          <Link href={`/dashboard/orders/${orderId}/kot`} target="_blank" aria-label="Print KOT" title="Print KOT" className={iconBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
              <path d="M9 8h6M9 12h6" />
            </svg>
          </Link>
          {cancellable && (
            <button
              type="button"
              disabled={pending}
              aria-label="Cancel order"
              title="Cancel order"
              onClick={() => {
                if (!window.confirm("Cancel this order?")) return;
                startTransition(() => advanceOrderStatusAction(orderId, "CANCELLED"));
              }}
              className="grid size-[30px] place-items-center rounded-lg border border-[#f3c6c6] bg-[#fdf0f0] text-[#b23b3b] hover:bg-[#fae0e0] disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {next && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => advanceOrderStatusAction(orderId, next.to))}
          className={`w-full rounded-[10px] px-3 py-[11px] text-[13.5px] font-bold hover:brightness-95 disabled:opacity-60 ${toneCls}`}
        >
          {pending ? "Working…" : next.label}
        </button>
      )}
    </>
  );
}
