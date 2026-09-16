import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { isRazorpayConfigured, getRazorpayKeyId } from "@/lib/payments/razorpay";
import { PLAN_DEFINITIONS } from "@/lib/plans";
import { formatINR } from "@/lib/money";
import { PlanCards } from "@/components/billing/plan-cards";
import { cancelSubscriptionAction } from "@/app/dashboard/billing/actions";

const STATUS_LABEL: Record<string, string> = {
  NONE: "No active subscription",
  ACTIVE: "Active",
  PAST_DUE: "Payment past due",
  CANCELLED: "Cancelled",
};

const STATUS_STYLE: Record<string, string> = {
  NONE: "bg-gray-200 text-gray-600",
  ACTIVE: "bg-green-100 text-green-700",
  PAST_DUE: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-gray-200 text-gray-600",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ trialExpired?: string }>;
}) {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;

  const { trialExpired } = await searchParams;
  const plan = PLAN_DEFINITIONS[tenant.planTier];
  const razorpayReady = isRazorpayConfigured();
  const keyId = getRazorpayKeyId();
  const isActive = tenant.subscriptionStatus === "ACTIVE";
  const welcomeCouponEligible = !tenant.welcomeCouponRedeemedAt && !isActive;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-gray-900">Billing</h2>

      {/* src/proxy.ts redirects here once the free trial (15 min since the
          tenant was created, see getTenantTrialStatus) has run out on an
          unpaid tenant. isActive is impossible while trialExpired is set
          (the proxy skips a genuinely ACTIVE tenant), but keeping the check
          means an owner who resolves it mid-page-load, e.g. by paying in
          another tab, never sees a stale warning. */}
      {trialExpired === "1" && !isActive && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your 15-minute free trial has ended. Subscribe to a plan below to keep using the dashboard.
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
        <p className="text-sm text-gray-500">Current plan</p>
        <p className="mt-1 text-xl font-semibold text-gray-900">{plan.label}</p>
        <p className="text-sm text-gray-600">{formatINR(plan.priceCents)} / month</p>
        {/* isActive means this tenant actually paid for this tier via the flow below (or the webhook
            confirmed it) — anything else is just the unpaid STARTER default or a platform override,
            never implied to be a paid entitlement. */}
        <p className="mt-2 text-xs text-gray-400">
          {isActive
            ? "Billed automatically via Razorpay."
            : "Not an active paid subscription — either the default for a new restaurant, or set manually by the platform. Subscribe below to pay for it yourself."}
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">Subscription status</p>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[tenant.subscriptionStatus]}`}
          >
            {STATUS_LABEL[tenant.subscriptionStatus]}
          </span>
        </div>

        {!razorpayReady && (
          <p className="mt-3 text-sm text-gray-500">
            Online recurring billing isn&apos;t set up yet — this restaurant&apos;s plan is
            tracked manually by the platform and there&apos;s nothing to pay here right now.
          </p>
        )}

        {razorpayReady && isActive && (
          <form action={cancelSubscriptionAction} className="mt-3">
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Cancel subscription
            </button>
          </form>
        )}
      </section>

      {razorpayReady && !isActive && keyId && (
        <PlanCards keyId={keyId} restaurantName={tenant.name} welcomeCouponEligible={welcomeCouponEligible} />
      )}
    </div>
  );
}
