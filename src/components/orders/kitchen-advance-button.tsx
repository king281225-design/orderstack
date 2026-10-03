"use client";

import { useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { advanceOrderStatusAction } from "@/app/dashboard/actions";

/** Same pending-state fix as the Orders board buttons, for the kitchen board's own copy of this button. */
export function KitchenAdvanceButton({
  orderId,
  to,
  label,
  accent = "#ffffff",
}: {
  orderId: string;
  to: OrderStatus;
  label: string;
  /** Column colour, so the next step is obvious at a glance. */
  accent?: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => advanceOrderStatusAction(orderId, to))}
      style={{ backgroundColor: accent }}
      className="min-h-12 w-full touch-manipulation rounded-xl px-3 py-3 text-lg font-bold text-slate-950 shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
    >
      {isPending ? "Working…" : label}
    </button>
  );
}
