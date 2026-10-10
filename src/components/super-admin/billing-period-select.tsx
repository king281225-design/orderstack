"use client";

import { setTenantBillingPeriodAction } from "@/app/super-admin/actions";
import type { BillingPeriod } from "@prisma/client";
import { useTransition } from "react";

/** Monthly / Annual / not recorded — what this customer pays on. */
export function BillingPeriodSelect({ tenantId, period }: { tenantId: string; period: BillingPeriod | null }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      value={period ?? ""}
      disabled={isPending}
      aria-label="Billing period"
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await setTenantBillingPeriodAction(tenantId, next);
        });
      }}
      className="min-h-9 w-full touch-manipulation cursor-pointer rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-600 focus:outline-none disabled:cursor-wait disabled:opacity-60 dark:bg-[#241d17]"
    >
      <option value="">Billing: not set</option>
      <option value="MONTHLY">Monthly</option>
      <option value="ANNUAL">Annual</option>
    </select>
  );
}
