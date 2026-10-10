"use client";

import { setTenantPlanAction } from "@/app/super-admin/actions";
import { PLAN_DEFINITIONS, PLAN_TIERS } from "@/lib/plans";
import type { PlanTier } from "@prisma/client";
import { useTransition } from "react";

export function PlanSelect({ tenantId, planTier }: { tenantId: string; planTier: PlanTier }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={planTier}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as PlanTier;
        startTransition(async () => {
          await setTenantPlanAction(tenantId, next);
        });
      }}
      aria-label="Plan tier"
      className="min-h-9 w-full touch-manipulation cursor-pointer rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs focus:border-indigo-600 focus:outline-none disabled:cursor-wait disabled:opacity-60 dark:bg-[#241d17]"
    >
      {PLAN_TIERS.map((tier) => (
        <option key={tier} value={tier}>
          {PLAN_DEFINITIONS[tier].label}
        </option>
      ))}
    </select>
  );
}
