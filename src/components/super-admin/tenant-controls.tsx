import { setTenantStatusAction, setTenantSubscriptionOverrideAction, startManagingTenantAction } from "@/app/super-admin/actions";
import { trialState } from "@/lib/plans";
import type { SubscriptionStatus, TenantStatus } from "@prisma/client";

/**
 * Manual override of the "has this tenant ever paid" signal — bypasses the
 * 7-day dashboard trial gate (src/proxy.ts) without a real Razorpay payment.
 * Kept separate from real subscription state; see
 * setTenantSubscriptionOverride's own comment. The label shows where the
 * tenant actually stands so the super-admin can see trial days left at a glance.
 */
export function AccessToggle({
  tenantId,
  subscriptionStatus,
  createdAt,
  now,
}: {
  tenantId: string;
  subscriptionStatus: SubscriptionStatus;
  createdAt: Date;
  now: number;
}) {
  const state = trialState(createdAt, subscriptionStatus, now);
  const label =
    state.kind === "full" ? "Full access" : state.kind === "trial" ? `Trial · ${state.daysLeft}d left` : "Trial ended";
  const style =
    state.kind === "full"
      ? "bg-green-100 text-green-700"
      : state.kind === "trial"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-700";
  return (
    <form action={setTenantSubscriptionOverrideAction.bind(null, tenantId, subscriptionStatus !== "ACTIVE")}>
      <button
        type="submit"
        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
        title={
          state.kind === "full"
            ? "Click to remove the manual full-access override"
            : "Click to grant full access (no real payment) — for demo/test tenants"
        }
      >
        {label}
      </button>
    </form>
  );
}

export function StatusToggle({ tenantId, status }: { tenantId: string; status: TenantStatus }) {
  return (
    <form action={setTenantStatusAction.bind(null, tenantId, status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>
      <button type="submit" className="text-xs font-medium text-gray-600 hover:underline">
        {status === "ACTIVE" ? "Suspend" : "Reactivate"}
      </button>
    </form>
  );
}

/** Opens the restaurant's real dashboard as its owner — see startManagingTenantAction. */
export function ManageButtons({ tenantId, compact = false }: { tenantId: string; compact?: boolean }) {
  const base = "rounded-md px-2.5 py-1 text-xs font-semibold";
  return (
    <div className="flex items-center justify-end gap-1.5">
      <form action={startManagingTenantAction.bind(null, tenantId, "/dashboard")}>
        <button type="submit" className={`${base} bg-indigo-600 text-white hover:bg-indigo-700`}>
          Manage
        </button>
      </form>
      {!compact && (
        <form action={startManagingTenantAction.bind(null, tenantId, "/dashboard/menu")}>
          <button type="submit" className={`${base} border border-indigo-300 text-indigo-700 hover:bg-indigo-50`}>
            Menu
          </button>
        </form>
      )}
    </div>
  );
}
