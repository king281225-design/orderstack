"use client";

import { useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { advanceOrderStatusAction } from "@/app/dashboard/actions";

/** Same pending-state fix as the Orders board buttons, for the kitchen board's own copy of this button. */
export function KitchenAdvanceButton({
  orderId,
  to,
  label,
}: {
  orderId: string;
  to: OrderStatus;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => advanceOrderStatusAction(orderId, to))}
      className="w-full rounded-md bg-white dark:bg-[#241d17] px-3 py-2 text-base font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50"
    >
      {isPending ? "Working…" : label}
    </button>
  );
}
