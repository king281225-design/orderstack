import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { logoutAction } from "@/app/logout/actions";
import { tierHasFeature } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "STAFF") || !session.tenantId) {
    redirect("/login");
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) redirect("/login");

  const isOwner = session.role === "OWNER";
  // Nav visibility follows the tenant's plan tier (src/lib/plans.ts) —
  // Kitchen is also gated even though staff can otherwise reach it, since
  // it's a Business-tier feature regardless of who's asking.
  const tier = tenant.planTier;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50">
      {/* print:hidden — a printed invoice (/dashboard/orders/[id]/print) must never carry the dashboard chrome. */}
      <header className="border-b border-gray-200 bg-white print:hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
              {tenant.name.charAt(0).toUpperCase()}
            </span>
            <span className="font-semibold text-gray-900">{tenant.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                tenant.isOpen ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
              }`}
            >
              {tenant.isOpen ? "Open" : "Closed"}
            </span>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-gray-500 hover:text-indigo-600">
              Sign out
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-1 px-4 pb-2 text-sm">
          <Link href="/dashboard" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
            Orders
          </Link>
          <Link href="/dashboard/orders/new" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
            New bill
          </Link>
          <Link href="/dashboard/customers" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
            Customers
          </Link>
          <Link href="/dashboard/menu" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
            Menu
          </Link>
          {tierHasFeature(tier, "kitchen") && (
            <Link href="/dashboard/kitchen" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
              Kitchen
            </Link>
          )}
          {isOwner && (
            <>
              <Link href="/dashboard/invoices" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                Invoices
              </Link>
              {tierHasFeature(tier, "analytics") && (
                <Link href="/dashboard/analytics" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                  Analytics
                </Link>
              )}
              <Link href="/dashboard/branding" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                Settings
              </Link>
              {tierHasFeature(tier, "coupons") && (
                <Link href="/dashboard/coupons" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                  Coupons
                </Link>
              )}
              <Link href="/dashboard/tables" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                Tables
              </Link>
              {tierHasFeature(tier, "staff") && (
                <Link href="/dashboard/staff" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                  Staff
                </Link>
              )}
              <Link href="/dashboard/billing" className="rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                Billing
              </Link>
            </>
          )}
          <a
            href={`/r/${tenant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto rounded-full px-2.5 py-1 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
          >
            View storefront ↗
          </a>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
