import { requireOwnerSession } from "@/lib/auth";
import { listStaffForTenant } from "@/lib/data/staff";
import { getTenantById } from "@/lib/data/tenants";
import { AddStaffForm } from "@/components/staff/add-staff-form";
import { deleteStaffAction } from "@/app/dashboard/staff/actions";
import { tierHasFeature, PLAN_DEFINITIONS } from "@/lib/plans";
import { UpgradeRequired } from "@/components/upgrade-required";

export default async function StaffPage() {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;
  if (!tierHasFeature(tenant.planTier, "staff")) {
    return <UpgradeRequired feature="Staff logins" requiredPlanLabel={PLAN_DEFINITIONS.BUSINESS.label} />;
  }

  const staff = await listStaffForTenant(session.tenantId);

  return (
    <div className="flex flex-col gap-6">
      <AddStaffForm />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Staff logins</h2>
        <p className="mb-3 text-sm text-gray-500">
          Staff can manage Orders, Kitchen, and Menu availability. They can&apos;t see Branding,
          Coupons, Tables, Analytics, or this Staff page.
        </p>
        {staff.length === 0 ? (
          <p className="text-sm text-gray-500">No staff logins yet — add one above.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {staff.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-white dark:bg-[#1e2939] px-4 py-2 text-sm"
              >
                <span className="text-gray-700">{s.email}</span>
                <form action={deleteStaffAction.bind(null, s.id)}>
                  <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
