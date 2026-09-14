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
      className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none"
    >
      {PLAN_TIERS.map((tier) => (
        <option key={tier} value={tier}>
          {PLAN_DEFINITIONS[tier].label}
        </option>
      ))}
    </select>
  );
}
