"use client";

import { useEffect, useState } from "react";
import type { OrderStatus } from "@prisma/client";

const STEPS: OrderStatus[] = ["PENDING", "ACCEPTED", "PREPARING", "READY", "COMPLETED"];
const LABEL: Record<OrderStatus, string> = {
  PENDING: "Order received",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function OrderStatusView({
  slug,
  orderId,
  initialStatus,
}: {
  slug: string;
  orderId: string;
  initialStatus: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);

  useEffect(() => {
    if (status === "COMPLETED" || status === "CANCELLED") return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/orders/${orderId}/status?slug=${slug}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status) setStatus(data.status);
      } catch {
        // transient network error — next tick will retry
      }
    }, 5000);
    return () => clearInterval(id);
  }, [slug, orderId, status]);

  if (status === "CANCELLED") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        This order was cancelled by the restaurant. Please contact them if you have questions.
      </div>
    );
  }

  const activeIndex = STEPS.indexOf(status);

  return (
    <ol className="flex flex-col gap-3">
      {STEPS.map((step, i) => {
        const done = i <= activeIndex;
        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done ? "bg-[var(--brand-primary)] text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {i + 1}
            </span>
            <span className={done ? "font-medium text-gray-900" : "text-gray-400"}>
              {LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
