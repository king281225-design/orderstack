import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { logoutAction } from "@/app/logout/actions";
import { tierHasFeature } from "@/lib/plans";
import { ThemeToggle } from "@/components/theme/theme-toggle";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50 dark:from-[#05070d] dark:via-[#0b0f1a] dark:to-[#1e1147]">
      {/* print:hidden — a printed invoice (/dashboard/orders/[id]/print) must never carry the dashboard chrome.
          A bold gradient fill (not just a white bar with a thin accent strip) — the earlier, more timid version
          of this header was flagged twice as still not looking good. */}
      <header className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 shadow-md print:hidden dark:from-indigo-800 dark:via-indigo-800 dark:to-violet-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-7 place-items-center rounded-lg bg-white/15 text-xs font-bold text-white">
              {tenant.name.charAt(0).toUpperCase()}
            </span>
            <span className="font-semibold text-white">{tenant.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                tenant.isOpen ? "bg-white/90 text-green-700" : "bg-black/20 text-white/80"
              }`}
            >
              {tenant.isOpen ? "Open" : "Closed"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle variant="header" />
            <form action={logoutAction}>
              <button type="submit" className="text-sm text-white/80 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-1 px-4 pb-2 text-sm">
          <Link href="/dashboard" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
            Orders
          </Link>
          <Link href="/dashboard/orders/new" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
            New bill
          </Link>
          <Link href="/dashboard/customers" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
            Customers
          </Link>
          <Link href="/dashboard/menu" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
            Menu
          </Link>
          {tierHasFeature(tier, "kitchen") && (
            <Link href="/dashboard/kitchen" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
              Kitchen
            </Link>
          )}
          {isOwner && (
            <>
              <Link href="/dashboard/invoices" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                Invoices
              </Link>
              {tierHasFeature(tier, "analytics") && (
                <Link href="/dashboard/analytics" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                  Analytics
                </Link>
              )}
              <Link href="/dashboard/branding" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                Settings
              </Link>
              {tierHasFeature(tier, "coupons") && (
                <Link href="/dashboard/coupons" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                  Coupons
                </Link>
              )}
              <Link href="/dashboard/tables" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                Tables
              </Link>
              {tierHasFeature(tier, "staff") && (
                <Link href="/dashboard/staff" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                  Staff
                </Link>
              )}
              <Link href="/dashboard/billing" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                Billing
              </Link>
            </>
          )}
          <Link href="/dashboard/help" className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
            Help
          </Link>
          <a
            href={`/r/${tenant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            View storefront ↗
          </a>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
