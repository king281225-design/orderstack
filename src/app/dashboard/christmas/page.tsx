import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { listCouponsForTenant } from "@/lib/data/coupons";
import { listRecentSpins } from "@/lib/data/christmas";
import { tenantHasFeature } from "@/lib/plans";
import { SpinPoolForm } from "@/components/christmas/spin-pool-form";

export default async function ChristmasCampaignPage() {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;

  // Off only outside the season or when a super-admin forced it off for this
  // restaurant (src/lib/seasonal.ts). Deliberately not UpgradeRequired (that
  // component assumes a paid tier unlocks the feature, which isn't true here).
  if (!tenantHasFeature(tenant, "christmasCampaign")) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white dark:bg-[#241d17] p-6 text-center">
        <p className="text-sm font-medium text-gray-900">The Christmas campaign isn&apos;t enabled for your account.</p>
        <p className="mt-1 text-sm text-gray-500">Ask the platform team if you&apos;d like it turned on for this season.</p>
      </div>
    );
  }

  const [coupons, spins] = await Promise.all([
    listCouponsForTenant(session.tenantId),
    listRecentSpins(session.tenantId),
  ]);
  const poolIds: string[] = Array.isArray(tenant.christmasSpinCouponIds)
    ? tenant.christmasSpinCouponIds.filter((v): v is string => typeof v === "string")
    : [];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">🎄 Christmas Spin &amp; Win</h2>
        <p className="mb-3 text-sm text-gray-500">
          Pick which of your existing coupons customers can win by spinning the wheel on your storefront. The
          Spin &amp; Win button appears on your storefront once you save at least one coupon here. Every spin wins
          one of these coupons, and each device gets one spin (it&apos;s a simple limit, not a
          guarantee — someone using a different phone or browser can spin again). A coupon&apos;s redemption
          limit counts <strong>orders</strong> that use it, not spins. Once the limit is reached it leaves the
          wheel, and winners who haven&apos;t used it yet can&apos;t — so give wheel coupons a generous limit, or
          none.
        </p>
        {coupons.length === 0 ? (
          <p className="text-sm text-gray-500">
            You don&apos;t have any coupons yet — create one on the Coupons page first, then come back here to add
            it to the spin pool.
          </p>
        ) : (
          <SpinPoolForm
            coupons={coupons.map((c) => ({
              id: c.id,
              code: c.code,
              discountType: c.discountType,
              discountValue: c.discountValue,
            }))}
            selectedIds={poolIds}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent spins</h2>
        {spins.length === 0 ? (
          <p className="text-sm text-gray-500">No spins yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Coupon won</th>
                </tr>
              </thead>
              <tbody>
                {spins.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-500">{s.createdAt.toLocaleString()}</td>
                    <td className="px-4 py-2 text-gray-700">{s.customerPhone ?? "Anonymous device"}</td>
                    <td className="px-4 py-2 font-medium text-gray-900">{s.coupon.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
