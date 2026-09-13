"use client";

import { useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { advanceOrderStatusAction, markOrderPaidAction } from "@/app/dashboard/actions";

/**
 * Plain <form action={...}> buttons (the original implementation) give no
 * visual feedback while a server action is in flight — on this app's actual
 * latency (a genuine cross-region round trip to the database, not just
 * something to hide), that reads as an unresponsive button and invites a
 * second click. A second click landing on an order that already moved is
 * now a harmless no-op server-side (see advanceOrderStatus's own comment),
 * but a disabled/pending button fixes the actual complaint — it stops
 * looking broken — rather than just tolerating the retry after the fact.
 */
export function OrderActionButtons({
  orderId,
  next,
  cancellable,
  paymentPending,
}: {
  orderId: string;
  next: { to: OrderStatus; label: string } | undefined;
  cancellable: boolean;
  paymentPending: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {next && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => advanceOrderStatusAction(orderId, next.to))}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "Working…" : next.label}
        </button>
      )}
      {cancellable && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => advanceOrderStatusAction(orderId, "CANCELLED"))}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
      {paymentPending && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => markOrderPaidAction(orderId))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          title="Manual reconciliation — mark this order as paid"
        >
          Mark as paid
        </button>
      )}
    </>
  );
}
