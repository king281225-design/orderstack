import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { listDynoRestaurantLinks } from "@/lib/data/dyno-connections";
import { tierHasFeature, PLAN_DEFINITIONS } from "@/lib/plans";
import { UpgradeRequired } from "@/components/upgrade-required";
import { DynoConnectionForm } from "@/components/integrations/dyno-connection-form";
import { PlatformCard } from "@/components/integrations/platform-card";
import { ZomatoIcon, SwiggyIcon } from "@/components/integrations/platform-icons";
import { disconnectDynoAction } from "@/app/dashboard/integrations/actions";
import { SITE_URL } from "@/lib/site";
import type { DeliveryPlatform } from "@prisma/client";

/**
 * A restaurant's id on Zomato is a different value than its id on Swiggy —
 * confirmed by reading Dyno's real client source — so each platform gets
 * its own connection, not one shared id. Adding a future platform is one
 * more entry here plus a matching icon, not a new layout.
 */
const PLATFORMS: { key: DeliveryPlatform; name: string; description: string; icon: React.ReactNode }[] = [
  {
    key: "ZOMATO",
    name: "Zomato",
    description: "Live orders from your Zomato listing, right on this dashboard.",
    icon: <ZomatoIcon className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm" />,
  },
  {
    key: "SWIGGY",
    name: "Swiggy",
    description: "Live orders from your Swiggy listing, right on this dashboard.",
    icon: <SwiggyIcon className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm" />,
  },
];

export default async function IntegrationsPage() {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;
  if (!tierHasFeature(tenant.planTier, "deliveryAggregator")) {
    return <UpgradeRequired feature="Delivery-platform integration" requiredPlanLabel={PLAN_DEFINITIONS.BUSINESS.label} />;
  }

  const links = await listDynoRestaurantLinks(session.tenantId);
  const linkByPlatform = new Map(links.map((l) => [l.platform, l]));
  const webhookBaseUrl = `${SITE_URL}/api/dyno`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Delivery platforms</h2>
        <p className="mt-1 text-sm text-gray-500">
          Bring Zomato and Swiggy orders into this dashboard alongside your own storefront and walk-in
          orders, via <span className="font-medium">Dyno (DynoAPIs)</span> — none of these platforms hands
          out API access directly, so Dyno is what actually talks to them on your behalf. Each platform
          assigns your restaurant its own id, so connect them separately below.
        </p>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
        <p className="font-medium text-gray-900">In Dyno&apos;s Webhook Configuration screen, enter this as your Cloud Webhook Host Url:</p>
        <p className="mt-1 break-all rounded bg-white px-2 py-1 font-mono text-xs text-gray-700">{webhookBaseUrl}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PLATFORMS.map((p) => {
          const link = linkByPlatform.get(p.key);
          return (
            <PlatformCard key={p.key} icon={p.icon} name={p.name} description={p.description} connected={Boolean(link)}>
              {link ? (
                <div className="flex flex-col gap-1 rounded-md border border-green-200 bg-green-50 p-2.5 text-xs">
                  <p className="font-medium text-green-800">
                    Restaurant id <span className="font-mono">{link.externalId}</span>
                  </p>
                  <form action={disconnectDynoAction.bind(null, p.key)}>
                    <button type="submit" className="self-start text-red-600 hover:underline">
                      Disconnect
                    </button>
                  </form>
                </div>
              ) : (
                <DynoConnectionForm platform={p.key} />
              )}
            </PlatformCard>
          );
        })}
      </div>
    </div>
  );
}
