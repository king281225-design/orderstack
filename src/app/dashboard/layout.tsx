import { redirect } from "next/navigation";
import { Fraunces, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import { getSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { nowMs } from "@/lib/time";
import { hasAnyMenuItems } from "@/lib/data/menu";
import { countLowStockItems } from "@/lib/data/inventory";
import { ManagingBanner } from "@/components/dashboard/managing-banner";
import { OnboardingBanner } from "@/components/dashboard/onboarding-banner";
import { WhatsNewModal } from "@/components/dashboard/whats-new-modal";
import { listOrdersForTenant } from "@/lib/data/orders";
import { listPendingWaiterCalls } from "@/lib/data/waiter-calls";
import { acknowledgeWaiterCallAction, dismissOnboardingAction, toggleOpenAction } from "@/app/dashboard/actions";
import { logoutAction } from "@/app/logout/actions";
import { tenantHasFeature, trialMsFor } from "@/lib/plans";
import { listAccessibleStores } from "@/lib/data/business";
import { switchStoreAction } from "@/app/dashboard/business/actions";
import { StoreSwitcher } from "@/components/business/store-switcher";
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
    countLowStockItems(session.tenantId),
  ]);
  if (!tenant) redirect("/login");

  const isOwner = session.role === "OWNER";
  const menuDone = isOwner ? await hasAnyMenuItems(session.tenantId) : true;
  const brandingDone = Boolean(tenant.logoUrl || tenant.tagline);
  const trialMsLeft = tenant.createdAt.getTime() + trialMsFor(tenant.trialDays) - nowMs();
  const trialDaysLeft =
    isOwner && tenant.subscriptionStatus !== "ACTIVE" && trialMsLeft > 0
      ? Math.max(0, Math.ceil(trialMsLeft / 86_400_000))
      : null;
  // Nav visibility follows the tenant's plan tier, with the super-admin's
  // per-tenant feature overrides layered on top (src/lib/plans.ts) — Kitchen
  // is also gated even though staff can otherwise reach it, since it's a
  // Business-tier feature regardless of who's asking.
  const isOwnerSelf = isOwner && !session.impersonatorId;
  const { business, stores } = isOwnerSelf
    ? await listAccessibleStores(session.sub, session.tenantId)
    : { business: null, stores: [] };
  const showBusinessNav = isOwnerSelf && (tenantHasFeature(tenant, "multiStore") || Boolean(business));

  const links: DashboardNavLink[] = [
    { href: "/dashboard", label: "Orders" },
    { href: "/dashboard/orders/new", label: "New bill" },
    { href: "/dashboard/orders/history", label: "Edit history" },
    { href: "/dashboard/customers", label: "Customers" },
    { href: "/dashboard/menu", label: "Menu" },
    ...(tenantHasFeature(tenant, "inventory") ? [{ href: "/dashboard/inventory", label: "Inventory", badge: lowStockCount }] : []),
    ...(tenantHasFeature(tenant, "kot") ? [{ href: "/dashboard/kot", label: "KOT" }] : []),
    ...(tenantHasFeature(tenant, "kitchen") ? [{ href: "/dashboard/kitchen", label: "Kitchen" }] : []),
    ...(isOwner
      ? [
          ...(showBusinessNav ? [{ href: "/dashboard/business", label: "Business" }] : []),
          { href: "/dashboard/invoices", label: "Invoices" },
          ...(tenantHasFeature(tenant, "analytics") ? [{ href: "/dashboard/analytics", label: "Analytics" }] : []),
          { href: "/dashboard/branding", label: "Settings" },
          ...(tenantHasFeature(tenant, "coupons") ? [{ href: "/dashboard/coupons", label: "Coupons" }] : []),
          { href: "/dashboard/tables/board", label: "Tables" },
          ...(tenantHasFeature(tenant, "staff") ? [{ href: "/dashboard/staff", label: "Staff" }] : []),
          ...(tenantHasFeature(tenant, "deliveryAggregator")
            ? [{ href: "/dashboard/integrations", label: "Integrations" }]
            : []),
          { href: "/dashboard/billing", label: "Billing" },
        ]
      : []),
    { href: "/dashboard/help", label: "Help" },
  ];

  return (
    <div className={`${publicSans.variable} ${fraunces.variable} ${plexMono.variable}`}>
      <WhatsNewModal />
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
        storeSwitcher={
          business && stores.length > 1 ? (
            <StoreSwitcher
              stores={stores.map((x) => ({ id: x.id, name: x.name, status: x.status }))}
              activeId={session.tenantId}
              switchAction={switchStoreAction}
            />
          ) : null
        }
        banner={session.impersonatorId ? <ManagingBanner tenantName={tenant.name} /> : null}
        notices={
          isOwner ? (
            <OnboardingBanner
              menuDone={menuDone}
              brandingDone={brandingDone}
              trialDaysLeft={trialDaysLeft}
              dismissed={Boolean(tenant.onboardingDismissedAt)}
              dismissAction={dismissOnboardingAction}
            />
          ) : null
        }
      >
        {children}
      </DashboardShell>
    </div>
  );
}
