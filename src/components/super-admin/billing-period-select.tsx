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
      className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none"
    >
      <option value="">Billing: not set</option>
      <option value="MONTHLY">Monthly</option>
      <option value="ANNUAL">Annual</option>
    </select>
  );
}
