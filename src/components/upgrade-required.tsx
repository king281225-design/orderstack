import Link from "next/link";

/** Shown instead of a gated page's real content when the tenant's plan doesn't include that feature (see src/lib/plans.ts). */
export function UpgradeRequired({ feature, requiredPlanLabel }: { feature: string; requiredPlanLabel: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
      <p className="text-sm font-medium text-gray-900">{feature} isn&apos;t included on your current plan.</p>
      <p className="mt-1 text-sm text-gray-500">Upgrade to {requiredPlanLabel} or higher to unlock it.</p>
      <Link
        href="/dashboard/billing"
        className="mt-3 inline-block rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        View plans
      </Link>
    </div>
  );
}
