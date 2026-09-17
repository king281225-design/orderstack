import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { listOrdersForTenant } from "@/lib/data/orders";
import { listPendingWaiterCalls } from "@/lib/data/waiter-calls";
import { acknowledgeWaiterCallAction } from "@/app/dashboard/actions";
import { logoutAction } from "@/app/logout/actions";
import { tierHasFeature } from "@/lib/plans";
import { DashboardHeader, type DashboardNavLink } from "@/components/dashboard/dashboard-header";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "STAFF") || !session.tenantId) {
    redirect("/login");
  }

  const [tenant, pendingOrders, waiterCalls] = await Promise.all([
    getTenantById(session.tenantId),
    listOrdersForTenant(session.tenantId, ["PENDING"]),
    listPendingWaiterCalls(session.tenantId),
  ]);
  if (!tenant) redirect("/login");

  const isOwner = session.role === "OWNER";
  // Nav visibility follows the tenant's plan tier (src/lib/plans.ts) —
  // Kitchen is also gated even though staff can otherwise reach it, since
  // it's a Business-tier feature regardless of who's asking.
  const tier = tenant.planTier;

  const links: DashboardNavLink[] = [
    { href: "/dashboard", label: "Orders" },
    { href: "/dashboard/orders/new", label: "New bill" },
    { href: "/dashboard/customers", label: "Customers" },
    { href: "/dashboard/menu", label: "Menu" },
    ...(tierHasFeature(tier, "kitchen") ? [{ href: "/dashboard/kitchen", label: "Kitchen" }] : []),
    ...(isOwner
      ? [
          { href: "/dashboard/invoices", label: "Invoices" },
          ...(tierHasFeature(tier, "analytics") ? [{ href: "/dashboard/analytics", label: "Analytics" }] : []),
          { href: "/dashboard/branding", label: "Settings" },
          ...(tierHasFeature(tier, "coupons") ? [{ href: "/dashboard/coupons", label: "Coupons" }] : []),
          { href: "/dashboard/tables", label: "Tables" },
          ...(tierHasFeature(tier, "staff") ? [{ href: "/dashboard/staff", label: "Staff" }] : []),
          { href: "/dashboard/billing", label: "Billing" },
        ]
      : []),
    { href: "/dashboard/help", label: "Help" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50 dark:from-[#0f0b08] dark:via-[#1a120c] dark:to-[#3d1c05]">
      <DashboardHeader
        tenantName={tenant.name}
        tenantSlug={tenant.slug}
        isOpen={tenant.isOpen}
        links={links}
        logoutAction={logoutAction}
        pendingOrderCount={pendingOrders.length}
        waiterCalls={waiterCalls.map((c) => ({ id: c.id, tableLabel: c.tableLabel }))}
        acknowledgeWaiterCallAction={acknowledgeWaiterCallAction}
      />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
