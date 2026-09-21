import { redirect } from "next/navigation";
import { Fraunces, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import { getSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { nowMs } from "@/lib/time";
import { hasAnyMenuItems } from "@/lib/data/menu";
import { countLowStock } from "@/lib/data/inventory";
import { ManagingBanner } from "@/components/dashboard/managing-banner";
import { OnboardingBanner } from "@/components/dashboard/onboarding-banner";
import { listOrdersForTenant } from "@/lib/data/orders";
import { listPendingWaiterCalls } from "@/lib/data/waiter-calls";
import { acknowledgeWaiterCallAction, toggleOpenAction } from "@/app/dashboard/actions";
import { logoutAction } from "@/app/logout/actions";
import { tierHasFeature, TRIAL_MS } from "@/lib/plans";
import { DashboardShell, type DashboardNavLink } from "@/components/dashboard/dashboard-shell";

// Typefaces from the Orders design: Public Sans body, Fraunces headings,
// IBM Plex Mono for order numbers and amounts. Exposed as CSS variables that
// the .ds classes in globals.css read.
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-fraunces" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-plex-mono" });

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "STAFF") || !session.tenantId) {
    redirect("/login");
  }

  const [tenant, pendingOrders, waiterCalls, lowStockCount] = await Promise.all([
    getTenantById(session.tenantId),
    listOrdersForTenant(session.tenantId, ["PENDING"]),
    listPendingWaiterCalls(session.tenantId),
    countLowStock(session.tenantId),
  ]);
  if (!tenant) redirect("/login");

  const isOwner = session.role === "OWNER";
  const menuDone = isOwner ? await hasAnyMenuItems(session.tenantId) : true;
  const brandingDone = Boolean(tenant.logoUrl || tenant.tagline);
  const trialMsLeft = tenant.createdAt.getTime() + TRIAL_MS - nowMs();
  const trialDaysLeft =
    isOwner && tenant.subscriptionStatus !== "ACTIVE" && trialMsLeft > 0
      ? Math.max(0, Math.ceil(trialMsLeft / 86_400_000))
      : null;
  // Nav visibility follows the tenant's plan tier (src/lib/plans.ts) —
  // Kitchen is also gated even though staff can otherwise reach it, since
  // it's a Business-tier feature regardless of who's asking.
  const tier = tenant.planTier;

  const links: DashboardNavLink[] = [
    { href: "/dashboard", label: "Orders" },
    { href: "/dashboard/orders/new", label: "New bill" },
    { href: "/dashboard/customers", label: "Customers" },
    { href: "/dashboard/menu", label: "Menu" },
    ...(tierHasFeature(tier, "inventory") ? [{ href: "/dashboard/inventory", label: "Inventory", badge: lowStockCount }] : []),
    ...(tierHasFeature(tier, "kot") ? [{ href: "/dashboard/kot", label: "KOT" }] : []),
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
    <div className={`${publicSans.variable} ${fraunces.variable} ${plexMono.variable}`}>
      <DashboardShell
        tenantName={tenant.name}
        tenantSlug={tenant.slug}
        isOpen={tenant.isOpen}
        roleLabel={isOwner ? "Owner" : "Staff"}
        links={links}
        logoutAction={logoutAction}
        setOpenAction={toggleOpenAction}
        pendingOrderCount={pendingOrders.length}
        waiterCalls={waiterCalls.map((c) => ({ id: c.id, tableLabel: c.tableLabel }))}
        acknowledgeWaiterCallAction={acknowledgeWaiterCallAction}
        banner={session.impersonatorId ? <ManagingBanner tenantName={tenant.name} /> : null}
        notices={
          isOwner ? (
            <OnboardingBanner menuDone={menuDone} brandingDone={brandingDone} trialDaysLeft={trialDaysLeft} />
          ) : null
        }
      >
        {children}
      </DashboardShell>
    </div>
  );
}
