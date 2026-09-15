import { requireOwnerSession } from "@/lib/auth";
import { listCouponsForTenant } from "@/lib/data/coupons";
import { getTenantById } from "@/lib/data/tenants";
import { formatINR } from "@/lib/money";
import { AddCouponForm } from "@/components/coupons/add-coupon-form";
import { deleteCouponAction, setCouponActiveAction } from "@/app/dashboard/coupons/actions";
import { tierHasFeature, PLAN_DEFINITIONS } from "@/lib/plans";
import { UpgradeRequired } from "@/components/upgrade-required";

export default async function CouponsPage() {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;
  if (!tierHasFeature(tenant.planTier, "coupons")) {
    return <UpgradeRequired feature="Coupons" requiredPlanLabel={PLAN_DEFINITIONS.ADVANCED.label} />;
  }

  const coupons = await listCouponsForTenant(session.tenantId);

  return (
    <div className="flex flex-col gap-6">
      <AddCouponForm />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Coupons</h2>
        {coupons.length === 0 ? (
          <p className="text-sm text-gray-500">No coupons yet — add one above.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Discount</th>
                  <th className="px-4 py-2">Min order</th>
                  <th className="px-4 py-2">Redeemed</th>
                  <th className="px-4 py-2">Expires</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const expired = c.isExpired;
                  const limitReached = c.isRedemptionLimitReached;
                  return (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 font-medium text-gray-900">{c.code}</td>
                      <td className="px-4 py-2">
                        {c.discountType === "PERCENT" ? `${c.discountValue}%` : formatINR(c.discountValue)}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {c.minOrderCents > 0 ? formatINR(c.minOrderCents) : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {c.redemptionCount}
                        {c.maxRedemptions !== null ? ` / ${c.maxRedemptions}` : ""}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {c.expiresAt ? c.expiresAt.toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            !c.isActive
                              ? "bg-gray-200 text-gray-600"
                              : expired || limitReached
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {!c.isActive ? "Disabled" : expired ? "Expired" : limitReached ? "Limit reached" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-3">
                          <form action={setCouponActiveAction.bind(null, c.id, !c.isActive)}>
                            <button type="submit" className="text-xs font-medium text-gray-600 hover:underline">
                              {c.isActive ? "Disable" : "Enable"}
                            </button>
                          </form>
                          <form action={deleteCouponAction.bind(null, c.id)}>
                            <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
