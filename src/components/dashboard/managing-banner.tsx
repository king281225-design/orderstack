import { stopManagingTenantAction } from "@/app/super-admin/actions";

/** Shown across the whole dashboard while a super-admin is managing a restaurant on the owner's behalf. */
export function ManagingBanner({ tenantName }: { tenantName: string }) {
  return (
    <div className="border-b border-amber-300 bg-amber-100 text-amber-900 print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <span>
          <strong>Super admin:</strong> you&apos;re managing <strong>{tenantName}</strong> as its owner. Changes are real.
        </span>
        <form action={stopManagingTenantAction}>
          <button type="submit" className="rounded-md bg-amber-900 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800">
            ← Back to super admin
          </button>
        </form>
      </div>
    </div>
  );
}
