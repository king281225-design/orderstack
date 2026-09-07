import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { isRazorpayConfigured, getRazorpayKeyId } from "@/lib/payments/razorpay";
import { PLAN_DEFINITIONS } from "@/lib/plans";
import { formatINR } from "@/lib/money";
import { SubscribeButton } from "@/components/billing/subscribe-button";
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

export default async function BillingPage() {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;

  const plan = PLAN_DEFINITIONS[tenant.planTier];
  const razorpayReady = isRazorpayConfigured();
  const keyId = getRazorpayKeyId();

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-gray-900">Billing</h2>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Current plan</p>
        <p className="mt-1 text-xl font-semibold text-gray-900">{plan.label}</p>
        <p className="text-sm text-gray-600">{formatINR(plan.priceCents)} / month</p>
        <p className="mt-2 text-xs text-gray-400">
          Assigned by the platform — contact support to change your plan tier.
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
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

        {razorpayReady && tenant.subscriptionStatus !== "ACTIVE" && keyId && (
          <div className="mt-3">
            <p className="mb-2 text-sm text-gray-600">
              Start a recurring monthly subscription for the {plan.label} plan (
              {formatINR(plan.priceCents)}/month), billed automatically via Razorpay.
            </p>
            <SubscribeButton keyId={keyId} restaurantName={tenant.name} />
          </div>
        )}

        {razorpayReady && tenant.subscriptionStatus === "ACTIVE" && (
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
    </div>
  );
}
