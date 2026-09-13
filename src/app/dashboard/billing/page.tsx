import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { isRazorpayConfigured, getRazorpayKeyId } from "@/lib/payments/razorpay";
import { PLAN_DEFINITIONS, PLAN_TIERS } from "@/lib/plans";
import { formatINR } from "@/lib/money";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { WelcomeCouponForm } from "@/components/billing/welcome-coupon-form";
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
  const isActive = tenant.subscriptionStatus === "ACTIVE";
  const welcomeCouponEligible = !tenant.welcomeCouponRedeemedAt && !isActive;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-gray-900">Billing</h2>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
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
        <section>
          <h3 className="mb-1 text-sm font-semibold text-gray-900">Choose a plan</h3>
          <p className="mb-3 text-xs text-gray-500">
            Pick a plan and pay for it yourself, billed automatically every month via Razorpay.
            Your plan only changes once payment actually goes through — picking one here doesn&apos;t
            charge anything until you complete the checkout.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PLAN_TIERS.map((tier) => {
              const def = PLAN_DEFINITIONS[tier];
              return (
                <div key={tier} className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm font-semibold text-gray-900">{def.label}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatINR(def.priceCents)}
                    <span className="text-xs font-normal text-gray-500"> /month</span>
                  </p>
                  <ul className="mb-1 flex-1 text-xs text-gray-500">
                    {def.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                  <SubscribeButton
                    keyId={keyId}
                    restaurantName={tenant.name}
                    tier={tier}
                    label={`Subscribe to ${def.label}`}
                  />
                  {tier === "STARTER" && welcomeCouponEligible && (
                    <WelcomeCouponForm keyId={keyId} restaurantName={tenant.name} />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
