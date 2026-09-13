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
    <div className="min-h-screen bg-gray-50">
      {/* print:hidden — a printed invoice (/dashboard/orders/[id]/print) must never carry the dashboard chrome. */}
      <header className="border-b border-gray-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
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
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 pb-2 text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            Orders
          </Link>
          <Link href="/dashboard/orders/new" className="text-gray-600 hover:text-gray-900">
            New bill
          </Link>
          <Link href="/dashboard/customers" className="text-gray-600 hover:text-gray-900">
            Customers
          </Link>
          <Link href="/dashboard/menu" className="text-gray-600 hover:text-gray-900">
            Menu
          </Link>
          {tierHasFeature(tier, "kitchen") && (
            <Link href="/dashboard/kitchen" className="text-gray-600 hover:text-gray-900">
              Kitchen
            </Link>
          )}
          {isOwner && (
            <>
              <Link href="/dashboard/invoices" className="text-gray-600 hover:text-gray-900">
                Invoices
              </Link>
              {tierHasFeature(tier, "analytics") && (
                <Link href="/dashboard/analytics" className="text-gray-600 hover:text-gray-900">
                  Analytics
                </Link>
              )}
              <Link href="/dashboard/branding" className="text-gray-600 hover:text-gray-900">
                Settings
              </Link>
              {tierHasFeature(tier, "coupons") && (
                <Link href="/dashboard/coupons" className="text-gray-600 hover:text-gray-900">
                  Coupons
                </Link>
              )}
              <Link href="/dashboard/tables" className="text-gray-600 hover:text-gray-900">
                Tables
              </Link>
              {tierHasFeature(tier, "staff") && (
                <Link href="/dashboard/staff" className="text-gray-600 hover:text-gray-900">
                  Staff
                </Link>
              )}
              <Link href="/dashboard/billing" className="text-gray-600 hover:text-gray-900">
                Billing
              </Link>
            </>
          )}
          <a
            href={`/r/${tenant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-gray-600 hover:text-gray-900"
          >
            View storefront ↗
          </a>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
